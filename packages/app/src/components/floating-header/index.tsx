import { createContext, useContext, useCallback, useState, useId, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Portal, PortalHost } from "@gorhom/portal";
import { useRetainedPanelActive } from "@/components/retained-panel";

const OverlayClearanceContext = createContext(0);
const OverlayHostContext = createContext<string | null>(null);

/** Keep status overlays above the fade without lifting the scrolling content. */
export function FloatingHeaderOverlay({ children }: { children: ReactNode }) {
  const hostName = useContext(OverlayHostContext);
  const active = useRetainedPanelActive();
  if (!hostName) return children;
  return active ? <Portal hostName={hostName}>{children}</Portal> : null;
}

/** Clearance for stationary overlays inside this layout, measured to the header bottom. */
export function useFloatingHeaderOverlayClearance(): number {
  return useContext(OverlayClearanceContext);
}

/** iMessage overlays render into the floating header's host so they sit above the transcript. */
export function useFloatingHeaderOverlayHost(): string | null {
  return useContext(OverlayHostContext);
}

/** The iMessage bar is transparent; the measured scroll-edge wash does the work the fade used to do. */

interface FloatingHeaderLayoutProps {
  header: ReactNode;
  /** Float only when the content supports visual-top clearance. */
  floating: boolean;
  /** Scroll content under the floating bar instead of below it. */
  underlap?: boolean;
  children: (topOverlayInset: number) => ReactNode;
}

/**
 * Stacks a header above content, or floats it over the content behind a fade. Children keep the
 * same tree position in both modes, so toggling `floating` never remounts them.
 */
export function FloatingHeaderLayout({ header, floating, underlap, children }: FloatingHeaderLayoutProps) {
  const overlayHostName = useId();
  const [headerHeight, setHeaderHeight] = useState(0);
  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const overlayClearance = floating ? headerHeight : 0;
  // Underlap hands the content the top of the screen; the bar floats above it.
  const topOverlayInset = underlap || !floating ? 0 : headerHeight;

  return (
    <View style={styles.root}>
      {floating ? null : header}
      <View style={styles.content}>
        <OverlayClearanceContext.Provider value={overlayClearance}>
          <OverlayHostContext.Provider value={floating ? overlayHostName : null}>
            {children(topOverlayInset)}
          </OverlayHostContext.Provider>
        </OverlayClearanceContext.Provider>
      </View>
      {floating ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <View
            testID="floating-header"
            collapsable={false}
            pointerEvents="box-none"
            onLayout={handleHeaderLayout}
          >
            {header}
          </View>
        </View>
      ) : null}
      <View style={styles.statusOverlay} pointerEvents="box-none">
        <PortalHost name={overlayHostName} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
