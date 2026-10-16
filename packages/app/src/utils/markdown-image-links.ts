import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { isRemoteImageUrl } from "@/components/markdown/media-links";

/**
 * Bare remote image URLs as image tokens, assistant surfaces only.
 *
 * Rendering image previews from the link rule left bare URLs on a
 * different code path than authored images (link node vs image node)
 * with different mount behavior. Converting at parse time makes bare
 * URLs indistinguishable from authored `![...](...)`: same AST node
 * type, same image rule, same component. Only linkify-generated links
 * convert — authored `[text](url)` links keep their form.
 *
 * Runs after linkify core (its triples are the input) and pairs with
 * the local-path rule, which owns filesystem paths. Unmatched
 * extensions and unclosed spans stay links.
 */

function imageToken(state: StateCore, href: string): Token {
  const token = new state.Token("image", "img", 0);
  token.attrs = [
    ["src", href],
    ["alt", ""],
  ];
  const alt = new state.Token("text", "", 0);
  alt.content = "";
  token.children = [alt];
  token.content = "";
  token.markup = "image-link";
  return token;
}

function bareImageLinkRule(state: StateCore): void {
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    const children = block.children;
    // Scan from the end like linkify core so splicing keeps positions.
    for (let i = children.length - 1; i >= 0; i--) {
      const close = children[i];
      if (close.type !== "link_close" || close.markup !== "linkify") continue;
      const text = children[i - 1];
      const open = children[i - 2];
      if (!open || !text || open.type !== "link_open" || text.type !== "text") continue;
      const href = open.attrs?.find((attr) => attr[0] === "href")?.[1];
      if (typeof href !== "string" || !isRemoteImageUrl(href)) continue;
      children.splice(i - 2, 3, imageToken(state, href));
      i -= 2;
    }
  }
}

export function enableBareImageLinks(parser: MarkdownIt): void {
  parser.core.ruler.after("linkify", "bare-image-link", bareImageLinkRule);
}
