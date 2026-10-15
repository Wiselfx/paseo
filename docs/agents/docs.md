# Paseo media fork

Inline YouTube playback, link and image cards, and long-press
downloads in chat. Web UI only. No native builds.

## Files

1. `packages/app/src/components/markdown/fence/youtube/index.tsx` (new).
   WebView player wrapping a `youtube-nocookie` embed. Requires
   `javaScriptEnabled` and `allowsInlineMediaPlayback`.
2. `packages/app/src/components/markdown/fence/index.tsx`. Registers
   `youtube` in the fence map.
3. `packages/app/src/components/markdown/renderer.tsx` plus
   `packages/app/src/assistant-file-links/link.tsx`. Bare YouTube
   URLs route to the player in `SharedMarkdownLink` (file preview)
   and `AssistantMarkdownLink` (assistant chat bubbles).
4. `packages/app/src/components/ui/context-menu.tsx`. Long-press
   opens the menu on touch web. `coerceEventPoint` reads
   `changedTouches[0]`; without a point the menu opens unanchored.
5. `packages/app/src/components/tree-primitives.tsx`. `user-select:
none` on tree rows, touch web only, coarse-pointer guard.
6. `packages/app/src/components/markdown/html-ish.ts`
   (`html-ish.test.ts`). Closed inline `<svg>` blocks become
   data-URI images. Image context runs no scripts.
7. `packages/app/src/components/markdown/media-links.ts`
   (`media-links.test.ts`). Link/image classifiers ported from the
   plugin detectors: no prose gates, no card caps, no replacement.
8. `packages/app/src/utils/markdown-local-paths.ts`
   (`markdown-local-paths.test.ts`). Core ruler rule linkifies
   bare `/abs` and `~/` paths (images to image tokens, rest to
   file:// links). Assistant surfaces only.
9. `packages/app/src/components/markdown/link-card.tsx`
   (`link-card.test.ts`). Favicon plus domain card for
   standalone bare links. Wired in `components/message.tsx`
   link rule with `AssistantMarkdownImage` for bare image URLs.
10. `.github/workflows/build.yml`. Manual dispatch. Builds server
    and web UI, asserts fork markers in the bundle, uploads dist.
11. `docs/agents/.base-ref`. Last-merged upstream SHA.

## Failure map

- Link, no player: #3 regex, #2 registration, or the
  `AssistantMarkdownLink` hook (chat bubbles never use #3).
- Bare link, no card: #9 placement (prose-embedded links stay
  links by design) or #7 classifier.
- Local path, dead text: #8 rule (assistant surfaces only).
- Player black: #1 props, or embedding disabled upstream.
- Player black: #1 props, or embedding disabled upstream.
- Long-press selects only: #4 handler, or TouchEvent coercion.
- OS callout covers the menu: #5 styles.
- Download broken: `download-store.ts` (upstream, untouched).
- SVG renders as text: #6 fallthroughs (unclosed, oversized,
  code span).
- Merge conflicts: files 2–6 can produce them. Files 1, 7, 8,
  9, 10, 11 cannot.

## Needs

- `build:daemon-web-ui` output served at daemon root. The manifest
  scope depends on it.
- iOS Safari long-press: device-verified 2026-10-15 (menu opens,
  Download works). Fallback opens unanchored.

## Not covered

- Native apps. Separate builds, untouched.
- Stock clients. Plain links where the fork renders players.
