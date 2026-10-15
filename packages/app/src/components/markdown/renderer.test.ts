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

it("preserves empty table cells while escaping spoilers in cell text", () => {
  const source = "| A || B |\n| --- | --- | --- |\n| x || z |";
  expect(prepareMarkdownSource(source).render()).toBe(
    "| A | | B |\n| --- | --- | --- |\n| x | | z |",
  );
});

it.each([
  "src/components/message.tsx",
  "C:\\repo\\file.ts",
  "docs/说明.md",
  "my%20file.ts",
  "src/file.ts:10-20",
  "src/file.ts(10,2)",
])("recognizes inline paths through the file resolver: %s", (path) => {
  const prepared = prepareMarkdownSource(`Open \`${path}\`.`);
  expect(prepared.linkRecognition.inlineCode?.test(path)).toBe(true);
  expect(prepared.linkSource(path, "inline-code")).toEqual({
    href: path,
    text: path,
    sourceType: "inline-code",
  });
});

it("recognizes bare Unicode filenames and preserves inline-code URLs", () => {
  const prepared = prepareMarkdownSource("Read 说明.md, or `https://example.com`.");
  expect([..."说明.md,".matchAll(prepared.linkRecognition.text)].map(([text]) => text)).toEqual([
    "说明.md",
  ]);
  expect(prepared.linkRecognition.inlineCode?.test("https://example.com")).toBe(true);
});

it("keeps explicit and inline-code links distinct when their URL strings match", () => {
  const url = "/tmp/my%20file.ts";
  const prepared = prepareMarkdownSource(`[open](${url}) and \`${url}\``);
  expect(prepared.linkSource(url, "markdown")).toEqual({ href: url, text: url });
  expect(prepared.linkSource(url, "inline-code")).toEqual({
    href: url,
    text: url,
    sourceType: "inline-code",
  });
});

it("extracts only Mermaid fences for the native diagram host", async () => {
  const { splitMermaidFences } = await import("./fence/mermaid/segments");
  const source =
    "First.\n\n```ts\nconst n = 1;\n```\n\n```mermaid\ngraph TD\nA-->B\n```\n\n> Last.";
  expect(splitMermaidFences(source)).toEqual([
    { kind: "markdown", id: "0", source: "First.\n\n```ts\nconst n = 1;\n```\n\n" },
    { kind: "mermaid", id: "1", source: "graph TD\nA-->B" },
    { kind: "markdown", id: "2", source: "\n\n> Last." },
  ]);
  expect(splitMermaidFences("```md\n```mermaid\n```")).toEqual([
    { kind: "markdown", id: "0", source: "```md\n```mermaid\n```" },
  ]);
});

it("keeps reference links available across native Mermaid boundaries", async () => {
  const { splitMermaidFences } = await import("./fence/mermaid/segments");
  const parts = splitMermaidFences(
    "[Before][file]\n\n```mermaid\ngraph TD\nA-->B\n```\n\n[After][file]\n\n[file]: src/file.ts",
  );
  for (const part of parts.filter((candidate) => candidate.kind === "markdown"))
    expect(part.source).toContain("[file]: <src/file.ts>");
});

it("recognizes mixed-case Mermaid fence info and incomplete streaming fences", async () => {
  const { splitMermaidFences } = await import("./fence/mermaid/segments");
  expect(splitMermaidFences("```Mermaid title\ngraph TD\nA-->B")).toEqual([
    { kind: "mermaid", id: "0", source: "graph TD\nA-->B" },
  ]);
});

it("carries reference definitions nested in quotes across a diagram", async () => {
  const { splitMermaidFences } = await import("./fence/mermaid/segments");
  const parts = splitMermaidFences(
    "[open][file]\n\n```mermaid\ngraph TD\nA-->B\n```\n\n> [file]: src/file.ts",
  );
  expect(parts[0].source).toContain("[file]: <src/file.ts>");
});

it("keeps diagram identity when an earlier workspace image resolves", async () => {
  const { splitMermaidFences } = await import("./fence/mermaid/segments");
  const source = "![image](a.png)\n\n```mermaid\ngraph TD\nA-->B\n```";
  const before = splitMermaidFences(source).find((part) => part.kind === "mermaid");
  const after = splitMermaidFences(
    source.replace("a.png", "file:///long/cache/path/image.png"),
  ).find((part) => part.kind === "mermaid");
  expect(before).toHaveProperty("id");
  expect(after?.id).toBe(before?.id);
});
