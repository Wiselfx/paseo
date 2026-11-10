import { useRetainedPullRequestData } from "./pull-request/data";
import {
  pullRequestPanelPresentation,
  usePullRequestPanelDescriptor,
} from "./pull-request/descriptor";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";
import invariant from "tiny-invariant";
import { usePaneContext } from "@/panels/pane-context";
import { definePanel } from "@/panels/panel-registry";
import { PullRequestContent } from "@/panels/pull-request";
import { useWorkspaceDirectory } from "@/stores/session-store-hooks";

function PullRequestPanel() {
  const { t } = useTranslation();
  const { serverId, workspaceId, target } = usePaneContext();
  const cwd = useWorkspaceDirectory(serverId, workspaceId) ?? "";
  invariant(target.kind === "pull_request", "PullRequestPanel requires pull_request target");
  const prPane = useRetainedPullRequestData({ serverId, cwd }, "content");
  if (!cwd) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>{t("panels.file.directoryMissing")}</Text>
      </View>
    );
  }
  return (
    <PullRequestContent serverId={serverId} workspaceId={workspaceId} cwd={cwd} prPane={prPane} />
  );
}

export const pullRequestPanelRegistration = definePanel("pull_request", {
  component: PullRequestPanel,
  presentation: pullRequestPanelPresentation,
  useDescriptor: usePullRequestPanelDescriptor,
});

const styles = StyleSheet.create((theme) => ({
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface0,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.foregroundExtraMuted,
    textAlign: "center",
  },
}));
