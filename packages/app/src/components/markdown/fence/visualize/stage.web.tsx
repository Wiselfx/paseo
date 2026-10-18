import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Maximize2 } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
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
import { openVizPanel } from "./store";

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

export interface VisualizeStageProps {
  code: string;
  serverId?: string;
  agentId?: string;
  workspaceId?: string;
  expanded?: boolean;
  uncapped?: boolean;
}

/**
 * Web stage: sandboxed srcdoc iframe. `allow-scripts` only: no same-origin,
 * so the document has an opaque origin and cannot touch parent DOM by
 * construction. Height, prompts, and state arrive via postMessage, each
 * validated by source and shape. Inline surface caps at one screenful;
 * the panel renders uncapped.
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
  const srcDoc = useMemo(() => buildVizDocument(code, colorScheme), [code, colorScheme]);
  const frameId = useMemo(() => hashCode(code), [code]);
  const stateKey = useMemo(() => hashCode(code), [code]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const cap = uncapped ? 100000 : 800;
  const canExpand = !expanded && serverId && workspaceId;
  const frameStyle = useMemo(
    () => ({ width: "100%", height, borderWidth: 0, display: "block" }),
    [height],
  );
  const openPanel = useStableEvent(() => {
    void openVizPanel({ serverId: serverId!, workspaceId: workspaceId!, code, agentId });
  });
  useEffect(() => {
    function reply(value: string | null, nonce: number) {
      frameRef.current?.contentWindow?.postMessage({ type: VIZ_STATE_MESSAGE, nonce, value }, "*");
    }
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
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
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [serverId, agentId, stateKey, cap]);
  return (
    <View style={styles.screen}>
      <iframe
        ref={frameRef}
        data-viz={frameId}
        srcDoc={srcDoc}
        title="Visualization"
        sandbox="allow-scripts"
        style={frameStyle}
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
