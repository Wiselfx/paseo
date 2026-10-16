import { describe, expect, it } from "vitest";
import { createAssistantMarkdownParser } from "./assistant-markdown-parser";

const render = (source: string) => createAssistantMarkdownParser().renderInline(source);

describe("bare image links", () => {
  it("converts bare remote image URLs to images", () => {
    expect(render("see https://x.test/a.png")).toContain('<img src="https://x.test/a.png"');
  });
  it("keeps query strings on converted URLs", () => {
    expect(render("https://x.test/a.jpg?w=2")).toContain('<img src="https://x.test/a.jpg?w=2"');
  });
  it("leaves authored markdown links as links", () => {
    expect(render("[pic](https://x.test/a.png)")).toBe('<a href="https://x.test/a.png">pic</a>');
  });
  it("leaves non-image bare URLs as links", () => {
    expect(render("see https://github.com/")).toContain('<a href="https://github.com/">');
  });
  it("leaves YouTube URLs to the player hook", () => {
    expect(render("https://www.youtube.com/watch?v=4q6UGCyHZCI")).toContain("<a href=");
    expect(render("https://www.youtube.com/watch?v=4q6UGCyHZCI")).not.toContain("<img");
  });
});
