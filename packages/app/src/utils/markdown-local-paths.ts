import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { isLocalImagePath, trimTrailingPunctuation } from "@/components/markdown/media-links";

/**
 * Bare local paths as links/images, assistant surfaces only.
 *
 * markdown-it's linkify only matches schemes, so `/abs/path` and `~/path`
 * render as dead text. This core rule (same shape as linkify core: it
 * post-processes text tokens because the inline `text` rule swallows `/`
 * runs whole) splits them out: image extensions become image tokens
 * (AssistantMarkdownImage resolves file sources through the daemon
 * client), anything else becomes a link token with a file:// href
 * (AssistantMarkdownLink resolves workspace files).
 *
 * Link label contents are skipped like linkify core skips them. Code
 * spans and fenced blocks are non-text tokens, so code needs no
 * scrubbing. Streaming-safe: a partial path linkifies and extends like
 * linkify URLs.
 */

const PATH_SCAN_RE = /(~?\/[^\s`'"[\]()<>]*)/g;

function isPathStart(content: string, index: number): boolean {
  if (index === 0) return true;
  const prev = content[index - 1];
  return (
    prev === " " ||
    prev === "\n" ||
    prev === "\t" ||
    prev === "(" ||
    prev === "[" ||
    prev === '"' ||
    prev === "'"
  );
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function textToken(state: StateCore, content: string): Token {
  const token = new state.Token("text", "", 0);
  token.content = content;
  return token;
}

function pathTokens(state: StateCore, raw: string): Token[] {
  if (isLocalImagePath(raw)) {
    const token = new state.Token("image", "img", 0);
    token.attrs = [
      ["src", raw],
      ["alt", ""],
    ];
    const alt = new state.Token("text", "", 0);
    alt.content = basename(raw);
    token.children = [alt];
    token.content = alt.content;
    token.markup = "local-path";
    return [token];
  }
  const open = new state.Token("link_open", "a", 1);
  open.attrs = [["href", `file://${raw}`]];
  open.markup = "local-path";
  open.info = "auto";
  const text = new state.Token("text", "", 0);
  text.content = raw;
  const close = new state.Token("link_close", "a", -1);
  close.markup = "local-path";
  close.info = "auto";
  return [open, text, close];
}

function splitTextToken(state: StateCore, content: string): Token[] | null {
  PATH_SCAN_RE.lastIndex = 0;
  let last = 0;
  let matched = false;
  const out: Token[] = [];
  for (const m of content.matchAll(PATH_SCAN_RE)) {
    const index = m.index ?? 0;
    if (!isPathStart(content, index)) continue;
    const raw = trimTrailingPunctuation(m[1]);
    if (raw.length < 2) continue;
    matched = true;
    if (index > last) out.push(textToken(state, content.slice(last, index)));
    out.push(...pathTokens(state, raw));
    // Advance past the trimmed path only: punctuation stays as text.
    last = index + raw.length;
  }
  if (!matched) return null;
  if (last < content.length) out.push(textToken(state, content.slice(last)));
  return out;
}

function localPathCoreRule(state: StateCore): void {
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    const children = block.children;
    // Scan from the end like linkify core so splicing keeps positions.
    for (let i = children.length - 1; i >= 0; i--) {
      const token = children[i];
      if (token.type === "link_close") {
        // Skip markdown link contents, mirroring linkify core.
        i--;
        while (i >= 0 && children[i].type !== "link_open") i--;
        continue;
      }
      if (token.type !== "text") continue;
      const frags = splitTextToken(state, token.content);
      if (frags) children.splice(i, 1, ...frags);
    }
  }
}

export function enableLocalPathLinks(parser: MarkdownIt): void {
  parser.core.ruler.after("linkify", "local-path", localPathCoreRule);
}
