import { useCallback } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";
import { buildWorkspaceAttachmentScopeKey } from "@/attachments/workspace-attachments-store";
import { useToast } from "@/contexts/toast-context";
import { useCheckoutGitActionsStore } from "@/git/actions-store";
import {
  PullRequestPane,
  PullRequestPaneError,
  PullRequestPaneSkeleton,
} from "@/git/pull-request-panel";
import type { UsePrPaneDataResult } from "@/git/pull-request-panel/use-data";

import { resolvePullRequestContentState } from "./state";
export {
  useWorkspacePullRequestDiscovery,
  useHasPullRequest,
  usePullRequestAutoAdd,
} from "./discovery";
export { usePullRequestData } from "./data";

export function PullRequestContent(input: {
  serverId: string;
  workspaceId?: string | null;
  cwd: string;
  prPane: UsePrPaneDataResult;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const refresh = useCheckoutGitActionsStore((state) => state.refresh);
  const onRetry = useCallback(() => {
    void refresh({ serverId: input.serverId, cwd: input.cwd }).catch((error) => {
      toast.error(error instanceof Error ? error.message : t("workspace.git.diff.failedRefresh"));
    });
  }, [input.cwd, input.serverId, refresh, t, toast]);

  if (input.prPane.data) {
    return (
      <PullRequestPane
        serverId={input.serverId}
        cwd={input.cwd}
        data={input.prPane.data}
        activityLoading={input.prPane.activityLoading}
        workspaceAttachmentScopeKey={buildWorkspaceAttachmentScopeKey({
          serverId: input.serverId,
          workspaceId: input.workspaceId,
          cwd: input.cwd,
        })}
      />
    );
  }
  const contentState = resolvePullRequestContentState(input.prPane);
  if (contentState === "error") {
    return <PullRequestPaneError onRetry={onRetry} />;
  }
  if (contentState === "loading") {
    return <PullRequestPaneSkeleton />;
  }
  return (
    <View style={styles.empty} testID="pull-request-empty-state">
      <Text style={styles.emptyTitle}>{t("panels.pullRequest.emptyTitle")}</Text>
      <Text style={styles.emptyDescription}>{t("panels.pullRequest.emptyDescription")}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[6],
    backgroundColor: theme.colors.surface0,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.foregroundMuted,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.foregroundExtraMuted,
    textAlign: "center",
  },
}));
