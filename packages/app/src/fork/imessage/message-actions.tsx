/**
 * Fork (imessage): the iOS long-press overlay — dim, lifted bubble, Tapback pill, menu.
 *
 * Ported from `message-actions.tsx` and `context-menu.tsx`. Everything here is measured
 * from the long-press captures, and the measurements are what make it look native:
 *
 * - The pressed bubble lifts about its *trailing* edge, widening by 26.07 up to ×1.15, and
 *   rises 0.18. Three pressed bubbles pin that: "Ok" hits the scale cap, a 250.96-wide
 *   two-liner goes to 277.00 (×1.1037), a 280.63-wide one to 306.74 (×1.0930). A rule keyed
 *   to height misses the widest by 2pt, so the lift is keyed to width.
 * - The pill sits 5 above the bubble and runs from the screen margin (10.83) to the
 *   bubble's trailing edge; the emoji bubble hangs off it with its centre 28 beside the
 *   bubble; the 250-wide menu starts 16.1 below the bubble's bottom edge, tail included.
 * - If the menu would pass 42 above the bottom of the frame, or the pill would rise above
 *   60, the whole group shifts together.
 * - The dim is one material in both appearances, measured by regressing a long-press
 *   capture on the same frame without one: rgba(22,21,42,0.21). It covers the whole
 *   screen — nav bar and composer go under it.
 * - The menu is 250 wide with 42pt rows, 17pt labels whose ink starts 60 in, icons centred
 *   36.2 in, and radius 32 (a squircle, so the path in `menu.tsx` is Apple's continuous
 *   corner, not a circular one).
 *
 * Motion: dim from 0, lift and menu unfolding from the bubble's corner over ~130ms, the
 * pill expanding out of the picker circle over ~200ms, glyphs fading left to right with a
 * 17ms stagger.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Portal } from "@gorhom/portal";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { PressHighlight } from "@/components/ui/press-highlight";

import { GlassSurface } from "./glass";
import { contextMenuPanel } from "./menu";
import { bubblePalette, withAlpha } from "./palette";
import { TapbackBar, tapbackBarMetrics, type TapbackSelection } from "./tapback-bar";
import type { BubbleSide } from "./bubble";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const messageActionsMetrics = {
  liftWidth: 26.07,
  liftMaxScale: 1.15,
  liftY: -0.18,
  barGap: 5,
  menuGap: 16.1,
  tailHang: 6.8,
  pickerBeside: 28,
  topInset: 60,
  bottomInset: 42,
} as const;

export const messageActionsTiming = {
  dim: 150,
  lift: 130,
  menu: 130,
  barDelay: 100,
  barDuration: 220,
  glyphStart: 250,
  glyphStagger: 17,
  glyphDuration: 120,
  exit: 220,
} as const;

/** One dim in both themes; the captures agree to a level. */
export const MESSAGE_ACTIONS_DIM = "rgba(22,21,42,0.21)";

const SPRING = Easing.bezier(0.2, 0.95, 0.3, 1);
const FADE = { duration: messageActionsTiming.dim, easing: Easing.out(Easing.quad) };
const EXIT = { duration: messageActionsTiming.exit, easing: Easing.bezier(0.4, 0, 1, 1) };

export function liftScale(width: number): number {
  if (width <= 0) return 1;
  return Math.min(
    messageActionsMetrics.liftMaxScale,
    1 + messageActionsMetrics.liftWidth / width,
  );
}

export interface MessageActionsRequest {
  /** The pressed bubble's body in window coordinates. */
  rect: Rect;
  side: BubbleSide;
  tail: boolean;
  /** The bubble to lift, rendered from the same props with its press behaviour off. */
  bubble: ReactNode;
  /** Bubble fill, so the menu's glass picks the colour up. */
  wash: string;
  selected?: TapbackSelection;
  onSelect?: (selection: TapbackSelection) => void;
  onAction?: (id: string) => void;
  onPickEmoji?: () => void;
}

interface MessageActionsApi {
  open: (request: MessageActionsRequest) => void;
  close: () => void;
}

const MessageActionsContext = createContext<MessageActionsApi | null>(null);

/** Null outside a provider, so a bubble can render inertly in a test or a preview. */
export function useOptionalMessageActions(): MessageActionsApi | null {
  return useContext(MessageActionsContext);
}

