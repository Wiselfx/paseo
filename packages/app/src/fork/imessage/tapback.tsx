/**
 * Fork (imessage): the Tapback balloon.
 *
 * Ported from `tapback.tsx` in the reference kit. The numbers are Apple's, read out of
 * captures and cross-checked against ChatKit, so they survive the translation intact:
 *
 * - iOS balloon: main Ø34, trail Ø10.4 at (−10.82, +15.20) and Ø5 at (−17.49, +23.46)
 *   from the main circle's centre, pointing away from the bubble.
 * - Heart ink 18.34 × 16.33, its centre 0.8 below the circle's.
 * - Own reactions are #0088ff in both appearances. Other people's are #e9e9eb light and
 *   #3b3b3d dark — `messageAcknowledgmentBalloonColorTypeForStyle:` 0, not the incoming
 *   bubble's own fill.
 * - A balloon sits `marginTop` 28 above the body, `top` −27.39 and `side` −13.85 from the
 *   body's top corner (outgoing; mirrored for incoming). The list has to open that slot
 *   itself, which is why `message-bubble` reads it too.
 * - Two or more reactions are not a pill with a number on it. ChatKit draws the front
 *   balloon with one or two more behind it along the tail's direction, pitch 3 · (34/33)
 *   with a 1 · (34/33) rim gap, capped at two behind because the artwork stops there.
 *
 * The web original tints the glyphs with CSS gradients that have no React Native
 * equivalent; the two SVG glyphs keep their gradients (react-native-svg has them), and the
 * laugh / like / dislike glyphs fall back to a flat fill at Apple's darker end.
 */
import { memo, useEffect, useId } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { MESSAGES_PALETTE } from "./palette";

export const tapbackLabels = {
  love: "Love",
  like: "Like",
  dislike: "Dislike",
  laugh: "Laugh",
  emphasize: "Emphasize",
  question: "Question",
} as const;

export type TapbackType = keyof typeof tapbackLabels;
export const tapbackTypes = Object.keys(tapbackLabels) as TapbackType[];

export const tapbackColors = {
  own: "#0088FF",
  selectedRing: "#26AEFF",
  selectedRingDark: "#0064D2",
} as const;

export interface BalloonGeometry {
  main: number;
  medium: number;
  small: number;
  mediumOffset: [number, number];
  smallOffset: [number, number];
  glyph: number;
  glyphOffsetY?: number;
}

export const balloonGeometry: BalloonGeometry = {
  main: 34,
  medium: 10.4,
  small: 5,
  mediumOffset: [-10.82, 15.2],
  smallOffset: [-17.49, 23.46],
  glyph: 18.34,
  glyphOffsetY: 0.8,
};

/** Where the list must open a slot for a balloon, measured on the settled captures. */
export const balloonSlot = { marginTop: 28, top: -27.39, side: -13.85 } as const;

export const aggregateStack = { pitch: 3 * (34 / 33), gap: 1 * (34 / 33), max: 2 } as const;

/** The emoji-picker thought bubble beside a long-pressed message: the same shape at ~1.3×. */
export const pickerBalloonGeometry: BalloonGeometry = {
  main: 44,
  medium: 14.6,
  small: 8,
  mediumOffset: [-13.2, 20.3],
  smallOffset: [-22.2, 30.7],
  glyph: 24,
};

/**
 * The balloon's entrance, timed on 24 consecutive frames of `tapback-apply-frames`:
 * 110ms to full size, no delay on the trail (it rides the same scale).
 */
export const tapbackAppear = { duration: 420, growth: 110, trailDelay: 0 } as const;

const HEART_PLAIN: [string, string][] = [
  ["0", "#FFD9EA"],
  ["0.12", "#FFC1D8"],
  ["0.38", "#FF99CA"],
  ["0.51", "#FF81BD"],
  ["0.79", "#FF6CB0"],
  ["1", "#FF4796"],
];
const HEART_ACCENT: [string, string][] = [
  ["0", "#FFEEFE"],
  ["0.12", "#FFD6EC"],
  ["0.38", "#FFAEDE"],
  ["0.51", "#FF96D1"],
  ["0.79", "#FF81C4"],
  ["1", "#FF5CAA"],
];

