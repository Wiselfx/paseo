import { View } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { ChevronRight } from "lucide-react-native";
import { SPACING, type Theme } from "@/styles/theme";
import { inlineUnistylesStyle } from "@/styles/unistyles-inline-style";

// Shared presentation primitives for the app's directory trees. Both the Files
// explorer (server-loaded listings) and the Changes view (client-built from diff
// paths) render different data, but their ROWS should look identical — same
// indentation, guides, density, name emphasis, and chevron. Keep those here so the two trees can't
// drift apart.
export const TREE_INDENT_PER_LEVEL = 16;
export const WORKSPACE_FILE_ROW_VERTICAL_PADDING = SPACING[1.5];
export const WORKSPACE_TREE_ICON_SIZE = 16;
export const WORKSPACE_TREE_LOADING_ICON_SIZE = 14;
export const WORKSPACE_TREE_ICON_LABEL_GAP = SPACING[2];

// Fork: touch web keeps the menu, so its rows must not select on long-press.
/** True on touch-driven web browsers (phones/tablets). Native apps never hit
 * the Safari touch-callout problem, so they keep default text behavior. */
const SUPPRESS_TOUCH_CALLOUT =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const TOUCH_CALLOUT_SUPPRESSION = SUPPRESS_TOUCH_CALLOUT ? { userSelect: "none" as const } : {};
/**
 * Trailing glyph rail shared with the explorer X and Changes options chevron.
 * The extra 2px is optical: text ink ends inside its layout box, while the
 * header icons' strokes extend to theirs.
 */
/** Shared painted-edge rail for pane headers, toolbars, and tree/diff rows. */
export const WORKSPACE_PANE_TRAILING_GLYPH_RAIL = SPACING[2];

/** Left padding for a row in either workspace tree. */
export function treeRowPaddingLeft(depth: number): number {
  return SPACING[3] + depth * TREE_INDENT_PER_LEVEL;
}

const INDENT_GUIDE_WIDTH = 1;

/** Left edge of each guide on a row at `depth`: one per ancestor, centred under its chevron. */
export function treeIndentGuideOffsets(depth: number): number[] {
  const chevronCenter = (WORKSPACE_TREE_ICON_SIZE - INDENT_GUIDE_WIDTH) / 2;
  return Array.from({ length: depth }, (_, level) => treeRowPaddingLeft(level) + chevronCenter);
}

/**
 * The ancestor lines of a tree row. Render it first inside the element that paints the row's
 * hover and selection fill, so the lines span the row and stay above the fill.
 */
export function TreeIndentGuides({ depth }: { depth: number }) {
  return treeIndentGuideOffsets(depth).map((left) => (
    <View
      key={left}
      pointerEvents="none"
      style={[styles.indentGuide, inlineUnistylesStyle({ left })]}
      testID="tree-indent-guide"
    />
  ));
}

const foregroundExtraMutedIconColorMapping = (theme: Theme) => ({
  color: theme.colors.foregroundExtraMuted,
});

const ThemedChevronRight = withUnistyles(ChevronRight);

/** Rotating disclosure chevron for a directory row (points right; rotates down when expanded). */
export function TreeChevron({ expanded }: { expanded: boolean }) {
  return (
    <View style={expanded ? [styles.chevron, styles.chevronExpanded] : styles.chevron}>
      <ThemedChevronRight
        size={WORKSPACE_TREE_ICON_SIZE}
        uniProps={foregroundExtraMutedIconColorMapping}
      />
    </View>
  );
}

export const workspaceTreeRowStyles = StyleSheet.create((theme: Theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: WORKSPACE_FILE_ROW_VERTICAL_PADDING,
    paddingRight: WORKSPACE_PANE_TRAILING_GLYPH_RAIL,
    // Touch web (iOS Safari): stop the OS hijacking long-press with its own
    // callout/magnifier so the gesture reaches the context menu trigger.
    // (If Safari ever needs the stronger `-webkit-touch-callout: none`, it
    // has no RN type — add it here via a CSS escape hatch, not this object.)
    // Desktop keeps text selection; copy remains via the menu everywhere.
    ...(SUPPRESS_TOUCH_CALLOUT ? TOUCH_CALLOUT_SUPPRESSION : {}),
  },
  active: {
    backgroundColor: theme.colors.surfaceSidebarHover,
  },
  name: { color: theme.colors.foreground, opacity: 0.76 },
  nameHovered: { opacity: 1 },
}));

const styles = StyleSheet.create((theme: Theme) => ({
  indentGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: INDENT_GUIDE_WIDTH,
    // Translucent ink, not `border`: a solid line that colour disappears into a hovered row's fill.
    backgroundColor: theme.colors.foregroundExtraMuted,
    opacity: theme.opacity[50],
  },
  chevron: {
    width: WORKSPACE_TREE_ICON_SIZE,
    height: WORKSPACE_TREE_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },
}));
