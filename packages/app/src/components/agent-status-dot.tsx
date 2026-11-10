import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  AGENT_LIFECYCLE_STATUSES,
  type AgentLifecycleStatus,
} from "@getpaseo/protocol/agent-lifecycle";
import { deriveSidebarStateBucket, type SidebarStateBucket } from "@/utils/sidebar-agent-state";
import { STATUS_INDICATOR_FILLED_DOT_SIZE } from "@/utils/status-indicator-geometry";

/** The breathing period, from DSH's `--dsh-claude-period-status-breathe`. */
const RUNNING_BREATHE_DURATION = 1200;

export function AgentStatusDot({
  status,
  requiresAttention,
  attentionReason,
  pendingPermissionCount,
}: {
  status: string | null | undefined;
  requiresAttention: boolean | null | undefined;
  attentionReason?: "finished" | "error" | "permission" | null;
  pendingPermissionCount?: number;
}) {
  if (!status) {
    return null;
  }
  if (!isAgentLifecycleStatus(status)) {
    return null;
  }

  const bucket = deriveSidebarStateBucket({
    status,
    requiresAttention: Boolean(requiresAttention),
    attentionReason: attentionReason ?? null,
    pendingPermissionCount: pendingPermissionCount ?? 0,
  });
  return <AgentStatusDotView bucket={bucket} />;
}

/** The dot for a bucket, without an agent to derive it from. */
export function AgentStatusDotView({ bucket }: { bucket: SidebarStateBucket }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (bucket !== "running" || reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = 0.3;
    opacity.value = withRepeat(
      withTiming(1, { duration: RUNNING_BREATHE_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [bucket, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (bucket === "done") {
    return <View style={[styles.dot, styles.idle]} testID="agent-status-dot-done" />;
  }
  return (
    <Animated.View
      style={[styles.dot, bucketStyle(bucket), animatedStyle]}
      testID={`agent-status-dot-${bucket}`}
    />
  );
}

function bucketStyle(bucket: Exclude<SidebarStateBucket, "done">) {
  switch (bucket) {
    case "needs_input":
      return styles.awaitingInput;
    case "attention":
      return styles.unread;
    case "failed":
      return styles.error;
    case "running":
      return styles.running;
  }
}

function isAgentLifecycleStatus(value: string): value is AgentLifecycleStatus {
  return AGENT_LIFECYCLE_STATUSES.some((status) => status === value);
}

const styles = StyleSheet.create((theme) => ({
  dot: {
    width: STATUS_INDICATOR_FILLED_DOT_SIZE,
    height: STATUS_INDICATOR_FILLED_DOT_SIZE,
    borderRadius: theme.borderRadius.full,
    flexShrink: 0,
  },
  // Working is the one state that moves; its ink is the muted neutral so the motion, not the
  // colour, is what reports it.
  running: {
    backgroundColor: theme.colors.foregroundExtraMuted,
  },
  // Awaiting an answer. Amber because it wants something from you.
  awaitingInput: {
    backgroundColor: theme.colors.statusDotWarning,
  },
  // Unread is a reminder, not a failure: blue, the accent's dot band.
  unread: {
    backgroundColor: theme.colors.statusDotRunning,
  },
  error: {
    backgroundColor: theme.colors.statusDotDanger,
  },
  // An idle row still holds the rail, hollow so it reports nothing.
  idle: {
    borderWidth: 1.5,
    borderColor: theme.colors.foregroundExtraMuted,
    backgroundColor: "transparent",
  },
}));
