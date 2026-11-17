import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { Code, Image as ImageIcon } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { HighlightedCodeBlock } from "@/components/highlighted-code-block";
import type { Theme } from "@/styles/theme";
import { RAW_SVG_MAX_CHARS } from "@/utils/markdown-raw-svg";

export { splitSvgFences } from "./segments";

const styles = StyleSheet.create((theme: Theme) => ({
  card: { gap: 6 },
  drawing: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.surface1,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  toggleLabel: { color: theme.colors.foregroundMuted, fontSize: 12 },
}));

const ThemedCode = withUnistyles(HighlightedCodeBlock);
const codeStyle = (theme: Theme) => ({
  inheritedStyles: {
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.code,
  },
  textStyle: { backgroundColor: theme.colors.surface2, padding: 12, borderRadius: 8 },
});
const ThemedCodeIcon = withUnistyles(Code);
const ThemedImageIcon = withUnistyles(ImageIcon);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });

function aspectRatio(svg: string): number {
  const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
  if (box && Number(box[1]) > 0 && Number(box[2]) > 0) return Number(box[1]) / Number(box[2]);
  return 4 / 3;
}

/**
 * ```svg fence: the drawing, with a toggle to the source. SvgXml draws static
 * vector content, so scripts in the markup never run. An unfinished (streaming)
 * or oversized fence has nothing to draw yet and shows its code.
 */
export function SvgFence({ code }: { code: string }) {
  const [showSource, setShowSource] = useState(false);
  const toggle = useCallback(() => setShowSource((value) => !value), []);
  const drawable = /<\/svg\s*>\s*$/i.test(code.trim()) && code.length <= RAW_SVG_MAX_CHARS;
  const ratio = useMemo(() => aspectRatio(code), [code]);
  if (!drawable) return <ThemedCode code={code} language="xml" uniProps={codeStyle} />;
  const label = showSource ? "View image" : "View source";
  const Icon = showSource ? ThemedImageIcon : ThemedCodeIcon;
  return (
    <View style={styles.card}>
      {showSource ? (
        <ThemedCode code={code} language="xml" uniProps={codeStyle} />
      ) : (
        <View style={[styles.drawing as ViewStyle, { aspectRatio: ratio }]}>
          <SvgXml xml={code} width="100%" height="100%" />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={toggle}
        style={styles.toggle as ViewStyle}
      >
        <Icon size={12} uniProps={mutedIcon} />
        <Text style={styles.toggleLabel as TextStyle}>{label}</Text>
      </Pressable>
    </View>
  );
}
