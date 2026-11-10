import { View, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { formatDiffCount } from "@/git/file-header-presentation";

interface DiffStatProps {
  additions: number;
  deletions: number;
  testID?: string;
}

export function DiffStat({ additions, deletions, testID }: DiffStatProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.additions}>+{formatDiffCount(additions)}</Text>
      <Text style={styles.deletions}>−{formatDiffCount(deletions)}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 6,
    flexShrink: 0,
  },
  additions: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.statusSuccess,
  },
  deletions: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.statusDanger,
  },
}));
