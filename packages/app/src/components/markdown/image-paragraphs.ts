import type { Paragraph, PhrasingContent } from "mdast";

export interface MarkdownEdit {
  start: number;
  end: number;
  text: string;
}

export interface ImageParagraphBreak {
  start: number;
  end: number;
  text: string;
}

/**
 * Fork media: an image alone in its paragraph renders as a block; every other image
 * is sized by the library as one square the height of a text line, which reads as a
 * tile. So an image gets a paragraph of its own: a shared line is split around it.
 * Line boundaries are edited into the source; a break inside a line is recorded on
 * the image instead, because it only applies when the image renders, so an image
 * that collapses to alt text stays inline. List items keep the tile — a blank line
 * would end the list, and a mid-line break would leave the rest at column 0.
 */
export function createImageParagraphs(source: string, edits: MarkdownEdit[]) {
  // Line boundaries already turned into paragraph breaks, by offset of their newline.
  const splitBoundaries = new Set<number>();
  // Mid-line breaks owed to an image, by the image's own start offset. Inserted
  // when the image renders, so an image that collapses to alt text stays inline.
  const imageBreaks = new Map<number, ImageParagraphBreak[]>();
  const inlineBreaks = new Set<number>();
  // Whitespace a break eats, so text escapes never rewrite the same characters.
  const trimmedWhitespace: { start: number; end: number }[] = [];
  function isImageLike(node: PhrasingContent): boolean {
    if (node.type === "image" || node.type === "imageReference") return true;
    return (
      (node.type === "link" || node.type === "linkReference") &&
      node.children.length === 1 &&
      isImageLike(node.children[0])
    );
  }
  function split(paragraph: Paragraph, start: number, end: number, insideListItem: boolean) {
    for (const child of paragraph.children) {
      const childStart = child.position?.start.offset;
      const childEnd = child.position?.end.offset;
      if (childStart === undefined || childEnd === undefined || !isImageLike(child)) continue;
      const lineStart = source.lastIndexOf("\n", childStart - 1) + 1;
      const newline = source.indexOf("\n", childEnd);
      const lineEnd = newline === -1 ? source.length : newline;
      const prefix = source.slice(lineStart, childStart);
      const suffix = source.slice(childEnd, lineEnd);
      const sharesBefore = childStart > start && !/^[\s>]*$/.test(prefix);
      const sharesAfter = !/^\s*\\?$/.test(suffix);
      // Continuation lines inside quotes keep their quote markers on the blank line.
      const blank = prefix.replace(/[^>]/g, " ").trimEnd();
      const splitAt = (boundary: number) => {
        if (splitBoundaries.has(boundary)) return;
        splitBoundaries.add(boundary);
        // A trailing backslash was a hard break; at a paragraph end it would render literally.
        const cut = source[boundary - 1] === "\\" ? boundary - 1 : boundary;
        edits.push({ start: cut, end: boundary + 1, text: `\n${blank}\n` });
      };
      const recordBreak = (offset: number, edge: "before" | "after") => {
        const run = edge === "before" ? /[ \t]*$/.exec(prefix)![0] : /^[ \t]*/.exec(suffix)![0];
        const from = edge === "before" ? offset - run.length : offset;
        const to = edge === "before" ? offset : offset + run.length;
        if (inlineBreaks.has(from)) return;
        inlineBreaks.add(from);
        trimmedWhitespace.push({ start: from, end: to });
        const key = innermostImageStart(child) ?? childStart;
        const breaks = imageBreaks.get(key) ?? [];
        breaks.push({ start: from, end: to, text: `\n${blank}\n${blank ? `${blank} ` : ""}` });
        imageBreaks.set(key, breaks);
      };
      if (sharesBefore) {
        if (!insideListItem) recordBreak(childStart, "before");
      } else if (lineStart > start) {
        splitAt(lineStart - 1);
      }
      if (sharesAfter) {
        if (!insideListItem) recordBreak(childEnd, "after");
      } else if (lineEnd < end) {
        splitAt(lineEnd);
      }
    }
  }
  // A break eats the whitespace beside an image; an escape must not rewrite it too.
  function clip(start: number, end: number): [number, number] {
    let [from, to] = [start, end];
    for (const trim of trimmedWhitespace) {
      if (trim.end <= from || trim.start >= to) continue;
      if (trim.start <= from) from = trim.end;
      else if (trim.end >= to) to = trim.start;
    }
    return [from, to];
  }
  // A link around an image owns the breaks, but the image is what renders.
  function innermostImageStart(node: PhrasingContent): number | undefined {
    if (node.type === "image" || node.type === "imageReference") {
      return node.position?.start.offset;
    }
    return "children" in node && node.children.length === 1
      ? innermostImageStart(node.children[0])
      : undefined;
  }
  // Breaks are applied only when the image occupies a box, keyed by its own start.
  const breaksFor = (imageStart: number): ImageParagraphBreak[] =>
    imageBreaks.get(imageStart) ?? [];
  return { split, clip, breaksFor };
}
