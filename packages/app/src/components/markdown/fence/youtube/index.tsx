import { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { WebView } from "react-native-webview";
import { Play } from "lucide-react-native";
import { openExternalUrl } from "@/utils/open-external-url";
import type { MarkdownFenceRendererProps } from "../types";

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

export function YouTubeInlinePlayer({ videoId }: { videoId: string }) {
  const { theme } = useUnistyles();
  const embedUrl = useMemo(() => youtubeEmbedUrl(videoId), [videoId]);
  const watchUrl = useMemo(() => youtubeWatchUrl(videoId), [videoId]);
  const handleOpen = useCallback(() => {
    void openExternalUrl(watchUrl);
  }, [watchUrl]);
  const styles = useMemo(
    () => ({
      card: { gap: 6 },
      screen: {
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: 8,
        overflow: "hidden" as const,
        backgroundColor: theme.colors.surface2,
      },
      player: { width: "100%", height: "100%" },
      metaRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
      },
      host: { color: theme.colors.foregroundMuted, fontSize: 12 },
    }),
    [theme],
  );

  return (
    <View style={styles.card}>
      <View style={styles.screen}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.player}
          javaScriptEnabled
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          scrollEnabled={false}
        />
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open YouTube video ${videoId}`}
        onPress={handleOpen}
        style={styles.metaRow}
      >
        <Play size={12} color={theme.colors.foregroundMuted} />
        <Text style={styles.host}>youtube.com · {videoId}</Text>
      </Pressable>
    </View>
  );
}

/** ```youtube fence: code is a watch URL or bare video ID. */
export function YouTubeFence({ code }: MarkdownFenceRendererProps) {
  const videoId = useMemo(() => youtubeIdForUrl(code), [code]);
  if (!videoId) return null;
  return <YouTubeInlinePlayer videoId={videoId} />;
}
