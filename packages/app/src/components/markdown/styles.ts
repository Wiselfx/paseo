import type { MarkdownStyle } from "react-native-enriched-markdown";
import { DEFAULT_DISPLAY_FONT_STACK, type Theme } from "@/styles/theme";
import { isWeb } from "@/constants/platform";

// iOS Safari needs the prefix to override the gesture host's selection suppression.
const WEB_CONTAINER = { userSelect: "text", WebkitUserSelect: "text" } as const;

export function createMarkdownStyles(
  theme: Theme,
  {
    compact = false,
    muted = false,
    blockGap,
  }: { compact?: boolean; muted?: boolean; blockGap: number },
): { markdownStyle: MarkdownStyle; selectionColor: string; containerStyle?: typeof WEB_CONTAINER } {
  const fontSize = compact ? theme.fontSize.base : theme.fontSize.content;
  const lineHeight = compact ? 20 : 23;
  // Every block is followed by the same gap; the library drops it after the last block.
  const block = { marginTop: 0, marginBottom: blockGap };
  const paragraph = {
    fontSize,
    fontFamily: theme.fontFamily.prose,
    lineHeight,
    color: muted ? theme.colors.foregroundMuted : theme.colors.foreground,
    ...block,
  };
  const heading = (size: number, line: number) => ({
    ...paragraph,
    fontFamily: DEFAULT_DISPLAY_FONT_STACK,
    fontSize: size,
    lineHeight: line,
    fontWeight: theme.fontWeight.bold,
    marginTop: 24,
    marginBottom: 12,
  });
  return {
    containerStyle: isWeb ? WEB_CONTAINER : undefined,
    selectionColor: theme.colors.terminal.selectionBackground,
    markdownStyle: {
      paragraph,
      h1: heading(24, 32),
      h2: heading(18, 26),
      h3: heading(16, 24),
      h4: { ...heading(15, 23), marginTop: 16, marginBottom: 8 },
      h5: { ...heading(15, 23), marginTop: 16, marginBottom: 8 },
      h6: {
        ...heading(15, 23),
        marginTop: 16,
        marginBottom: 8,
        color: theme.colors.foregroundMuted,
      },
      list: {
        ...paragraph,
        bulletColor: theme.colors.foregroundExtraMuted,
        markerColor: theme.colors.foregroundExtraMuted,
        gapWidth: 7,
        itemSpacing: 4,
        marginLeft: 20,
      },
      blockquote: {
        ...paragraph,
        color: theme.colors.foregroundMuted,
        backgroundColor: "transparent",
        borderColor: theme.colors.border,
        borderWidth: 2,
        borderRadius: 0,
        padding: 12,
        gapWidth: 8,
        admonitions: {
          note: { color: theme.colors.accentInk, backgroundColor: theme.colors.surface2 },
          tip: { color: theme.colors.statusSuccess, backgroundColor: theme.colors.surface2 },
          important: { color: theme.colors.statusMerged, backgroundColor: theme.colors.surface2 },
          warning: { color: theme.colors.statusWarning, backgroundColor: theme.colors.surface2 },
          caution: { color: theme.colors.statusDanger, backgroundColor: theme.colors.surface2 },
        },
      },
      link: { color: theme.colors.accentInk, underline: true },
      linkVariants: {
        "^(?!https?://).+": {
          color: theme.colors.accentInk,
        },
      },
      code: {
        fontFamily: theme.fontFamily.mono,
        fontScale: 0.92,
        color: theme.colors.foreground,
        backgroundColor: theme.colors.bubble,
        borderColor: "transparent",
      },
      codeBlock: {
        ...paragraph,
        fontFamily: theme.fontFamily.mono,
        fontSize: 12.5,
        lineHeight: 19,
        backgroundColor: theme.colors.codeBackground,
        borderColor: "transparent",
        borderRadius: 12,
        padding: 12,
      },
      table: {
        ...paragraph,
        borderColor: theme.colors.border,
        headerBackgroundColor: theme.colors.surface2,
        headerTextColor: theme.colors.foreground,
        rowEvenBackgroundColor: theme.colors.surface0,
        rowOddBackgroundColor: theme.colors.surface1,
      },
      taskList: {
        checkedTextColor: theme.colors.foregroundMuted,
        checkedColor: theme.colors.accent,
        checkmarkColor: theme.colors.accentForeground,
        borderColor: theme.colors.foregroundMuted,
      },
      inlineImage: { size: paragraph.lineHeight },
      image: { ...block, height: 320, resizeMode: "contain", borderRadius: 8 },
      thematicBreak: { ...block, color: theme.colors.border, height: 1 },
    },
  };
}
