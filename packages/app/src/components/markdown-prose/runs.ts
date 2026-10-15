import { ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT } from "@/components/assistant-message-render-limit";
import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import type Token from "markdown-it/lib/token.mjs";
import type { AssistantMessageItem } from "@/types/stream";

const parser = createAssistantMarkdownParser().set({ html: true });
const partsByBlock = new WeakMap<AssistantMessageItem, AssistantMessageItem[]>();

function splitBlock(block: AssistantMessageItem): AssistantMessageItem[] {
  const cached = partsByBlock.get(block);
  if (cached) return cached;
  // Oversized blocks cannot join capped runs; the existing renderer caps text before parsing.
  if (block.text.length > ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT) {
    return [{ ...block, markdownKind: "block" }];
  }
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
  growing: boolean;
  rows: AssistantMessageItem[];
  starts: number[];
  ends: number[];
}
const runsByBlocks = new WeakMap<readonly AssistantMessageItem[], GroupedRuns>();
const growingRunsByBlocks = new WeakMap<readonly AssistantMessageItem[], GroupedRuns>();

/** Rebuild only the run containing the changed source block; completed runs retain identity. */
export function groupMarkdownProse(
  blocks: readonly AssistantMessageItem[],
  previousBlocks?: readonly AssistantMessageItem[],
  growing = false,
): AssistantMessageItem[] {
  const cache = growing ? growingRunsByBlocks : runsByBlocks;
  const cached = cache.get(blocks);
  if (cached) return cached.rows;
  const previous = previousGroups(previousBlocks);
  const retained = retainedRunCount(blocks, previousBlocks, previous, growing);
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
    const block = blocks[index]!;
    const partsForBlock =
      growing && index === blocks.length - 1
        ? [{ ...block, markdownKind: "block" as const }]
        : splitBlock(block);
    for (const part of partsForBlock) {
      if (parts.length && !canJoinRun(parts[0]!, part, length)) flush();
      if (!parts.length) runStart = index;
      length += (parts.length ? 2 : 0) + part.text.length;
      parts.push(part);
      runEnd = index;
    }
  }
  flush();
  reuseUnchangedRows(blocks, previousBlocks, previous, rows, starts, ends, retained);
  cache.set(blocks, { rows, starts, ends, growing });
  return rows;
}

function retainedRunCount(
  blocks: readonly AssistantMessageItem[],
  previousBlocks: readonly AssistantMessageItem[] | undefined,
  previous: GroupedRuns | undefined,
  growing: boolean,
): number {
  if (!previous || !previousBlocks) return 0;
  let shared = 0;
  while (shared < blocks.length && blocks[shared] === previousBlocks[shared]) shared++;
  if (previous.growing && (!growing || blocks.length !== previousBlocks.length))
    shared = Math.min(shared, previousBlocks.length - 1);
  let retained = 0;
  while (retained < previous.rows.length && previous.ends[retained]! < shared) retained++;
  // Only completed blocks can merge with the preceding run. The live tail is a
  // hard boundary, so appending to it never rebuilds completed prose.
  if (!(growing && shared === blocks.length - 1)) retained = Math.max(0, retained - 1);
  while (retained > 0 && previous.ends[retained - 1]! >= (previous.starts[retained] ?? shared))
    retained--;
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
    if (old?.id !== row.id || old.text !== row.text || old.markdownKind !== row.markdownKind)
      continue;
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

function canJoinRun(
  first: AssistantMessageItem,
  next: AssistantMessageItem,
  length: number,
): boolean {
  return (
    first.markdownKind === "prose" &&
    next.markdownKind === "prose" &&
    length + 2 + next.text.length <= ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT
  );
}

function previousGroups(
  blocks: readonly AssistantMessageItem[] | undefined,
): GroupedRuns | undefined {
  return blocks && (growingRunsByBlocks.get(blocks) ?? runsByBlocks.get(blocks));
}
