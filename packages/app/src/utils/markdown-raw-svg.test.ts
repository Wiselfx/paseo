import { describe, expect, it } from "vitest";
import { hoistRawSvgToImages } from "./markdown-raw-svg";

describe("hoistRawSvgToImages", () => {
  const svg = '<svg width="10"><circle r="5"/></svg>';

  it("converts closed svg to a data-URI image", () => {
    expect(hoistRawSvgToImages(`see ${svg}`)).toContain("![](data:image/svg+xml,");
  });
  it("converts svg carrying an xmlns URL without touching it", () => {
    const namespaced = '<svg xmlns="http://www.w3.org/2000/svg" width="10"><circle r="5"/></svg>';
    const out = hoistRawSvgToImages(namespaced);
    expect(out).toContain("![](data:image/svg+xml,");
    expect(out).not.toContain("w3.org/2000/svg ");
  });
  it("converts multi-line svg", () => {
    expect(hoistRawSvgToImages('a\n<svg width="10">\n<circle r="5"/>\n</svg>\nb')).toContain(
      "![](data:image/svg+xml,",
    );
  });
  it("leaves unclosed svg as text for streaming", () => {
    expect(hoistRawSvgToImages("see <svg width=\"10\"><circle")).toContain("<svg");
  });
  it("leaves fenced and inline code untouched", () => {
    expect(hoistRawSvgToImages(`run \`${svg}\``)).not.toContain("![](");
    expect(hoistRawSvgToImages(`\`\`\`\n${svg}\n\`\`\``)).not.toContain("![](");
  });
});
