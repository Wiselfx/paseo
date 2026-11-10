import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  type HostRuntimeConnectionStatus,
  useHostRuntimeConnectionStatus,
} from "@/runtime/host-runtime";
import { STATUS_INDICATOR_FILLED_DOT_SIZE } from "@/utils/status-indicator-geometry";

export function HostStatusDot({ serverId }: { serverId: string }) {
  const status = useHostRuntimeConnectionStatus(serverId);

  return <View style={[styles.dot, statusStyle(status)]} />;
}

function statusStyle(status: HostRuntimeConnectionStatus) {
  if (status === "online") return styles.dotOnline;
  if (status === "connecting") return styles.dotConnecting;
  return styles.dotOffline;
}

const styles = StyleSheet.create((theme) => ({
  dot: {
    width: STATUS_INDICATOR_FILLED_DOT_SIZE,
    height: STATUS_INDICATOR_FILLED_DOT_SIZE,
    borderRadius: theme.borderRadius.full,
    flexShrink: 0,
  },
  // The status-dot band, not the status glyph band: a 6px disc has to read at a glance.
  dotOnline: {
    backgroundColor: theme.colors.statusDotSuccess,
  },
  dotConnecting: {
    backgroundColor: theme.colors.statusDotWarning,
  },
  dotOffline: {
    backgroundColor: theme.colors.statusDotDanger,
  },
}));
