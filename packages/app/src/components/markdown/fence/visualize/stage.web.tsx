import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
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
 * Web stage: sandboxed srcdoc iframe. `allow-scripts` only: no same-origin,
 * so the document has an opaque origin and cannot touch parent DOM by
 * construction. Height, prompts, and state arrive via postMessage, each
 * validated by source and shape. Inline surface (one screenful max).
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
  const srcDoc = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const frameId = useMemo(() => hashCode(code), [code]);
  const stateKey = useMemo(() => hashCode(code), [code]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function reply(value: string | null, nonce: number) {
      frameRef.current?.contentWindow?.postMessage({ type: VIZ_STATE_MESSAGE, nonce, value }, "*");
    }
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
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
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [serverId, agentId, stateKey]);
  return (
    <View style={styles.screen}>
      <iframe
        ref={frameRef}
        data-viz={frameId}
        srcDoc={srcDoc}
        title="Visualization"
        sandbox="allow-scripts"
        style={{ width: "100%", height, borderWidth: 0, display: "block" }}
      />
    </View>
  );
}
