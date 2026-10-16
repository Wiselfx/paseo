import { describe, expect, it } from "vitest";
import { splitVisualizeFences } from "./segments";
import { buildVizDocument, isVizHeightMessage, VIZ_CSP } from "./document";

describe("splitVisualizeFences", () => {
  it("extracts visualize fences", () => {
    const segments = splitVisualizeFences("before\n```visualize\n<div>hi</div>\n```\nafter");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "viz", "markdown"]);
    expect(segments[1].source).toBe("<div>hi</div>");
  });

  it("ignores other fence languages", () => {
    expect(splitVisualizeFences("```mermaid\ngraph\n```")).toHaveLength(1);
  });

  it("paints unclosed fences partial (streaming), settles on complete", () => {
    const segments = splitVisualizeFences("```visualize\n<div>hi");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("viz");
  });
});

describe("buildVizDocument", () => {
  it("embeds CSP, theme vars, height reporter, and code intact", () => {
    const doc = buildVizDocument("<div>hi</div>", "dark");
    expect(doc).toContain(VIZ_CSP);
    expect(doc).toContain("--viz-accent");
    expect(doc).toContain("viz:height");
    expect(doc).toContain("<div>hi</div>");
  });

  it("carries hostile strings without breaking out", () => {
    const hostile = "</script><script>alert(1)</script></iframe><svg onload=x>";
    const doc = buildVizDocument(hostile, "light");
    expect(doc).toContain(hostile);
    expect(doc.indexOf("</body></html>")).toBeGreaterThan(doc.indexOf(hostile));
  });

  it("validates height messages", () => {
    expect(isVizHeightMessage({ type: "viz:height", height: 300 })).toBe(true);
    expect(isVizHeightMessage({ type: "viz:height", height: -5 })).toBe(false);
    expect(isVizHeightMessage({ type: "other", height: 300 })).toBe(false);
    expect(isVizHeightMessage(null)).toBe(false);
  });
});
