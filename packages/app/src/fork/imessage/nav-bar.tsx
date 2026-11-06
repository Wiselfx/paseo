/**
 * Fork (imessage): the conversation nav bar.
 *
 * iOS 26 dropped the opaque bar: a Ø44 glass back button, the contact's Ø60 avatar
 * and a glass capsule holding the name and a chevron float over the transcript,
 * and the messages scroll underneath them through a wash. That is the single
 * biggest reason a screenshot of Messages reads as Messages, so Paseo's compact
 * header can take this face instead of its flat row of islands.
 *
 * Geometry is measured, not eyeballed (`ios-nav-bar.tsx` in the reference kit):
 * a 94pt bar under the status bar, back button Ø44 at (16, 8), avatar Ø60 at
 * y 8 centred on x 201 of a 402pt screen, capsule at y 63 with a 32.333pt height
 * and a 16.17pt radius, 17pt bold name, and a 4.67 × 12.67 chevron with a 2.6pt
 * round stroke in #bdbdbd. The avatar deliberately overhangs the capsule: its
 * circle runs 5pt past the capsule's top edge, over the glass, casting its own
 * soft shadow onto it.
 *
 * Press behaviour is borrowed from ChatKit (`replyButtonTouchAlpha` 0.4,
 * `replyButtonTouchScale` 0.85) because no capture holds a pressed control. The
 * scale is only applied to the round button — 0.85 on a capsule this wide pulls
 * each end 14pt inward, which reads as a different control rather than a
 * pressed one.
 */
import { memo, useCallback, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { Avatar } from "./avatar";
import { GlassSurface } from "./glass";
import { PressHighlight } from "@/components/ui/press-highlight";
import { touchSenses } from "./senses";

/** Measured on a 402pt iPhone: bar height, control boxes and their offsets. */
const BAR_HEIGHT = 94;
const CONTROL_TOP = 8;
const ROUND_SIZE = 44;
const ROUND_LEFT = 16;
const AVATAR_SIZE = 60;
const PILL_TOP = 63;
const PILL_HEIGHT = 32.3333;
const PILL_RADIUS = PILL_HEIGHT / 2;
const NAME_SIZE = 17;

const CHEVRON_STROKE = 2.6;
const BACK_STROKE = 2.4;

/** ChatKit's touch pair, the only press numbers the framework records. */
const TOUCH_ALPHA = 0.4;
const TOUCH_SCALE = 0.85;
const RELEASE_MS = 100;

const BACK_PATH = "M24.8 13.87 16.2 22.17 24.8 30.47";
const CHEVRON_PATH = "M1.3 1.3 3.37 6.3333 1.3 11.37";

const ThemedPath = withUnistyles(Path);

function labelColor(theme: Theme): string {
  return theme.colorScheme === "light" ? "#1A1919" : "#F4F3F4";
}

function chevronColor(theme: Theme): string {
  return theme.colorScheme === "light" ? "#BDBDBD" : "#5D5D5D";
}

const backStroke = (theme: Theme) => ({ stroke: labelColor(theme) });
const chevronStroke = (theme: Theme) => ({ stroke: chevronColor(theme) });

/**
 * Instant down, 100ms eased release — a finger must feel the frame it landed on.
 *
 * @param withScale - the round button gives; a capsule only dims, because 0.85 on
 * a 187pt pill pulls each end 14pt inward and stops reading as the same control.
 */
function useControlPress(withScale: boolean) {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * (1 - TOUCH_ALPHA),
    transform: [{ scale: withScale ? 1 - progress.value * (1 - TOUCH_SCALE) : 1 }],
  }));
  const onPressIn = useCallback(() => {
    touchSenses();
    progress.value = withTiming(1, { duration: 0 });
  }, [progress]);
  const onPressOut = useCallback(() => {
    progress.value = withTiming(0, { duration: RELEASE_MS });
  }, [progress]);
  return { style, onPressIn, onPressOut };
}

function RoundButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const press = useControlPress(true);
  return (
    <Animated.View style={[styles.roundBox, press.style]}>
      <GlassSurface radius={ROUND_SIZE / 2} style={styles.roundGlass} />
      <PressHighlight
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        highlightStyle={styles.noHighlight}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.roundHit}
      >
        {children}
      </PressHighlight>
    </Animated.View>
  );
}

