import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";

/**
 * Raw inline <svg> markup as images, assistant surfaces only.
 *
 * The assistant parser disables raw HTML, so `<svg>...</svg>` arrives as
 * text and markdown-it escapes it. This core rule converts closed svg
 * blocks into image tokens (data-URI source, same encoding as
 * svgTokensToInlineImage in html-ish.ts) so they render through the
 * normal image rule with lightbox, size cap, and daemon handling.
 *
 * Runs BEFORE linkify core: linkify would linkify the xmlns URL inside
 * svg attributes and split the run. Unclosed svg (streaming) and code
 * spans stay text. Size cap mirrors MAX_INLINE_SVG_CHARS.
 */

const RAW_SVG_RE = /<svg(?:\s[^<>]*)?>[\s\S]*?<\/svg\s*>/gi;
const RAW_SVG_MAX_CHARS = 100 * 1024;

function svgImageToken(state: StateCore, raw: string): Token {
  const token = new state.Token("image", "img", 0);
  token.attrs = [
    ["src", `data:image/svg+xml,${encodeURIComponent(raw)}`],
    ["alt", ""],
  ];
  const alt = new state.Token("text", "", 0);
  alt.content = "";
  token.children = [alt];
  token.content = "";
  token.markup = "raw-svg";
  return token;
}

function textToken(state: StateCore, content: string): Token {
  const token = new state.Token("text", "", 0);
  token.content = content;
  return token;
}

function convertRun(state: StateCore, run: Token[]): Token[] | null {
  const combined = run
    .map((token) =>
      token.type === "softbreak" || token.type === "hardbreak" ? "\n" : token.content,
    )
    .join("");
  RAW_SVG_RE.lastIndex = 0;
  let last = 0;
  let matched = false;
  const out: Token[] = [];
  for (const m of combined.matchAll(RAW_SVG_RE)) {
    const index = m.index ?? 0;
    const raw = m[0];
    if (raw.length > RAW_SVG_MAX_CHARS) continue;
    matched = true;
    if (index > last) out.push(textToken(state, combined.slice(last, index)));
    out.push(svgImageToken(state, raw));
    last = index + raw.length;
  }
  if (!matched) return null;
  if (last < combined.length) out.push(textToken(state, combined.slice(last)));
  return out;
}

function rawSvgCoreRule(state: StateCore): void {
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    const children = block.children;
    // Scan from the end like linkify core so splicing keeps positions.
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i].type === "link_close") {
        // Skip markdown link contents, mirroring linkify core.
        i--;
        while (i >= 0 && children[i].type !== "link_open") i--;
        continue;
      }
      if (
        children[i].type !== "text" &&
        children[i].type !== "softbreak" &&
        children[i].type !== "hardbreak"
      ) {
        continue;
      }
      // Collect the maximal text/break run ending here: code spans,
      // links, and other tokens break runs, so claimed content is
      // never reprocessed.
      let start = i;
      while (
        start - 1 >= 0 &&
        (children[start - 1].type === "text" ||
          children[start - 1].type === "softbreak" ||
          children[start - 1].type === "hardbreak")
      ) {
        start--;
      }
      const runLength = i - start + 1;
      const converted = convertRun(state, children.slice(start, i + 1));
      if (converted) children.splice(start, runLength, ...converted);
      i = start;
    }
  }
}

export function enableRawSvgImages(parser: MarkdownIt): void {
  parser.core.ruler.before("linkify", "raw-svg", rawSvgCoreRule);
}
