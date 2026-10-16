/**
 * Raw inline <svg> markup as data-URI markdown images, assistant surfaces.
 *
 * The old engine converted svg at markdown-it parse time. The new engine
 * prepares source with mdast (prepareMarkdownSource), so this runs earlier
 * as a source string pre-pass in useMarkdownSource: closed svg blocks become
 * `![](data:image/svg+xml,...)` and flow through the stock image pipeline
 * (placeholder, lightbox, pending/ready gating). Scripts never execute in
 * image context, so no sanitizer is needed. Unclosed svg (streaming) and
 * fenced/inline code stay text. Size cap mirrors the old rule.
 */

const RAW_SVG_RE = /<svg(?:\s[^<>]*)?>[\s\S]*?<\/svg\s*>/gi;
const CODE_SPAN_RE = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`)/g;
export const RAW_SVG_MAX_CHARS = 100 * 1024;

function hoistInProse(text: string): string {
  RAW_SVG_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of text.matchAll(RAW_SVG_RE)) {
    const index = m.index ?? 0;
    const raw = m[0];
    if (raw.length > RAW_SVG_MAX_CHARS) continue;
    out += text.slice(last, index);
    out += `![](data:image/svg+xml,${encodeURIComponent(raw)})`;
    last = index + raw.length;
  }
  return out + text.slice(last);
}

export function hoistRawSvgToImages(source: string): string {
  CODE_SPAN_RE.lastIndex = 0;
  let last = 0;
  let out = "";
  for (const m of source.matchAll(CODE_SPAN_RE)) {
    const index = m.index ?? 0;
    out += hoistInProse(source.slice(last, index));
    out += m[0];
    last = index + m[0].length;
  }
  return out + hoistInProse(source.slice(last));
}
