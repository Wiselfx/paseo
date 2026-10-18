import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";
import { findYouTubeUrls, youtubeIdForUrl } from "./urls";

export interface MediaSegment {
  kind: "markdown" | "youtube" | "youtube-inline";
  id: string;
  source: string;
}

/** True when the whole line is one YouTube URL or bare ID (never a substring). */
function isStandaloneYouTubeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return youtubeIdForUrl(t) !== null && /^https?:\S+$|^[A-Za-z0-9_-]{11}$/.test(t);
}

type ParagraphNode = Extract<RootContent, { type: "paragraph" }>;

interface YouTubeCut {
  start: number;
  end: number;
  source: string;
  kind: "youtube" | "youtube-inline";
}

/**
 * Video cuts inside one paragraph. A block that is exactly one link, or one
 * line that is only a URL, keeps the standalone player. A URL riding along in
 * prose becomes the small prose player at its exact source range.
 */
function youtubeCuts(markdown: string, node: ParagraphNode): YouTubeCut[] {
  const start = node.position!.start.offset!;
  const end = node.position!.end.offset!;
  // Sole authored link: [text](youtube-url) alone in the block.
  if (
    node.children.length === 1 &&
    node.children[0].type === "link" &&
    youtubeIdForUrl(node.children[0].url)
  ) {
    return [{ start, end, source: node.children[0].url, kind: "youtube" }];
  }
  const cuts: YouTubeCut[] = [];
  function pushInline(base: number, text: string) {
    for (const hit of findYouTubeUrls(text)) {
      cuts.push({
        start: base + hit.index,
        end: base + hit.index + hit.length,
        source: hit.url,
        kind: "youtube-inline",
      });
    }
  }
  // Pure-text paragraphs (no links/images/code): soft breaks do not split
  // paragraphs, so walk line by line to keep standalone lines standalone.
  if (node.children.every((c) => c.type === "text")) {
    let offset = start;
    for (const line of markdown.slice(start, end).split("\n")) {
      const lineEnd = offset + line.length;
      if (isStandaloneYouTubeLine(line)) {
        cuts.push({ start: offset, end: lineEnd, source: line.trim(), kind: "youtube" });
      } else {
        pushInline(offset, line);
      }
      offset = lineEnd + 1;
    }
    return cuts;
  }
  for (const child of node.children) {
    const position = child.position;
    if (!position) continue;
    const childStart = position.start.offset!;
    if (child.type === "link") {
      if (youtubeIdForUrl(child.url)) {
        cuts.push({
          start: childStart,
          end: position.end.offset!,
          source: child.url,
          kind: "youtube-inline",
        });
      }
      continue;
    }
    if (child.type === "text") {
      pushInline(childStart, markdown.slice(childStart, position.end.offset!));
    }
  }
  return cuts;
}

/**
 * YouTube extraction, mirroring splitMermaidFences: ```youtube fences leave
 * the engine and host the player between library segments. Standalone bare
 * YouTube URLs on their own line (fence or sole-link paragraph included) do
 * the same; a URL inside prose hosts the small player instead. Streaming-safe:
 * partial IDs never match (see youtubeIdForUrl), so a link flips to a player
 * only once complete.
 */
export function splitYouTubeFences(markdown: string): MediaSegment[] {
  if (!/youtu\.?be/i.test(markdown)) return [{ kind: "markdown", id: "0", source: markdown }];
  const segments: MediaSegment[] = [];
  let cursor = 0;
  function pushMarkdown(source: string) {
    if (source) segments.push({ kind: "markdown", id: String(segments.length), source });
  }
  function pushSegment(kind: MediaSegment["kind"], source: string, start: number, end: number) {
    if (start > cursor) pushMarkdown(markdown.slice(cursor, start));
    segments.push({ kind, id: String(segments.length), source });
    cursor = end;
  }
  function visit(node: RootContent): void {
    if (node.type === "code" && node.lang?.toLowerCase() === "youtube" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      pushSegment("youtube", node.value, start, end);
    } else if (node.type === "paragraph" && node.position) {
      for (const cut of youtubeCuts(markdown, node)) {
        pushSegment(cut.kind, cut.source, cut.start, cut.end);
      }
    } else if ("children" in node) node.children.forEach(visit);
  }
  const tree = fromMarkdown(markdown);
  tree.children.forEach(visit);
  if (cursor < markdown.length || segments.length === 0) pushMarkdown(markdown.slice(cursor));
  return segments;
}
