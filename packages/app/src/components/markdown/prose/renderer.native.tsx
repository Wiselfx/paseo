import { memo, useMemo } from "react";
import { EnrichedMarkdownText, type MarkdownStyle } from "react-native-enriched-markdown";
import { withUnistyles } from "react-native-unistyles";
import { useStableEvent } from "@/hooks/use-stable-event";
import { createCompactMarkdownStyles, createMarkdownStyles } from "@/styles/markdown-styles";
import type { Theme } from "@/styles/theme";
import type { MarkdownProseProps } from "./props";
import { handleProseLinkPress, createProsePreparer } from "./prepare";

const ThemedMarkdown = withUnistyles(EnrichedMarkdownText);
const MD4C_FLAGS = { latexMath: false, hardSoftBreaks: true, admonitions: true };

function proseStyleMapping(
  theme: Theme,
  compact = false,
  blockSpacing = 0,
): { markdownStyle: MarkdownStyle } {
  const styles = compact ? createCompactMarkdownStyles(theme) : createMarkdownStyles(theme);
  const paragraph = {
    color: styles.body.color,
    fontSize: styles.body.fontSize,
    lineHeight: styles.body.lineHeight,
    marginTop: 0,
    marginBottom: styles.paragraph.marginBottom + blockSpacing,
  };
  return {
    markdownStyle: {
      paragraph,
      h1: {
        ...styles.heading1,
        marginBottom: styles.heading1.marginBottom + blockSpacing + styles.heading1.paddingBottom,
      },
      h2: {
        ...styles.heading2,
        marginBottom: styles.heading2.marginBottom + blockSpacing + styles.heading2.paddingBottom,
      },
      h3: { ...styles.heading3, marginBottom: styles.heading3.marginBottom + blockSpacing },
      h4: { ...styles.heading4, marginBottom: styles.heading4.marginBottom + blockSpacing },
      h5: { ...styles.heading5, marginBottom: styles.heading5.marginBottom + blockSpacing },
      h6: { ...styles.heading6, marginBottom: styles.heading6.marginBottom + blockSpacing },
      list: {
        ...paragraph,
        bulletColor: styles.bullet_list_icon.color,
        markerColor: styles.ordered_list_icon.color,
        gapWidth: 7,
        itemSpacing: styles.list_item.marginBottom,
        marginLeft: theme.spacing[4],
      },
      blockquote: {
        ...paragraph,
        color: styles.blockquote.color,
        backgroundColor: styles.blockquote.backgroundColor,
        borderColor: styles.blockquote.borderLeftColor,
        borderWidth: styles.blockquote.borderLeftWidth,
        borderRadius: styles.blockquote.borderRadius,
        padding: styles.blockquote.paddingTop,
        gapWidth: 4,
        marginTop: styles.blockquote.marginVertical,
        marginBottom: styles.blockquote.marginVertical,
      },
      link: { color: styles.link.color, underline: false },
      code: {
        // RCTFont does not resolve Fabric's ui-monospace alias. An empty family
        // selects the library's native system-monospace font on iOS.
        fontFamily:
          styles.code_inline.fontFamily === "ui-monospace" ? "" : styles.code_inline.fontFamily,
        fontSize: styles.code_inline.fontSize,
        color: styles.code_inline.color,
        backgroundColor: styles.code_inline.backgroundColor,
        borderColor: "transparent",
      },
      strong: { fontWeight: "bold" },
      em: styles.em,
      strikethrough: { color: styles.s.color },
      thematicBreak: {
        color: styles.hr.backgroundColor,
        height: styles.hr.height,
        marginTop: styles.hr.marginVertical,
        marginBottom: styles.hr.marginVertical,
      },
    },
  };
}

const NativeProse = memo(function NativeProse({
  text,
  sourceBlocks,
  kind,
  onLinkPress,
  compact = false,
  blockSpacing = 0,
  fileLinks,
  references,
  linkify = true,
  allowFileLinks = false,
}: MarkdownProseProps) {
  const canResolveCode = useStableEvent(
    (content: string) =>
      fileLinks?.canResolveFile({ href: content, text: content, sourceType: "inline-code" }) ??
      false,
  );
  const prepare = useMemo(
    () => createProsePreparer(canResolveCode, { linkify, allowFileLinks, references }),
    [canResolveCode, linkify, allowFileLinks, references],
  );
  const markdown = useMemo(
    () => prepare(sourceBlocks, text.length),
    [text.length, sourceBlocks, prepare],
  );
  const handleLinkPress = useStableEvent(({ url }: { url: string }) => {
    handleProseLinkPress(
      url,
      (source) => (fileLinks ? fileLinks.open(source, "preferred") : onLinkPress(source.href)),
      onLinkPress,
    );
  });
  const uniProps = useMemo(
    () => (theme: Theme) => {
      const mapped = proseStyleMapping(theme, compact, blockSpacing);
      if (kind === "quote")
        mapped.markdownStyle.paragraph = {
          ...mapped.markdownStyle.paragraph,
          marginBottom: theme.spacing[3],
        };
      return mapped;
    },
    [kind, compact, blockSpacing],
  );
  const containerStyle = useMemo(
    () => (kind === "prose" ? { marginBottom: -blockSpacing } : undefined),
    [kind, blockSpacing],
  );
  return (
    <ThemedMarkdown
      uniProps={uniProps}
      containerStyle={containerStyle}
      markdown={markdown}
      flavor="github"
      selectable
      md4cFlags={MD4C_FLAGS}
      enableTaskListItemToggle={false}
      enableLinkPreview={false}
      enableBlockContextMenu={false}
      allowTrailingMargin
      streamingAnimation={false}
      onLinkPress={handleLinkPress}
    />
  );
});

export function MarkdownProse(props: MarkdownProseProps) {
  return props.kind === "block" ? props.children : <NativeProse {...props} />;
}
