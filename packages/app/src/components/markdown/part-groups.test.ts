import { describe, expect, it } from "vitest";
import type { MarkdownDisplayPart } from "./html-ish";
import { groupMarkdownParts } from "./part-groups";
import { parseMarkdownPreviewDocument } from "@/file-pane/markdown-preview/document";
import { createProsePreparer } from "./prose/prepare";
import { splitMarkdownProse } from "./parts";

describe("groupMarkdownParts", () => {
  const flowImage: MarkdownDisplayPart = {
    kind: "inlineImage",
    alt: "Priority",
    src: "https://example.com/priority.svg",
    flowsWithText: true,
  };

  it("flows an image with the lead paragraph and keeps later paragraphs full width", () => {
    expect(
      groupMarkdownParts([
        flowImage,
        { kind: "markdown", text: " **Title line**\n\nSecond paragraph." },
      ]),
    ).toEqual([
      {
        kind: "imageText",
        images: [flowImage],
        lead: "**Title line**",
        rest: "Second paragraph.",
      },
    ]);
  });

  it("flows an image with a single-paragraph text", () => {
    expect(groupMarkdownParts([flowImage, { kind: "markdown", text: " Only line" }])).toEqual([
      { kind: "imageText", images: [flowImage], lead: "Only line", rest: "" },
    ]);
  });

  it("groups two consecutive flowing images with the lead paragraph", () => {
    const secondImage: MarkdownDisplayPart = {
      kind: "inlineImage",
      alt: "Severity",
      src: "https://example.com/severity.svg",
      flowsWithText: true,
    };

    expect(
      groupMarkdownParts([
        flowImage,
        { kind: "markdown", text: " " },
        secondImage,
        { kind: "markdown", text: " **Title text here**\n\nBody paragraph." },
      ]),
    ).toEqual([
      {
        kind: "imageText",
        images: [flowImage, secondImage],
        lead: "**Title text here**",
        rest: "Body paragraph.",
      },
    ]);
  });

  it("keeps standalone images as plain parts", () => {
    const image: MarkdownDisplayPart = {
      kind: "inlineImage",
      alt: "Shot",
      src: "https://example.com/shot.png",
    };

    expect(groupMarkdownParts([image, { kind: "markdown", text: "\n\nCaption" }])).toEqual([
      { kind: "part", part: image },
      { kind: "part", part: { kind: "markdown", text: "\n\nCaption" } },
    ]);
  });

  it("keeps a flowing image alone when no markdown follows", () => {
    expect(groupMarkdownParts([flowImage])).toEqual([{ kind: "part", part: flowImage }]);
  });

  it("keeps a flowing image alone when the following markdown starts with a blank line", () => {
    expect(groupMarkdownParts([flowImage, { kind: "markdown", text: "\n\nBelow" }])).toEqual([
      { kind: "part", part: flowImage },
      { kind: "part", part: { kind: "markdown", text: "\n\nBelow" } },
    ]);
  });

  it("passes other part kinds through unchanged", () => {
    const details: MarkdownDisplayPart = { kind: "details", summary: "More", body: "Body" };

    expect(groupMarkdownParts([{ kind: "markdown", text: "Intro" }, details])).toEqual([
      { kind: "part", part: { kind: "markdown", text: "Intro" } },
      { kind: "part", part: details },
    ]);
  });
});

describe("shared renderer prose parts", () => {
  it("groups paragraphs and retains code and quote boundaries for a document", () => {
    const parts = splitMarkdownProse(
      "First paragraph.\n\nSecond paragraph.\n\n```ts\nconst x = 1;\n```\n\n> Quote one.\n>\n> Quote two.",
    );
    expect(parts.map((part) => part.markdownKind)).toEqual(["prose", "block", "quote"]);
    expect(parts[0]?.markdownProseBlocks).toEqual(["First paragraph.", "Second paragraph."]);
  });
});

describe("Markdown file preview document", () => {
  it("uses shared prose parts after removing front matter", () => {
    const document = parseMarkdownPreviewDocument(
      "---\ntitle: Preview\n---\n\nFirst paragraph.\n\nSecond paragraph.\n\n```js\n42\n```\n\n> Quote",
    );
    expect(splitMarkdownProse(document.body).map((part) => part.markdownKind)).toEqual([
      "prose",
      "block",
      "quote",
    ]);
  });
  it("retains document-wide references in prose and image blocks", () => {
    const parts = splitMarkdownProse(
      "[site][ref]\n\n![image][pic]\n\nOther text.\n\n[ref]: https://example.com\n[pic]: image.png",
    );
    expect(parts.map((part) => part.markdownKind)).toEqual(["prose", "block", "prose"]);
    const first = parts[0]!;
    const prepare = createProsePreparer(() => false, {
      linkify: true,
      allowFileLinks: false,
      references: first.references,
    });
    expect(prepare(first.markdownProseBlocks!)).toBe("[site](<https://example.com>)");
    expect(parts[1]?.references?.PIC?.href).toBe("image.png");
  });
});
