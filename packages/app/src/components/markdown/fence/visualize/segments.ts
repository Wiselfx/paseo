import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";

export interface VizSegment {
  kind: "markdown" | "viz";
  id: string;
  source: string;
}

/**
 * ```visualize fences leave the engine and host the interactive stage
 * between library segments (same pattern as mermaid/youtube). Explicit
 * fence only: no bare-URL detection. Unclosed fences (streaming) stay
 * markdown until complete.
 */
export function splitVisualizeFences(markdown: string): VizSegment[] {
  if (!/```visualize/i.test(markdown)) return [{ kind: "markdown", id: "0", source: markdown }];
  const segments: VizSegment[] = [];
  let cursor = 0;
  function visit(node: RootContent): void {
    if (node.type === "code" && node.lang?.toLowerCase() === "visualize" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      if (start > cursor)
        segments.push({
          kind: "markdown",
          id: String(segments.length),
          source: markdown.slice(cursor, start),
        });
      segments.push({ kind: "viz", id: String(segments.length), source: node.value });
      cursor = end;
    } else if ("children" in node) node.children.forEach(visit);
  }
  const tree = fromMarkdown(markdown);
  tree.children.forEach(visit);
  if (cursor < markdown.length || segments.length === 0)
    segments.push({
      kind: "markdown",
      id: String(segments.length),
      source: markdown.slice(cursor),
    });
  return segments;
}