export function useMessageActions(): MessageActionsApi {
  const api = useContext(MessageActionsContext);
  if (!api) throw new Error("useMessageActions must be used inside MessageActionsProvider");
  return api;
}

interface Layout {
  scale: number;
  liftedTop: number;
  liftedHeight: number;
  barTop: number;
  barLeft: number;
  barRight: number;
  menuTop: number;
  menuLeft: number;
  shift: number;
  pickerX: number;
  pickerSide: "left" | "right";
}

const MENU_WIDTH = 250;
const WASH_STOPS = [0, 0.45] as const;
const WASH_START = { x: 0.5, y: 0 } as const;
const WASH_END = { x: 0.5, y: 1 } as const;

export function layoutMessageActions(
  rect: Rect,
  side: BubbleSide,
  tail: boolean,
  frame: { width: number; height: number },
  menuHeight: number,
): Layout {
  const m = messageActionsMetrics;
  const outgoing = side === "user";
  const scale = liftScale(rect.width);
  const liftedHeight = rect.height * scale;
  const liftedTop = rect.y + rect.height / 2 - liftedHeight / 2 + m.liftY;
  const liftedLeft = outgoing ? rect.x + rect.width - rect.width * scale : rect.x;

  const barTop = liftedTop - m.barGap - tapbackBarMetrics.height;
  const barLeft = outgoing ? tapbackBarMetrics.edgeInset : rect.x;
  const barRight = outgoing ? rect.x + rect.width : frame.width - tapbackBarMetrics.edgeInset;

  const menuLeft = outgoing ? rect.x + rect.width - MENU_WIDTH : rect.x;
  const menuTop =
    liftedTop + liftedHeight + m.menuGap + (tail ? m.tailHang * scale : 0);

  let shift = 0;
  const menuBottom = menuTop + menuHeight;
  if (menuBottom > frame.height - m.bottomInset) {
    shift = frame.height - m.bottomInset - menuBottom;
  }
  if (barTop + shift < m.topInset) shift = m.topInset - barTop;

  return {
    scale,
    liftedTop: liftedTop + shift,
    liftedHeight,
    barTop: barTop + shift,
    barLeft,
    barRight,
    menuTop: menuTop + shift,
    menuLeft,
    shift,
    pickerX: (outgoing ? liftedLeft - m.pickerBeside : liftedLeft + rect.width * scale + m.pickerBeside) - barLeft,
    pickerSide: outgoing ? "left" : "right",
  };
}

function menuGlass(theme: Theme) {
  return {
    tint: theme.colorScheme === "light" ? "rgba(237,239,240,0.8)" : "rgba(20,22,23,0.8)",
    radius: 32,
  };
}

