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
6. `packages/app/src/utils/markdown-raw-svg.ts`
   (`markdown-raw-svg.test.ts`). Closed inline `<svg>` blocks become
   data-URI images and ride the image pipeline. Unclosed blocks and
   code spans pass through. Image context runs no scripts.
7. `packages/app/src/components/markdown/media-links.ts`
   (`media-links.test.ts`). Link/image classifiers ported from the
   plugin detectors: no prose gates, no card caps, no replacement.
8. `packages/app/src/utils/markdown-local-paths.ts` and
   `packages/app/src/utils/markdown-image-links.ts`, tested together in
   `markdown-media-prepass.test.ts`. Source pre-passes before mdast:
   bare `/abs` and `~/` paths become image or file links, bare remote
   image URLs become image markdown. Assistant surfaces only.
9. `packages/app/src/components/markdown/link-card.tsx`
   (`link-card.test.tsx`) and `link-card-segments.ts`
   (`link-card-segments.test.ts`). Favicon plus domain card for
   standalone bare links; the segment split decides which lines are
   standalone. Wired in `components/message.tsx` link rule with
   `AssistantMarkdownImage` for bare image URLs.
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
16. `packages/app/src/components/markdown/fence/visualize/` and
    `packages/app/src/panels/viz-panel.tsx`. The `visualize` fence: sandboxed
    stage, per-fence state and prompt bridges, workspace tab, export. Behaviour
    and protocol in `visualize.md`; the files are `index.tsx` and `segments.ts`
    (fence and splitting, `viz.test.ts`), `document.ts` (the sandboxed document
    and its theme vars, `viz.test.ts`), `stage.tsx` / `stage.web.tsx` (WebView
    and iframe), `bridges.ts` (`bridges.test.ts`), `store.ts` (`store.test.ts`).
17. `packages/app/src/components/markdown/fence/youtube/`. The player split:
    `urls.ts` (URL extraction and thumbnail, `urls.test.ts`), `mini.tsx`
    (`mini.test.tsx`, the inline poster), `player.tsx` / `player.web.tsx`
    (full-width player, `player.web.test.tsx`), `segments.ts`
    (`segments.test.ts`, the cut), `index.tsx` (fence registration).
18. `packages/app/src/components/markdown/image-paragraphs.ts`, called by
    `source.ts`. Every image gets a paragraph of its own, including one that
    shares its line with text: the library sizes a text-sharing image as one
    square the height of a text line. A break splits at a line boundary, or eats
    the whitespace beside the image within a line, and a break inside a quote
    re-opens the marker. Two boundaries: an image inside a list item keeps the
    tile, because a blank line there ends the list; an image that collapses to
    alt text — unavailable, or an SVG on native — stays where it was, since it
    occupies no box. Upstream's `docs/markdown-renderer.md` still describes its
    own inline rule. Upstream's engine fork (`#7240`) moves this rule into C++
    and deletes the call.
19. `packages/app/src/components/markdown/hosted-segments.ts`
    (`hosted-segments.test.ts`). The one stage table that decides which fence
    kinds the app hosts outside the library — mermaid native-only, then YouTube,
    cards, visualize — walked depth-first so hosted blocks keep document order.
    `renderer.tsx` renders whatever the table returns, so a new hosted fence is
    one stage entry plus a renderer case.
20. `packages/app/src/components/markdown/test-utils/library-internals.ts`.
    The app's only import of `react-native-enriched-markdown` private paths,
    used by `renderer.test.ts`; the one file to rename when the library is
    replaced.

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
- Image renders as a small tile: it sits inside a list item, or it is acquirable
  but mid-sentence and still pending — the pending placeholder takes a paragraph
  of its own, so the tile is the resolved image's size.
- Merge conflicts: files 2–6, and the fork calls left in `source.ts` and
  `renderer.tsx` (#3). New-file items (#18–20) cannot.

## Needs

- `build:daemon-web-ui` output served at daemon root. The manifest
  scope depends on it.
- iOS Safari long-press: device-verified 2026-10-15 (menu opens,
  Download works). Fallback opens unanchored.

## Not covered

- Native apps. Separate builds, untouched.
- Stock clients. Plain links where the fork renders players.
