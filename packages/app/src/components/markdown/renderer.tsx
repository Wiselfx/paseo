import { memo, useMemo, useState } from "react";
import { EnrichedMarkdownText, type LinkPressEvent } from "react-native-enriched-markdown";
import { withUnistyles } from "react-native-unistyles";
import {
  useAssistantFileLinkActions,
  useAssistantFileLinkEnvironment,
} from "@/assistant-file-links";
import { useStableEvent } from "@/hooks/use-stable-event";
import { AttachmentLightbox, type ImageLightboxSource } from "@/components/attachment-lightbox";
import type { Theme } from "@/styles/theme";
import { isWeb } from "@/constants/platform";
import { MarkdownRendererFrame } from "./frame";
import { WEB_RENDERERS } from "./renderers";
import { createMarkdownStyles } from "./styles";
import { PENDING_MARKDOWN_IMAGE } from "./source";
import { splitStreamingMarkdown } from "./streaming";
import { useMarkdownSource, type MarkdownImageContext } from "./images";

import { MermaidFence, MermaidStreamingContext, splitMermaidFences } from "./fence/mermaid";
import { YouTubeFence } from "./fence/youtube";
import { splitYouTubeFences } from "./fence/youtube/segments";
import { AssistantLinkCard } from "./link-card";
import { splitLinkCards } from "./link-card-segments";
import { VisualizeFence } from "./fence/visualize";
import { splitVisualizeFences } from "./fence/visualize/segments";

const ThemedMarkdown = withUnistyles(EnrichedMarkdownText);
const MD4C_FLAGS = { latexMath: false, hardSoftBreaks: true, admonitions: true };

const regularStyle = (theme: Theme) => createMarkdownStyles(theme);
const compactStyle = (theme: Theme) => createMarkdownStyles(theme, true);
const WEB_CONTAINER = { userSelect: "text" as const };

export interface MarkdownRendererProps extends MarkdownImageContext {
  text: string;
  compact?: boolean;
  streaming?: boolean;
  agentId?: string;
  workspaceId?: string;
  onLinkPress?: (url: string) => unknown;
}

/** All Markdown surfaces share the same engine and source adaptation. */
export const MarkdownRenderer = memo(function MarkdownRenderer(props: MarkdownRendererProps) {
  const streaming = !isWeb && !!props.streaming;
  // Only completed lines affect block closure. Do not run mdast on every reveal frame.
  const completeLines = streaming ? props.text.slice(0, props.text.lastIndexOf("\n") + 1) : "";
  const boundary = useMemo(
    () => splitStreamingMarkdown(completeLines, true).head.length,
    [completeLines],
  );
  if (!streaming || boundary === 0) return <MarkdownPart {...props} />;
  return (
    <>
      <MarkdownPart {...props} text={props.text.slice(0, boundary)} continues />
      <MarkdownPart {...props} text={props.text.slice(boundary)} />
    </>
  );
});

const MarkdownPart = memo(function MarkdownPart({
  text,
  continues = false,
  compact = false,
  streaming = false,
  agentId,
  workspaceId,
  onLinkPress,
  ...imageContext
}: MarkdownRendererProps & { continues?: boolean }) {
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
  const pressImage = useStableEvent(({ url }: { url: string }) => {
    if (url !== PENDING_MARKDOWN_IMAGE) setImage({ type: "uri", uri: url });
  });
  const closeImage = useStableEvent(() => setImage(null));
  // Fork media: YouTube fences + standalone bare YouTube URL lines host the
  // player between library segments (same pattern as mermaid). Standalone
  // bare links become favicon cards the same way. Mermaid splitting stays
  // platform-gated as upstream; YouTube/card splits run everywhere.
  const segments = useMemo(() => {
    const mermaid = isWeb
      ? [{ kind: "markdown" as const, id: "0", source: markdown }]
      : splitMermaidFences(markdown);
    const out: { kind: string; id: string; source: string }[] = [];
    const splitCards = (source: string) => {
      for (const c of splitLinkCards(source)) {
        if (c.kind !== "markdown") out.push({ ...c, id: `c${out.length}` });
        else
          for (const v of splitVisualizeFences(c.source)) out.push({ ...v, id: `v${out.length}` });
      }
    };
    for (const m of mermaid) {
      if (m.kind !== "markdown") {
        out.push({ ...m, id: `m${out.length}` });
        continue;
      }
      for (const y of splitYouTubeFences(m.source)) {
        if (y.kind !== "markdown") out.push({ ...y, id: `y${out.length}` });
        else splitCards(y.source);
      }
    }
    return out;
  }, [markdown]);
  const content = (
    <MermaidStreamingContext.Provider value={streaming}>
      {segments.map((segment) =>
        segment.kind === "mermaid" ? (
          <MermaidFence key={`${segment.kind}:${segment.id}`} code={segment.source} />
        ) : segment.kind === "youtube" ? (
          <YouTubeFence key={`${segment.kind}:${segment.id}`} code={segment.source} />
        ) : segment.kind === "card" ? (
          <AssistantLinkCard
            key={`${segment.kind}:${segment.id}`}
            url={segment.source}
            onPress={(url) => pressLink({ url, sourceType: "text" })}
          />
        ) : segment.kind === "viz" ? (
          <VisualizeFence
            key={`${segment.kind}:${segment.id}`}
            code={segment.source}
            serverId={imageContext.serverId}
            agentId={agentId}
            workspaceId={workspaceId}
          />
        ) : (
          <ThemedMarkdown
            key={`${segment.kind}:${segment.id}`}
            markdown={segment.source}
            containerStyle={isWeb ? WEB_CONTAINER : undefined}
            uniProps={compact ? compactStyle : regularStyle}
            flavor="github"
            selectable
            allowTrailingMargin={continues && segment === segments[segments.length - 1]}
            md4cFlags={MD4C_FLAGS}
            linkRecognition={linkRecognition}
            enableTaskListItemToggle={false}
            enableLinkPreview={false}
            enableBlockContextMenu={false}
            // JS reveal owns pacing; native fade animation is a separate experiment.
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
  return <MarkdownRendererFrame imageSources={imageSources}>{content}</MarkdownRendererFrame>;
});
