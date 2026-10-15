import { ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT } from "@/components/assistant-message-render-limit";
import MarkdownIt from "markdown-it";
import type { AssistantMessageItem } from "@/types/stream";

const parser = new MarkdownIt({ html: true });
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
  if (
    preserved ||
    (hasImage &&
      (isQuote ||
        environment.references ||
        tokens.some((token) => token.type === "list_item_open")))
  ) {
    parts = [{ ...block, markdownKind: "block" }];
  } else if (hasImage) {
    parts = splitParagraphImages(block);
  } else {
    parts = [{ ...block, markdownKind: isQuote ? "quote" : "prose" }];
  }
  partsByBlock.set(block, parts);
  return parts;
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

/** Native selection belongs to a text view, so adjacent prose shares one display row. */
export function groupMarkdownProse(blocks: AssistantMessageItem[]): AssistantMessageItem[] {
  const rows: AssistantMessageItem[] = [];
  for (const block of blocks.flatMap(splitBlock)) {
    const previous = rows.at(-1);
    if (
      block.markdownKind === "prose" &&
      previous?.markdownKind === "prose" &&
      previous.text.length + 2 + block.text.length <= ASSISTANT_MESSAGE_RENDER_CHARACTER_LIMIT
    ) {
      previous.text += `\n\n${block.text}`;
      continue;
    }
    rows.push({
      ...block,
      id: block.markdownKind === "prose" ? block.id.replace(":block:", ":run:") : block.id,
    });
  }
  return rows;
}
