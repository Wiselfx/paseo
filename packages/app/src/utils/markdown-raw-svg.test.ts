import { describe, expect, it } from "vitest";
import { createAssistantMarkdownParser } from "./assistant-markdown-parser";

const render = (source: string) => createAssistantMarkdownParser().renderInline(source);

describe("raw svg images", () => {
  const svg = '<svg width="10"><circle r="5"/></svg>';

  it("converts single-line svg to an image", () => {
    expect(render(`see ${svg}`)).toContain('<img src="data:image/svg+xml,');
  });
  it("converts svg carrying an xmlns URL without linkifying it", () => {
    const namespaced = '<svg xmlns="http://www.w3.org/2000/svg" width="10"><circle r="5"/></svg>';
    const out = render(namespaced);
    expect(out).toContain('<img src="data:image/svg+xml,');
    expect(out).not.toContain('w3.org/2000/svg">');
  });
  it("converts multi-line svg across softbreaks", () => {
    expect(render('a\n<svg width="10">\n<circle r="5"/>\n</svg>\nb')).toContain(
      '<img src="data:image/svg+xml,',
    );
  });
  it("leaves unclosed svg as text for streaming", () => {
    expect(render('see <svg width="10"><circle')).toContain("&lt;svg");
  });
  it("leaves code spans untouched", () => {
    const out = render(`run \`${svg}\``);
    expect(out).toContain("<code>");
    expect(out).not.toContain("<img");
  });
});
