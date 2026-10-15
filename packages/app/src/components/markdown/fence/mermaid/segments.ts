import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent } from "mdast";

interface Segment {
  kind: "markdown" | "mermaid";
  offset: number;
  source: string;
}

/** Native enriched-markdown has no fenced-block override. Only diagrams leave its engine. */
export function splitMermaidFences(markdown: string): Segment[] {
  if (!/mermaid/i.test(markdown)) return [{ kind: "markdown", offset: 0, source: markdown }];
  const segments: Segment[] = [];
  let cursor = 0;
  function visit(node: RootContent): void {
    if (node.type === "code" && node.lang?.toLowerCase() === "mermaid" && node.position) {
      const start = node.position.start.offset!;
      const end = node.position.end.offset!;
      if (start > cursor)
        segments.push({ kind: "markdown", offset: cursor, source: markdown.slice(cursor, start) });
      segments.push({ kind: "mermaid", offset: start, source: node.value });
      cursor = end;
    } else if ("children" in node) node.children.forEach(visit);
  }
  const tree = fromMarkdown(markdown);
  tree.children.forEach(visit);
  if (cursor < markdown.length || segments.length === 0)
    segments.push({ kind: "markdown", offset: cursor, source: markdown.slice(cursor) });
  // Reference links keep their document-wide scope on both sides of a diagram.
  if (segments.some((segment) => segment.kind === "mermaid")) {
    const definitions = tree.children
      .filter((node) => node.type === "definition")
      .map((node) => markdown.slice(node.position!.start.offset, node.position!.end.offset))
      .join("\n");
    if (definitions)
      for (const segment of segments) {
        if (segment.kind === "markdown") segment.source += `\n\n${definitions}`;
      }
  }
  return segments;
}
