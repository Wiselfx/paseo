import { memo, useMemo } from "react";
import { EnrichedMarkdownText, type MarkdownStyle } from "react-native-enriched-markdown";
import { withUnistyles } from "react-native-unistyles";
import { useAssistantFileLinkActions } from "@/assistant-file-links";
import { useStableEvent } from "@/hooks/use-stable-event";
import { createMarkdownStyles } from "@/styles/markdown-styles";
import type { Theme } from "@/styles/theme";
import type { MarkdownProseProps } from "./props";
import { inlineCodeLinkContent, prepareProse } from "./prepare";

const ThemedMarkdown = withUnistyles(EnrichedMarkdownText);
const MD4C_FLAGS = { latexMath: false, hardSoftBreaks: true, admonitions: false };

function proseStyleMapping(theme: Theme): { markdownStyle: MarkdownStyle } {
  const styles = createMarkdownStyles(theme);
  const paragraph = {
    color: styles.body.color,
    fontSize: styles.body.fontSize,
    lineHeight: styles.body.lineHeight,
    marginTop: 0,
    marginBottom: styles.paragraph.marginBottom + theme.spacing[3],
  };
  return {
    markdownStyle: {
      paragraph,
      h1: {
        ...styles.heading1,
        marginBottom:
          styles.heading1.marginBottom + theme.spacing[3] + styles.heading1.paddingBottom,
      },
      h2: {
        ...styles.heading2,
        marginBottom:
          styles.heading2.marginBottom + theme.spacing[3] + styles.heading2.paddingBottom,
      },
      h3: { ...styles.heading3, marginBottom: styles.heading3.marginBottom + theme.spacing[3] },
      h4: { ...styles.heading4, marginBottom: styles.heading4.marginBottom + theme.spacing[3] },
      h5: { ...styles.heading5, marginBottom: styles.heading5.marginBottom + theme.spacing[3] },
      h6: { ...styles.heading6, marginBottom: styles.heading6.marginBottom + theme.spacing[3] },
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
      code: { ...styles.code_inline, borderColor: "transparent" },
      strong: styles.strong,
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

function quoteStyleMapping(theme: Theme): { markdownStyle: MarkdownStyle } {
  const mapped = proseStyleMapping(theme);
  return {
    markdownStyle: {
      ...mapped.markdownStyle,
      paragraph: { ...mapped.markdownStyle.paragraph, marginBottom: theme.spacing[3] },
    },
  };
}

const PROSE_CONTAINER = { marginBottom: -12 };

const NativeProse = memo(function NativeProse({
  text,
  streaming,
  kind,
  onLinkPress,
}: MarkdownProseProps) {
  const actions = useAssistantFileLinkActions();
  const canResolveCode = useStableEvent((content: string) =>
    actions.canResolveFile({ href: content, text: content, sourceType: "inline-code" }),
  );
  const markdown = useMemo(
    () => prepareProse(text, canResolveCode, streaming),
    [text, canResolveCode, streaming],
  );
  const handleLinkPress = useStableEvent(({ url }: { url: string }) => {
    const content = inlineCodeLinkContent(url);
    if (content !== null) {
      actions.open({ href: content, text: content, sourceType: "inline-code" }, "preferred");
      return;
    }
    onLinkPress(url);
  });
  return (
    <ThemedMarkdown
      uniProps={kind === "quote" ? quoteStyleMapping : proseStyleMapping}
      containerStyle={kind === "prose" ? PROSE_CONTAINER : undefined}
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
