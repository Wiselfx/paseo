/** Minimal AST shape for block parents (old react-native-markdown-display
 * ASTNode; the library is gone upstream, classifiers only need this). */
interface BlockNode {
  type: string;
  key: string;
  content: string;
  children: BlockNode[];
}

/**
 * Native port of the media-cards plugin detectors: same matchers, none of
 * the gates. The plugin caps at 5 cards, vetoes long prose, and replaces the
 * whole message or nothing (see transform-cards.ts in the plugin source).
 * Native renderers work inline at the token level, so prose limits, card
 * caps, and message replacement do not exist here — these are pure
 * classifiers. YouTube detection stays in fence/youtube (youtubeIdForUrl).
 */

const REMOTE_IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)(?:[?#]\S*)?$/i;

const LOCAL_IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

// Bare absolute or home-relative paths: no spaces, no markdown closers.
// Trailing punctuation is trimmed by trimTrailingPunctuation after matching,
// so sentence-final "/tmp/shot.png." still resolves.
const BARE_LOCAL_PATH_RE = /(~?\/[^\s`'"[\]()]+)/g;

const TRAILING_PUNCT_RE = /[.,;:!?]+$/;

const HOST_RE = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/:?#\s]+)/i;

/** Remote http(s) URL pointing at an image file (query strings allowed). */
export function isRemoteImageUrl(href: string): boolean {
  return /^(https?:|data:|blob:)/i.test(href) && REMOTE_IMAGE_RE.test(href.split("#")[0]);
}

/** Absolute or ~/ path pointing at an image file. */
export function isLocalImagePath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") && !trimmed.startsWith("~/")) return false;
  return LOCAL_IMAGE_EXT_RE.test(trimTrailingPunctuation(trimmed));
}

/** Absolute or ~/ path of any kind (image or not). */
export function isLocalPath(path: string): boolean {
  const trimmed = path.trim();
  return trimmed.startsWith("/") || trimmed.startsWith("~/");
}

export function trimTrailingPunctuation(s: string): string {
  return s.replace(TRAILING_PUNCT_RE, "");
}

const CARD_CONTAINER_TYPES = new Set(["paragraph", "textgroup"]);

/**
 * True when the link is its block's only meaningful content: the nearest
 * paragraph-like container (paragraph, or the textgroup wrapper the
 * renderer groups inline runs into — the assistant block pipeline tops
 * out at textgroup, so a paragraph lookup never matches there) holds
 * nothing but the link, blank text, and line breaks. Structural parents
 * opt out: links in list items and headings stay links, and cards never
 * render inside them.
 */
export function isSoleBlockContent(nodeKey: string, parent: BlockNode[]): boolean {
  if (parent.some((a) => a?.type === "list_item" || (a?.type?.startsWith("heading") ?? false)))
    return false;
  const container = parent.find(
    (a) =>
      a && CARD_CONTAINER_TYPES.has(a.type) && Array.isArray(a.children) && a.children.length > 0,
  );
  const siblings = container?.children;
  if (!siblings) return false;
  return siblings.every(
    (child) =>
      child?.key === nodeKey ||
      (child?.type === "text" && child?.content.trim() === "") ||
      child?.type === "softbreak" ||
      child?.type === "hardbreak",
  );
}

/**
 * Display form of a URL with secrets removed: scheme, query string,
 * fragment, and userinfo are dropped; host + path remain. Loading always
 * uses the full URL — this is for visible text only.
 */
export function displayUrl(url: string): string {
  const m = url.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#\s]+@)?([^/?#\s]+)([^?#\s]*)/i);
  if (!m) return url;
  const path = m[2].replace(/\/+$/, "");
  return path && path !== "/" ? `${m[1]}${path}` : m[1];
}

/** Host for a URL, or the input unchanged when no host parses. */
export function domainForUrl(url: string): string {
  return url.match(HOST_RE)?.[1] ?? url;
}

/**
 * Bare-path matcher for the markdown inline rule: yields each candidate
 * path substring. Code spans never reach inline rules, so fenced/inline
 * code needs no scrubbing (unlike the plugin's raw-text regexes).
 */
export function matchBareLocalPaths(text: string): string[] {
  BARE_LOCAL_PATH_RE.lastIndex = 0;
  const out: string[] = [];
  for (const m of text.matchAll(BARE_LOCAL_PATH_RE)) {
    out.push(trimTrailingPunctuation(m[1]));
  }
  return out.filter((s) => s.length > 1);
}
