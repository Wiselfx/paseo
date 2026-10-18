# Paseo media fork

Inline YouTube playback, link and image cards, and long-press
downloads in chat. Web UI only. No native builds.

## Files

1. `packages/app/src/components/markdown/fence/youtube/index.tsx` (new).
   WebView player wrapping a `youtube-nocookie` embed. Requires
   `javaScriptEnabled` and `allowsInlineMediaPlayback`. A bare YouTube URL
   inside prose hosts the matching-sized player instead of a full-width one
   (`segments.ts` `youtube-inline` cut, `mini.tsx`: 16:9 poster, max 320
   wide, radius 12, tap to load).
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
11. `packages/app/src/components/context-window-cache.ts`
    (`context-window-cache.test.ts`). Prompt-cache figures as reported by the
    provider, rendered as muted lines in `context-window-details.tsx` next to
    session cost: the read and the input it compares against, the hit rate for
    the last turn and for the session, the tokens re-billed with their cost,
    and cost with volume per model when a session touched more than one.
    Nothing is recomputed here — the percentages arrive already computed and are
    only rounded to Pi's one decimal.
12. `packages/app/src/components/markdown/styles.fork.test.ts`. Guards the
    two fork values inside `styles.ts` across upstream merges: block images
    keep `borderRadius` 12 and `maxHeight` 1200. Everything else in that file
    is upstream's: since #7298 blocks take one shared gap
    (`density.blockGap`, 12 compact / 16 desktop) via `...block` and
    `MarkdownBlockStack`, which replaced `frame.tsx`. Fork fences carry no
    margins of their own, so they take that single gap.
13. `docs/agents/.base-ref`. Last-merged upstream SHA.
14. `packages/server/src/server/agent/providers/pi/cache-miss.ts`
    (`cache-miss.test.ts`) and `cache-stats.ts` (`cache-stats.test.ts`). Pi
    reports no cache metrics over RPC, so Paseo derives them from what each
    assistant message already records: a warning when a turn re-bills prompt
    tokens, at Pi's own thresholds (1024-token noise floor, notice at 20K tokens
    or $0.10), and the figures item 11 renders. History replay re-derives the
    warnings, so a resumed session keeps them.

    The notice states measurements rather than diagnosing: `Cache miss` followed
    only by facts the provider's numbers support — how much was billed against
    the prompt it came from, a model change, a prompt that lost content, nothing
    served from cache, a previous turn that cached nothing, and the gap since the
    last turn. A clause appears only when it is true, so a fact the numbers cannot
    support (a cost the message does not price, a gap history cannot measure) is
    left out rather than guessed. Pi names a reason only for model switches and
    idle gaps; this format says what happened in every case.

15. `packages/app/src/components/fork-strings.ts`. Where fork-only UI text lives,
    as plain literals. Adding one key to the locale resources obliges all nine
    languages to carry a translation — `i18n/resources.test.ts` compares every
    locale's key set against English and refuses strings identical to it. So
    upstream text keeps using `t()`, fork surfaces use this module, and
    translating the fork means translating this one file.

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
- No cache lines: the provider reported no cache reads, or the message predates
  usage being recorded. A miss warning without its cost means the provider
  priced nothing.
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
