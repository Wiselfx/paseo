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

export interface YouTubeUrlHit {
  index: number;
  length: number;
  url: string;
  videoId: string;
}

const URL_CHAR_RE = /[^\s"'`<>*]/;
const TRAILING_PUNCT_RE = /[.,;:!?)\]}>"']+$/;

/**
 * YouTube URLs sitting inside prose, with exact source ranges. The URL keeps
 * consuming while it stays URL-ish, so `?t=30` rides along and a sentence
 * period or closing paren stays prose. Streaming-safe like youtubeIdForUrl.
 */
export function findYouTubeUrls(text: string): YouTubeUrlHit[] {
  const re = new RegExp(YOUTUBE_ID_RE.source, "gi");
  const hits: YouTubeUrlHit[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    let end = match.index + match[0].length;
    while (end < text.length && URL_CHAR_RE.test(text.charAt(end))) end += 1;
    const url = text.slice(match.index, end).replace(TRAILING_PUNCT_RE, "");
    end = match.index + url.length;
    hits.push({ index: match.index, length: url.length, url, videoId: match[1] });
    re.lastIndex = end;
  }
  return hits;
}

/** Poster frame for the prose player. hqdefault letterboxes 16:9 inside 4:3. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
