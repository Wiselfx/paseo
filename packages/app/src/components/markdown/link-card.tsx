import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { displayUrl, domainForUrl } from "./media-links";

/**
 * Native port of the plugin's link card: favicon + domain + trimmed URL.
 * No prose note (prose stays in place — nothing to steal) and no gates.
 * Renders for standalone bare links; embedded links stay links.
 */

const stylesheet = StyleSheet.create((theme) => ({
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.surface1,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  pressed: { opacity: 0.85 },
  icon: { width: 32, height: 32, borderRadius: 8 },
  col: { flex: 1, gap: 2 },
  domain: { color: theme.colors.foreground, fontWeight: "600", fontSize: 13 },
  url: { color: theme.colors.foregroundMuted, fontSize: 12 },
}));

export function AssistantLinkCard({
  url,
  onPress,
}: {
  url: string;
  onPress: (url: string) => void;
}) {
  const [iconGone, setIconGone] = useState(false);
  const domain = domainForUrl(url);
  return (
    <View style={stylesheet.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${domain}`}
        onPress={() => onPress(url)}
        style={({ pressed }) => [stylesheet.row, pressed && stylesheet.pressed]}
      >
        {!iconGone ? (
          <Image
            source={{ uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=64` }}
            style={stylesheet.icon}
            onError={() => setIconGone(true)}
            accessibilityLabel={`${domain} icon`}
          />
        ) : null}
        <View style={stylesheet.col}>
          <Text style={stylesheet.domain} numberOfLines={1} ellipsizeMode="tail">
            {domain}
          </Text>
          <Text style={stylesheet.url} numberOfLines={1} ellipsizeMode="middle">
            {displayUrl(url)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
