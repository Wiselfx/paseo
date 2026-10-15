# Paseo media fork

Inline YouTube playback and long-press downloads in chat.
Web UI only. No native builds.

## Files

1. `packages/app/src/components/markdown/fence/youtube/index.tsx` (new).
   WebView player wrapping a `youtube-nocookie` embed. Requires
   `javaScriptEnabled` and `allowsInlineMediaPlayback`.
2. `packages/app/src/components/markdown/fence/index.tsx`. Registers
   `youtube` in the fence map.
3. `packages/app/src/components/markdown/renderer.tsx`. Bare YouTube
   URLs route to the player in `SharedMarkdownLink`.
4. `packages/app/src/components/ui/context-menu.tsx`. Long-press
   opens the menu on touch web. `coerceEventPoint` reads
   `changedTouches[0]`; without a point the menu opens unanchored.
5. `packages/app/src/components/tree-primitives.tsx`. `user-select:
none` on tree rows, touch web only, coarse-pointer guard.
6. `packages/app/src/components/markdown/html-ish.ts`
   (`html-ish.test.ts`). Closed inline `<svg>` blocks become
   data-URI images. Image context runs no scripts.
7. `.github/workflows/build.yml`. Manual dispatch. Builds server
   and web UI, asserts fork markers in the bundle, uploads dist.
8. `docs/agents/.base-ref`. Last-merged upstream SHA.

## Failure map

- Link, no player: #3 regex, #2 registration.
- Player black: #1 props, or embedding disabled upstream.
- Long-press selects only: #4 handler, or TouchEvent coercion.
- OS callout covers the menu: #5 styles.
- Download broken: `download-store.ts` (upstream, untouched).
- SVG renders as text: #6 fallthroughs (unclosed, oversized,
  code span).
- Merge conflicts: files 2–6 can produce them. Files 1, 7, 8
  cannot.

## Needs

- `build:daemon-web-ui` output served at daemon root. The manifest
  scope depends on it.
- iOS Safari device check for the long-press anchor. Fallback:
  opens unanchored.

## Not covered

- Native apps. Separate builds, untouched.
- Stock clients. Plain links where the fork renders players.
