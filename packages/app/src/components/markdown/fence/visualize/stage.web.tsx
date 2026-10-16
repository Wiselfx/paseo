import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { buildVizDocument, isVizHeightMessage } from "./document";

const styles = StyleSheet.create((theme: Theme) => ({
  screen: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface1,
  },
}));

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `v${Math.abs(h).toString(36)}`;
}

/**
 * Web stage: sandboxed srcdoc iframe. `allow-scripts` only: no same-origin,
 * so the document has an opaque origin and cannot touch parent DOM by
 * construction. Height arrives via postMessage, validated by source.
 * Inline surface (one screenful max): taller content clips at 800.
 */
export function VisualizeStage({ code }: { code: string }) {
  const scheme = useColorScheme();
  const colorScheme = scheme === "light" ? "light" : "dark";
  const [height, setHeight] = useState(240);
  const srcDoc = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const frameId = useMemo(() => hashCode(code), [code]);
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const frame = document.querySelector(
        `iframe[data-viz="${frameId}"]`,
      ) as HTMLIFrameElement | null;
      if (event.source !== frame?.contentWindow) return;
      if (isVizHeightMessage(event.data)) setHeight(Math.min(Math.max(event.data.height, 80), 800));
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [frameId]);
  return (
    <View style={styles.screen}>
      <iframe
        data-viz={frameId}
        srcDoc={srcDoc}
        title="Visualization"
        sandbox="allow-scripts"
        style={{ width: "100%", height, borderWidth: 0, display: "block" }}
      />
    </View>
  );
}
