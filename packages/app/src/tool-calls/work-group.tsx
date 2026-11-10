import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ScrollView,
  StyleSheet as NativeStyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
} from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ChevronRight, CircleDot, FileSymlink, TriangleAlert } from "lucide-react-native";
import { PressHighlight } from "@/components/ui/press-highlight";
import {
  ProcessCardScopeProvider,
  useInsideProcessCard,
  useInsideTurnBody,
} from "@/agent-stream/process-card-scope";
import { CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";
import type { Theme } from "@/styles/theme";

const HEADER_HEIGHT = 36;
const ROW_MIN_HEIGHT = 36;
const DOT_SIZE = 4;
const GLYPH_SIZE = 12;
const ThemedChevronRight = withUnistyles(ChevronRight);
const ThemedCircleDot = withUnistyles(CircleDot);
const ThemedFileSymlink = withUnistyles(FileSymlink);
const ThemedTriangleAlert = withUnistyles(TriangleAlert);
const mutedIconMapping = (theme: Theme) => ({ color: theme.colors.foregroundExtraMuted });
const dangerIconMapping = (theme: Theme) => ({ color: theme.colors.destructive });

/** Fades and lifts content into place. Height is final at insertion; closing unmounts. */
export function WorkGroupFold({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const easing = useMemo(() => Easing.bezier(...CLAUDE_EASE.out), []);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: CLAUDE_DURATION.reveal, easing });
  }, [easing, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -2 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function WorkGroupLoadingDots() {
  const reduceMotion = useReducedMotion();
  const first = useSharedValue(0);
  const second = useSharedValue(0);
  const third = useSharedValue(0);
  const easing = useMemo(() => Easing.inOut(Easing.quad), []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const dots = [
      { progress: first, delay: 0 },
      { progress: second, delay: 150 },
      { progress: third, delay: 300 },
    ] as const;
    for (const dot of dots) {
      dot.progress.value = 0;
      dot.progress.value = withDelay(
        dot.delay,
        withRepeat(withTiming(1, { duration: 450, easing }), -1, true),
      );
    }
    return () => {
      cancelAnimation(first);
      cancelAnimation(second);
      cancelAnimation(third);
    };
  }, [easing, first, reduceMotion, second, third]);

  const firstStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.65 : 0.3 + first.value * 0.7,
  }));
  const secondStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.65 : 0.3 + second.value * 0.7,
  }));
  const thirdStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.65 : 0.3 + third.value * 0.7,
  }));

  return (
    <View style={styles.loadingDots} testID="work-group-loading">
      <Animated.View style={[styles.loadingDot, firstStyle]} />
      <Animated.View style={[styles.loadingDot, secondStyle]} />
      <Animated.View style={[styles.loadingDot, thirdStyle]} />
    </View>
  );
}

function WorkGroupChevron({ expanded }: { expanded: boolean }) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(expanded ? 1 : 0);
  const easing = useMemo(() => Easing.bezier(...CLAUDE_EASE.out), []);

  useEffect(() => {
    const target = expanded ? 1 : 0;
    rotation.value = reduceMotion
      ? target
      : withTiming(target, { duration: CLAUDE_DURATION.feedback, easing });
  }, [easing, expanded, reduceMotion, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));

  return (
    <Animated.View style={[styles.chevron, style]}>
      <ThemedChevronRight size={GLYPH_SIZE} uniProps={mutedIconMapping} />
    </Animated.View>
  );
}

interface WorkGroupCardProps {
  label: string;
  expanded: boolean;
  onToggle?: () => void;
  isLoading?: boolean;
  isLastInSequence?: boolean;
  disableOuterSpacing?: boolean;
  testID?: string;
  children?: ReactNode;
}

