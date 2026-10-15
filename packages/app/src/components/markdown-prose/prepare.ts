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

interface PreparedBlock {
  text: string;
  cuts: number[];
  offsets: number[];
}

/** One cache per mounted prose row. Reveal reuses the prepared prefix and parses only its open tail. */
export function createProsePreparer(canResolveCode: (text: string) => boolean) {
  let cache = new Map<string, { source: string; prepared: PreparedBlock }>();
  return (blocks: readonly string[], streaming: boolean, visibleLength: number): string => {
    const retained = new Map<string, { source: string; prepared: PreparedBlock }>();
    const result: string[] = [];
    let remaining = visibleLength;
    for (const [index, block] of blocks.entries()) {
      if (remaining < 0) break;
      const live = streaming && (index === blocks.length - 1 || remaining < block.length);
      const key = `${live}:${block}`;
      const source = block.slice(0, remaining);
      const cached = cache.get(key);
      const entry =
        cached && cached.source.length >= source.length
          ? cached
          : { source, prepared: compileBlock(source, canResolveCode, live) };
      retained.set(key, entry);
      result.push(
        revealBlock(entry.source, entry.prepared, source.length, canResolveCode, streaming),
      );
      remaining -= block.length + 2;
    }
    cache = retained;
    return result.join("\n\n");
  };
}
function revealBlock(
  source: string,
  prepared: PreparedBlock,
  length: number,
  canResolveCode: (text: string) => boolean,
  streaming: boolean,
): string {
  if (length >= source.length) return prepared.text;
  // Checkpoints are outside inline containers, at whitespace in a plain paragraph.
  let low = 0;
  let high = prepared.cuts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (prepared.cuts[mid]! <= length) low = mid + 1;
    else high = mid;
  }
  const index = low - 1;
  if (index < 0) return prepareBlock(source.slice(0, length), canResolveCode, streaming);
  const cut = prepared.cuts[index]!;
  // Retain paragraph context if the tail happens to begin with a block marker.
  const tail = prepareBlock(`x ${source.slice(cut, length)}`, canResolveCode, streaming).slice(2);
  return prepared.text.slice(0, prepared.offsets[index]) + tail;
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
  protectedRanges: Uint8Array;
  referenceRanges: Uint8Array;
  task: boolean;
  edits: Edit[];
}
function insert(context: InlinePreparation, at: number, text: string) {
  context.edits.push({ start: at, end: at, text });
}
function contains(ranges: Uint8Array, start: number, end = start + 1): boolean {
  for (let i = start; i < end; i++) if (ranges[i]) return true;
  return false;
}
function protect(ranges: Uint8Array, span: { start: number; end: number }) {
  ranges.fill(1, span.start, span.end);
}
function codeUrl(context: InlinePreparation, content: string): string | null {
  if (context.canResolveCode(content)) return INLINE_CODE_SCHEME + encodeURIComponent(content);
  const matches = context.parser.linkify.match(content);
  const match = matches?.length === 1 ? matches[0] : undefined;
  return match?.index === 0 && match.lastIndex === content.length ? match.url : null;
}
function prepareCode(context: InlinePreparation, span: InlineSpan, raw: string, code: Token) {
  protect(context.protectedRanges, span);
  protect(context.referenceRanges, span);
  const complete = raw.length >= code.markup.length * 2 && raw.endsWith(code.markup);
  const closing = complete ? "" : code.markup.slice(raw.match(/`+$/)?.[0].length ?? 0);
  const url = codeUrl(context, code.content);
  if (!span.insideLink && url) {
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
  protect(context.referenceRanges, span);
}
function preserveLinkScope(context: InlinePreparation, span: InlineSpan, raw: string, link: Token) {
  const end = labelEnd(context, raw, 0);
  protect(context.protectedRanges, { start: span.start + end, end: span.end });
  protect(context.referenceRanges, span);
  if (raw[end + 1] === "(") {
    decodeDestination(context, span, raw, end, link.attrGet("href")!);
    return;
  }
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
function decodeDestination(
  context: InlinePreparation,
  span: InlineSpan,
  raw: string,
  label: number,
  href: string,
) {
  if (raw[label + 1] !== "(") return;
  const start = label + 2 + (raw.slice(label + 2).match(/^\s*/)?.[0].length ?? 0);
  const destination = context.parser.helpers.parseLinkDestination(raw, start, raw.length);
  if (!destination.ok) return;
  const original = raw.slice(start, destination.pos);
  if (context.parser.utils.unescapeAll(original) === original) return;
  context.edits.push({
    start: span.start + start,
    end: span.start + destination.pos,
    text: `<${href}>`,
  });
}
function entityWhitespace(
  context: InlinePreparation,
  span: InlineSpan,
  decoded: string,
): string | null {
  if (!/^[\t\n\r\f\v ]+$/.test(decoded)) return null;
  if (!/[\r\n]/.test(decoded))
    return decoded.replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0").replace(/[\f\v ]/g, "\u00a0");
  // A text-token newline must not start a block. Backslash breaks also work at
  // the beginning of a paragraph, where two-space breaks would be trimmed away.
  const following = context.source.slice(span.end);
  const marker =
    /^[ \t]*(?:[-=]+[ \t]*(?:\n|$)|(?:[-*_][ \t]*){3,}(?:\n|$)|#{1,6}(?:[ \t]|$)|>|\d{1,9}[.)][ \t]|[-+*][ \t]|`{3,}|~{3,}|<)/.exec(
      following,
    );
  if (marker) {
    const punctuation = marker[0].search(/[^ \t\d]/);
    insert(context, span.end + punctuation, "\\");
  }
  return decoded.replace(/\r\n?|\n/g, "\\\n");
}
function decodeEntity(context: InlinePreparation, span: InlineSpan, raw: string) {
  // MD4C 1.1.1 drops entity nodes. Decode once without introducing Markdown syntax.
  const decoded = context.parser.utils.unescapeAll(raw);
  let text =
    entityWhitespace(context, span, decoded) ??
    decoded.replace(/([\\`*{}[\]()#+.!_<>|~-])/g, "\\$1");
  if (decoded.endsWith("&") && /^(?:#\w+|\w+);/.test(context.source.slice(span.end)))
    text = text.slice(0, -1) + "\\&";
  context.edits.push({ start: span.start, end: span.end, text });
  protect(context.protectedRanges, span);
}
function prepareSpan(context: InlinePreparation, span: InlineSpan) {
  const raw = context.source.slice(span.start, span.end);
  const link = span.tokens.find((child) => child.type === "link_open");
  const image = span.tokens.find((child) => child.type === "image");
  const code = span.tokens.find((child) => child.type === "code_inline");
  if (image) {
    decodeDestination(context, span, raw, labelEnd(context, raw, 1), image.attrGet("src")!);
    protect(context.protectedRanges, span);
    protect(context.referenceRanges, span);
  } else if (raw.startsWith("\\") || (link && raw.startsWith("<"))) {
    protect(context.protectedRanges, span);
    protect(context.referenceRanges, span);
  } else if (/^&(?:#\w+|\w+);$/.test(raw)) {
    decodeEntity(context, span, raw);
  } else if (link && raw.startsWith("[")) {
    preserveLinkScope(context, span, raw, link);
  } else if (code && raw.startsWith("`")) {
    prepareCode(context, span, raw, code);
  } else if (
    context.streaming &&
    !contains(context.referenceRanges, span.start) &&
    (raw.startsWith("[") || raw.startsWith("!["))
  ) {
    prepareUnfinishedLink(context, span, raw);
  } else if (
    context.streaming &&
    span.tokens.length === 0 &&
    /^(?:\*{1,3}|_{1,3}|~{1,2}|`+)$/.test(raw)
  ) {
    context.edits.push({ start: span.start, end: span.end, text: "" });
    protect(context.protectedRanges, span);
  }
}
function preserveUnresolvedReferences(context: InlinePreparation) {
  // Protect every unresolved label, regardless of CommonMark's case/whitespace
  // normalization. Escapes inside a label do not make its opening bracket safe.
  const openings: number[] = [];
  for (let index = 0; index < context.source.length; index++) {
    if (contains(context.referenceRanges, index)) continue;
    if (context.source[index] === "[") openings.push(index);
    if (context.source[index] !== "]") continue;
    const start = openings.pop();
    if (start === undefined) continue;
    const label = context.source.slice(start, index + 1);
    if (/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/.test(label)) continue;
    if (
      context.task &&
      start === 0 &&
      /^\[[ xX]\]$/.test(label) &&
      /\s/.test(context.source[index + 1] ?? "")
    )
      continue;
    insert(context, start, "\\");
  }
}
function prepareText(context: InlinePreparation) {
  for (let i = 0; i < context.source.length; i++) {
    if (contains(context.protectedRanges, i)) continue;
    const char = context.source[i]!;
    if (
      char === "|" ||
      (char === "~" && context.source[i - 1] !== "~" && context.source[i + 1] !== "~")
    )
      insert(context, i, "\\");
    if (context.uppercase && char.toUpperCase() !== char)
      context.edits.push({ start: i, end: i + 1, text: char.toUpperCase() });
  }
}
/** Linkify sees decoded inline text; keep its offsets tied to the original Markdown. */
function linkifySource(context: InlinePreparation) {
  const positions: number[] = [];
  let decoded = "";
  let cursor = 0;
  const escapes = /\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|&[a-z#][a-z0-9]{1,31};/gi;
  function appendPlain(end: number) {
    while (cursor < end) {
      positions.push(cursor);
      decoded += context.source[cursor++];
    }
  }
  for (const match of context.source.matchAll(escapes)) {
    appendPlain(match.index);
    const text = context.parser.utils.unescapeAll(match[0]);
    for (let index = 0; index < text.length; index++) positions.push(cursor);
    decoded += text;
    cursor += match[0].length;
  }
  appendPlain(context.source.length);
  positions.push(cursor);
  return { decoded, positions };
}
function prepareLinkifiedLinks(context: InlinePreparation) {
  const links =
    context.token.children?.filter(
      (child) => child.type === "link_open" && child.markup === "linkify",
    ) ?? [];
  if (!links.length) return;
  const destinations = new Map(links.map((link) => [link.attrGet("href"), link]));
  const { decoded, positions } = linkifySource(context);
  let cursor = 0;
  for (const text of context.trace.linkifyTexts) {
    if (!text) continue;
    let offset = decoded.indexOf(text, cursor);
    while (
      offset >= 0 &&
      contains(context.referenceRanges, positions[offset]!, positions[offset + text.length]!)
    )
      offset = decoded.indexOf(text, offset + 1);
    if (offset < 0) continue;
    cursor = offset + text.length;
    for (const match of context.parser.linkify.match(text) ?? []) {
      const link = destinations.get(context.parser.normalizeLink(match.url));
      if (!link) continue;
      wrapLinkifiedMatch(
        context,
        positions[offset + match.index]!,
        positions[offset + match.lastIndex]!,
        link.attrGet("href")!,
        match.text,
      );
    }
  }
}
function wrapLinkifiedMatch(
  context: InlinePreparation,
  start: number,
  end: number,
  destination: string,
  text: string,
) {
  const payload: AssistantFileLinkSource = {
    href: destination,
    text,
    markup: "linkify",
    sourceInfo: "auto",
  };
  const href = context.canResolveCode(text)
    ? FILE_LINK_SCHEME + encodeURIComponent(JSON.stringify(payload))
    : destination;
  protect(context.referenceRanges, { start, end });
  insert(context, start, "[");
  insert(context, end, `](<${href}>)`);
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
  return compileBlock(text, canResolveCode, streaming).text;
}
function compileBlock(
  text: string,
  canResolveCode: (text: string) => boolean,
  streaming: boolean,
): PreparedBlock {
  const normalized = !/[\r\t]/.test(text);
  text = text.replace(/\r\n?/g, "\n").replaceAll("\0", "\ufffd");
  text = text.replace(/^[ \t>]*/gm, (prefix) => {
    let expanded = "";
    for (const char of prefix)
      expanded += char === "\t" ? " ".repeat(4 - (expanded.length % 4)) : char;
    return expanded;
  });
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
  let cuts: number[] = [];
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "inline" || !token.map) continue;
    const trace = traces.get(token)!;
    if (
      normalized &&
      text === token.content &&
      tokens.length === 3 &&
      tokens[0]!.type === "paragraph_open"
    )
      cuts = paragraphCuts(token.content, trace);
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
      protectedRanges: new Uint8Array(token.content.length),
      referenceRanges: new Uint8Array(token.content.length),
      task: tokens[index - 2]?.type === "list_item_open",
      edits: [],
    };
    // Link/code ownership is established before either references or provisional
    // brackets can be rewritten. Linkify uses the parser's emphasis-split text tokens.
    for (const span of trace.spans)
      if (span.tokens.some((child) => ["link_open", "code_inline", "image"].includes(child.type)))
        protect(context.referenceRanges, span);
    prepareLinkifiedLinks(context);
    for (const span of trace.spans) prepareSpan(context, span);
    if (trace.trim) {
      const tail = { start: token.content.length - trace.trim, end: token.content.length };
      context.edits.push({ ...tail, text: "" });
      protect(context.protectedRanges, tail);
    }
    preserveUnresolvedReferences(context);
    prepareText(context);
    if (trace.suffix) insert(context, token.content.length, trace.suffix);
    const positions = sourcePositions(token, heading, lines, lineOffsets);
    for (const edit of context.edits)
      edits.push({ ...edit, start: positions[edit.start]!, end: positions[edit.end]! });
  }
  const rendered = applyEdits(text, edits);
  return { text: rendered, cuts, offsets: preparedOffsets(cuts, edits) };
}
function preparedOffsets(cuts: number[], edits: Edit[]): number[] {
  const offsets: number[] = [];
  let editIndex = 0;
  let delta = 0;
  for (const cut of cuts) {
    while (
      editIndex < edits.length &&
      edits[editIndex]!.end <= cut &&
      edits[editIndex]!.start < cut
    ) {
      const edit = edits[editIndex++]!;
      delta += edit.text.length - (edit.end - edit.start);
    }
    offsets.push(cut + delta);
  }
  return offsets;
}
function paragraphCuts(source: string, trace: InlineTrace): number[] {
  const cuts: number[] = [];
  let depth = 0;
  // A bracket can remain a provisional reference/link even after its closing bracket.
  // Keep that suffix together until the block settles.
  const bracket = source.indexOf("[");
  const stableEnd = bracket < 0 ? source.length : bracket;
  for (const span of trace.spans) {
    if (span.insideLink) continue;
    if (depth === 0 && span.tokens.length === 0 && source[span.start] !== "&") {
      for (let i = span.start; i < span.end; i++)
        if (i < stableEnd && source[i] === " ") cuts.push(i + 1);
    }
    for (const token of span.tokens) depth += token.nesting;
  }
  return cuts;
}
