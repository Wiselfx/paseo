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
    ["http://[::1]:3000", "<http://[::1]:3000>"],
    ["[http://[::1]:3000](http://[::1]:3000)", "[http\\://[::1]:3000](<http://[::1]:3000>)"],
    ["http://[::1]:3000/path?x=[1]", "<http://[::1]:3000/path?x=[1]>"],
    ["###### &#97;", "###### A"],
  ])("preserves IPv6 links and decoded heading case: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it.each([
    [
      "https://example.com/?tags[]=a",
      "[https://example.com/?tags[]=a](<https://example.com/?tags%5B%5D=a>)",
    ],
    ["`src/[...]/file.ts`", "`src/[...]/file.ts`"],
    ["[text []](https://example.com)", "[text []](https://example.com)"],
    ["https://example.com/a*b*c", "[https://example.com/a](<https://example.com/a>)*b*c"],
  ])("uses parser-owned link ranges: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it.each([
    ["Paths ~/.config and ~/.local are used.", "Paths \\~/.config and \\~/.local are used."],
    ["~/a ~/b", "\\~/a \\~/b"],
    ["~~gone~~", "~~gone~~"],
    ["a ~ b", "a \\~ b"],
    ["`~~` and `~/a ~/b`", "`~~` and `~/a ~/b`"],
  ])("keeps single tildes literal: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it.each([
    ["https://example.com/a&amp;b", "[https://example.com/a&b](<https://example.com/a&b>)"],
    ["https://example.com/é", "[https://example.com/é](<https://example.com/%C3%A9>)"],
    ["https://example.com/a\\_b", "[https://example.com/a\\_b](<https://example.com/a_b>)"],
  ])("wraps linkify's normalized destination: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
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
    "\n\nA paragraph.\n\n",
    "- [ ] Task\n- [x] Done",
    "> [!NOTE]\n> Note",
    "> Ordinary quote",
  ])("copies unchanged source byte-for-byte: %s", (source) => {
    expect(prepareProse([source], noFiles)).toBe(source);
  });
  it.each([
    ["[file](file:///repo/a&amp;b.txt)", "[file](<file:///repo/a&b.txt>)"],
    ["![file](file:///repo/a&amp;b.png)", "![file](<file:///repo/a&b.png>)"],
    ["- first\n\t&amp; second", "- first\n    & second"],
    ["[foo\nbar]", "\\[foo\nbar]"],
    ["[foo\\*bar]", "\\[foo\\*bar]"],
  ])("preserves decoded destinations and source positions: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it.each([
    ["&#10;---", "\\\n\\---"],
    ["Before&#10;# after", "Before\\\n\\# after"],
    ["&#10;1. next", "\\\n1\\. next"],
    ["&#9;---", "\u00a0\u00a0\u00a0\u00a0---"],
    ["&#32;---", "\u00a0---"],
    ["Before&#13;after", "Before\\\nafter"],
  ])("keeps whitespace entities inside text: %s", (source, expected) => {
    expect(prepareProse([source], noFiles)).toBe(expected);
  });
  it("keeps multiline and escaped labels local to each source block", () => {
    expect(prepareProse(["[foo\nbar]", "Other", "[foo bar]: https://example.com"], noFiles)).toBe(
      "\\[foo\nbar]\n\nOther\n\n[foo bar]: https://example.com",
    );
    expect(
      prepareProse(["[foo\\*bar]", "Other", "[foo\\*bar]: https://example.com"], noFiles),
    ).toBe("\\[foo\\*bar]\n\nOther\n\n[foo\\*bar]: https://example.com");
  });
  it("prepares only changed source blocks on append", () => {
    const candidates: string[] = [];
    const prepare = createProsePreparer((text) => {
      candidates.push(text);
      return false;
    });
    prepare(["First `one`.", "Next `two`.", "Last `three`."], Infinity);
    candidates.length = 0;
    prepare(["First `one`.", "Next `two`.", "Last `three`. More."], Infinity);
    expect(candidates).toEqual(["three"]);
  });
  it("bounds preparation before parsing a capped block", () => {
    let candidates = 0;
    const prepare = createProsePreparer(() => {
      candidates++;
      return false;
    });
    const source = "Use `foo` here. ".repeat(70_000);
    prepare([source], 32_000);
    expect(candidates).toBeLessThan(2200);
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
  it("prepares 30k of inline code in under 50ms warm", () => {
    const text = "Use `foo` and `bar` here. ".repeat(1300).slice(0, 30000);
    for (let i = 0; i < 10; i++) prepareProse([text], noFiles);
    const start = performance.now();
    for (let i = 0; i < 5; i++) expect(prepareProse([text], noFiles)).toBe(text);
    expect((performance.now() - start) / 5).toBeLessThan(50);
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
