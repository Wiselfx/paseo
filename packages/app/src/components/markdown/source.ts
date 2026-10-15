import { decodeString } from "micromark-util-decode-string";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes } from "mdast";

export interface MarkdownImage {
  source: string;
  alt: string;
  title: string | null;
  start: number;
  end: number;
}

/** Preserve source spelling; adapt workspace images, spoiler delimiters, and entity text. */
export function prepareMarkdownSource(source: string) {
  const images: MarkdownImage[] = [];
  const edits: { start: number; end: number; text: string }[] = [];
  if (!source.includes("![") && !source.includes("||") && !source.includes("&")) {
    return { images, render: () => source };
  }
  const tree = fromMarkdown(source);
  const definitions = new Map<string, { url: string; title?: string | null }>();
  function definitionsIn(node: Nodes) {
    if (node.type === "definition") definitions.set(node.identifier, node);
    if ("children" in node) node.children.forEach(definitionsIn);
  }
  definitionsIn(tree);
  function visit(node: Nodes) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "image" || node.type === "imageReference") {
        const target = node.type === "image" ? node : definitions.get(node.identifier);
        if (target)
          images.push({
            source: target.url,
            alt: node.alt ?? "",
            title: target.title ?? null,
            start,
            end,
          });
        return;
      }
      if (node.type === "text") {
        const text = source
          .slice(start, end)
          .replace(/(?<!\\)&(?:#(?:[xX][\da-fA-F]+|\d+)|[a-zA-Z][a-zA-Z\d]+);/g, (entity) =>
            decodeString(entity).replace(/[!-/:-@[-`{-~]/g, "\\$&"),
          )
          .replace(/(?<!\\)\|\|/g, "\\|\\|");
        if (text !== source.slice(start, end)) edits.push({ start, end, text });
      }
    }
    if ("children" in node) node.children.forEach(visit);
  }
  visit(tree);
  return {
    images,
    render(urls: ReadonlyMap<string, string> = new Map()) {
      const replacements = [...edits];
      for (const image of images) {
        if (/^(https?:|data:|blob:)/i.test(image.source)) continue;
        const url = urls.get(image.source);
        replacements.push({
          start: image.start,
          end: image.end,
          text: url
            ? `![${image.alt.replace(/[[\]\\]/g, "\\$&")}](<${url}>${image.title ? ` ${JSON.stringify(image.title)}` : ""})`
            : image.alt,
        });
      }
      let result = source;
      for (const edit of replacements.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
      }
      return result;
    },
  };
}
