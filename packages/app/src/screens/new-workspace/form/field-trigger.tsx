import { forwardRef, useCallback, type ReactElement, type ReactNode } from "react";
import { Text, View, type PressableStateCallbackType } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { ComboboxTrigger } from "@/components/ui/combobox-trigger";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * `badge` is the desktop meta row: a borderless pill that names its field in a tooltip.
 * `field` is the compact form: a full-width filled box with the field's label inside, above the
 * value, so the whole field is one tap target.
 */
export type FieldTriggerVariant = "badge" | "field";

export interface FieldTriggerContentProps {
  variant: FieldTriggerVariant;
  /** The field's name, shown inside a `field`. */
  label: string;
  icon: ReactNode;
  value: string;
  /** Secondary text after the value, such as a terminal profile's name. */
  detail?: string;
}

export function FieldTriggerContent({
  variant,
  label,
  icon,
  value,
  detail,
}: FieldTriggerContentProps): ReactElement {
  const valueLine = (
    <>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={variant === "field" ? styles.fieldValue : styles.value} numberOfLines={1}>
        {value}
        {detail ? <Text style={styles.detail}> {detail}</Text> : null}
      </Text>
    </>
  );
  if (variant === "badge") {
    return valueLine;
  }
  return (
    <View style={styles.fieldBody}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.fieldValueLine}>{valueLine}</View>
    </View>
  );
}

/** Pressable style for a field trigger, for triggers that bring their own Pressable. */
export function useFieldTriggerStyle(variant: FieldTriggerVariant, disabled: boolean) {
  return useCallback(
    (state: PressableStateCallbackType & { hovered?: boolean }) => [
      variant === "field" ? styles.field : styles.badge,
      !disabled && Boolean(state.hovered) && styles.highlighted,
      !disabled &&
        state.pressed &&
        (variant === "field" ? styles.highlighted : styles.badgePressed),
      disabled && styles.disabled,
    ],
    [disabled, variant],
  );
}

export interface FieldTriggerProps extends FieldTriggerContentProps {
  /** What a screen reader announces; defaults to `label`. */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Desktop hover hint; badges only, since a field shows its label. */
  tooltip?: string;
  testID?: string;
}

/** A field trigger that anchors a Combobox. */
export const FieldTrigger = forwardRef<View, FieldTriggerProps>(function FieldTrigger(
  { accessibilityLabel, onPress, disabled = false, tooltip, testID, ...content },
  ref,
): ReactElement {
  const style = useFieldTriggerStyle(content.variant, disabled);
  const trigger = (
    <ComboboxTrigger
      ref={ref}
      chevron={null}
      block={content.variant === "field"}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? content.label}
    >
      <FieldTriggerContent {...content} />
    </ComboboxTrigger>
  );
  if (content.variant === "field" || !tooltip) return trigger;
  return (
    <Tooltip>
      <TooltipTrigger asChild triggerRefProp="ref">
        {trigger}
      </TooltipTrigger>
      <TooltipContent side="top" align="center" offset={8}>
        <Text style={styles.tooltipText}>{tooltip}</Text>
      </TooltipContent>
    </Tooltip>
  );
});

// Height of a badge. The desktop row sizes from it.
export const FIELD_BADGE_HEIGHT = 36;
// Height of a compact field: secondary line over value line. The compact stack reserves rows from it.
export const FIELD_HEIGHT = 36;

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: FIELD_BADGE_HEIGHT,
    maxWidth: 240,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.control,
    gap: theme.spacing[1],
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: FIELD_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.control,
    backgroundColor: theme.colors.surface1,
    gap: theme.spacing[2],
  },
  highlighted: {
    backgroundColor: theme.colors.hover,
  },
  badgePressed: {
    backgroundColor: theme.colors.pressed,
  },
  disabled: {
    opacity: 0.6,
  },
  iconBox: {
    width: theme.iconSize.md,
    height: theme.iconSize.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: theme.fontSize.base,
    lineHeight: 20,
    color: theme.colors.foreground,
  },
  fieldBody: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
    color: theme.colors.foregroundExtraMuted,
  },
  fieldValueLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
  },
  fieldValue: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: theme.fontSize.base,
    lineHeight: 20,
    color: theme.colors.foreground,
  },
  detail: {
    color: theme.colors.foregroundExtraMuted,
    lineHeight: 20,
  },
  tooltipText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.popoverForeground,
  },
}));
