import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet as NativeStyleSheet,
  View,
  Text,
  type PressableStateCallbackType,
  type TextStyle,
} from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { HighlightToken } from "@getpaseo/highlight";
import { isWeb } from "@/constants/platform";
import { ICON_SIZE, type Theme } from "@/styles/theme";
import { syntaxTokenStyleFor } from "@/styles/syntax-token-styles";
import { CODE_SURFACE_DATASET } from "@/styles/code-surface";
import { highlightToKeyedLines, type KeyedLine } from "@/utils/highlight-cache";
import {
  markdownCopyCodeBlockDataSet,
  markdownCopyDataSet,
  TRAILING_CODE_LINE_BREAKS,
} from "@/assistant-selection-copy/markup";

interface HighlightedCodeBlockProps {
  code: string;
  language: string | null | undefined;
  inheritedStyles: TextStyle;
  textStyle: TextStyle;
}

// Fence info strings ("```ts", "```typescript", "```ts {1,3}") map to the
// extension-based parser table in @getpaseo/highlight. Aliases here only
// cover names that don't already match an extension key in parsers.ts.
const LANGUAGE_ALIASES: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  rust: "rs",
  golang: "go",
  "c++": "cpp",
  csharp: "cs",
  "c#": "cs",
  objc: "m",
  "objective-c": "m",
  markdown: "md",
  elixir: "ex",
  terraform: "tf",
};

function fenceLanguageToExtension(info: string | null | undefined): string | null {
  if (!info) return null;
  const first = info.trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return null;
  const normalized = first.replace(/^\./, "");
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function fenceLanguageLabel(info: string | null | undefined): string | null {
  if (!info) return null;
  const first = info.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.replace(/^\./, "");
}

function stripTerminalFenceNewline(code: string): string {
  return code.endsWith("\n") ? code.slice(0, -1) : code;
}

export const HighlightedCodeBlock = React.memo(function HighlightedCodeBlock({
  code,
  language,
  inheritedStyles,
}: HighlightedCodeBlockProps) {
  const renderedCode = useMemo(() => stripTerminalFenceNewline(code), [code]);
  const copyDataSet = useMemo(
    () => ({ ...CODE_SURFACE_DATASET, ...markdownCopyCodeBlockDataSet(language) }),
    [language],
  );
  const languageLabel = useMemo(() => fenceLanguageLabel(language), [language]);
  const codeTextStyle = useMemo(
    () => [styles.codeText, inheritedStyles.color ? { color: inheritedStyles.color } : null],
    [inheritedStyles.color],
  );

  const keyedLines = useMemo<KeyedLine[] | null>(
    () => highlightToKeyedLines(renderedCode, fenceLanguageToExtension(language)),
    [renderedCode, language],
  );

  const [isHovered, setIsHovered] = useState(false);
  const handlePointerEnter = useCallback(() => setIsHovered(true), []);
  const handlePointerLeave = useCallback(() => setIsHovered(false), []);
  const controlsVisible = isHovered || !isWeb;
  // Copy the code without its trailing blank lines. A fence body ends in a newline,
  // and ends in more than one when the author left a blank line before the closing
  // fence; pasting any of them into a terminal runs the last line.
  const getCode = useCallback(() => code.replace(TRAILING_CODE_LINE_BREAKS, ""), [code]);

  return (
    <View
      style={styles.container}
      dataSet={copyDataSet}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <View style={styles.header}>
        <Text style={styles.language} numberOfLines={1}>
          {languageLabel}
        </Text>
        <CopyButton getCode={getCode} visible={controlsVisible} />
      </View>
      <ScrollView
        horizontal
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsHorizontalScrollIndicator={controlsVisible}
      >
        {keyedLines ? (
          <Text style={codeTextStyle} dataSet={markdownCopyDataSet.code}>
            {renderCodeSegments(keyedLines)}
          </Text>
        ) : (
          <Text style={codeTextStyle} dataSet={markdownCopyDataSet.code}>
            {renderedCode}
          </Text>
        )}
      </ScrollView>
    </View>
  );
});

function renderCodeSegments(keyedLines: KeyedLine[]): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  for (let lineIndex = 0; lineIndex < keyedLines.length; lineIndex += 1) {
    const line = keyedLines[lineIndex];
    if (lineIndex > 0) {
      segments.push(<CodeTextSpan key={`${line.key}-newline`} text={"\n"} />);
    }
    for (const { key, token } of line.tokens) {
      segments.push(<TokenSpan key={`${line.key}-${key}`} token={token} />);
    }
  }
  return segments;
}

