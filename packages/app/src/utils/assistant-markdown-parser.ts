import type MarkdownIt from "markdown-it";
import { createMarkdownParser } from "@/utils/markdown-parser";
import { enableLocalPathLinks } from "@/utils/markdown-local-paths";
import { enableStreamingMarkdown } from "@/utils/streaming-markdown";

export function createAssistantMarkdownParser({ streaming = false } = {}): MarkdownIt {
  const parser = createMarkdownParser({ linkify: true });
  const defaultValidateLink = parser.validateLink.bind(parser);

  // Assistant messages are the only surface allowed to link into the
  // filesystem. Every other parser keeps markdown-it's stricter default.
  parser.validateLink = (url: string) =>
    url.trim().toLowerCase().startsWith("file://") || defaultValidateLink(url);

  // Bare /abs and ~/ paths linkify to file:// links / images. Same
  // assistant-only scoping as validateLink above.
  enableLocalPathLinks(parser);

  if (streaming) {
    enableStreamingMarkdown(parser);
  }

  return parser;
}
