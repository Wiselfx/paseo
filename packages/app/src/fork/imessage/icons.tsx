/**
 * Fork (imessage): the composer's mic, traced from `conv3-light.png` at 3×.
 *
 * Messages draws this symbol at a lighter weight than the conversation list's search pill, so
 * it gets its own geometry rather than reusing one: ink 11.87 × 17.85, capsule 6.03 × 11.65,
 * 11.87 across the U, every stroke 1.25. Measured colour #b4b8bf light / #636466 dark, which is
 * also what ChatKit's `_entryViewButtonTintColor` reports for the light case.
 */
import Svg, { Path, Rect } from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

interface MicProps {
  color: string;
  width?: number;
  height?: number;
}

function ComposerMic({ color, width = 12, height = 17.6667 }: MicProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 12 17.6667" fill="none">
      <Rect
        x="3.6667"
        y="0.6667"
        width="4.6667"
        height="10.3333"
        rx="2.3333"
        stroke={color}
        strokeWidth="1.3333"
      />
      <Path
        d="M0.75 6.3333V8.83A5.08 5.08 0 0 0 10.92 8.83V6.3333"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path d="M5.83 14.5V16.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2.3 16.9H9.4" stroke={color} strokeWidth="1.3333" strokeLinecap="round" />
    </Svg>
  );
}

const ThemedComposerMic = withUnistyles(ComposerMic);

const micTheme = (theme: Theme) => ({
  color: theme.colorScheme === "light" ? "#B4B8BF" : "#636466",
});

export function ComposerMicIcon({ width, height }: { width?: number; height?: number }) {
  return <ThemedComposerMic width={width} height={height} uniProps={micTheme} />;
}