interface GlyphProps {
  type?: TapbackType;
  emoji?: string;
  size: number;
  onAccent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TapbackGlyph({ type, emoji, size, onAccent = false, style }: GlyphProps) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, "");

  if (emoji || !type) {
    return (
      <Text
        style={[
          styles.glyphText,
          { fontSize: size, lineHeight: size, width: size, height: size },
          style,
        ]}
      >
        {emoji}
      </Text>
    );
  }

  if (type === "love") {
    const width = size;
    const height = size * 0.8906;
    return (
      <Svg width={width} height={height} viewBox="0 0 18 16.03">
        <Defs>
          <RadialGradient id={`${id}h`} cx="0.5" cy="0.18" r="0.8">
            {(onAccent ? HEART_ACCENT : HEART_PLAIN).map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </RadialGradient>
        </Defs>
        <Path
          d="M9,16.03 C7.6,15.9 0,10.51 0,4.91 A4.75,4.75 0 0 1 9,2.79 A4.75,4.75 0 0 1 18,4.91 C18,10.51 10.4,15.9 9,16.03 Z"
          fill={`url(#${id}h)`}
        />
      </Svg>
    );
  }

  if (type === "emphasize") {
    return (
      <Svg width={size * 0.71} height={size * 1.053} viewBox="0 0 18 26.67">
        <Defs>
          <SvgLinearGradient id={`${id}e`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF8C6E" />
            <Stop offset="0.6" stopColor="#FF4F3F" />
            <Stop offset="1" stopColor="#FF2A34" />
          </SvgLinearGradient>
        </Defs>
        {[0, 10].map((x) => (
          <Svg key={x} x={x} y={0}>
            <Path
              d="M0.2,3.6 A3.8,3.8 0 0 1 7.8,3.6 L6.3,16.3 A2.3,2.3 0 0 1 1.7,16.3 Z"
              fill={`url(#${id}e)`}
            />
            <Circle cx="4" cy="23.1" r="3.5" fill={`url(#${id}e)`} />
            <Path d="M1.7,2.2 A1.3,2 0 0 1 4.3,2.2" fill="#fff" opacity={0.45} />
          </Svg>
        ))}
      </Svg>
    );
  }

  if (type === "question") {
    return (
      <Svg width={size * 0.566} height={size * 0.987} viewBox="0 0 14.33 25">
        <Defs>
          <SvgLinearGradient id={`${id}q`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C4A8FF" />
            <Stop offset="0.6" stopColor="#9B7CF5" />
            <Stop offset="1" stopColor="#7A5EE0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M2.4,7.4 A4.9,4.9 0 1 1 8.1,12.1 C7.3,12.6 7.2,13.4 7.2,15.4"
          fill="none"
          stroke={`url(#${id}q)`}
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="7.2" cy="22.4" r="2.5" fill={`url(#${id}q)`} />
      </Svg>
    );
  }

  if (type === "laugh") {
    return (
      <Text
        style={[
          styles.laugh,
          { fontSize: size * 0.68, lineHeight: size * 0.5, letterSpacing: -size * 0.02 },
          style,
        ]}
      >
        HA{"\n"}HA
      </Text>
    );
  }

  // The like / dislike glyphs are Apple's emoji, and the thumbs sit high in their own box;
  // the reference pushes 👎 down 0.145 of the slot because the artwork does.
  const drop = type === "dislike" ? size * 0.145 : 0;
  return (
    <Text
      style={[
        styles.glyphText,
        { fontSize: size * 0.987, width: size, height: size, marginTop: drop },
        style,
      ]}
    >
      {type === "like" ? "👍" : "👎"}
    </Text>
  );
}

function Trail({
  geometry,
  side,
  color,
  rimColor,
}: {
  geometry: BalloonGeometry;
  side: "left" | "right";
  color: string;
  rimColor?: string;
}) {
  const half = geometry.main / 2;
  const place = (diameter: number, [dx, dy]: [number, number]) => ({
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    top: half + dy - diameter / 2,
    [side === "left" ? "left" : "right"]: half + dx - diameter / 2,
  });
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.trail,
          { backgroundColor: color },
          rimColor ? { borderWidth: 0.5, borderColor: rimColor } : null,
          place(geometry.medium, geometry.mediumOffset),
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.trail,
          { backgroundColor: color },
          rimColor ? { borderWidth: 0.5, borderColor: rimColor } : null,
          place(geometry.small, geometry.smallOffset),
        ]}
      />
    </>
  );
}

/** The rim a balloon is knocked out against is the page, and theirs is not their bubble. */
function tapbackTheme(theme: Theme) {
  return {
    rimColor: MESSAGES_PALETTE[theme.colorScheme].background,
    theirs: MESSAGES_PALETTE[theme.colorScheme].tapbackTheirs,
  };
}

