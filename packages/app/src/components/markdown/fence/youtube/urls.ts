const YOUTUBE_ID_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^#\s]*?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i;
const BARE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract an 11-char YouTube video ID from a watch/shorts/live/embed URL or a
 * bare ID. Streaming-safe: partial URLs never match, so a link only flips to a
 * player once the ID is complete.
 */
export function youtubeIdForUrl(value: string): string | null {
  const input = value.trim();
  if (BARE_ID_RE.test(input)) return input;
  return YOUTUBE_ID_RE.exec(input)?.[1] ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