/** A bordered process card: one summary header and, when open, its rows inline. */
export function WorkGroupCard({
  label,
  expanded,
  onToggle,
  isLoading = false,
  isLastInSequence = false,
  disableOuterSpacing,
  testID,
  children,
}: WorkGroupCardProps) {
  const { height: windowHeight } = useWindowDimensions();
  const rows = useMemo(() => Children.toArray(children), [children]);
  const hasRows = rows.length > 0;
  const maxBodyHeight = Math.min(400, windowHeight * 0.5);
  const rowsStyle = useMemo(() => [styles.rows, { maxHeight: maxBodyHeight }], [maxBodyHeight]);
  const headerStyle = useCallback(
    ({ hovered, pressed }: PressableStateCallbackType & { hovered?: boolean }) => [
      styles.header,
      hovered ? styles.hover : null,
      pressed ? styles.pressed : null,
    ],
    [],
  );
  const accessibilityState = useMemo(
    () => (onToggle ? { expanded } : undefined),
    [expanded, onToggle],
  );

  return (
    <View
      style={[
        !disableOuterSpacing &&
          (isLastInSequence ? styles.containerLastInSequence : styles.containerSpacing),
      ]}
      testID={testID}
    >
      <PressHighlight
        style={headerStyle}
        onPress={onToggle}
        disabled={!onToggle}
        accessibilityRole={onToggle ? "button" : undefined}
        accessibilityState={accessibilityState}
      >
        {isLoading ? <WorkGroupLoadingDots /> : null}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <WorkGroupChevron expanded={expanded} />
      </PressHighlight>
      {expanded && hasRows ? (
        <View style={styles.card}>
          <ScrollView style={rowsStyle} nestedScrollEnabled showsVerticalScrollIndicator>
            <WorkGroupFold>
              <ProcessCardScopeProvider value={true}>
                {rows.map((row, index) => (
                  <View
                    key={isValidElement(row) ? String(row.key) : `row-${index}`}
                    style={index > 0 ? styles.rowDivider : undefined}
                  >
                    {row}
                  </View>
                ))}
              </ProcessCardScopeProvider>
            </WorkGroupFold>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

interface WorkGroupRowProps {
  label: string;
  subtitle?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onOpenFile?: () => void;
  details?: ReactNode;
  trailing?: "status" | "chevron";
  isLastInSequence?: boolean;
  isGroupRow?: boolean;
  disableOuterSpacing?: boolean;
  testID?: string;
}

/**
 * DSH rows carry no success mark: the chevron or the details say the row is done, and
 * a line of checks reads as a checklist rather than a transcript. Running and failed
 * rows keep a glyph because only those states change what the row means.
 */
function RowStatusGlyph({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isError) {
    return <ThemedTriangleAlert size={GLYPH_SIZE} uniProps={dangerIconMapping} />;
  }
  if (isLoading) {
    return <ThemedCircleDot size={GLYPH_SIZE} uniProps={mutedIconMapping} />;
  }
  return null;
}

function WorkGroupRowDetails({
  insideTurnBody,
  children,
}: {
  insideTurnBody: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.details, insideTurnBody ? styles.detailsInTurnBody : null]}>
      {children}
    </View>
  );
}

/** One line of work inside a process card: what ran, its preview, and its status. */
export function WorkGroupRow({
  label,
  subtitle,
  isExpanded = false,
  onToggle,
  isLoading = false,
  isError = false,
  onOpenFile,
  details,
  trailing = "status",
  isLastInSequence = false,
  isGroupRow = false,
  disableOuterSpacing,
  testID,
}: WorkGroupRowProps) {
  const insideProcessCard = useInsideProcessCard();
  const insideTurnBody = useInsideTurnBody();
  const [hovered, setHovered] = useState(false);
  const handleHoverIn = useCallback(() => setHovered(true), []);
  const handleHoverOut = useCallback(() => setHovered(false), []);
  const rowStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [
      styles.rowToggle,
      pressed ? styles.pressed : null,
    ],
    [],
  );
  const accessibilityState = useMemo(
    () => (onToggle ? { expanded: isExpanded } : undefined),
    [isExpanded, onToggle],
  );
  const rowSpacing = useMemo(() => {
    if (insideProcessCard || insideTurnBody || isGroupRow || disableOuterSpacing) return null;
    return isLastInSequence ? styles.containerLastInSequence : styles.containerSpacing;
  }, [disableOuterSpacing, insideProcessCard, insideTurnBody, isGroupRow, isLastInSequence]);
  const rowShellStyle = useMemo(
    () => [styles.row, insideTurnBody ? styles.rowInTurnBody : null, hovered ? styles.hover : null],
    [hovered, insideTurnBody],
  );
  const trailingNode =
    isLoading || isError || !onToggle ? (
      <RowStatusGlyph isLoading={isLoading} isError={isError} />
    ) : (
      <WorkGroupChevron expanded={isExpanded} />
    );

  return (
    <View style={rowSpacing} testID={testID}>
      <View style={rowShellStyle} onPointerEnter={handleHoverIn} onPointerLeave={handleHoverOut}>
        <PressHighlight
          style={insideTurnBody ? styles.rowToggleInTurnBody : rowStyle}
          onPress={onToggle}
          disabled={!onToggle}
          accessibilityRole={onToggle ? "button" : undefined}
          accessibilityState={accessibilityState}
        >
          <View style={styles.rowText}>
            <Text
              style={[styles.rowTitle, trailing === "chevron" ? styles.rowTitleMuted : null]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {subtitle ? <View style={styles.rowDot} /> : null}
            {subtitle ? (
              <Text style={styles.rowSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailingNode}
        </PressHighlight>
        {onOpenFile ? (
          <PressHighlight
            onPress={onOpenFile}
            accessibilityRole="button"
            testID="tool-call-open-file"
            style={styles.openFile}
            hitSlop={6}
          >
            <ThemedFileSymlink size={GLYPH_SIZE} uniProps={mutedIconMapping} />
          </PressHighlight>
        ) : null}
      </View>
      {details ? (
        <WorkGroupRowDetails insideTurnBody={insideTurnBody}>{details}</WorkGroupRowDetails>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  containerSpacing: {
    marginBottom: theme.spacing[1],
  },
  containerLastInSequence: {
    marginBottom: theme.spacing[4],
  },
  card: {
    marginTop: 8,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.control,
    overflow: "hidden",
  },
  header: {
    minHeight: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
    color: theme.colors.foregroundMuted,
    fontFamily: theme.fontFamily.ui,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 6,
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  loadingDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: theme.colors.brand,
  },
  rows: {},
  rowDivider: {
    borderTopWidth: NativeStyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingRight: 12,
    borderRadius: theme.borderRadius.md,
  },
  rowToggle: {
    minHeight: ROW_MIN_HEIGHT,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingLeft: 12,
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.md,
  },
  // The turn body card already insets its rows; the row must not inset again.
  rowInTurnBody: {
    paddingRight: 0,
  },
  rowToggleInTurnBody: {
    minHeight: ROW_MIN_HEIGHT,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.md,
  },
  rowText: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
  },
  rowTitle: {
    flexShrink: 1,
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.ui,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitleMuted: {
    color: theme.colors.foregroundMuted,
  },
  rowSubtitle: {
    flexShrink: 1,
    color: theme.colors.foregroundExtraMuted,
    fontFamily: theme.fontFamily.ui,
    fontSize: 13,
    lineHeight: 18,
  },
  rowDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.foregroundExtraMuted,
  },
  hover: {
    backgroundColor: theme.colors.hover,
  },
  pressed: {
    backgroundColor: theme.colors.pressed,
  },
  openFile: {
    padding: theme.spacing[1],
    margin: -theme.spacing[1],
    marginLeft: "auto",
    borderRadius: theme.borderRadius.md,
  },
  details: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  detailsInTurnBody: {
    paddingHorizontal: 0,
  },
}));
