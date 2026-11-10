import { useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { DensityIcon } from "@/components/ui/density-icon";
import { useIsCompactFormFactor } from "@/constants/layout";
import { isNative } from "@/constants/platform";

/** A sidebar section label such as "Pinned" or "Workspaces". A section with `onToggle`
 * collapses from its title; children sit at the trailing edge as its actions. */
export function SidebarSectionHeader({
  title,
  collapsed,
  onToggle,
  testID,
  children,
}: {
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
  testID?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onToggle ? (
        <CollapsibleTitle
          title={title}
          collapsed={collapsed ?? false}
          onToggle={onToggle}
          testID={testID}
        />
      ) : (
        <Text style={styles.title} testID={testID}>
          {title}
        </Text>
      )}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

function CollapsibleTitle({
  title,
  collapsed,
  onToggle,
  testID,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  const isCompact = useIsCompactFormFactor();
  const accessibilityState = useMemo(() => ({ expanded: !collapsed }), [collapsed]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onToggle}
      style={styles.toggle}
      testID={testID}
    >
      {({ hovered }) => (
        <>
          <Text style={styles.title}>{title}</Text>
          {hovered || isNative || isCompact ? (
            <DensityIcon
              icon={collapsed ? ChevronRight : ChevronDown}
              size="xs"
              color="foregroundMuted"
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[1.5],
    // The label sits at the same inset as the rows' text, with the trailing actions pulled
    // right so their painted glyph stops on the row rail.
    paddingLeft: 10,
    paddingRight: 4,
    userSelect: "none",
  },
  // The toggle reaches back over the header's leading padding so the whole label edge is pressable.
  toggle: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    marginLeft: -10,
    paddingHorizontal: 10,
  },
  title: {
    color: theme.colors.foregroundExtraMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
    fontWeight: theme.fontWeight.normal,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
}));
