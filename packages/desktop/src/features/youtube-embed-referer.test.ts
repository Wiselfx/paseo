import { describe, expect, it } from "vitest";
import { YOUTUBE_EMBED_REFERER, youtubeEmbedRequestHeaders } from "./youtube-embed-referer";

describe("youtubeEmbedRequestHeaders", () => {
  it("replaces the app-scheme referer", () => {
    expect(youtubeEmbedRequestHeaders({ Referer: "paseo://app/", Accept: "*/*" })).toEqual({
      Accept: "*/*",
      Referer: YOUTUBE_EMBED_REFERER,
    });
  });

  it("adds a referer when none is sent", () => {
    expect(youtubeEmbedRequestHeaders({})).toEqual({ Referer: YOUTUBE_EMBED_REFERER });
  });

  it("keeps an http(s) referer", () => {
    const headers = { referer: "http://localhost:6767/" };
    expect(youtubeEmbedRequestHeaders(headers)).toBe(headers);
  });
});
