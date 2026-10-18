import { useCallback, useMemo, type CSSProperties } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Play } from "lucide-react-native";
import type { Theme } from "@/styles/theme";
import { openExternalUrl } from "@/utils/open-external-url";
import { youtubeEmbedUrl, youtubeWatchUrl } from "./urls";

/**
 * Web player: plain iframe. react-native-webview is a stub on web that
 * renders "does not support this platform", so the native WebView
 * implementation (player.tsx) cannot run here. Same chrome, same URLs.
 */

const styles = StyleSheet.create((theme: Theme) => ({
  card: { gap: 6 },
  screen: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.surface2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  host: { color: theme.colors.foregroundMuted, fontSize: 12 },
}));

const iframeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderWidth: 0,
};

function YouTubeInlinePlayerBase({ videoId, theme }: { videoId: string; theme: Theme }) {
  const watchUrl = useMemo(() => youtubeWatchUrl(videoId), [videoId]);
  const handleOpen = useCallback(() => {
    void openExternalUrl(watchUrl);
  }, [watchUrl]);

  return (
    <View style={styles.card}>
      <View style={styles.screen}>
        <YouTubePlayerScreen videoId={videoId} />
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open YouTube video ${videoId}`}
        onPress={handleOpen}
        style={styles.metaRow as ViewStyle}
      >
        <Play size={12} color={theme.colors.foregroundMuted} />
        <Text style={styles.host as TextStyle}>youtube.com · {videoId}</Text>
      </Pressable>
    </View>
  );
}

/** The embed surface, sized by its parent box. */
export function YouTubePlayerScreen({ videoId }: { videoId: string }) {
  const embedUrl = useMemo(() => youtubeEmbedUrl(videoId), [videoId]);
  return (
    <iframe
      src={embedUrl}
      title={`YouTube video ${videoId}`}
      style={iframeStyle}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

export const YouTubeInlinePlayer = withUnistyles(YouTubeInlinePlayerBase, (theme) => ({ theme }));
