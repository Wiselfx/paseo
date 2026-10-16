import { isLocalImagePath, trimTrailingPunctuation } from "@/components/markdown/media-links";

/**
 * Bare local paths as links/images, assistant surfaces.
 *
 * The old engine did this as a markdown-it core rule. The new engine
 * prepares source with mdast, so this runs earlier as a source string
 * pre-pass in useMarkdownSource: `/abs` and `~/` paths become image
 * markdown (image extensions, daemon-resolved downstream) or `file://`
 * links otherwise. Code spans, fences, and authored links stay untouched.
 * Streaming-safe: a partial path linkifies and extends on the next pass.
 */

const PROTECTED_RE =
  /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|!\[[^\][\n]*\]\([^()\n]*\)|\[[^\][\n]*\]\([^()\n]*\)|<\S+?>)/g;
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

function linkifyInProse(text: string): string {
  PATH_SCAN_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of text.matchAll(PATH_SCAN_RE)) {
    const index = m.index ?? 0;
    if (!isPathStart(text, index)) continue;
    const raw = trimTrailingPunctuation(m[1]);
    if (raw.length < 2) continue;
    out += text.slice(last, index);
    out += isLocalImagePath(raw) ? `![${basename(raw)}](${raw})` : `[${raw}](file://${raw})`;
    last = index + raw.length;
  }
  return out + text.slice(last);
}

export function linkifyLocalPaths(source: string): string {
  PROTECTED_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of source.matchAll(PROTECTED_RE)) {
    const index = m.index ?? 0;
    out += linkifyInProse(source.slice(last, index));
    out += m[0];
    last = index + m[0].length;
  }
  return out + linkifyInProse(source.slice(last));
}