const ThemedGlass = withUnistyles(function MenuGlass({
  tint,
  radius,
  style,
}: {
  tint: string;
  radius: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <GlassSurface radius={radius} tint={tint} cast="menu" style={style} />;
});

export function MessageActionsProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<MessageActionsRequest | null>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback((next: MessageActionsRequest) => {
    setRequest(next);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const api = useMemo<MessageActionsApi>(() => ({ open, close }), [open, close]);

  const handleExited = useCallback(() => {
    setRequest(null);
  }, []);

  return (
    <MessageActionsContext.Provider value={api}>
      {children}
      {request ? (
        <Portal>
          <MessageActionsOverlay
            request={request}
            open={visible}
            onClose={close}
            onExited={handleExited}
          />
        </Portal>
      ) : null}
    </MessageActionsContext.Provider>
  );
}

interface OverlayProps {
  request: MessageActionsRequest;
  open: boolean;
  onClose: () => void;
  onExited: () => void;
}

function MessageActionsOverlay({ request, open, onClose, onExited }: OverlayProps) {
  const frame = useWindowDimensions();
  const { rect, side, tail, bubble, wash, selected, onSelect, onAction, onPickEmoji } = request;
  const outgoing = side === "user";

  const menuItems = useMemo(
    () => [
      { id: "copy", label: "Copy", icon: "copy" as const },
      { id: "translate", label: "Translate", icon: "translate" as const },
      { id: "select", label: "Select", icon: "select" as const },
      { id: "more", label: "More…", icon: "more" as const },
    ],
    [],
  );
  const menuHeight = 2 * 10 + 42 * menuItems.length;

  const layout = useMemo(
    () => layoutMessageActions(rect, side, tail, frame, menuHeight),
    [rect, side, tail, frame, menuHeight],
  );

  const handleSelect = useCallback(
    (selection: TapbackSelection) => {
      onSelect?.(selection);
      onClose();
    },
    [onSelect, onClose],
  );

  const dim = useSharedValue(0);
  const lift = useSharedValue(0);
  const panel = useSharedValue(0);
  const bar = useSharedValue(0);

  useEffect(() => {
    if (open) {
      dim.value = withTiming(1, FADE);
      lift.value = withTiming(1, { duration: messageActionsTiming.lift, easing: SPRING });
      panel.value = withTiming(1, { duration: messageActionsTiming.menu, easing: SPRING });
      bar.value = withDelay(
        messageActionsTiming.barDelay,
        withTiming(1, { duration: messageActionsTiming.barDuration, easing: SPRING }),
      );
      return;
    }
    dim.value = withTiming(0, EXIT);
    lift.value = withTiming(0, EXIT);
    panel.value = withTiming(0, EXIT);
    bar.value = withTiming(0, EXIT);
    const timer = setTimeout(onExited, messageActionsTiming.exit);
    return () => clearTimeout(timer);
  }, [open, dim, lift, panel, bar, onExited]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  const liftStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [
      { translateY: (1 - lift.value) * messageActionsMetrics.liftY * 6 },
      { scale: 1 + (layout.scale - 1) * lift.value },
    ],
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panel.value,
    transform: [{ scale: 0.6 + panel.value * 0.4 }],
  }));

  const barStyle = useAnimatedStyle(() => {
    const width = Math.max(1, layout.barRight - layout.barLeft);
    return {
      opacity: Math.min(1, bar.value * 2),
      transform: [
        { translateX: (1 - bar.value) * (outgoing ? (layout.pickerX - width / 2) * 0.5 : 0) },
        { scaleX: 0.2 + bar.value * 0.8 },
      ],
    };
  });

  // The menu laps the bubble it opened on, and native carries that colour through the glass.
  // A flat tint cannot: it is one value for the whole panel, so the top band reads grey.
  const washColors = useMemo(
    () => [withAlpha(wash, 0.35), withAlpha(wash, 0)] as const,
    [wash],
  );

  const liftedShell = useMemo(
    () => ({
      position: "absolute" as const,
      left: outgoing ? rect.x + rect.width - rect.width * layout.scale : rect.x,
      top: layout.liftedTop,
      width: rect.width,
      height: layout.liftedHeight / layout.scale,
      transformOrigin: outgoing ? "100% 50%" : "0% 50%",
    }),
    [rect, layout, outgoing],
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.dim, dimStyle]}>
        <PressHighlight
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          highlightStyle={styles.noHighlight}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message options"
        />
      </Animated.View>

      {/* The lifted copy: same bubble, same props, scaled about its trailing edge. */}
      <Animated.View pointerEvents="none" style={[liftedShell, liftStyle]}>
        {bubble}
      </Animated.View>

      <Animated.View style={[styles.bar, { left: layout.barLeft, top: layout.barTop }, barStyle]}>
        <TapbackBar
          width={Math.max(200, layout.barRight - layout.barLeft)}
          selection={selected}
          onSelect={handleSelect}
          onPickEmoji={onPickEmoji}
          pickerX={layout.pickerX}
          pickerSide={layout.pickerSide}
        />
      </Animated.View>

      <Animated.View style={[styles.menu, { left: layout.menuLeft, top: layout.menuTop }, panelStyle]}>
        <ThemedGlass style={StyleSheet.absoluteFill} uniProps={menuGlass} />
        <LinearGradient
          pointerEvents="none"
          colors={washColors}
          locations={WASH_STOPS}
          start={WASH_START}
          end={WASH_END}
          style={StyleSheet.absoluteFill}
        />
        {contextMenuPanel(menuItems, wash, (id) => {
          onAction?.(id);
          onClose();
        })}
      </Animated.View>
    </View>
  );
}

function bubbleWash(side: BubbleSide, scheme: "light" | "dark"): string {
  return bubblePalette(side, scheme).background;
}

export { bubbleWash, MENU_WIDTH };

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: MESSAGE_ACTIONS_DIM,
  },
  bar: {
    position: "absolute",
  },
  menu: {
    position: "absolute",
    width: MENU_WIDTH,
    borderRadius: 32,
    overflow: "hidden",
  },
  noHighlight: {
    backgroundColor: "transparent",
  },
});
