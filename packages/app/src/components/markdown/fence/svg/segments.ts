import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";

export interface SvgSegment {
  kind: "markdown" | "svg";
  id: string;
  source: string;
}

/**
 * ```svg fences leave the engine and render as the drawing they describe, with
 * a toggle back to the code. Raw `<svg>` in prose still hoists to an image
 * (`utils/markdown-raw-svg.ts`).
 */
export function splitSvgFences(markdown: string): SvgSegment[] {
  if (!/```svg/i.test(markdown)) return [{ kind: "markdown", id: "0", source: markdown }];
  const segments: SvgSegment[] = [];
  let cursor = 0;
  function visit(node: RootContent): void {
    if (node.type === "code" && node.lang?.toLowerCase() === "svg" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      if (start > cursor)
        segments.push({
          kind: "markdown",
          id: String(segments.length),
          source: markdown.slice(cursor, start),
        });
      segments.push({ kind: "svg", id: String(segments.length), source: node.value });
      cursor = end;
    } else if ("children" in node) node.children.forEach(visit);
  }
  fromMarkdown(markdown).children.forEach(visit);
  if (cursor < markdown.length || segments.length === 0)
    segments.push({
      kind: "markdown",
      id: String(segments.length),
      source: markdown.slice(cursor),
    });
  return segments;
}
