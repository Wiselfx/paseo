import { useMemo, useEffect, useId } from "react";
import { useFetchQueries } from "@/data/query";
import { createAssistantImageFileAcquisition } from "@/assistant-image/file-acquisition";
import {
  persistAttachmentFromBytes,
  resolveAttachmentPreviewUrl,
  releaseAttachmentPreviewUrl,
} from "@/attachments/service";
import { createAssistantImageAcquisitionCache } from "@/assistant-image/acquisition-cache";
import { retainAttachmentForGarbageCollection } from "@/attachments/gc-retention";
import { resolveAssistantImageSource } from "@/utils/assistant-image-source";
import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { AttachmentMetadata } from "@/attachments/types";
import { resolveMarkdownPreviewImageSource } from "./image-source";
import { prepareMarkdownSource } from "./source";

const urls = createAssistantImageAcquisitionCache<{ uri: string; attachment: AttachmentMetadata }>({
  capacity: 500,
  onRetain: ({ uri, attachment }) => {
    const release = retainAttachmentForGarbageCollection(attachment.id);
    return () => {
      release();
      void releaseAttachmentPreviewUrl({ attachment, url: uri });
    };
  },
});

export interface MarkdownImageContext {
  client?: Pick<DaemonClient, "readFile"> | null;
  workspaceRoot?: string;
  serverId?: string;
  filePath?: string;
}

export function useMarkdownSource(text: string, context: MarkdownImageContext) {
  const occurrenceKey = useId();
  const prepared = useMemo(() => prepareMarkdownSource(text), [text]);
  const sources = [...new Set(prepared.images.map((image) => image.source))];
  const acquisitions = sources.map((source) => {
    const resolved = context.filePath
      ? resolveMarkdownPreviewImageSource({
          source,
          markdownPath: context.filePath,
          workspaceRoot: context.workspaceRoot,
        })
      : source;
    return createAssistantImageFileAcquisition({
      port: context.client
        ? {
            readFile: (cwd, path) => context.client!.readFile(cwd, path),
            persist: persistAttachmentFromBytes,
          }
        : null,
      resolution: resolved
        ? resolveAssistantImageSource({ source: resolved, workspaceRoot: context.workspaceRoot })
        : null,
      serverId: context.serverId,
      occurrenceKey,
      unavailableMessage: "Image unavailable",
    });
  });
  const results = useFetchQueries(
    acquisitions.map((acquisition, index) => ({
      queryKey: ["markdownImage", acquisition?.key ?? sources[index]],
      enabled: acquisition !== null,
      immutableWhen: () => true,
      dataShape: "value",
      gcTime: 0,
      queryFn: async () => {
        if (!acquisition) throw new Error("No image acquisition");
        return urls.acquire(acquisition.key, async () => {
          const attachment = await acquisition.locate();
          const uri = await resolveAttachmentPreviewUrl(attachment);
          return { attachment, uri };
        });
      },
    })),
  );
  useEffect(() => {
    const releases = results.flatMap((result, index) => {
      const acquisition = acquisitions[index];
      if (!result.data || !acquisition) return [];
      const value = result.data;
      return [urls.acquireRetained(acquisition.key, async () => value).release];
    });
    return () => releases.forEach((release) => release());
  }, [results, acquisitions]);
  const resolved = new Map<string, string>();
  results.forEach((result, index) => {
    if (result.data) resolved.set(sources[index]!, result.data.uri);
  });
  return {
    markdown: prepared.render(resolved),
    linkRecognition: prepared.linkRecognition,
    linkSource: prepared.linkSource,
    imageSources: Object.fromEntries([...resolved].map(([source, url]) => [url, source])),
  };
}
