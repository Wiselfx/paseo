import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import type { AssistantFileLinkSource } from "@/assistant-file-links";
import { decodeString } from "micromark-util-decode-string";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes, Root } from "mdast";

// Keep this regex in the syntax shared by JavaScript, ICU and java.util.regex.
// The Unicode flag makes Metro expand it to escapes rejected by native engines.
const FILE_PATTERN =
  /(?:https?:\/\/[^\s<>]+|(?:[A-Za-z]:[\\/]|\.{0,2}\/|~\/)?[a-zA-Z0-9\u0080-\uFFFF_@.%+-]+(?:[\\/][a-zA-Z0-9\u0080-\uFFFF_@.%+-]+)+(?::\d+(?::\d+)?(?:-\d+(?::\d+)?)?)?|[a-zA-Z0-9\u0080-\uFFFF_@%-]+\.[a-zA-Z0-9\u0080-\uFFFF_%-]+(?::\d+(?::\d+)?(?:-\d+(?::\d+)?)?)?)/g;

function linkMetadata() {
  return {
    linkRecognition: {
      text: FILE_PATTERN,
      inlineCode: new RegExp(
        String.raw`^(?:${FILE_PATTERN.source})(?:\(\d+(?:,\d+)?(?:-\d+(?:,\d+)?)?\)| lines? \d+(?:-\d+)?)?$`,
      ),
    },
    linkSource(
      url: string,
      sourceType?: "markdown" | "text" | "inline-code",
    ): AssistantFileLinkSource {
      if (sourceType === "inline-code") return { href: url, text: url, sourceType };
      if (sourceType === "text") return { href: url, text: url, markup: "linkify" };
      return { href: url, text: url };
    },
  };
}

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
  let tree: Root | undefined;
  const getTree = () =>
    (tree ??= fromMarkdown(source, {
      extensions: [gfmTable()],
      mdastExtensions: [gfmTableFromMarkdown()],
    }));
  const edits: { start: number; end: number; text: string }[] = [];
  if (!source.includes("![") && !source.includes("||") && !source.includes("&")) {
    return { images, ...linkMetadata(), render: () => source };
  }

  const definitions = new Map<string, { url: string; title?: string | null }>();
  function definitionsIn(node: Nodes) {
    if (node.type === "definition") definitions.set(node.identifier, node);
    if ("children" in node) node.children.forEach(definitionsIn);
  }
  definitionsIn(getTree());
  function visit(node: Nodes) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "tableRow") {
        // MD4C's always-enabled spoiler extension otherwise consumes adjacent cell
        // delimiters. Spaces keep empty GFM cells empty without producing spoilers.
        const row = source.slice(start, end);
        for (const match of row.matchAll(/(?<!\\)\|(?=\|)/g)) {
          edits.push({ start: start + match.index + 1, end: start + match.index + 1, text: " " });
        }
      }
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
  visit(getTree());
  return {
    images,
    ...linkMetadata(),
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
