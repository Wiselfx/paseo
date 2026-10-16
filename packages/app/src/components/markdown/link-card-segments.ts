import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";
import { isRemoteImageUrl } from "./media-links";
import { youtubeIdForUrl } from "./fence/youtube/urls";

export interface CardSegment {
  kind: "markdown" | "card";
  id: string;
  source: string;
}

const BARE_URL_RE = /^https?:\S+$/i;

/**
 * Standalone bare links as cards, beside library segments. A paragraph that
 * is one bare URL (no images, no YouTube, no list/heading parent) becomes a
 * favicon card; embedded and authored links stay links. Bare image URLs stay
 * images (upstream image pipeline owns them now).
 */
export function splitLinkCards(markdown: string): CardSegment[] {
  if (!/https?:/i.test(markdown)) return [{ kind: "markdown", id: "0", source: markdown }];
  const segments: CardSegment[] = [];
  let cursor = 0;
  function visit(node: RootContent, inListOrHeading: boolean): void {
    if (node.type === "paragraph" && node.position && !inListOrHeading) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      // Pure-text paragraphs only: authored/embedded links stay links.
      // Soft breaks do not split paragraphs, so walk line by line.
      if (node.children.every((c) => c.type === "text")) {
        let offset = start;
        for (const line of markdown.slice(start, end).split("\n")) {
          const lineEnd = offset + line.length;
          const t = line.trim();
          if (
            BARE_URL_RE.test(t) &&
            !isRemoteImageUrl(t) &&
            !youtubeIdForUrl(t)
          ) {
            if (offset > cursor)
              segments.push({ kind: "markdown", id: String(segments.length), source: markdown.slice(cursor, offset) });
            segments.push({ kind: "card", id: String(segments.length), source: t });
            cursor = lineEnd;
          }
          offset = lineEnd + 1;
        }
        return;
      }
    }
    if ("children" in node) {
      const nested = inListOrHeading || node.type === "listItem" || node.type === "heading";
      node.children.forEach((c) => visit(c, nested));
    }
  }
  const tree = fromMarkdown(markdown);
  tree.children.forEach((c) => visit(c, false));
  if (cursor < markdown.length || segments.length === 0)
    segments.push({ kind: "markdown", id: String(segments.length), source: markdown.slice(cursor) });
  return segments;
}
