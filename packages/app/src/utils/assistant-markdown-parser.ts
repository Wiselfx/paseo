import type MarkdownIt from "markdown-it";
import { createMarkdownParser } from "@/utils/markdown-parser";
import { enableLocalPathLinks } from "@/utils/markdown-local-paths";
import { enableRawSvgImages } from "@/utils/markdown-raw-svg";
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
  // Raw <svg> blocks become data-URI images. Anchored before linkify
  // (its xmlns URL must not linkify first); registration order vs the
  // local-path rule is irrelevant, different anchors.
  enableRawSvgImages(parser);

  if (streaming) {
    enableStreamingMarkdown(parser);
  }

  return parser;
}
