import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";
import { youtubeIdForUrl } from "./urls";

export interface MediaSegment {
  kind: "markdown" | "youtube";
  id: string;
  source: string;
}

/** True when the whole line is one YouTube URL or bare ID (never a substring). */
function isStandaloneYouTubeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return youtubeIdForUrl(t) !== null && /^https?:\S+$|^[A-Za-z0-9_-]{11}$/.test(t);
}

/**
 * YouTube extraction, mirroring splitMermaidFences: ```youtube fences leave
 * the engine and host the player between library segments. Standalone bare
 * YouTube URLs on their own line (fence or sole-link paragraph included) do
 * the same; embedded links stay links. Streaming-safe: partial IDs never
 * match (see youtubeIdForUrl), so a link flips to a player only once complete.
 */
export function splitYouTubeFences(markdown: string): MediaSegment[] {
  if (!/youtu\.?be/i.test(markdown)) return [{ kind: "markdown", id: "0", source: markdown }];
  const segments: MediaSegment[] = [];
  let cursor = 0;
  function pushMarkdown(source: string) {
    if (source) segments.push({ kind: "markdown", id: String(segments.length), source });
  }
  function pushYouTube(source: string, start: number, end: number) {
    if (start > cursor) pushMarkdown(markdown.slice(cursor, start));
    segments.push({ kind: "youtube", id: String(segments.length), source });
    cursor = end;
  }
  function visit(node: RootContent): void {
    if (node.type === "code" && node.lang?.toLowerCase() === "youtube" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      pushYouTube(node.value, start, end);
    } else if (node.type === "paragraph" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      // Sole authored link: [text](youtube-url) alone in the block.
      if (
        node.children.length === 1 &&
        node.children[0].type === "link" &&
        youtubeIdForUrl(node.children[0].url)
      ) {
        pushYouTube(node.children[0].url, start, end);
        return;
      }
      // Bare URL lines in pure-text paragraphs (no links/images/code).
      if (node.children.every((c) => c.type === "text")) {
        let offset = start;
        for (const line of markdown.slice(start, end).split("\n")) {
          const lineEnd = offset + line.length;
          if (isStandaloneYouTubeLine(line)) pushYouTube(line.trim(), offset, lineEnd);
          offset = lineEnd + 1;
        }
      }
    } else if ("children" in node) node.children.forEach(visit);
  }
  const tree = fromMarkdown(markdown);
  tree.children.forEach(visit);
  if (cursor < markdown.length || segments.length === 0) pushMarkdown(markdown.slice(cursor));
  return segments;
}
