import { createElement } from "react";
import { MarkdownRendererFrame } from "./frame";
import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "@/styles/theme";
import { createMarkdownStyles } from "./styles";
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

it("keeps workspace-relative hover titles on explicit absolute file links", () => {
  expect(prepareMarkdownSource("[Open](/repo/src/file.ts:42-45)", "/repo").render()).toBe(
    '[Open](/repo/src/file.ts:42-45 "src/file.ts:42-45")',
  );
});

it.each(['""', "''", "()"])("preserves an authored empty link title: %s", (title) => {
  const source = `[Open](/repo/file.ts ${title})`;
  expect(prepareMarkdownSource(source, "/repo").render()).toBe(source);
});

describe("shared Markdown theme colours", () => {
  it.each([
    ["dark", darkTheme],
    ["light", lightTheme],
  ] as const)("uses %s theme colours for tables and task labels", (_name, theme) => {
    const { markdownStyle: style } = createMarkdownStyles(theme);
    expect(style.table).toMatchObject({
      color: theme.colors.foreground,
      headerTextColor: theme.colors.foreground,
      headerBackgroundColor: theme.colors.surface2,
      rowEvenBackgroundColor: theme.colors.surface0,
      rowOddBackgroundColor: theme.colors.surface1,
      borderColor: theme.colors.border,
    });
    expect(style.list?.color).toBe(theme.colors.foreground);
    expect(style.taskList).toMatchObject({
      checkedTextColor: theme.colors.foregroundMuted,
      checkedColor: theme.colors.accent,
      checkmarkColor: theme.colors.accentForeground,
      borderColor: theme.colors.foregroundMuted,
    });
  });
});

it.each([
  ["dark", darkTheme],
  ["light", lightTheme],
] as const)(
  "uses %s theme colours for quotes, admonitions, code, links and dividers",
  (_name, theme) => {
    const { markdownStyle: style } = createMarkdownStyles(theme);
    expect(style.blockquote).toMatchObject({
      color: theme.colors.foregroundMuted,
      backgroundColor: theme.colors.surface2,
      borderColor: theme.colors.border,
      admonitions: {
        note: { color: theme.colors.accentBright, backgroundColor: theme.colors.surface2 },
        tip: { color: theme.colors.statusSuccess, backgroundColor: theme.colors.surface2 },
        important: { color: theme.colors.statusMerged, backgroundColor: theme.colors.surface2 },
        warning: { color: theme.colors.statusWarning, backgroundColor: theme.colors.surface2 },
        caution: { color: theme.colors.statusDanger, backgroundColor: theme.colors.surface2 },
      },
    });
    expect(style.code).toMatchObject({
      color: theme.colors.foreground,
      backgroundColor: theme.colors.surface2,
      borderColor: "transparent",
    });
    expect(style.link?.color).toBe(theme.colors.accent);
    expect(style.linkVariants?.["^(?!https?://).+"]?.color).toBe(theme.colors.accent);
    expect(style.thematicBreak?.color).toBe(theme.colors.border);
  },
);

it.each([darkTheme, lightTheme])("supplies the theme selection colour to the renderer", (theme) => {
  expect(createMarkdownStyles(theme)).toHaveProperty(
    "selectionColor",
    theme.colors.terminal.selectionBackground,
  );
});

describe("GitHub comment HTML normalization", () => {
  it.each([
    [
      '<img alt="P1" src="https://example.com/p1.svg" align="top">',
      "![P1](<https://example.com/p1.svg>)",
    ],
    ['<a href="https://example.com/review">▶</a>', "[▶](<https://example.com/review>)"],
    ["Before<br>After<br/>End", "Before  \nAfter  \nEnd"],
    ["<b>bold</b> and <strong>strong</strong>", "**bold** and **strong**"],
    ["<i>italic</i> and <em>emphasis</em>", "*italic* and *emphasis*"],
    ["Use <code>const n = 1</code>.", "Use `const n = 1`."],
    ["H<sub>2</sub>O and x<sup>2</sup>", "H2O and x2"],
    [
      "<details><summary>Review details</summary>Body **stays**.</details>",
      "**Review details**\n\nBody **stays**.",
    ],
    ["Before<!-- private -->After", "BeforeAfter"],
    ["<div><span>Keep the content</span></div>", "Keep the content"],
    [
      '<a href="https://example.com"><strong>Review</strong></a>',
      "[**Review**](<https://example.com>)",
    ],
    ['`<img src="literal.png">` and <b>bold</b>', '`<img src="literal.png">` and **bold**'],
    [
      '```html\n<img src="literal.png">\n```\n\n<b>bold</b>',
      '```html\n<img src="literal.png">\n```\n\n**bold**',
    ],
    ['~~~html\n<a href="literal">link</a>\n~~~', '~~~html\n<a href="literal">link</a>\n~~~'],
    [
      '<details><summary>Code</summary>\n\n```html\n<img src="literal.png">\n```\n</details>',
      '**Code**\n\n\n\n```html\n<img src="literal.png">\n```\n',
    ],
    [
      "<https://example.com> and <user@example.com>",
      "<https://example.com> and <user@example.com>",
    ],
  ])("normalizes %s without changing code", (source, expected) => {
    expect(prepareMarkdownSource(source).render()).toBe(expected);
  });
});

