import { useMemo } from "react";
import { YouTubeInlinePlayer } from "./player";
import { YouTubeMiniPlayer } from "./mini";
import { youtubeIdForUrl } from "./urls";

export { YouTubeInlinePlayer, YouTubeMiniPlayer };
export { youtubeEmbedUrl, youtubeIdForUrl, youtubeWatchUrl } from "./urls";

/** ```youtube fence: code is a watch URL or bare video ID. Standalone
 * bare YouTube URLs on their own line also arrive here via segments. */
export function YouTubeFence({ code }: { code: string }) {
  const videoId = useMemo(() => youtubeIdForUrl(code), [code]);
  if (!videoId) return null;
  return <YouTubeInlinePlayer videoId={videoId} />;
}
