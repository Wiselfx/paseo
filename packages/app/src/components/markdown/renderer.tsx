import { View } from "react-native";
import { markdownCopyImageSourcesDataSet } from "@/assistant-selection-copy/markup";
import { memo, useState } from "react";
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
  type CodeBlockRendererProps,
} from "react-native-enriched-markdown";
import { withUnistyles } from "react-native-unistyles";
import {
  useAssistantFileLinkActions,
  useAssistantFileLinkEnvironment,
} from "@/assistant-file-links";
import { useStableEvent } from "@/hooks/use-stable-event";
import { HighlightedCodeBlock } from "@/components/highlighted-code-block";
import { AttachmentLightbox, type ImageLightboxSource } from "@/components/attachment-lightbox";
import type { Theme } from "@/styles/theme";
import { isWeb } from "@/constants/platform";
import { useMarkdownSource, type MarkdownImageContext } from "./images";

const ThemedMarkdown = withUnistyles(EnrichedMarkdownText);
const MD4C_FLAGS = { latexMath: false, hardSoftBreaks: true, admonitions: true };

function markdownStyle(theme: Theme, compact = false): { markdownStyle: MarkdownStyle } {
  const fontSize = compact ? theme.fontSize.base : theme.fontSize.content;
  const paragraph = {
    fontSize,
    fontFamily: theme.fontFamily.ui,
    lineHeight: Math.round(fontSize * 1.4),
    color: theme.colors.foreground,
    marginTop: 0,
    marginBottom: theme.spacing[3],
  };
  const heading = (scale: number) => ({
    ...paragraph,
    fontSize: Math.round(fontSize * scale),
    lineHeight: Math.round(fontSize * scale * 1.3),
    fontWeight: "bold",
    marginTop: theme.spacing[3],
  });
  return {
    markdownStyle: {
      paragraph,
      h1: heading(1.6),
      h2: heading(1.4),
      h3: heading(1.2),
      h4: heading(1.1),
      h5: heading(1),
      h6: heading(1),
      list: {
        ...paragraph,
        bulletColor: theme.colors.foreground,
        markerColor: theme.colors.foregroundMuted,
        gapWidth: 7,
        itemSpacing: 4,
        marginLeft: 20,
      },
      blockquote: {
        ...paragraph,
        color: theme.colors.foregroundMuted,
        backgroundColor: theme.colors.surface2,
        borderColor: theme.colors.border,
        borderWidth: 3,
        padding: 12,
        gapWidth: 8,
      },
      link: { color: theme.colors.accent, underline: false },
      linkVariants: {
        "^(?!https?://).+": {
          color: theme.colors.accent,
          pill: { borderRadius: 4, paddingHorizontal: 3 },
        },
      },
      code: {
        fontFamily: theme.fontFamily.mono === "ui-monospace" && !isWeb ? "" : theme.fontFamily.mono,
        fontSize: theme.fontSize.code,
        color: theme.colors.foreground,
        backgroundColor: theme.colors.surface2,
        borderColor: "transparent",
      },
      codeBlock: {
        ...paragraph,
        fontFamily: theme.fontFamily.mono === "ui-monospace" && !isWeb ? "" : theme.fontFamily.mono,
        fontSize: theme.fontSize.code,
        backgroundColor: theme.colors.surface2,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
      },
      table: {
        ...paragraph,
        borderColor: theme.colors.border,
        headerBackgroundColor: theme.colors.surface2,
      },
      image: { height: 320, resizeMode: "contain", borderRadius: 8 },
      thematicBreak: { color: theme.colors.border, height: 1, marginTop: 12, marginBottom: 12 },
    },
  };
}
const regularStyle = (theme: Theme) => markdownStyle(theme);
const compactStyle = (theme: Theme) => markdownStyle(theme, true);
const ThemedCodeBlock = withUnistyles(HighlightedCodeBlock);
const codeStyle = (theme: Theme) => ({
  inheritedStyles: {
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.code,
  },
  textStyle: { backgroundColor: theme.colors.surface2, padding: 12, borderRadius: 8 },
});
function WebCodeBlock({ code, language }: CodeBlockRendererProps) {
  return <ThemedCodeBlock code={code} language={language} uniProps={codeStyle} />;
}
const WEB_CONTAINER = { userSelect: "text" as const };
const WEB_RENDERERS = { codeBlock: WebCodeBlock };

export interface MarkdownRendererProps extends MarkdownImageContext {
  text: string;
  compact?: boolean;
  onLinkPress?: (url: string) => unknown;
}

/** All Markdown surfaces share the same engine and source adaptation. */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  text,
  compact = false,
  onLinkPress,
  ...imageContext
}: MarkdownRendererProps) {
  const environment = useAssistantFileLinkEnvironment();
  const actions = useAssistantFileLinkActions();
  const client =
    imageContext.client ??
    (environment.client?.readFile
      ? { readFile: environment.client.readFile.bind(environment.client) }
      : undefined);
  const { markdown, imageSources, linkRecognition, linkPillContent, linkSource } =
    useMarkdownSource(text, {
      workspaceRoot: environment.workspaceRoot,
      serverId: environment.serverId,
      ...imageContext,
      client,
    });
  const [image, setImage] = useState<ImageLightboxSource | null>(null);
  const pressLink = useStableEvent(({ url }: { url: string }) => {
    const source = linkSource(url);
    if (onLinkPress && !actions.canResolveFile(source)) onLinkPress(url);
    else actions.open(source, "preferred");
  });
  const pressImage = useStableEvent(({ url }: { url: string }) =>
    setImage({ type: "uri", uri: url }),
  );
  const closeImage = useStableEvent(() => setImage(null));
  const content = (
    <>
      <ThemedMarkdown
        markdown={markdown}
        containerStyle={isWeb ? WEB_CONTAINER : undefined}
        uniProps={compact ? compactStyle : regularStyle}
        flavor="github"
        selectable
        md4cFlags={MD4C_FLAGS}
        linkRecognition={linkRecognition}
        linkPillContent={linkPillContent}
        enableTaskListItemToggle={false}
        enableLinkPreview={false}
        enableBlockContextMenu={false}
        streamingAnimation={false}
        onLinkPress={pressLink}
        onImagePress={pressImage}
        renderers={isWeb ? WEB_RENDERERS : undefined}
      />
      {image ? <AttachmentLightbox source={image} onClose={closeImage} /> : null}
    </>
  );
  return isWeb && Object.keys(imageSources).length > 0 ? (
    <View dataSet={markdownCopyImageSourcesDataSet(imageSources)}>{content}</View>
  ) : (
    content
  );
});
