import { isRemoteImageUrl, trimTrailingPunctuation } from "@/components/markdown/media-links";

/**
 * Bare remote image URLs as image markdown, assistant surfaces.
 *
 * The old engine converted linkify links to image tokens at parse time.
 * The new engine prepares source with mdast, so this runs earlier as a
 * source string pre-pass in useMarkdownSource: bare `https://…png` lines
 * become `![](…)` and flow through the stock image pipeline. Authored
 * `[text](url)` links, code, and non-image URLs stay untouched.
 */

const PROTECTED_RE = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|!\[[^\][\n]*\]\([^()\n]*\)|\[[^\][\n]*\]\([^()\n]*\)|<\S+?>)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>)\]]+/g;

function hoistInProse(text: string): string {
  BARE_URL_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of text.matchAll(BARE_URL_RE)) {
    const index = m.index ?? 0;
    const url = trimTrailingPunctuation(m[0]);
    if (!isRemoteImageUrl(url)) continue;
    out += text.slice(last, index);
    out += `![](${url})`;
    last = index + url.length;
  }
  return out + text.slice(last);
}

export function hoistBareRemoteImages(source: string): string {
  PROTECTED_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of source.matchAll(PROTECTED_RE)) {
    const index = m.index ?? 0;
    out += hoistInProse(source.slice(last, index));
    out += m[0];
    last = index + m[0].length;
  }
  return out + hoistInProse(source.slice(last));
}