export interface ImessageNavBarProps {
  name: string;
  /** A second line under the capsule — the workspace it belongs to. */
  subtitle?: ReactNode;
  /** Initials for the avatar; derived from the name when omitted. */
  initials?: string;
  leading?: "back" | "menu";
  /** Renders your own control inside the glass circle instead of the built-in glyph. */
  leadingSlot?: ReactNode;
  onPressLeading?: () => void;
  leadingLabel?: string;
  onPressTitle?: () => void;
  /** Right-hand controls, kept out of the measured layout so they can be app-shaped. */
  actions?: ReactNode;
  testID?: string;
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export const ImessageNavBar = memo(function ImessageNavBar({
  name,
  subtitle,
  initials,
  leading = "back",
  leadingSlot,
  onPressLeading,
  leadingLabel,
  onPressTitle,
  actions,
  testID,
}: ImessageNavBarProps) {
  const press = useControlPress(false);
  const letters = initials ?? initialsOf(name);

  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.bar}>
        {leadingSlot ? (
          <View style={styles.roundBox}>{leadingSlot}</View>
        ) : (
        <RoundButton onPress={onPressLeading} accessibilityLabel={leadingLabel ?? "Back"}>
          {leading === "back" ? (
            <Svg width={ROUND_SIZE} height={ROUND_SIZE} viewBox="0 0 44 44" fill="none">
              <ThemedPath
                d={BACK_PATH}
                strokeWidth={BACK_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                uniProps={backStroke}
              />
            </Svg>
          ) : (
            <Svg width={22} height={16} viewBox="0 0 22 16" fill="none">
              <ThemedPath
                d="M1 2h20M1 8h20M1 14h20"
                strokeWidth={BACK_STROKE}
                strokeLinecap="round"
                uniProps={backStroke}
              />
            </Svg>
          )}
        </RoundButton>
        )}

        <View style={styles.avatar}>
          <Avatar size={AVATAR_SIZE} initials={letters} name={name} />
        </View>

        <Animated.View style={[styles.pillWrap, press.style]}>
          <PressHighlight
            onPress={onPressTitle}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            highlightStyle={styles.noHighlight}
            accessibilityRole="button"
            accessibilityLabel={name}
            style={styles.pillHit}
          >
            <GlassSurface radius={PILL_RADIUS} style={styles.pillGlass} />
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Svg width={8.6667} height={16.6667} viewBox="-2 -2 8.6667 16.6667" fill="none">
              <ThemedPath
                d={CHEVRON_PATH}
                strokeWidth={CHEVRON_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                uniProps={chevronStroke}
              />
            </Svg>
          </PressHighlight>
        </Animated.View>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? <View style={styles.subtitle}>{subtitle}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: {
    width: "100%",
  },
  bar: {
    height: BAR_HEIGHT,
    width: "100%",
  },
  roundBox: {
    position: "absolute",
    left: ROUND_LEFT,
    top: CONTROL_TOP,
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: ROUND_SIZE / 2,
  },
  roundGlass: {
    ...StyleSheet.absoluteFillObject,
  },
  roundHit: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  noHighlight: {
    backgroundColor: "transparent",
  },
  avatar: {
    position: "absolute",
    left: "50%",
    marginLeft: -AVATAR_SIZE / 2,
    top: CONTROL_TOP,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: `0 2px 4px ${theme.colorScheme === "light" ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.3)"}`,
  },
  pillWrap: {
    position: "absolute",
    top: PILL_TOP,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pillHit: {
    flexDirection: "row",
    alignItems: "center",
    height: PILL_HEIGHT,
    maxWidth: "72%",
    gap: 6.1875,
    paddingLeft: 12.9531,
    paddingRight: 10.7188,
    borderRadius: PILL_RADIUS,
  },
  pillGlass: {
    ...StyleSheet.absoluteFillObject,
  },
  name: {
    color: theme.colorScheme === "light" ? "#1A1919" : "#F4F3F4",
    fontSize: NAME_SIZE,
    fontWeight: "700",
    flexShrink: 1,
  },
  actions: {
    position: "absolute",
    right: ROUND_LEFT,
    top: CONTROL_TOP,
    height: ROUND_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    alignItems: "center",
    paddingTop: 2,
  },
}));
