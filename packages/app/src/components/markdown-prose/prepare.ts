import type { AssistantFileLinkSource } from "@/assistant-file-links";
import type Token from "markdown-it/lib/token.mjs";
import { type InlineSpan, type InlineTrace, createSourceParser } from "./source-inline";

const settled = createSourceParser(false);
const provisional = createSourceParser(true);
const INLINE_CODE_SCHEME = "paseo-inline-code:";
const FILE_LINK_SCHEME = "paseo-file-link:";

export function inlineCodeLinkContent(url: string): string | null {
  return url.startsWith(INLINE_CODE_SCHEME)
    ? decodeURIComponent(url.slice(INLINE_CODE_SCHEME.length))
    : null;
}
export function proseLinkSource(url: string): AssistantFileLinkSource | null {
  try {
    const code = inlineCodeLinkContent(url);
    if (code !== null) return { href: code, text: code, sourceType: "inline-code" };
    if (!url.startsWith(FILE_LINK_SCHEME)) return null;
    const source: unknown = JSON.parse(decodeURIComponent(url.slice(FILE_LINK_SCHEME.length)));
    if (
      !source ||
      typeof source !== "object" ||
      !("href" in source) ||
      !("text" in source) ||
      typeof source.href !== "string" ||
      typeof source.text !== "string"
    )
      return null;
    return { href: source.href, text: source.text, markup: "linkify", sourceInfo: "auto" };
  } catch {
    return null;
  }
}

