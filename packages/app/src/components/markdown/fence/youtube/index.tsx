import { useMemo } from "react";
import { YouTubeInlinePlayer } from "./player";
import type { MarkdownFenceRendererProps } from "../types";
import { youtubeIdForUrl } from "./urls";

export { YouTubeInlinePlayer };
export { youtubeEmbedUrl, youtubeIdForUrl, youtubeWatchUrl } from "./urls";

/** ```youtube fence: code is a watch URL or bare video ID. */
export function YouTubeFence({ code }: MarkdownFenceRendererProps) {
  const videoId = useMemo(() => youtubeIdForUrl(code), [code]);
  if (!videoId) return null;
  return <YouTubeInlinePlayer videoId={videoId} />;
}
