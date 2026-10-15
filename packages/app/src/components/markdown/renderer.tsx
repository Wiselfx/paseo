import { View } from "react-native";
import { markdownCopyImageSourcesDataSet } from "@/assistant-selection-copy/markup";
import { memo, useMemo, useState } from "react";
import {
  EnrichedMarkdownText,
  type LinkPressEvent,
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
import { createMarkdownStyles } from "./styles";
import { useMarkdownSource, type MarkdownImageContext } from "./images";

import { MermaidFence, MermaidStreamingContext, splitMermaidFences } from "./fence/mermaid";

const ThemedMarkdown = withUnistyles(EnrichedMarkdownText);
const MD4C_FLAGS = { latexMath: false, hardSoftBreaks: true, admonitions: true };

const regularStyle = (theme: Theme) => createMarkdownStyles(theme);
const compactStyle = (theme: Theme) => createMarkdownStyles(theme, true);
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
  if (language?.toLowerCase() === "mermaid") return <MermaidFence code={code} />;
  return <ThemedCodeBlock code={code} language={language} uniProps={codeStyle} />;
}
const WEB_CONTAINER = { userSelect: "text" as const };
const WEB_RENDERERS = { codeBlock: WebCodeBlock };

export interface MarkdownRendererProps extends MarkdownImageContext {
  text: string;
  compact?: boolean;
  streaming?: boolean;
  onLinkPress?: (url: string) => unknown;
}

/** All Markdown surfaces share the same engine and source adaptation. */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  text,
  compact = false,
  streaming = false,
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
  const { markdown, imageSources, linkRecognition, linkSource } = useMarkdownSource(text, {
    workspaceRoot: environment.workspaceRoot,
    serverId: environment.serverId,
    ...imageContext,
    client,
  });
  const [image, setImage] = useState<ImageLightboxSource | null>(null);
  const pressLink = useStableEvent(({ url, sourceType }: LinkPressEvent) => {
    const source = linkSource(url, sourceType);
    if (onLinkPress && !actions.canResolveFile(source)) onLinkPress(url);
    else actions.open(source, "preferred");
  });
  const pressImage = useStableEvent(({ url }: { url: string }) =>
    setImage({ type: "uri", uri: url }),
  );
  const closeImage = useStableEvent(() => setImage(null));
  const segments = useMemo(
    () =>
      isWeb ? [{ kind: "markdown", id: "0", source: markdown }] : splitMermaidFences(markdown),
    [markdown],
  );
  const content = (
    <MermaidStreamingContext.Provider value={streaming}>
      {segments.map((segment) =>
        segment.kind === "mermaid" ? (
          <MermaidFence key={`${segment.kind}:${segment.id}`} code={segment.source} />
        ) : (
          <ThemedMarkdown
            key={`${segment.kind}:${segment.id}`}
            markdown={segment.source}
            containerStyle={isWeb ? WEB_CONTAINER : undefined}
            uniProps={compact ? compactStyle : regularStyle}
            flavor="github"
            selectable
            md4cFlags={MD4C_FLAGS}
            linkRecognition={linkRecognition}
            enableTaskListItemToggle={false}
            enableLinkPreview={false}
            enableBlockContextMenu={false}
            streamingAnimation={false}
            onLinkPress={pressLink}
            onImagePress={pressImage}
            renderers={isWeb ? WEB_RENDERERS : undefined}
          />
        ),
      )}
      {image ? <AttachmentLightbox source={image} onClose={closeImage} /> : null}
    </MermaidStreamingContext.Provider>
  );
  return isWeb && Object.keys(imageSources).length > 0 ? (
    <View dataSet={markdownCopyImageSourcesDataSet(imageSources)}>{content}</View>
  ) : (
    content
  );
});