function behindCount(count: number | undefined): number {
  return Math.min(Math.max((count ?? 1) - 1, 0), aggregateStack.max);
}

/** Reads on its own: "Love tapback, 2, from you". */
function tapbackLabel(
  reaction: TapbackType,
  emoji: string | undefined,
  own: boolean,
  count: number | undefined,
): string {
  const many = count !== undefined && count > 1 ? `, ${count}` : "";
  return `${emoji ?? tapbackLabels[reaction]} tapback${many}${own ? ", from you" : ""}`;
}

export interface TapbackProps {
  reaction?: TapbackType;
  emoji?: string;
  /** Blue balloon (yours) or grey (someone else's). */
  own?: boolean;
  /** Which side the trail points; outgoing bubbles use "left". */
  side?: "left" | "right";
  count?: number;
  /** Play the apply animation — only for a reaction the person just chose. */
  animateIn?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const TapbackBalloon = function TapbackBalloon({
  reaction = "love",
  emoji,
  own = true,
  side = "left",
  count,
  animateIn = false,
  onPress,
  style,
  accessibilityLabel,
  rimColor,
  theirs,
}: TapbackProps & { rimColor: string; theirs: string }) {
  const progress = useSharedValue(animateIn ? 0 : 1);

  useEffect(() => {
    if (!animateIn) return;
    // scale 0 → 1 in 110ms of the 420, overshoot to 1.14, settle 0.94 → 1.03 → 1.
    progress.value = withSequence(
      withTiming(1.14, { duration: tapbackAppear.growth }),
      withTiming(0.94, { duration: 90 }),
      withTiming(1.03, { duration: 70 }),
      withTiming(1, { duration: 90 }),
    );
  }, [animateIn, progress]);

  const grow = useAnimatedStyle(() => ({
    transform: [{ scale: animateIn ? progress.value : 1 }],
    opacity: animateIn ? Math.min(1, progress.value * 3) : 1,
  }));

  const fill = own ? tapbackColors.own : theirs;
  const behind = behindCount(count);
  const gapRing = Math.max(aggregateStack.gap, 0.5);
  const label = accessibilityLabel ?? tapbackLabel(reaction, emoji, own, count);

  const ball = (index: number) => (
    <View
      key={index}
      pointerEvents="none"
      style={[
        styles.ball,
        {
          backgroundColor: fill,
          borderWidth: gapRing,
          borderColor: rimColor,
          [side === "left" ? "left" : "right"]: -index * aggregateStack.pitch,
        },
      ]}
    >
      <Trail geometry={balloonGeometry} side={side} color={fill} rimColor={rimColor} />
    </View>
  );

  return (
    <Animated.View
      accessible
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={label}
      onTouchEnd={onPress}
      style={[
        styles.balloon,
        { transformOrigin: side === "left" ? "85% 85%" : "15% 85%" },
        animateIn ? grow : null,
        style,
      ]}
    >
      {behind > 0
        ? Array.from({ length: behind }, (_, i) => ball(behind - i)).concat(ball(0))
        : null}
      <View
        style={[
          styles.glyphBox,
          { marginTop: emoji ? 0 : 2 * (balloonGeometry.glyphOffsetY ?? 0) },
        ]}
      >
        <TapbackGlyph
          type={emoji ? undefined : reaction}
          emoji={emoji}
          size={balloonGeometry.glyph}
          onAccent={own}
        />
      </View>
      {behind === 0 ? (
        <Trail geometry={balloonGeometry} side={side} color={fill} rimColor={rimColor} />
      ) : null}
    </Animated.View>
  );
};

const ThemedTapback = withUnistyles(TapbackBalloon);

export const Tapback = memo(function Tapback(props: TapbackProps) {
  return <ThemedTapback {...props} uniProps={tapbackTheme} />;
});

const styles = StyleSheet.create({
  balloon: {
    width: balloonGeometry.main,
    minWidth: balloonGeometry.main,
    height: balloonGeometry.main,
    borderRadius: balloonGeometry.main / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ball: {
    position: "absolute",
    top: 0,
    width: balloonGeometry.main,
    height: balloonGeometry.main,
    borderRadius: balloonGeometry.main / 2,
  },
  trail: {
    position: "absolute",
  },
  glyphBox: {
    position: "relative",
  },
  glyphText: {
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  laugh: {
    color: "#0AA6FF",
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.65)",
    textShadowRadius: 0.6,
  },
});