it("preserves backslashes and decodes entities inside HTML code", () => {
  const source = String.raw`<code>\*literal\* &lt;img&gt;</code>`;
  expect(prepareMarkdownSource(source).render()).toBe("`" + String.raw`\*literal\* <img>` + "`");
});

it("keeps the renderer root and child identity as workspace images resolve", () => {
  const child = createElement("span", null, "Selected prose and open diagram");
  const pending = MarkdownRendererFrame({ imageSources: {}, children: child });
  const resolved = MarkdownRendererFrame({
    imageSources: { "blob:resolved": "/repo/image.png" },
    children: child,
  });
  expect(resolved.type).toBe(pending.type);
  expect(resolved.props.children).toBe(pending.props.children);
  expect(resolved.props.children).toBe(child);
  expect(resolved.props.dataSet).toEqual({
    paseoMarkdownImageSources: JSON.stringify({ "blob:resolved": "/repo/image.png" }),
  });
});

it.each([false, true])(
  "caps inline images to the paragraph line height (compact: %s)",
  (compact) => {
    const { markdownStyle } = createMarkdownStyles(darkTheme, compact);
    expect(markdownStyle.inlineImage?.size).toBe(markdownStyle.paragraph?.lineHeight);
  },
);

it("shows native SVG badges as alt text without reserving an image box", () => {
  const source = "![P1](https://example.com/p1.svg?v=9) **Finding**";
  const prepared = prepareMarkdownSource(source, undefined, { supportsSvg: false });
  expect(prepared.render()).toBe("P1 **Finding**");
  expect(prepared.images).toEqual([]);
});

it("collapses images that fail to load or decode to their alt text", () => {
  const prepared = prepareMarkdownSource(
    "![Remote](https://example.com/broken.png) and ![Local](broken.png)",
  );
  expect(
    prepared.render(
      new Map([["broken.png", "file:///broken.png"]]),
      new Set(["https://example.com/broken.png", "broken.png"]),
    ),
  ).toBe("Remote and Local");
});

it("preserves angle-bracket image destinations and authored link titles during HTML normalization", () => {
  const prepared = prepareMarkdownSource(
    '![shot](<my file.png>) and [open](<my file.png> "<b>literal title</b>")',
  );
  expect(prepared.images.map((image) => image.source)).toEqual(["my file.png"]);
  expect(prepared.render(new Map([["my file.png", "blob:shot"]]))).toBe(
    '![shot](<blob:shot>) and [open](<my file.png> "<b>literal title</b>")',
  );
});

it("uses the first repeated image reference definition", () => {
  const source = "![chart][image]\n\n[image]: first.png\n[image]: second.png";
  const prepared = prepareMarkdownSource(source);
  expect(prepared.images.map((image) => image.source)).toEqual(["first.png"]);
  expect(prepared.render(new Map([["first.png", "blob:first"]]))).toBe(
    "![chart](<blob:first>)\n\n[image]: first.png\n[image]: second.png",
  );
});

it("keeps Greptile header links and block text separated", () => {
  const source =
    '<h2><a href="https://app.greptile.com/api/retrigger?id=81261069"><picture><source media="(prefers-color-scheme: dark)" srcset="https://greptile-static-assets.s3.amazonaws.com/badges/RetriggerDark.svg?v=2"><source media="(prefers-color-scheme: light)" srcset="https://greptile-static-assets.s3.amazonaws.com/badges/Retrigger.svg?v=2"><img alt="Retrigger" src="https://greptile-static-assets.s3.amazonaws.com/badges/Retrigger.svg?v=2" align="right"></picture></a><a href="https://app.greptile.com/paseo/github/getpaseo/paseo/-/pull/6973"><picture><source media="(prefers-color-scheme: dark)" srcset="https://greptile-static-assets.s3.amazonaws.com/badges/ViewInGreptileDark.svg?v=2"><source media="(prefers-color-scheme: light)" srcset="https://greptile-static-assets.s3.amazonaws.com/badges/ViewInGreptile.svg?v=2"><img alt="View in Greptile" src="https://greptile-static-assets.s3.amazonaws.com/badges/ViewInGreptile.svg?v=2" align="right"></picture></a>Confidence Score: 2/5</h2>';
  const rendered = prepareMarkdownSource(source, undefined, { supportsSvg: false }).render();
  expect(rendered).toContain(
    "[Retrigger](<https://app.greptile.com/api/retrigger?id=81261069>) [View in Greptile]",
  );
  expect(rendered).toContain(") Confidence Score: 2/5");
});

it("keeps paragraph, heading and table-row boundaries when stripping HTML", () => {
  const source =
    "<div>First</div><p>Second<br>line</p><h3>Heading</h3><table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>";
  const rendered = prepareMarkdownSource(source).render();
  expect(rendered).toBe("First\n\nSecond  \nline\n\nHeading\n\nA B\n\nC D");
});

it("normalizes images following HTML code in the same HTML block", () => {
  const prepared = prepareMarkdownSource('<code>\nx\n</code>\n<img src="shot.png">');
  expect(prepared.images.map((image) => image.source)).toEqual(["shot.png"]);
  expect(prepared.render(new Map([["shot.png", "blob:shot"]]))).toContain("![](<blob:shot>)");
  expect(prepared.render()).toContain("`\nx\n`");
});
