import { describe, expect, it } from "vitest";
import { splitYouTubeFences } from "./segments";
import { findYouTubeUrls, youtubeThumbnailUrl } from "./urls";

describe("splitYouTubeFences", () => {
  it("extracts ```youtube fences", () => {
    const segments = splitYouTubeFences(
      "before\n```youtube\nhttps://www.youtube.com/watch?v=4q6UGCyHZCI\n```\nafter",
    );
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube", "markdown"]);
    expect(segments[1].source).toContain("4q6UGCyHZCI");
  });

  it("extracts standalone bare YouTube URLs", () => {
    const segments = splitYouTubeFences("see this\nhttps://youtu.be/4q6UGCyHZCI\nnice");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube", "markdown"]);
  });

  it("keeps the standalone player for sole authored links", () => {
    const segments = splitYouTubeFences("[this](https://www.youtube.com/watch?v=4q6UGCyHZCI)");
    expect(segments.map((s) => s.kind)).toEqual(["youtube"]);
  });

  it("hosts a prose player for a link embedded in a sentence", () => {
    const segments = splitYouTubeFences(
      "watch [this](https://www.youtube.com/watch?v=4q6UGCyHZCI) now",
    );
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube-inline", "markdown"]);
    expect(segments[1].source).toBe("https://www.youtube.com/watch?v=4q6UGCyHZCI");
    expect(segments[0].source).toBe("watch ");
    expect(segments[2].source).toBe(" now");
  });

  it("hosts a prose player for a bare URL inside a sentence", () => {
    const segments = splitYouTubeFences("see https://youtu.be/4q6UGCyHZCI for the demo");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube-inline", "markdown"]);
    expect(segments[1].source).toBe("https://youtu.be/4q6UGCyHZCI");
    expect(segments[2].source).toBe(" for the demo");
  });

  it("keeps a URL with query and trailing period whole", () => {
    const segments = splitYouTubeFences("clip https://youtu.be/4q6UGCyHZCI?t=30. done");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "youtube-inline", "markdown"]);
    expect(segments[1].source).toBe("https://youtu.be/4q6UGCyHZCI?t=30");
    expect(segments[2].source).toBe(". done");
  });

  it("hosts two prose players in one line", () => {
    const segments = splitYouTubeFences(
      "a https://youtu.be/4q6UGCyHZCI b https://youtu.be/AAAAAAAAAAA c",
    );
    expect(segments.map((s) => s.kind)).toEqual([
      "markdown",
      "youtube-inline",
      "markdown",
      "youtube-inline",
      "markdown",
    ]);
  });

  it("leaves partial IDs in markdown (streaming-safe)", () => {
    const segments = splitYouTubeFences("https://youtu.be/4q6UGC");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("markdown");
  });

  it("leaves a partial ID embedded in prose in markdown", () => {
    const segments = splitYouTubeFences("see https://youtu.be/4q6UGC now");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("markdown");
  });

  it("leaves non-YouTube links alone", () => {
    const segments = splitYouTubeFences("see [docs](https://example.com/a) now");
    expect(segments.map((s) => s.kind)).toEqual(["markdown"]);
  });
});

describe("findYouTubeUrls", () => {
  it("reports exact ranges and trims trailing punctuation", () => {
    const text = "a https://youtu.be/4q6UGCyHZCI?t=30, b";
    const hits = findYouTubeUrls(text);
    expect(hits).toHaveLength(1);
    expect(hits[0].url).toBe("https://youtu.be/4q6UGCyHZCI?t=30");
    expect(text.slice(hits[0].index, hits[0].index + hits[0].length)).toBe(hits[0].url);
  });

  it("ignores partial IDs and bare words", () => {
    expect(findYouTubeUrls("https://youtu.be/4q6UGC and")).toHaveLength(0);
    expect(findYouTubeUrls("just prose")).toHaveLength(0);
  });

  it("builds poster frames", () => {
    expect(youtubeThumbnailUrl("4q6UGCyHZCI")).toBe(
      "https://i.ytimg.com/vi/4q6UGCyHZCI/hqdefault.jpg",
    );
  });
});
