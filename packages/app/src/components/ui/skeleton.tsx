import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useReducedMotion } from "react-native-reanimated";

const SHEEN_DURATION_MS = 1600;

/**
 * One looping value per skeleton, shared by its shapes so their sheen travels
 * together. Reduced motion parks it at rest: the sheen is off-screen and the
 * base colour is the whole skeleton.
 */
export function useSkeletonPulse(): Animated.Value {
  const pulse = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: SHEEN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  return pulse;
}

/** A placeholder shape; `style` sets its size, radius and color. */
export function SkeletonPulse({
  pulse,
  style,
}: {
  pulse: Animated.Value;
  style: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const translateX = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });
  const animatedSheenStyle = useMemo(
    () => [styles.sheen, { width, transform: [{ translateX }] }],
    [width, translateX],
  );
  const pulseStyle = useMemo(() => [styles.round, style, styles.base], [style]);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  return (
    <Animated.View style={pulseStyle} onLayout={handleLayout}>
      {width > 0 ? <Animated.View pointerEvents="none" style={animatedSheenStyle} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  round: {
    borderRadius: theme.borderRadius.md,
  },
  base: {
    backgroundColor: theme.colors.skeletonBase,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.skeletonSheen,
  },
}));
