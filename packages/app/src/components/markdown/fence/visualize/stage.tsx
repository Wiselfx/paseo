import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { Theme } from "@/styles/theme";
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
 * Native stage: WebView over the same built document (no base URL, no file
 * access). Height, prompts, and state arrive via ReactNativeWebView
 * messages; load replies go back through injected JavaScript. Inline
 * surface, 800 max.
 */
export function VisualizeStage({
  code,
  serverId,
  agentId,
}: {
  code: string;
  serverId?: string;
  agentId?: string;
}) {
  const scheme = useColorScheme();
  const colorScheme = scheme === "light" ? "light" : "dark";
  const [height, setHeight] = useState(240);
  const html = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const source = useMemo(() => ({ html }), [html]);
  const stateKey = useMemo(() => hashCode(code), [code]);
  const webviewRef = useRef<WebView | null>(null);
  function reply(value: string | null, nonce: number) {
    webviewRef.current?.injectJavaScript(
      `(function(){window.dispatchEvent(new MessageEvent('message',{data:{type:'${VIZ_STATE_MESSAGE}',nonce:${nonce},value:${JSON.stringify(value)}}}));})();true;`,
    );
  }
  function handleMessage(event: WebViewMessageEvent) {
    let data: unknown;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (isVizHeightMessage(data)) {
      setHeight(Math.min(Math.max(data.height, 80), 800));
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
  }
  return (
    <View style={styles.screen}>
      <WebView
        ref={webviewRef}
        source={source}
        style={{ width: "100%", height }}
        javaScriptEnabled
        scrollEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        onMessage={handleMessage}
      />
    </View>
  );
}
