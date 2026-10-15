import { describe, expect, it } from "vitest";
import {
  prepareProse,
  createProsePreparer,
  inlineCodeLinkContent,
  proseLinkSource,
  handleProseLinkPress,
} from "./prepare";

const noFiles = () => false;
describe("source-preserving prose", () => {
  it.each([
    "A & B",
    "# A & B",
    "- A & B",
    "> A & B",
    "Escaped \\* and \\|",
    "<https://example.org>",
    "**bold** and *emphasis* and ~~deleted~~",
    "First  \nSecond",
    "# #",
    "Heading\n=======",
    'A [titled link](https://example.com "A title")',
    "[linked `code`](https://example.net)",
    "Before ![shot](file:///repo/shots/app.png) after.",
    "Blank `   ` code and ` normal ` code",
    "- first\n\tsecond",
    "\n\nA paragraph.\n\n",
    "- [ ] Task\n- [x] Done",
    "> [!NOTE]\n> Note",
    "> Ordinary quote",
  ])("copies unchanged source byte-for-byte: %s", (source) => {
    expect(prepareProse([source], noFiles)).toBe(source);
  });
  it("decodes entities outside code", () => {
    expect(prepareProse(["A &amp; B &#65; &#x41; &copy; `&amp;`"], noFiles)).toBe(
      "A & B A A © `&amp;`",
    );
  });
  it("decodes entities once, including encoded entity syntax", () => {
    expect(prepareProse(["Literal &amp;amp; and &amp;copy;"], noFiles)).toBe(
      "Literal \\&amp; and \\&copy;",
    );
  });
  it.each(["\r", "\r\n"])("normalizes line endings %j", (ending) => {
    expect(prepareProse([`First${ending}Second ||text||`], noFiles)).toBe(
      "First\nSecond \\|\\|text\\|\\|",
    );
  });
  it.each([
    ["See example.com.", "See [example.com](<http://example.com>)."],
    ["https://example.com/a_(b).", "[https://example.com/a_(b)](<https://example.com/a_(b)>)."],
    ["https://example.com/a.", "[https://example.com/a](<https://example.com/a>)."],
  ])("makes linkify destinations explicit: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it("only exempts task markers inside list items", () => {
    expect(prepareProse(["[x]", "Other\n\n[x]: https://example.com"], noFiles)).toBe(
      "\\[x]\n\nOther\n\n[x]: https://example.com",
    );
    const tasks = "- [x] Task\n- [ ] Pending\n1. [x] Ordered";
    expect(prepareProse([tasks], noFiles)).toBe(tasks);
  });
  it("prepares 30k of inline code in under 10ms warm", () => {
    const text = "Use `foo` and `bar` here. ".repeat(1300).slice(0, 30000);
    for (let i = 0; i < 10; i++) prepareProse([text], noFiles);
    const start = performance.now();
    for (let i = 0; i < 5; i++) expect(prepareProse([text], noFiles)).toBe(text);
    expect((performance.now() - start) / 5).toBeLessThan(10);
  });
  it("reuses prepared prefixes while completing the visible inline tail", () => {
    const prepare = createProsePreparer(noFiles);
    const blocks = ["First &amp; paragraph.", "Use `foo` and **bold** here. ".repeat(30)];
    const source = blocks.join("\n\n");
    prepare(blocks, true, source.length);
    for (let length = 0; length < source.length; length += 7) {
      expect(prepare(blocks, true, length)).toBe(prepareProse(blocks, noFiles, true, length));
    }
  });
  it.each([
    ["A ||literal|| and escaped \\* text.", 2, "A "],
    ["Use `README.md` and example.com. Later.", 4, "Use "],
    ["[unresolved label] later.", 12, "unresolved "],
    ["[unresolved label] later.", 19, "unresolved label "],
  ] as const)("keeps cached reveal boundaries literal: %s", (source, length, expected) => {
    const prepare = createProsePreparer((text) => text === "README.md");
    prepare([source], true, source.length);
    expect(prepare([source], true, length)).toBe(expected);
  });
  it("changes only prose pipes", () => {
    expect(prepareProse(["Keep ||literal|| and `a || b` and [a|b](https://x/a|b)."], noFiles)).toBe(
      "Keep \\|\\|literal\\|\\| and `a || b` and [a\\|b](https://x/a|b).",
    );
  });
  it("wraps inline file code without reprinting its source", () => {
    const source = "[Docs](https://example.com) and `` src/file.ts:12 ``";
    expect(prepareProse([source], (text) => text === "src/file.ts:12")).toBe(
      "[Docs](https://example.com) and [`` src/file.ts:12 ``](<paseo-inline-code:src%2Ffile.ts%3A12>)",
    );
    expect(inlineCodeLinkContent("paseo-inline-code:src%2Ffile.ts%3A12")).toBe("src/file.ts:12");
  });
  it("keeps inline-code URLs tappable", () => {
    expect(prepareProse(["`https://example.com`"], noFiles)).toBe(
      "[`https://example.com`](<https://example.com>)",
    );
  });
  it("uppercases only h6 text", () => {
    expect(
      prepareProse(
        ["###### Small **bold** `lower.ts` [link](https://example.com/lower) &amp;"],
        noFiles,
      ),
    ).toBe("###### SMALL **BOLD** `lower.ts` [LINK](https://example.com/lower) &");
  });
  it.each([
    ["Before **bold", "Before **bold**"],
    ["Before `code", "Before `code`"],
    ["Before [label](https://exa", "Before label"],
    ["### A **heading", "### A **heading**"],
    ["- First\n- **Second", "- First\n- **Second**"],
    ["> First\n> **Second", "> First\n> **Second**"],
    ["Before **", "Before "],
    ["Before ~~strike", "Before ~~strike~~"],
  ])("minimally completes the streaming tail: %s", (source, expected) => {
    expect(prepareProse([source], noFiles, true)).toBe(expected);
  });
  it("prepares source blocks independently, even beside a reference definition", () => {
    const blocks = ["![shot][pic]", "Other paragraph.\n\n[pic]: shots/app.png"];
    expect(prepareProse(blocks, noFiles)).toBe(
      blocks.map((block) => prepareProse([block], noFiles)).join("\n\n"),
    );
    expect(prepareProse(blocks, noFiles)).toBe(
      "!\\[shot]\\[pic]\n\nOther paragraph.\n\n[pic]: shots/app.png",
    );
  });
  it("localizes resolved references before joining blocks with conflicting definitions", () => {
    const blocks = [
      "[foo][ref]\n\n[ref]: https://one.example",
      "[bar][ref]\n\n[ref]: https://two.example",
    ];
    expect(prepareProse(blocks, noFiles)).toBe(
      "[foo](<https://one.example>)\n\n[ref]: https://one.example\n\n[bar](<https://two.example>)\n\n[ref]: https://two.example",
    );
  });
  it("carries a bare filename's text and href through the file action", () => {
    const prepared = prepareProse(["Open README.md"], (text) => text === "README.md");
    const source = {
      href: "http://README.md",
      text: "README.md",
      markup: "linkify",
      sourceInfo: "auto",
    };
    const url = `paseo-file-link:${encodeURIComponent(JSON.stringify(source))}`;
    expect(prepared).toBe(`Open [README.md](<${url}>)`);
    expect(proseLinkSource(url)).toEqual(source);
    const opened: unknown[] = [];
    handleProseLinkPress(
      url,
      (value) => opened.push(value),
      () => {
        throw new Error("Opened website");
      },
    );
    expect(opened).toEqual([source]);
  });
});
