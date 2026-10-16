import { describe, expect, it } from "vitest";
import { splitLinkCards } from "./link-card-segments";

describe("splitLinkCards", () => {
  it("extracts standalone bare links", () => {
    const segments = splitLinkCards("see this\nhttps://github.com/\nnow");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "card", "markdown"]);
    expect(segments[1].source).toBe("https://github.com/");
  });

  it("leaves embedded links in markdown", () => {
    expect(splitLinkCards("see https://github.com/ now")).toHaveLength(1);
  });

  it("leaves authored links in markdown", () => {
    expect(splitLinkCards("[hub](https://github.com/)")).toHaveLength(1);
  });

  it("leaves bare image URLs and YouTube URLs out", () => {
    expect(splitLinkCards("https://example.com/shot.png")).toHaveLength(1);
    expect(splitLinkCards("https://youtu.be/4q6UGCyHZCI")).toHaveLength(1);
  });

  it("leaves list links as links", () => {
    expect(splitLinkCards("- https://github.com/")).toHaveLength(1);
  });
});
