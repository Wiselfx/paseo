import { useMemo, useRef, useState } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Maximize2 } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { Theme } from "@/styles/theme";
import { useStableEvent } from "@/hooks/use-stable-event";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  buildVizDocument,
  isVizHeightMessage,
  isVizLoadMessage,
  isVizPromptMessage,
  isVizSaveMessage,
  VIZ_STATE_MESSAGE,
} from "./document";
import { sendVizPrompt, vizGetState, vizSetState } from "./bridges";
import { openVizPanel, type VisualizeStageProps } from "./store";

const styles = StyleSheet.create((theme: Theme) => ({
  screen: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface1,
  },
  // Floating control: part of the visualization rather than a strip above it, so
  // the card is nothing but the document at every size.
  expand: {
    position: "absolute",
    right: 8,
    bottom: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    opacity: 0.92,
  },
}));

const ThemedMaximize2 = withUnistyles(Maximize2);
const mutedColorMapping = (theme: Theme) => ({ color: theme.colors.foregroundMuted });

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `v${Math.abs(h).toString(36)}`;
}

/**
 * Native stage: WebView over the same built document (no base URL, no file
 * access). Height, prompts, and state arrive via ReactNativeWebView
 * messages; load replies go back through injected JavaScript. Inline
 * surface caps at one screenful; the panel renders uncapped.
 */
export function VisualizeStage({
  code,
  serverId,
  agentId,
  workspaceId,
  expanded,
  uncapped,
}: VisualizeStageProps) {
  const scheme = useColorScheme();
  const colorScheme = scheme === "light" ? "light" : "dark";
  const [height, setHeight] = useState(240);
  const html = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const source = useMemo(() => ({ html }), [html]);
  const stateKey = useMemo(() => hashCode(code), [code]);
  const webviewRef = useRef<WebView | null>(null);
  const cap = uncapped ? 100000 : 800;
  const canExpand = !expanded && serverId && workspaceId;
  const frameStyle = useMemo<ViewStyle>(() => ({ width: "100%", height }), [height]);
  const openPanel = useStableEvent(() => {
    void openVizPanel({ serverId: serverId!, workspaceId: workspaceId!, code, agentId });
  });
  function reply(value: string | null, nonce: number) {
    webviewRef.current?.injectJavaScript(
      `(function(){window.dispatchEvent(new MessageEvent('message',{data:{type:'${VIZ_STATE_MESSAGE}',nonce:${nonce},value:${JSON.stringify(value)}}}));})();true;`,
    );
  }
  const handleMessage = useStableEvent((event: WebViewMessageEvent) => {
    let data: unknown;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (isVizHeightMessage(data)) {
      setHeight(Math.min(Math.max(data.height, 80), cap));
      return;
    }
    if (isVizPromptMessage(data)) {
      void sendVizPrompt(serverId, agentId, data.text);
      return;
    }
    if (isVizSaveMessage(data)) {
      void vizSetState(`${stateKey}:${data.key}`, data.value);
      return;
    }
    if (isVizLoadMessage(data)) {
      vizGetState(`${stateKey}:${data.key}`).then(
        (value) => reply(value, data.nonce),
        () => reply(null, data.nonce),
      );
    }
  });
  return (
    <View style={styles.screen}>
      <WebView
        ref={webviewRef}
        source={source}
        style={frameStyle}
        javaScriptEnabled
        scrollEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        onMessage={handleMessage}
      />
      {canExpand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open visualization in panel"
          onPress={openPanel}
          style={styles.expand}
        >
          <ThemedMaximize2 size={14} uniProps={mutedColorMapping} />
        </Pressable>
      ) : null}
    </View>
  );
}
