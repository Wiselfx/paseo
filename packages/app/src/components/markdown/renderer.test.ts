import { describe, expect, it } from "vitest";
import { prepareMarkdownSource } from "./source";

describe("shared Markdown source adaptation", () => {
  it("keeps paragraphs, fences and quotes together for the library", () => {
    const source = "First paragraph.\n\nSecond paragraph.\n\n```ts\nconst n = 1;\n```\n\n> Quote";
    expect(prepareMarkdownSource(source).render()).toBe(source);
  });
  it("resolves workspace images without rewriting code or remote image URLs", () => {
    const source =
      "![Local](assets/a.png)\n\n![Remote](https://example.com/a.png)\n\n```md\n![Code](assets/a.png)\n```";
    const prepared = prepareMarkdownSource(source);
    expect(prepared.images.map((image) => image.source)).toEqual([
      "assets/a.png",
      "https://example.com/a.png",
    ]);
    expect(prepared.render(new Map([["assets/a.png", "blob:cached"]]))).toBe(
      "![Local](<blob:cached>)\n\n![Remote](https://example.com/a.png)\n\n```md\n![Code](assets/a.png)\n```",
    );
  });
  it("resolves reference images and images nested in lists and quotes", () => {
    const prepared = prepareMarkdownSource("> - ![Image][picture]\n\n[picture]: ../a.png");
    expect(prepared.render(new Map([["../a.png", "file:///cache/a.png"]]))).toBe(
      "> - ![Image](<file:///cache/a.png>)\n\n[picture]: ../a.png",
    );
  });
  it("escapes spoiler delimiters only in prose", () => {
    expect(prepareMarkdownSource("Show ||words|| and `||code||`.").render()).toBe(
      "Show \\|\\|words\\|\\| and `||code||`.",
    );
  });
});

it("preserves named and numeric entities as literal rendered text", () => {
  expect(prepareMarkdownSource("AT&amp;T &#x1F600; &#35; heading and `&amp;`").render()).toBe(
    "AT\\&T 😀 \\# heading and `&amp;`",
  );
});