interface TokenSpanProps {
  token: HighlightToken;
}

const TokenSpan = React.memo(function TokenSpan({ token }: TokenSpanProps) {
  return (
    <Text style={token.style ? syntaxTokenStyleFor(token.style) : undefined}>{token.text}</Text>
  );
});

interface CodeTextSpanProps {
  text: string;
}

const CodeTextSpan = React.memo(function CodeTextSpan({ text }: CodeTextSpanProps) {
  return <Text>{text}</Text>;
});

interface CopyButtonProps {
  getCode: () => string;
  visible: boolean;
}

const COPIED_RESET_MS = 1500;
const ThemedCheck = withUnistyles(Check);
const ThemedCopy = withUnistyles(Copy);
const mutedIconMapping = (theme: Theme) => ({ color: theme.colors.foregroundExtraMuted });

const CopyButton = React.memo(function CopyButton({ getCode, visible }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    [],
  );

  const handlePress = useCallback(async () => {
    const content = getCode();
    if (!content) return;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    if (resetRef.current) {
      clearTimeout(resetRef.current);
      resetRef.current = null;
    }
    resetRef.current = setTimeout(() => {
      setCopied(false);
      resetRef.current = null;
    }, COPIED_RESET_MS);
  }, [getCode]);

  const visibilityStyle = visible ? styles.copyButtonVisible : styles.copyButtonHidden;
  const pressableStyle = useCallback(
    ({ hovered, pressed }: PressableStateCallbackType & { hovered?: boolean }) => [
      styles.copyButton,
      visibilityStyle,
      hovered ? styles.copyButtonHovered : null,
      pressed ? styles.copyButtonPressed : null,
    ],
    [visibilityStyle],
  );

  return (
    <Pressable
      onPress={handlePress}
      style={pressableStyle}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityRole="button"
      accessibilityLabel={copied ? t("message.actions.copied") : t("message.actions.copyCode")}
      hitSlop={8}
      dataSet={markdownCopyDataSet.ignore}
    >
      {copied ? (
        <ThemedCheck size={ICON_SIZE.xs} uniProps={mutedIconMapping} />
      ) : (
        <ThemedCopy size={ICON_SIZE.xs} uniProps={mutedIconMapping} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.codeBackground,
    borderWidth: 0,
    borderRadius: theme.borderRadius.card,
    overflow: "hidden",
  },
  header: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[3],
    borderBottomWidth: NativeStyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  language: {
    color: theme.colors.foregroundExtraMuted,
    fontFamily: theme.fontFamily.ui,
    fontSize: 12,
    lineHeight: 16,
  },
  body: {
    minWidth: 0,
  },
  bodyContent: {
    padding: theme.spacing[3],
  },
  codeText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    lineHeight: 19,
    color: theme.colors.foreground,
    ...(isWeb ? { whiteSpace: "pre" as const } : null),
  },
  copyButton: {
    padding: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
  },
  copyButtonVisible: {
    opacity: 1,
  },
  copyButtonHidden: {
    opacity: 0,
  },
  copyButtonHovered: {
    backgroundColor: theme.colors.hover,
  },
  copyButtonPressed: {
    backgroundColor: theme.colors.pressed,
  },
}));
