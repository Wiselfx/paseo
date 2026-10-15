import { describe, expect, it } from "vitest";
import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import { inlineCodeLinkContent, prepareProse } from "./prepare";

const parser = createAssistantMarkdownParser();
const noFiles = () => false;

describe("native prose dialect", () => {
  it.each([
    "Literal &amp;amp; and &amp;copy;",
    "# #",
    "Setext heading\n==============",
    'A [titled link](https://example.com "A title")',
    "- first\n\tsecond",
    "Blank `   ` code and ` normal ` code",
    "# Heading\n\n- **First**\n- Second\n\n~~Deleted~~",
    "> First paragraph\n>\n> Second paragraph",
    "A [linked `path.ts`](file:///repo/path.ts)",
  ])("preserves existing rendered inline content: %s", (text) => {
    expect(parser.render(prepareProse(text, noFiles))).toBe(parser.render(text));
  });

  it("escapes spoiler delimiters without changing visible text or inline code", () => {
    const text = "Keep ||literal||, **bold**, ~~deleted~~ and `a || b`.";
    const prepared = prepareProse(text, noFiles);
    expect(prepared).toContain("\\|\\|literal\\|\\|");
    expect(parser.render(prepared)).toBe(parser.render(text));
  });

  it("keeps inline-code URLs tappable", () => {
    expect(parser.render(prepareProse("`https://example.com`", noFiles))).toBe(
      '<p><a href="https://example.com"><code>https://example.com</code></a></p>\n',
    );
  });

  it("retains links and makes inline workspace paths use the same resolver input", () => {
    const prepared = prepareProse(
      "[Docs](https://example.com) and `src/file.ts:12`",
      (text) => text === "src/file.ts:12",
    );
    const tokens = parser.parseInline(prepared, {})[0]!.children!;
    const hrefs = tokens
      .filter((token) => token.type === "link_open")
      .map((token) => token.attrGet("href"));
    expect(hrefs).toEqual(["https://example.com", "paseo-inline-code:src%2Ffile.ts%3A12"]);
    expect(inlineCodeLinkContent(hrefs[1]!)).toBe("src/file.ts:12");
  });

  it("preserves multiline quotes, literal pipes and code links", () => {
    const text = "> Before ||literal||\n> after `src/file.ts`";
    const prepared = prepareProse(text, () => true);
    expect(prepared).toContain("\\|\\|literal\\|\\|");
    expect(prepared).toContain("paseo-inline-code:");
  });
});

const streamingParser = createAssistantMarkdownParser({ streaming: true });
describe("streaming prose", () => {
  it.each([
    "Before **bold",
    "Before `code",
    "Before [label](https://exa",
    "### A **heading",
    "- First\n- **Second",
    "> First\n> **Second",
    "Before **",
    "Before ~~strike",
  ])("retains provisional formatting: %s", (text) => {
    expect(parser.render(prepareProse(text, noFiles, true))).toBe(streamingParser.render(text));
  });
});

it("uppercases heading-six text without changing inline code or link destinations", () => {
  expect(
    parser.render(
      prepareProse("###### Small **bold** `lower.ts` [link](https://example.com/lower)", noFiles),
    ),
  ).toBe(
    '<h6>SMALL <strong>BOLD</strong> <code>lower.ts</code> <a href="https://example.com/lower">LINK</a></h6>\n',
  );
});

it.each([false, true])(
  "preserves inline semantics and leaves reference definitions untouched (streaming=%s)",
  (streaming) => {
    const text =
      "[foo][ref] <https://example.org> &amp; \\* **bold**  \n[linked `code`](https://example.net)\n\n[ref]: https://example.com";
    const prepared = prepareProse(text, noFiles, streaming);
    expect(prepared).toContain("[ref]: https://example.com");
    expect(parser.render(prepared)).toBe(parser.render(text));
  },
);

it.each([
  "- [ ] Task",
  "- [x] Done",
  "1. [X] Done",
  "- parent\n  - [ ] Nested task",
  "> [!NOTE]\n> Keep this note",
  "> Ordinary quote",
])("preserves native block markers through streaming and settlement: %s", (text) => {
  const settled = prepareProse(text, noFiles);
  const streaming = prepareProse(text, noFiles, true);
  expect(settled).toBe(text);
  expect(streaming).toBe(settled);
  expect(parser.render(settled)).toBe(parser.render(text));
});
