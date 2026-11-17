import type { Session } from "electron";

// The packaged app loads from `paseo://app`. Chromium sends that as the iframe's
// Referer, and YouTube answers an embed whose Referer is not http(s) with error 153.
export const YOUTUBE_EMBED_REFERER = "https://paseo.sh/";

const YOUTUBE_EMBED_URLS = [
  "https://www.youtube-nocookie.com/embed/*",
  "https://www.youtube.com/embed/*",
];

export function youtubeEmbedRequestHeaders(
  headers: Record<string, string | string[]>,
): Record<string, string | string[]> {
  const current = Object.entries(headers).find(([name]) => name.toLowerCase() === "referer");
  if (current && /^https?:\/\//i.test(String(current[1]))) return headers;
  const next = { ...headers };
  if (current) delete next[current[0]];
  next.Referer = YOUTUBE_EMBED_REFERER;
  return next;
}

export function installYouTubeEmbedReferer(target: Session): void {
  target.webRequest.onBeforeSendHeaders({ urls: YOUTUBE_EMBED_URLS }, (details, callback) => {
    callback({ requestHeaders: youtubeEmbedRequestHeaders(details.requestHeaders) });
  });
}
