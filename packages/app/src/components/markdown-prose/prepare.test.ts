import { describe, expect, it } from "vitest";
import {
  prepareProse,
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
    "Literal &amp;amp; and &amp;copy;",
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
    ).toBe("###### SMALL **BOLD** `lower.ts` [LINK](https://example.com/lower) &amp;");
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
