import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Download, LayoutDashboard } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import invariant from "tiny-invariant";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Theme } from "@/styles/theme";
import { useStableEvent } from "@/hooks/use-stable-event";
import { usePaneContext } from "@/panels/pane-context";
import { definePanel, type PanelDescriptor, type PanelIconProps } from "@/panels/panel-registry";
import { buildVizDocument } from "@/components/markdown/fence/visualize/document";
import {
  readVizDoc,
  readVizDocSync,
  type VizDoc,
} from "@/components/markdown/fence/visualize/store";
import { VisualizeStage } from "@/components/markdown/fence/visualize/stage";

const styles = StyleSheet.create((theme: Theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  missing: { color: theme.colors.foregroundMuted, padding: 16 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { color: theme.colors.foreground, fontWeight: "600", fontSize: 13, flex: 1 },
  // Same pill as the inline stage's expand control, so both ends read as one system.
  exportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
  },
  exportLabel: { color: theme.colors.foregroundMuted, fontSize: 12 },
  scroll: { flex: 1 },
}));

const ThemedDownload = withUnistyles(Download);
const mutedColorMapping = (theme: Theme) => ({ color: theme.colors.foregroundMuted });

function VizTabIcon({ size, color }: PanelIconProps) {
  return <LayoutDashboard size={size} color={color} />;
}

function useVizPanelDescriptor(target: { kind: "viz"; vizId: string }): PanelDescriptor {
  const doc = readVizDocSync(target.vizId);
  const label = doc?.title ?? "Visualization";
  return {
    label,
    subtitle: label,
    tooltip: label,
    titleState: "ready",
    icon: VizTabIcon,
    statusBucket: null,
  };
}

function exportFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "visualization"}.html`;
}

async function exportVizDoc(doc: VizDoc): Promise<void> {
  const html = buildVizDocument(doc.code, "dark");
  const fileName = exportFilename(doc.title);
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const file = new File(Paths.cache, fileName);
  file.write(html);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/html", dialogTitle: fileName });
  }
}

export function VizPanel() {
  const { target } = usePaneContext();
  invariant(target.kind === "viz", "VizPanel requires viz target");
  const [doc, setDoc] = useState<VizDoc | null>(() => readVizDocSync(target.vizId));
  const onExport = useStableEvent(() => {
    if (doc) void exportVizDoc(doc).catch(() => {});
  });
  useEffect(() => {
    let live = true;
    readVizDoc(target.vizId).then(
      (loaded) => {
        if (live) {
          setDoc(loaded);
        }
        return undefined;
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [target.vizId]);
  if (!doc) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>Visualization unavailable.</Text>
      </View>
    );
  }
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text style={styles.title} numberOfLines={1}>
          {doc.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export visualization"
          onPress={onExport}
          style={styles.exportRow}
        >
          <ThemedDownload size={14} uniProps={mutedColorMapping} />
          <Text style={styles.exportLabel}>Export</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll}>
        <VisualizeStage
          code={doc.code}
          serverId={doc.serverId}
          agentId={doc.agentId}
          expanded
          uncapped
        />
      </ScrollView>
    </View>
  );
}

export const vizPanelRegistration = definePanel("viz", {
  component: VizPanel,
  useDescriptor: useVizPanelDescriptor,
});
