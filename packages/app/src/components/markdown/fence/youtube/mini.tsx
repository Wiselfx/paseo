import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Play } from "lucide-react-native";
import { StyleSheet } from "react-native-unistyles";
import { useStableEvent } from "@/hooks/use-stable-event";
import type { Theme } from "@/styles/theme";
import { YouTubePlayerScreen } from "./player";
import { youtubeIdForUrl, youtubeThumbnailUrl } from "./urls";

/**
 * Prose player: a mention-sized poster beside running text, tap to load the
 * real player in place. Sized to read as a playable mention, not a media
 * event: 16:9, never wider than 320, radius 12 like images and cards.
 */
const styles = StyleSheet.create((theme: Theme) => ({
  frame: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface2,
  },
  poster: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
}));

export function YouTubeMiniPlayer({ code }: { code: string }) {
  const videoId = useMemo(() => youtubeIdForUrl(code), [code]);
  const [playing, setPlaying] = useState(false);
  const thumbnail = videoId ? youtubeThumbnailUrl(videoId) : null;
  const posterSource = useMemo(() => ({ uri: thumbnail ?? "" }), [thumbnail]);
  const startPlaying = useStableEvent(() => setPlaying(true));
  if (!videoId || !thumbnail) return null;
  return (
    <View style={styles.frame}>
      {playing ? (
        <YouTubePlayerScreen videoId={videoId} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play YouTube video ${videoId}`}
          onPress={startPlaying}
          style={styles.poster}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={posterSource}
            style={styles.poster}
            resizeMode="cover"
          />
          <View style={styles.overlay} pointerEvents="none">
            {/* White in both themes: it sits on a dark scrim over the poster. */}
            <View style={styles.glyph}>
              <Play size={16} color="#fff" />
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}
