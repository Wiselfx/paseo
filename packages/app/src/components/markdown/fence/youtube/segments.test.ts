import { describe, expect, it } from "vitest";
import { splitYouTubeFences } from "./segments";

describe("splitYouTubeFences", () => {
  it("extracts ```youtube fences", () => {
    const segments = splitYouTubeFences(
      "before\n```youtube\nhttps://www.youtube.com/watch?v=4q6UGCyHZCI\n```\nafter",
    );
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube", "markdown"]);
    expect(segments[1].source).toContain("4q6UGCyHZCI");
  });

  it("extracts standalone bare YouTube URLs", () => {
    const segments = splitYouTubeFences(
      "see this\nhttps://youtu.be/4q6UGCyHZCI\nnice",
    );
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube", "markdown"]);
  });

  it("leaves embedded links in markdown", () => {
    const segments = splitYouTubeFences(
      "watch [this](https://www.youtube.com/watch?v=4q6UGCyHZCI) now",
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("markdown");
  });

  it("leaves partial IDs in markdown (streaming-safe)", () => {
    const segments = splitYouTubeFences("https://youtu.be/4q6UGC");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("markdown");
  });
});
