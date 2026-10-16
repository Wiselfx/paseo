import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeIdForUrl, youtubeWatchUrl } from "./urls";

describe("youtubeIdForUrl", () => {
  it("matches watch, shorts, live, embed, and youtu.be", () => {
    expect(youtubeIdForUrl("https://www.youtube.com/watch?v=4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("https://www.youtube.com/watch?x=1&v=4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("https://m.youtube.com/shorts/4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("https://www.youtube.com/live/4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("https://www.youtube.com/embed/4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("https://youtu.be/4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
    expect(youtubeIdForUrl("4q6UGCyHZCI")).toBe("4q6UGCyHZCI");
  });
  it("rejects partial IDs and non-URLs", () => {
    expect(youtubeIdForUrl("https://www.youtube.com/watch?v=short")).toBe(null);
    expect(youtubeIdForUrl("https://example.com/")).toBe(null);
    expect(youtubeIdForUrl("4q6UGCyHZCIX")).toBe(null);
  });
});

describe("embed and watch URLs", () => {
  it("builds nocookie embeds and watch links", () => {
    expect(youtubeEmbedUrl("4q6UGCyHZCI")).toBe(
      "https://www.youtube-nocookie.com/embed/4q6UGCyHZCI?rel=0",
    );
    expect(youtubeWatchUrl("4q6UGCyHZCI")).toBe("https://www.youtube.com/watch?v=4q6UGCyHZCI");
  });
});
