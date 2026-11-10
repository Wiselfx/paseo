import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import type { LayoutChangeEvent, StyleProp, TextStyle, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import {
  createControlGeometry,
  controlIconSize,
  type ControlSize,
} from "@/components/ui/control-geometry";
import { useContainedControlSize } from "@/components/ui/control-size";
import { focusRingStyle } from "@/components/ui/focus-ring";
import { CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";
import type { Theme } from "@/styles/theme";

type SegmentedControlIconRenderer = (props: { color: string; size: number }) => ReactNode;

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: SegmentedControlIconRenderer;
  disabled?: boolean;
  testID?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: ControlSize;
  hideLabels?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface SegmentIconProps {
  icon: SegmentedControlIconRenderer;
  iconSize: number;
  iconColor: string;
}

function SegmentIcon({ icon, iconSize, iconColor }: SegmentIconProps) {
  return <View style={styles.iconContainer}>{icon({ color: iconColor, size: iconSize })}</View>;
}

const ThemedSegmentIcon = withUnistyles(SegmentIcon);

const selectedIconMapping = (theme: Theme) => ({ iconColor: theme.colors.foreground });
const mutedIconMapping = (theme: Theme) => ({ iconColor: theme.colors.foregroundMuted });

interface SegmentLayout {
  x: number;
  width: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  size: sizeProp,
  hideLabels = false,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const containedSize = useContainedControlSize();
  const reducedMotion = useReducedMotion();
  const size = sizeProp ?? containedSize ?? "md";
  const sizeStyles = {
    sm: { container: styles.containerSm, segment: styles.segmentSm, label: styles.labelSm },
    md: { container: styles.containerMd, segment: styles.segmentMd, label: styles.labelMd },
  }[size];
  const containerSizeStyle = sizeStyles.container;
  const segmentSizeStyle = sizeStyles.segment;
  const labelSizeStyle = sizeStyles.label;
  const iconSize = controlIconSize[size];
  const [layouts, setLayouts] = useState<Record<string, SegmentLayout>>({});
  const selectedLayout = layouts[value];
  const thumbLeft = useSharedValue(0);
  const thumbWidth = useSharedValue(0);

  useEffect(() => {
    if (!selectedLayout) return;
    if (thumbWidth.value === 0) {
      thumbLeft.value = selectedLayout.x;
      thumbWidth.value = selectedLayout.width;
      return;
    }
    const config = {
      duration: reducedMotion ? 0 : CLAUDE_DURATION.swap,
      easing: Easing.bezier(
        CLAUDE_EASE.out[0],
        CLAUDE_EASE.out[1],
        CLAUDE_EASE.out[2],
        CLAUDE_EASE.out[3],
      ),
    };
    thumbLeft.value = withTiming(selectedLayout.x, config);
    thumbWidth.value = withTiming(selectedLayout.width, config);
  }, [selectedLayout, reducedMotion, thumbLeft, thumbWidth]);

  const thumbStyle = useAnimatedStyle(() => ({
    left: thumbLeft.value,
    width: thumbWidth.value,
    opacity: thumbWidth.value > 0 ? 1 : 0,
  }));

  const handleSegmentLayout = useCallback((segmentValue: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((current) => {
      const previous = current[segmentValue];
      if (previous && previous.x === x && previous.width === width) return current;
      return { ...current, [segmentValue]: { x, width } };
    });
  }, []);

  const containerStyle = useMemo(
    () => [styles.container, containerSizeStyle, style],
    [containerSizeStyle, style],
  );

  return (
    <View style={containerStyle} testID={testID}>
      <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <SegmentItem
            key={option.value}
            option={option}
            isSelected={isSelected}
            iconSize={iconSize}
            hideLabels={hideLabels}
            segmentSizeStyle={segmentSizeStyle}
            labelSizeStyle={labelSizeStyle}
            currentValue={value}
            onValueChange={onValueChange}
            onLayout={handleSegmentLayout}
          />
        );
      })}
    </View>
  );
}

function SegmentItem<T extends string>({
  option,
  isSelected,
  iconSize,
  hideLabels,
  segmentSizeStyle,
  labelSizeStyle,
  currentValue,
  onValueChange,
  onLayout,
}: {
  option: SegmentedControlOption<T>;
  isSelected: boolean;
  iconSize: number;
  hideLabels: boolean;
  segmentSizeStyle: StyleProp<ViewStyle>;
  labelSizeStyle: StyleProp<TextStyle>;
  currentValue: T;
  onValueChange: (value: T) => void;
  onLayout: (segmentValue: string, event: LayoutChangeEvent) => void;
}) {
  const labelStyle = useMemo(
    () => [styles.label, labelSizeStyle, isSelected && styles.labelSelected],
    [labelSizeStyle, isSelected],
  );
  const handlePress = useCallback(() => {
    if (!option.disabled && option.value !== currentValue) {
      onValueChange(option.value);
    }
  }, [option.disabled, option.value, currentValue, onValueChange]);
  const pressableStyle = useCallback(
    ({
      hovered,
      pressed,
      focused = false,
    }: PressableStateCallbackType & { hovered?: boolean; focused?: boolean }) => [
      styles.segment,
      segmentSizeStyle,
      Boolean(hovered) && !isSelected && styles.segmentHover,
      pressed && !isSelected && styles.segmentPressed,
      option.disabled && styles.segmentDisabled,
      focused && !option.disabled ? focusRingStyle() : null,
    ],
    [isSelected, option.disabled, segmentSizeStyle],
  );
  const accessibilityState = useMemo(
    () => ({ selected: isSelected, disabled: option.disabled }),
    [isSelected, option.disabled],
  );
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onLayout(option.value, event),
    [onLayout, option.value],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      aria-selected={isSelected}
      disabled={option.disabled}
      testID={option.testID}
      onPress={handlePress}
      onLayout={handleLayout}
      style={pressableStyle}
    >
      {option.icon ? (
        <ThemedSegmentIcon
          icon={option.icon}
          iconSize={iconSize}
          uniProps={isSelected ? selectedIconMapping : mutedIconMapping}
        />
      ) : null}
      {hideLabels ? null : (
        <Text style={labelStyle} numberOfLines={1}>
          {option.label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => {
  const geometry = createControlGeometry(theme);

  return {
    container: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface2,
      gap: theme.spacing[1],
    },
    containerSm: {
      ...geometry.segmentedContainerSm,
    },
    containerMd: {
      ...geometry.segmentedContainerMd,
    },
    segment: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      gap: theme.spacing[1],
    },
    segmentSm: {
      ...geometry.segmentedSegmentSm,
    },
    segmentMd: {
      ...geometry.segmentedSegmentMd,
    },
    thumb: {
      position: "absolute",
      top: 2,
      bottom: 2,
      backgroundColor: theme.colors.surface1,
      borderWidth: theme.borderWidth[1],
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
    },
    segmentHover: {
      backgroundColor: theme.colors.hover,
    },
    segmentPressed: {
      backgroundColor: theme.colors.pressed,
    },
    segmentDisabled: {
      opacity: theme.opacity[50],
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      color: theme.colors.foregroundExtraMuted,
      fontWeight: theme.fontWeight.normal,
    },
    labelSm: {
      ...geometry.segmentedLabelSm,
    },
    labelMd: {
      ...geometry.segmentedLabelMd,
    },
    labelSelected: {
      color: theme.colors.foreground,
    },
  };
});
