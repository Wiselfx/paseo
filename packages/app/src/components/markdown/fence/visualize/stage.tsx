import { useMemo, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { WebView } from "react-native-webview";
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

/**
 * Native stage: WebView over the same built document (no base URL, no file
 * access). Height arrives via postMessage. Inline surface, 800 max.
 */
export function VisualizeStage({ code }: { code: string }) {
  const scheme = useColorScheme();
  const colorScheme = scheme === "light" ? "light" : "dark";
  const [height, setHeight] = useState(240);
  const html = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const source = useMemo(() => ({ html }), [html]);
  return (
    <View style={styles.screen}>
      <WebView
        source={source}
        style={{ width: "100%", height }}
        javaScriptEnabled
        scrollEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (isVizHeightMessage(data)) setHeight(Math.min(Math.max(data.height, 80), 800));
          } catch {
            // Non-viz messages stay ignored.
          }
        }}
      />
    </View>
  );
}
