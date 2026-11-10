import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useContainedControlSize } from "@/components/ui/control-size";
import {
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { Pressable, Text, View } from "react-native";
import type {
  GestureResponderEvent,
  NativeSyntheticEvent,
  PressableProps,
  StyleProp,
  TargetedEvent,
  TextStyle,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import {
  controlIconSize,
  createControlGeometry,
  type ControlSize,
} from "@/components/ui/control-geometry";
import { focusRingStyle, isKeyboardFocusVisible } from "@/components/ui/focus-ring";
import { CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";
import type { Theme } from "@/styles/theme";

type ButtonVariant = "default" | "brand" | "secondary" | "outline" | "ghost" | "destructive";

type LeftIcon =
  | ReactElement
  | ComponentType<{ color: string; size: number }>
  | ((color: string) => ReactElement)
  | null;

interface ButtonIconProps {
  loading: boolean;
  leftIcon?: LeftIcon;
  iconSize: number;
  iconColor: string;
}

function ButtonIcon({ loading, leftIcon, iconSize, iconColor }: ButtonIconProps) {
  if (loading) {
    return (
      <View>
        <LoadingSpinner size="small" color={iconColor} />
      </View>
    );
  }

  if (!leftIcon) return null;

  if (typeof leftIcon === "object" && "type" in leftIcon) {
    return <View>{leftIcon}</View>;
  }

  if (
    typeof leftIcon === "function" &&
    !leftIcon.prototype?.isReactComponent &&
    leftIcon.length > 0
  ) {
    return <View>{(leftIcon as (color: string) => ReactElement)(iconColor)}</View>;
  }

  const Icon = leftIcon as ComponentType<{ color: string; size: number }>;
  return (
    <View>
      <Icon color={iconColor} size={iconSize} />
    </View>
  );
}

const ThemedButtonIcon = withUnistyles(ButtonIcon);

const foregroundIconMapping = (theme: Theme) => ({ iconColor: theme.colors.foreground });
const foregroundMutedIconMapping = (theme: Theme) => ({
  iconColor: theme.colors.foregroundMuted,
});
const accentForegroundIconMapping = (theme: Theme) => ({
  iconColor: theme.colors.accentForeground,
});
const destructiveForegroundIconMapping = (theme: Theme) => ({
  iconColor: theme.colors.destructiveForeground,
});
const styles = StyleSheet.create((theme) => {
  const geometry = createControlGeometry(theme);

  return {
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing[1.5],
      borderRadius: theme.borderRadius.control,
      borderWidth: 1,
      borderColor: "transparent",
      overflow: "hidden",
    },
    md: {
      ...geometry.buttonMd,
    },
    sm: {
      ...geometry.buttonSm,
    },
    iconOnlySm: geometry.buttonIconOnlySm,
    iconOnlyMd: geometry.buttonIconOnlyMd,
    default: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    brand: {
      backgroundColor: theme.colors.brand,
      borderColor: theme.colors.brand,
    },
    secondary: {
      backgroundColor: theme.colors.surface1,
      borderColor: theme.colors.border,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: theme.colors.borderAccent,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    destructive: {
      backgroundColor: theme.colors.destructive,
      borderColor: theme.colors.destructive,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      borderRadius: theme.borderRadius.control,
    },
    overlayHover: {
      backgroundColor: theme.colors.hover,
    },
    overlayPressed: {
      backgroundColor: theme.colors.pressed,
    },
    disabled: {
      opacity: theme.opacity[50],
    },
    text: {
      color: theme.colors.foreground,
      ...geometry.buttonTextMd,
      fontWeight: theme.fontWeight.medium,
    },
    textSm: {
      ...geometry.buttonTextSm,
    },
    textDefault: {
      color: theme.colors.primaryForeground,
    },
    textBrand: {
      color: theme.colors.accentForeground,
    },
    textDestructive: {
      color: theme.colors.destructiveForeground,
    },
    textGhost: {
      color: theme.colors.foregroundMuted,
    },
    textGhostHovered: {
      color: theme.colors.foreground,
    },
  };
});

export function Button({
  children,
  variant = "secondary",
  size: sizeProp,
  leftIcon,
  trailing,
  style,
  textStyle,
  numberOfLines,
  disabled,
  loading = false,
  accessibilityRole,
  accessibilityState: accessibilityStateProp,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  ...props
}: PropsWithChildren<
  Omit<PressableProps, "style"> & {
    ref?: React.Ref<View>;
    variant?: ButtonVariant;
    size?: ControlSize;
    leftIcon?: LeftIcon;
    trailing?: ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    numberOfLines?: number;
    loading?: boolean;
  }
>) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const hoverProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const containedSize = useContainedControlSize();
  const size = sizeProp ?? containedSize ?? "md";
  const isDisabled = disabled || loading;

  let variantStyle: ViewStyle;
  if (variant === "default") {
    variantStyle = styles.default;
  } else if (variant === "brand") {
    variantStyle = styles.brand;
  } else if (variant === "secondary") {
    variantStyle = styles.secondary;
  } else if (variant === "outline") {
    variantStyle = styles.outline;
  } else if (variant === "ghost") {
    variantStyle = styles.ghost;
  } else {
    variantStyle = styles.destructive;
  }

  const isIconOnly = children == null && leftIcon != null;
  const sizeStyle = size === "sm" ? styles.sm : styles.md;
  const iconOnlyStyle = size === "sm" ? styles.iconOnlySm : styles.iconOnlyMd;
  const isGhostHovered = hovered && variant === "ghost";

  const handleHoverIn = useCallback(() => setHovered(true), []);
  const handleHoverOut = useCallback(() => setHovered(false), []);
  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn],
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut],
  );
  const handleFocus = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      onFocus?.(event);
      if (isKeyboardFocusVisible()) setFocused(true);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  useEffect(() => {
    const config = {
      duration: reducedMotion ? 0 : CLAUDE_DURATION.feedback,
      easing: Easing.bezier(
        CLAUDE_EASE.out[0],
        CLAUDE_EASE.out[1],
        CLAUDE_EASE.out[2],
        CLAUDE_EASE.out[3],
      ),
    };
    hoverProgress.value = withTiming(hovered && !pressed && !isDisabled ? 1 : 0, config);
    pressProgress.value = withTiming(pressed && !isDisabled ? 1 : 0, config);
  }, [hovered, pressed, isDisabled, reducedMotion, hoverProgress, pressProgress]);

  const hoverOverlayStyle = useAnimatedStyle(() => ({ opacity: hoverProgress.value }));
  const pressOverlayStyle = useAnimatedStyle(() => ({ opacity: pressProgress.value }));

  const pressableStyle = useCallback(
    (): StyleProp<ViewStyle> => [
      styles.base,
      sizeStyle,
      isIconOnly ? iconOnlyStyle : null,
      variantStyle,
      style,
      focused ? focusRingStyle() : null,
      isDisabled ? styles.disabled : null,
    ],
    [sizeStyle, isIconOnly, iconOnlyStyle, variantStyle, style, focused, isDisabled],
  );

  const resolvedTextStyle = useMemo(
    () => [
      styles.text,
      size === "sm" ? styles.textSm : null,
      variant === "default" ? styles.textDefault : null,
      variant === "brand" ? styles.textBrand : null,
      variant === "destructive" ? styles.textDestructive : null,
      variant === "ghost" ? styles.textGhost : null,
      textStyle,
      isGhostHovered ? styles.textGhostHovered : null,
    ],
    [size, variant, textStyle, isGhostHovered],
  );

  const accessibilityState = useMemo(
    () => ({ ...accessibilityStateProp, disabled: isDisabled, busy: loading }),
    [accessibilityStateProp, isDisabled, loading],
  );

  function resolveIconMapping() {
    if (variant === "default") {
      return accentForegroundIconMapping;
    }
    if (variant === "brand") {
      return accentForegroundIconMapping;
    }
    if (variant === "destructive") {
      return destructiveForegroundIconMapping;
    }
    if (variant === "ghost") {
      return isGhostHovered ? foregroundIconMapping : foregroundMutedIconMapping;
    }
    return foregroundIconMapping;
  }

  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityState={accessibilityState}
      disabled={isDisabled}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={pressableStyle}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlayHover, hoverOverlayStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlayPressed, pressOverlayStyle]}
      />
      <ThemedButtonIcon
        loading={loading}
        leftIcon={leftIcon}
        iconSize={controlIconSize[size]}
        uniProps={resolveIconMapping()}
      />
      {children != null ? (
        <Text numberOfLines={numberOfLines} style={resolvedTextStyle}>
          {children}
        </Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}
