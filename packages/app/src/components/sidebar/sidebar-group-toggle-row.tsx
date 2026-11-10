import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { StyleSheet } from "react-native-unistyles";
import { isWeb } from "@/constants/platform";
import { sidebarWorkspaceRowStyles } from "@/components/sidebar/sidebar-workspace-row-content";
import { SidebarRowBackground } from "@/components/sidebar/sidebar-row-background";
import { DensityIcon } from "@/components/ui/density-icon";
import { densityIconBox } from "@/styles/density";

/**
 * The row that ends a truncated group. It is a workspace row that happens to say "Show more", so
 * it takes the workspace row's geometry — height, padding, radius, and both fills — rather than a
 * set of its own. Sitting under a column of rows, anything it does differently reads as a mistake
 * rather than as a distinction.
 *
 * `indented` because the two groupings disagree: status rows sit on their header's label rail and
 * project rows sit flush, so the caller says which list this row is ending. The indent itself is
 * the workspace row's, imported rather than re-derived.
 */
export function SidebarGroupToggleRow({
  expanded,
  onPress,
  indented = false,
  testID,
}: {
  expanded: boolean;
  onPress: () => void;
  indented?: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  const label = t(
    expanded ? "sidebar.workspace.actions.showLess" : "sidebar.workspace.actions.showMore",
  );
  const rowStyle = useMemo(
    () => [styles.row, indented && sidebarWorkspaceRowStyles.rowIndented],
    [indented],
  );

  return (
    <Pressable
      accessibilityRole={isWeb ? undefined : "button"}
      accessibilityLabel={label}
      onPress={onPress}
      style={rowStyle}
      testID={testID}
    >
      {({ hovered, pressed }) => (
        <>
          <SidebarRowBackground hovered={Boolean(hovered)} pressed={pressed} />
          <View style={styles.iconSlot}>
            <DensityIcon
              icon={expanded ? ChevronUp : ChevronDown}
              size="sm"
              color={hovered || pressed ? "foreground" : "foregroundMuted"}
            />
          </View>
          <Text style={hovered || pressed ? styles.textHovered : styles.text} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Kept in step with `workspaceRow` in sidebar-workspace-list.tsx and sidebar-status-list.tsx.
  row: {
    position: "relative",
    minHeight: 44,
    marginBottom: theme.spacing[0.5],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.control,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    userSelect: "none",
  },
  // The width of a workspace row's status slot, so the label lands on the same rail as the
  // titles above it rather than two points to their left.
  iconSlot: {
    width: densityIconBox("md"),
    height: densityIconBox("md"),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    minWidth: 0,
    flexShrink: 1,
  },
  textHovered: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    minWidth: 0,
    flexShrink: 1,
  },
}));
