import { describe, expect, it } from "vitest";
import { createAssistantMarkdownParser } from "./assistant-markdown-parser";

const render = (source: string) => createAssistantMarkdownParser().renderInline(source);

describe("bare local paths", () => {
  it("renders absolute image paths as images", () => {
    expect(render("see /tmp/shot.png")).toContain('<img src="/tmp/shot.png"');
  });
  it("renders home-relative image paths as images", () => {
    expect(render("see ~/pics/a.jpg")).toContain('<img src="~/pics/a.jpg"');
  });
  it("renders non-image paths as file links", () => {
    expect(render("open /tmp/notes.txt")).toContain(
      '<a href="file:///tmp/notes.txt">/tmp/notes.txt</a>',
    );
  });
  it("leaves trailing punctuation as text", () => {
    expect(render("see /tmp/a.png.")).toContain('<img src="/tmp/a.png"');
    expect(render("see /tmp/a.png.")).toContain(".");
  });
  it("leaves code spans untouched", () => {
    expect(render("run `/tmp/a.png`")).toBe("run <code>/tmp/a.png</code>");
  });
  it("leaves markdown links and http URLs to their own rules", () => {
    expect(render("[t](/tmp/a.png)")).toBe('<a href="/tmp/a.png">t</a>');
    expect(render("see https://x.test/a.png")).toContain('href="https://x.test/a.png"');
  });
  it("ignores slashes mid-word", () => {
    expect(render("a/b")).toBe("a/b");
  });
});
