import { useCallback, useMemo } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { WebView } from "react-native-webview";
import { Play } from "lucide-react-native";
import type { Theme } from "@/styles/theme";
import { openExternalUrl } from "@/utils/open-external-url";
import { youtubeEmbedUrl, youtubeWatchUrl } from "./urls";

const styles = StyleSheet.create((theme: Theme) => ({
  card: { gap: 6 },
  screen: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.surface2,
  },
  player: { width: "100%", height: "100%" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  host: { color: theme.colors.foregroundMuted, fontSize: 12 },
}));

function YouTubeInlinePlayerBase({ videoId, theme }: { videoId: string; theme: Theme }) {
  const embedUrl = useMemo(() => youtubeEmbedUrl(videoId), [videoId]);
  const watchUrl = useMemo(() => youtubeWatchUrl(videoId), [videoId]);
  const source = useMemo(() => ({ uri: embedUrl }), [embedUrl]);
  const handleOpen = useCallback(() => {
    void openExternalUrl(watchUrl);
  }, [watchUrl]);

  return (
    <View style={styles.card}>
      <View style={styles.screen}>
        <WebView
          source={source}
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
        style={styles.metaRow as ViewStyle}
      >
        <Play size={12} color={theme.colors.foregroundMuted} />
        <Text style={styles.host as TextStyle}>youtube.com · {videoId}</Text>
      </Pressable>
    </View>
  );
}

export const YouTubeInlinePlayer = withUnistyles(YouTubeInlinePlayerBase, (theme) => ({ theme }));
