import { ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT } from "@/components/assistant-message-render-limit";
import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import type Token from "markdown-it/lib/token.mjs";
import type { AssistantMessageItem } from "@/types/stream";

const parser = createAssistantMarkdownParser().set({ html: true });
const partsByBlock = new WeakMap<AssistantMessageItem, AssistantMessageItem[]>();

function splitBlock(block: AssistantMessageItem): AssistantMessageItem[] {
  const cached = partsByBlock.get(block);
  if (cached) return cached;
  const environment: { references?: unknown } = {};
  const tokens = parser.parse(block.text, environment);
  const preserved = tokens.some(
    (token) =>
      ["fence", "code_block", "table_open", "html_block"].includes(token.type) ||
      token.children?.some((child) => child.type === "html_inline"),
  );
  const isQuote = tokens.some((token) => token.type === "blockquote_open");
  const hasImage = tokens.some((token) => token.children?.some((child) => child.type === "image"));
  let parts: AssistantMessageItem[];
  // Retain the container and its definitions when splitting would lose image context.
  if (preserved || (hasImage && (environment.references || !canSplitParagraphImages(tokens)))) {
    parts = [{ ...block, markdownKind: "block" }];
  } else if (hasImage) {
    parts = splitParagraphImages(block);
  } else {
    parts = [{ ...block, markdownKind: isQuote ? "quote" : "prose" }];
  }
  partsByBlock.set(block, parts);
  return parts;
}

function canSplitParagraphImages(tokens: Token[]): boolean {
  if (tokens.length !== 3 || tokens[0]?.type !== "paragraph_open") return false;
  let depth = 0;
  for (const child of tokens[1]!.children ?? []) {
    if (child.type === "image" && depth !== 0) return false;
    depth += child.nesting;
  }
  return true;
}

function splitParagraphImages(block: AssistantMessageItem): AssistantMessageItem[] {
  const parts: AssistantMessageItem[] = [];
  const state = new parser.inline.State(block.text, parser, {}, []);
  let cursor = 0;
  function append(text: string, markdownKind: "prose" | "block", offset: number) {
    if (!text.trim()) return;
    parts.push({ ...block, text: text.trim(), markdownKind, id: `${block.id}:part:${offset}` });
  }
  while (state.pos < state.posMax) {
    const start = state.pos;
    parser.inline.skipToken(state);
    const candidate = block.text.slice(start, state.pos);
    if (!candidate.includes("![")) continue;
    const inline = parser.parseInline(candidate, {})[0];
    if (!inline?.children?.some((child) => child.type === "image")) continue;
    append(block.text.slice(cursor, start), "prose", cursor);
    append(candidate, "block", start);
    cursor = state.pos;
  }
  append(block.text.slice(cursor), "prose", cursor);
  if (parts.length === 1) parts[0] = { ...parts[0]!, id: block.id };
  return parts;
}

interface GroupedRuns {
  rows: AssistantMessageItem[];
  starts: number[];
  ends: number[];
}
const runsByBlocks = new WeakMap<readonly AssistantMessageItem[], GroupedRuns>();

/** Rebuild only the run containing the changed source block; completed runs retain identity. */
export function groupMarkdownProse(
  blocks: readonly AssistantMessageItem[],
  previousBlocks?: readonly AssistantMessageItem[],
): AssistantMessageItem[] {
  const cached = runsByBlocks.get(blocks);
  if (cached) return cached.rows;
  const previous = previousBlocks && runsByBlocks.get(previousBlocks);
  const retained = retainedRunCount(blocks, previousBlocks, previous);
  const start = previous?.starts[retained] ?? 0;
  const rows = previous?.rows.slice(0, retained) ?? [];
  const starts = previous?.starts.slice(0, retained) ?? [];
  const ends = previous?.ends.slice(0, retained) ?? [];
  let parts: AssistantMessageItem[] = [];
  let length = 0;
  let runStart = start;
  let runEnd = start;
  function flush() {
    if (!parts.length) return;
    const first = parts[0]!;
    const texts = parts.map((part) => part.text);
    rows.push({
      ...first,
      text: texts.join("\n\n"),
      markdownProseBlocks: first.markdownKind === "block" ? undefined : texts,
      id: first.markdownKind === "prose" ? first.id.replace(":block:", ":run:") : first.id,
    });
    starts.push(runStart);
    ends.push(runEnd);
    parts = [];
    length = 0;
  }
  for (let index = start; index < blocks.length; index++) {
    for (const part of splitBlock(blocks[index]!)) {
      if (
        parts.length &&
        (part.markdownKind !== "prose" ||
          parts[0]!.markdownKind !== "prose" ||
          length + 2 + part.text.length > ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT)
      )
        flush();
      if (!parts.length) runStart = index;
      length += (parts.length ? 2 : 0) + part.text.length;
      parts.push(part);
      runEnd = index;
    }
  }
  flush();
  reuseUnchangedRows(blocks, previousBlocks, previous, rows, starts, ends, retained);
  runsByBlocks.set(blocks, { rows, starts, ends });
  return rows;
}

function retainedRunCount(
  blocks: readonly AssistantMessageItem[],
  previousBlocks: readonly AssistantMessageItem[] | undefined,
  previous: GroupedRuns | undefined,
): number {
  if (!previous || !previousBlocks) return 0;
  let shared = 0;
  while (shared < blocks.length && blocks[shared] === previousBlocks[shared]) shared++;
  let retained = 0;
  // Revisit the boundary run because newly appended prose can join it.
  while (retained + 1 < previous.rows.length && previous.starts[retained + 1]! < shared) retained++;
  // Several image parts can originate from one source block. Rebuild them together.
  while (retained > 0 && previous.ends[retained - 1]! >= previous.starts[retained]!) retained--;
  return retained;
}
function reuseUnchangedRows(
  blocks: readonly AssistantMessageItem[],
  previousBlocks: readonly AssistantMessageItem[] | undefined,
  previous: GroupedRuns | undefined,
  rows: AssistantMessageItem[],
  starts: number[],
  ends: number[],
  retained: number,
) {
  if (!previous || !previousBlocks) return;
  for (let index = retained; index < rows.length; index++) {
    const old = previous.rows[index];
    const row = rows[index]!;
    if (old?.id !== row.id || old.text !== row.text) continue;
    const end = ends[index]!;
    let identical = true;
    for (let block = starts[index]!; block <= end; block++)
      if (blocks[block] !== previousBlocks[block]) {
        identical = false;
        break;
      }
    if (!identical) continue;
    rows[index] = old;
  }
}