export function handleProseLinkPress(
  url: string,
  open: (source: AssistantFileLinkSource) => void,
  onLinkPress: (url: string) => unknown,
): void {
  const source = proseLinkSource(url);
  if (source) open(source);
  else onLinkPress(url);
}
interface Edit {
  start: number;
  end: number;
  text: string;
}
interface Range {
  start: number;
  end: number;
}
function applyEdits(source: string, edits: Edit[]): string {
  let cursor = 0;
  let result = "";
  for (const edit of edits.sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (edit.start < cursor) continue;
    result += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + source.slice(cursor);
}

/** Source blocks are presentation's canonical inputs, never reconstructed from a joined run. */
export function prepareProse(
  blocks: readonly string[],
  canResolveCode: (text: string) => boolean,
  streaming = false,
  visibleLength = Infinity,
): string {
  const visible: string[] = [];
  let remaining = visibleLength;
  for (const block of blocks) {
    if (remaining < 0) break;
    visible.push(block.slice(0, remaining));
    remaining -= block.length + 2;
  }
  return visible
    .map((block, index) =>
      prepareBlock(block, canResolveCode, streaming && index === visible.length - 1),
    )
    .join("\n\n");
}

interface InlinePreparation {
  source: string;
  token: Token;
  trace: InlineTrace;
  parser: typeof settled.parser;
  env: object;
  streaming: boolean;
  uppercase: boolean;
  canResolveCode: (text: string) => boolean;
  protectedRanges: Range[];
  referenceRanges: Range[];
  edits: Edit[];
}
function insert(context: InlinePreparation, at: number, text: string) {
  context.edits.push({ start: at, end: at, text });
}
function contains(ranges: Range[], start: number, end = start + 1): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}
function codeUrl(context: InlinePreparation, content: string): string | null {
  if (context.canResolveCode(content)) return INLINE_CODE_SCHEME + encodeURIComponent(content);
  const matches = context.parser.linkify.match(content);
  const match = matches?.length === 1 ? matches[0] : undefined;
  return match?.index === 0 && match.lastIndex === content.length ? match.url : null;
}
function prepareCode(context: InlinePreparation, span: InlineSpan, raw: string, code: Token) {
  context.protectedRanges.push(span);
  context.referenceRanges.push(span);
  const insideLink = context.trace.spans.some(
    (parent) =>
      parent.start < span.start &&
      parent.end >= span.end &&
      parent.tokens.some((child) => child.type === "link_open"),
  );
  const complete = raw.length >= code.markup.length * 2 && raw.endsWith(code.markup);
  const closing = complete ? "" : code.markup.slice(raw.match(/`+$/)?.[0].length ?? 0);
  const url = codeUrl(context, code.content);
  if (!insideLink && url) {
    insert(context, span.start, "[");
    insert(context, span.end, `${closing}](<${url}>)`);
  } else if (closing) insert(context, span.end, closing);
}
function labelEnd(context: InlinePreparation, source: string, start: number): number {
  const state = new context.parser.inline.State(source, context.parser, context.env, []);
  return context.parser.helpers.parseLinkLabel(state, start, false);
}
function prepareUnfinishedLink(context: InlinePreparation, span: InlineSpan, raw: string) {
  const start = raw.startsWith("![") ? 1 : 0;
  const end = labelEnd(context, raw, start);
  context.edits.push({ start: span.start, end: span.start + start + 1, text: "" });
  if (start === 1) context.edits.push({ start: span.start + 2, end: span.end, text: "" });
  else if (end !== -1) context.edits.push({ start: span.start + end, end: span.end, text: "" });
  context.referenceRanges.push(span);
}
function preserveLinkScope(context: InlinePreparation, span: InlineSpan, raw: string, link: Token) {
  const end = labelEnd(context, raw, 0);
  context.protectedRanges.push({ start: span.start + end, end: span.end });
  context.referenceRanges.push(span);
  if (raw[end + 1] === "(") return;
  // The native parser sees the joined run; bind reference destinations to their source block.
  const title = link.attrGet("title");
  const quotedTitle =
    title === null ? "" : ` "${title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  context.edits.push({
    start: span.start + end,
    end: span.end,
    text: `](<${link.attrGet("href")}>${quotedTitle})`,
  });
}
function prepareSpan(context: InlinePreparation, span: InlineSpan) {
  const raw = context.source.slice(span.start, span.end);
  const link = span.tokens.find((child) => child.type === "link_open");
  const image = span.tokens.find((child) => child.type === "image");
  const code = span.tokens.find((child) => child.type === "code_inline");
  if (
    image ||
    raw.startsWith("\\") ||
    /^&(?:#\w+|\w+);$/.test(raw) ||
    (link && raw.startsWith("<"))
  ) {
    context.protectedRanges.push(span);
    context.referenceRanges.push(span);
  } else if (link && raw.startsWith("[")) {
    preserveLinkScope(context, span, raw, link);
  } else if (code && raw.startsWith("`")) {
    prepareCode(context, span, raw, code);
  } else if (context.streaming && (raw.startsWith("[") || raw.startsWith("!["))) {
    prepareUnfinishedLink(context, span, raw);
  } else if (
    context.streaming &&
    span.tokens.length === 0 &&
    /^(?:\*{1,3}|_{1,3}|~{1,2}|`+)$/.test(raw)
  ) {
    context.edits.push({ start: span.start, end: span.end, text: "" });
  }
}
function preserveUnresolvedReferences(context: InlinePreparation) {
  // Unresolved labels stay literal even when another source block defines them.
  for (const match of context.source.matchAll(/!?\[[^\]\n]+\](?:\[[^\]\n]*\])?/g)) {
    if (contains(context.referenceRanges, match.index, match.index + match[0].length)) continue;
    if (/^\[(?:[ xX]|!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION))\]$/.test(match[0])) continue;
    for (let i = 0; i < match[0].length; i++)
      if (match[0][i] === "[") insert(context, match.index + i, "\\");
  }
}
function prepareText(context: InlinePreparation) {
  for (let i = 0; i < context.source.length; i++) {
    if (contains(context.protectedRanges, i)) continue;
    const char = context.source[i]!;
    if (char === "|") insert(context, i, "\\");
    if (context.uppercase && char.toUpperCase() !== char)
      context.edits.push({ start: i, end: i + 1, text: char.toUpperCase() });
  }
}
function prepareLinkifiedFiles(context: InlinePreparation) {
  for (const match of context.parser.linkify.match(context.source) ?? []) {
    if (
      contains(context.protectedRanges, match.index, match.lastIndex) ||
      contains(context.referenceRanges, match.index, match.lastIndex) ||
      !context.canResolveCode(match.text)
    )
      continue;
    const linkified = context.token.children?.some(
      (child) =>
        child.type === "link_open" &&
        child.markup === "linkify" &&
        child.attrGet("href") === match.url,
    );
    if (!linkified) continue;
    const payload: AssistantFileLinkSource = {
      href: match.url,
      text: match.text,
      markup: "linkify",
      sourceInfo: "auto",
    };
    insert(context, match.index, "[");
    insert(
      context,
      match.lastIndex,
      `](<${FILE_LINK_SCHEME}${encodeURIComponent(JSON.stringify(payload))}>)`,
    );
  }
}
function sourcePositions(
  token: Token,
  heading: Token | undefined,
  lines: string[],
  lineOffsets: number[],
): number[] {
  const positions: number[] = [];
  for (const [index, content] of token.content.split("\n").entries()) {
    const row = token.map![0] + index;
    const rawLine = lines[row]!;
    let headingPrefix = 0;
    if (heading?.type === "heading_open" && heading.markup.startsWith("#"))
      headingPrefix = rawLine.match(/^(?:\s*>\s*)*\s*#{1,6}\s+/)?.[0].length ?? 0;
    const column = rawLine.indexOf(content, headingPrefix);
    const start = lineOffsets[row]! + Math.max(0, column);
    for (let i = 0; i <= content.length; i++) positions.push(start + i);
  }
  return positions;
}
function prepareBlock(
  text: string,
  canResolveCode: (text: string) => boolean,
  streaming: boolean,
): string {
  const { parser, traces } = streaming ? provisional : settled;
  const env = {};
  const tokens = parser.parse(text, env);
  const lines = text.split("\n");
  const lineOffsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1;
  }
  const edits: Edit[] = [];
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "inline" || !token.map) continue;
    const trace = traces.get(token)!;
    const heading = tokens[index - 1];
    const context: InlinePreparation = {
      source: token.content,
      token,
      trace,
      parser,
      env,
      streaming,
      uppercase: heading?.type === "heading_open" && heading.tag === "h6",
      canResolveCode,
      protectedRanges: [],
      referenceRanges: [],
      edits: [],
    };
    for (const span of trace.spans) prepareSpan(context, span);
    preserveUnresolvedReferences(context);
    prepareText(context);
    prepareLinkifiedFiles(context);
    if (trace.trim)
      context.edits.push({
        start: token.content.length - trace.trim,
        end: token.content.length,
        text: "",
      });
    if (trace.suffix) insert(context, token.content.length, trace.suffix);
    const positions = sourcePositions(token, heading, lines, lineOffsets);
    for (const edit of context.edits)
      edits.push({ ...edit, start: positions[edit.start]!, end: positions[edit.end]! });
  }
  return applyEdits(text, edits);
}
