import { createAssistantMarkdownParser } from "@/utils/assistant-markdown-parser";
import type Token from "markdown-it/lib/token.mjs";

const parser = createAssistantMarkdownParser();
const streamingParser = createAssistantMarkdownParser({ streaming: true });
const INLINE_CODE_SCHEME = "paseo-inline-code:";

export function inlineCodeLinkContent(url: string): string | null {
  return url.startsWith(INLINE_CODE_SCHEME)
    ? decodeURIComponent(url.slice(INLINE_CODE_SCHEME.length))
    : null;
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/[\\`*_{}[\]<>()#+\-.!|~]/g, "\\$&");
}

function renderInline(tokens: Token[], canResolveCode: (text: string) => boolean): string {
  const links: { href: string; title: string | null }[] = [];
  return tokens
    .map((token) => {
      switch (token.type) {
        case "text":
          return escapeText(token.content);
        case "softbreak":
          return "\n";
        case "hardbreak":
          return "  \n";
        case "link_open":
          links.push({ href: token.attrGet("href") ?? "", title: token.attrGet("title") });
          return "[";
        case "link_close": {
          const link = links.pop()!;
          const title =
            link.title === null
              ? ""
              : ` "${link.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
          return `](<${link.href}>${title})`;
        }
        case "code_inline": {
          const needsPadding =
            /[^ ]/.test(token.content) &&
            (/^[ `]/.test(token.content) || /[ `]$/.test(token.content));
          const padding = needsPadding ? " " : "";
          const code = `${token.markup}${padding}${token.content}${padding}${token.markup}`;
          if (links.length > 0) return code;
          if (canResolveCode(token.content)) {
            return `[${code}](<${INLINE_CODE_SCHEME}${encodeURIComponent(token.content)}>)`;
          }
          const matches = parser.linkify.match(token.content);
          const match = matches?.length === 1 ? matches[0] : undefined;
          if (match?.index === 0 && match.lastIndex === token.content.length)
            return `[${code}](<${match.url}>)`;
          return code;
        }
        default:
          return token.markup || token.content;
      }
    })
    .join("");
}

function preserveNativeBlockMarker(source: string, rendered: string): string {
  const marker = source.match(
    /^\[(?:[ xX]|!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION))\](?=\s|$)/,
  )?.[0];
  if (!marker) return rendered;
  const escaped = escapeText(marker);
  return rendered.startsWith(escaped) ? marker + rendered.slice(escaped.length) : rendered;
}

/** Keep the existing inline dialect, including literal pipes and tappable inline paths. */
export function prepareProse(
  text: string,
  canResolveCode: (text: string) => boolean,
  streaming = false,
): string {
  const tokens = (streaming ? streamingParser : parser).parse(text, {});
  const lines = text.split("\n");
  for (let index = tokens.length - 1; index >= 0; index--) {
    const token = tokens[index]!;
    const uppercase = tokens[index - 1]?.type === "heading_open" && tokens[index - 1]?.tag === "h6";
    if (token.type !== "inline" || !token.map || !token.children) continue;
    const [start] = token.map;
    const prefixes = token.content.split("\n").map((content, offset) => {
      const line = lines[start + offset]!;
      const heading = tokens[index - 1];
      const headingPrefix =
        heading?.type === "heading_open" && heading.markup.startsWith("#")
          ? (line.match(/^(?:\s*>\s*)*\s*#{1,6}\s+/)?.[0].length ?? 0)
          : 0;
      const position = line.indexOf(content, headingPrefix);
      return position < 0 ? "" : line.slice(0, position);
    });
    if (uppercase) {
      for (const child of token.children) {
        if (child.type === "text") child.content = child.content.toUpperCase();
      }
    }
    const rendered = preserveNativeBlockMarker(
      token.content,
      renderInline(token.children, canResolveCode),
    )
      .replace(/ $/, "&#32;")
      .split("\n");
    const replacement = rendered.map(
      (line, offset) => `${prefixes[offset] ?? prefixes.at(-1) ?? ""}${line}`,
    );
    lines.splice(start, token.content.split("\n").length, ...replacement);
  }
  return lines.join("\n");
}
