# Claude style

The branch `claude-style` makes the app look and move like the DSH Claude Style plugin, with
Claude's runtime-verified values (OCU) and no new features. This file is the ledger: the token
map, the parity matrix, the files changed, the rebase recipe, the perf numbers and the gaps.

Sources of truth, in order:

- **DSH** (`refs/dsh-claude-style/`) decides what exists and how it behaves and moves.
- **OCU** (`refs/specs/ocu-spec.md`) decides values: colours, radii, durations, curves.
- **Paseo** (`docs/design.md`) decides how it is built: primitives, tokens, unistyles.

## Token map

Values live in `packages/app/src/styles/claude-tokens.ts`; `theme.ts` composes them into the
default light and dark themes. Nothing else may hardcode a Claude colour.

| OCU value                                                        | Token                                                  | Where it lands |
| ---------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| canvas `#fcfcfb` / `#151515`                                     | `surface0`, `background`, `surfaceWorkspace`           | theme          |
| sidebar `#f9f9f7` / `#0b0b0b`                                    | `surfaceSidebar`                                       | theme          |
| panel/card `#ffffff` / `#1a1a19`                                 | `surface1`, `popover`                                  | theme          |
| raised `#f5f4f1` / `#20201f`                                     | `surface2`, `input`                                    | theme          |
| bubble `#f0efec` / white 6%                                      | `surface3`, `bubble`, `surfaceSidebarHover`            | theme          |
| pressed `#e8e6e1` / white 10%                                    | `surface4`, `pressed`                                  | theme          |
| ink `#0b0b0b` / `#f0efec`                                        | `foreground`, `primary`                                | theme          |
| ink-2 `#52514e` / `#c3c2b7`                                      | `foregroundMuted`                                      | theme          |
| ink-3 `#898781` both                                             | `foregroundExtraMuted`                                 | theme          |
| clay `#d97757`                                                   | `brand`, `accentBright`                                | theme          |
| clay emphasized `#c6613f`                                        | `brandStrong`, `accent` (filled buttons)               | theme          |
| accent ink `#184f95` / `#6da7ec`                                 | `accentInk`, `ring`                                    | theme          |
| accent stroke `#86b6ef` / `#0d366b`                              | `accentStroke`                                         | theme          |
| border ink 10% both                                              | `border`                                               | theme          |
| divider ink 5% / white 6%                                        | `divider`                                              | theme          |
| chip white 10% both                                              | `chip`                                                 | theme          |
| hover / selected / pressed washes                                | `hover`, `selected`, `pressed`, `interactionHighlight` | theme          |
| code block `#0d0d0c` dark                                        | `codeBackground`                                       | theme          |
| skeleton 5% / 7.5%                                               | `skeletonBase`, `skeletonSheen`                        | theme          |
| popover shadow pair                                              | `shadow` on floating surfaces                          | package 4      |
| radius 8 control / 12 card / 14 composer / 18 bubble / 16 dialog | `borderRadius.control/card/composer/bubble`            | theme          |
| durations 60/120/200/300/450                                     | `CLAUDE_DURATION`                                      | styles         |
| easings out/snap/overshoot                                       | `CLAUDE_EASE`                                          | styles         |
| display serif                                                    | `DEFAULT_DISPLAY_FONT_STACK`                           | styles         |

Compact adaptations (recorded because they differ from the desktop reference):

- **Composer radius** stays derived from the trailing disc (`composer/input/toolbar-rails.ts`),
  because the disc nests into the corner and the two radii are concentric. OCU's 14 is the
  desktop card.
- **Sidebar rows** stay 44 pt; OCU's 28 px is desktop density.
- **Content width** keeps the user's setting; OCU's 672–768 is desktop.

## Parity matrix

Status: `planned` → `built` → `reviewed` → `done`. Every in-scope row needs paired captures at
390×844 and 1440×900 in light and dark (kept in `evidence/`, never committed). DSH ships
desktop captures only; compact work is judged against `refs/specs/UX-SPEC.md`, whose iPhone
adaptation is the compact reference. The evidence sets are grouped by surface, not one image
per row: `clean-chat-*`, `clean-expanded-*`, `permission-*`, `search-*`, `settings-*`,
`files-*`, `changes-*`, `diff-*`, `sidebar-*`, `tabs-*`.

| DSH feature        | In?            | Paseo surface                                    | Files                                                       | Status  |
| ------------------ | -------------- | ------------------------------------------------ | ----------------------------------------------------------- | ------- |
| brand              | yes            | palette, mark                                    | `styles/claude-tokens.ts`, `theme.ts`                       | done    |
| surface            | no             | Chat/Code switch is a DSH product feature        | —                                                           | out     |
| header-band        | no             | Windows desktop caption row                      | —                                                           | out     |
| caret              | yes            | composer caret                                   | `composer/input/input.tsx`                                  | done    |
| composer           | yes            | composer card, chips, footer tray                | `composer/**`                                               | done    |
| chat-fold          | yes            | process group fold, thought rows                 | `agent-stream/view.tsx`, `tool-calls/**`                    | done    |
| chat-reveal        | yes            | streamed text pacing                             | `agent-stream/text-reveal.ts`                               | done    |
| chat-follow        | yes            | tail follow, scroll pill                         | `agent-stream/view.tsx`                                     | done    |
| chat-anchor        | yes            | answer anchor on reveal                          | `agent-stream/**`                                           | blocked |
| chat-send          | yes            | sent message entrance                            | `agent-stream/**`                                           | done    |
| chat-wait          | partial        | loader look; no new status strings               | `synced-loader.tsx`                                         | done    |
| chat-files         | yes            | file-change rows in process                      | `tool-calls/**`                                             | done    |
| process-column     | yes            | grouped tool card layout                         | `tool-calls/detail-level/**`                                | done    |
| conversation-width | yes (existing) | user-selectable conversation width               | `components/message.tsx`                                    | done    |
| message-actions    | yes            | message hover actions                            | `components/message.tsx`                                    | done    |
| permissions        | yes            | permission card                                  | `agent-stream/view.tsx`                                     | done    |
| question-card      | yes            | question form card                               | `components/question-form-card.tsx`                         | done    |
| turn-nav           | yes            | turn rail                                        | `agent-stream/chat-outline/**`                              | done    |
| mascot             | blocked        | crab art is Anthropic's, license grants no reuse | `screens/new-workspace-screen.tsx`                          | blocked |
| home               | yes            | new-session hero                                 | `screens/new-workspace-screen.tsx`                          | done    |
| home-ripple        | no             | pointer-driven decorative field                  | —                                                           | out     |
| hero-menu          | yes            | hero menu look                                   | `screens/new-workspace/**`                                  | done    |
| date-groups        | no             | adds a grouping toggle and sectioning            | —                                                           | out     |
| sidebar-entries    | yes            | sidebar rows and footer                          | `components/left-sidebar.tsx`, `sidebar-workspace-list.tsx` | done    |
| sidebar-status     | yes            | status dots, running row                         | `agent-status-dot.tsx`, `sidebar-workspace-list.tsx`        | done    |
| sidebar-peek       | no             | desktop hover-peek                               | —                                                           | out     |
| session-title      | no             | inline rename field is a new interaction         | —                                                           | out     |
| session-actions    | yes            | row menu look                                    | `sidebar-workspace-list.tsx`                                | done    |
| active-first       | yes            | running rows first                               | `sidebar-workspace-list.tsx`                                | blocked |
| active-shelf       | no             | adds a bell and a running list                   | —                                                           | out     |
| manual-unread      | no             | adds a read-state action                         | —                                                           | out     |
| row-skip           | no             | upstream already virtualizes                     | —                                                           | out     |
| sound-cues         | no             | new audio                                        | —                                                           | out     |
| view-tabs          | yes (desktop)  | workspace tab strip look                         | `workspace-tabs/**`                                         | done    |
| width-handle       | yes (desktop)  | resize handle look                               | `resize-handle.tsx`                                         | done    |
| rightbar-fit       | yes (desktop)  | pane fit rules                                   | `workspace/**`                                              | done    |
| bottom-panel-fit   | yes (desktop)  | bottom sheet fit                                 | `panels/**`                                                 | done    |
| search             | yes            | search sheet look                                | `command-center/**`                                         | done    |
| settings           | yes            | settings cards/rows                              | `styles/settings.ts`                                        | done    |
| workspace          | yes            | workspace panel chrome                           | `screens/workspace/**`                                      | done    |
| model              | yes            | model picker look                                | `composer/agent-controls/**`                                | done    |
| effort             | yes            | thinking picker look                             | `composer/agent-controls/**`                                | done    |
| context-stats      | yes            | context meter look                               | `components/context-window-meter.tsx`                       | done    |
| account            | no             | DSH account panel                                | —                                                           | out     |
| ban-screen         | no             | DSH product surface                              | —                                                           | out     |
| peakrate           | no             | DSH product surface                              | —                                                           | out     |
| sodium             | no             | rendering engine, not a look                     | —                                                           | out     |

## Type

Claude's three interface faces ship in `packages/app/assets/fonts/anthropic` and are loaded
once at the root (`src/styles/fonts.ts` via `expo-font`); `src/styles/theme.ts` names them in
the three stacks:

| role                         | face                     | stack                         |
| ---------------------------- | ------------------------ | ----------------------------- |
| interface                    | Anthropic Sans Web Text  | `AnthropicSans` + system sans |
| conversation prose, headings | Anthropic Serif Web Text | `AnthropicSerif` + Georgia    |
| code                         | Anthropic Mono Web       | `AnthropicMono` + system mono |

Prose (`components/markdown/styles.ts`) reads `theme.fontFamily.prose`; the composer, sidebar,
and controls keep `theme.fontFamily.ui`. These are Text Regular cuts, so the platform
synthesizes weight. Provenance and licensing note: `packages/app/assets/fonts/anthropic/README.md`.

## Files changed

`git diff --stat upstream/main`: **141 files, +4,078 / −2,056** (three font binaries
excluded from the line count).

| Area                      | Files | Change                                                                                                              |
| ------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------- |
| tokens, theme, appearance |     7 | `styles/claude-tokens.ts` (new), `styles/theme.ts`, `appearance/apply*.ts`                                          |
| type                      |     6 | three Anthropic faces, `styles/fonts.ts`, root `useFonts` gate, `app/_layout.tsx`                                   |
| conversation              |    18 | `components/message.tsx`, markdown renderer/styles, highlighted code, turn footer, question card, `agent-stream/**` |
| process / tool rows       |     4 | `tool-calls/**`, `agent-stream/process-card-scope.ts`, work-group                                                   |
| composer                  |    11 | `composer/**` (card, chips, footer, caret, pickers)                                                                 |
| shell and sidebar         |    12 | `left-sidebar`, `sidebar-workspace-list`, `sidebar/*`, status dots, headers                                         |
| workspace and panels      |    22 | `screens/workspace/**`, `panels/**`, `file-explorer-pane`, `terminal-pane`, diff viewers, resize handles            |
| home and model pickers    |     6 | `screens/new-workspace*`, `combined-model-selector`, context meter                                                  |
| search, turn rail, find   |     6 | `command-center/**`, `chat-outline/**`, `pane-find/**`                                                              |
| native fixture            |     1 | terminal grapheme-row colours                                                                                       |

The theme is the centre: most component files read semantic tokens instead of carrying Claude
values. The few literal values are geometry the host owns (44 pt rows, 18 pt tab close, the
desktop rail's 28 pt column), each named beside its style.

## How to rebase on upstream

The fork's `main` is a merge of upstream, so rebasing the branch on `upstream/main` must replay
only the branch's own commits, not the merge history:

```sh
git fetch upstream
git rebase --onto upstream/main <fork-main-at-branch-point> claude-style
```

Last run: upstream `de67a7370` (2026-11-11), `--onto` from `b0e5cece6`, 18 branch commits.
Two conflict stops, ~10 minutes: upstream deleted `panels/viz-panel.tsx` and the legacy
visualize/YouTube/link-card media files; the branch had restyled or lint-fixed them, so those
paths were dropped. No conflicted code needed hand-merging. Re-run typecheck, lint, format and
the app unit suite afterwards (all green on this rebase).

## Performance

`npx vitest bench src/agent-stream/stream-tick.bench.ts --run` (200 streamed deltas over a
2,000-item timeline; three runs each, median shown). Same machine, upstream worktree uses this
checkout's `node_modules`.

| Case                               | upstream `de67a7370` |     `claude-style` | Delta |
| ---------------------------------- | -------------------: | -----------------: | ----: |
| mounted window (recent items only) |   291.9 Hz (3.43 ms) | 297.9 Hz (3.36 ms) | +2.1% |
| history fully revealed (top)       |   487.4 Hz (2.05 ms) | 482.6 Hz (2.07 ms) | −1.0% |

First runs of both trees were cold outliers (branch 269.5/454.5 Hz, upstream 294.0/497.9 Hz);
the medians above are stable. The stream-tick and scroll strategy code is not algorithmically
different from upstream, and no per-token animation was added: the reveal keeps upstream's rAF
pacing, the new work is layout and paint.

## Blocked

- **Mascot.** DSH's crab is Anthropic's character and the plugin's license excludes it; the
  Deepy and Whalegirl sheets are licensed to that plugin only. No original sprite was drawn, so
  the home hero has no mascot.
- **chat-anchor.** DSH anchors the answer's first line at the top and hands the follow there.
  Paseo's transcript owns the tail through `BottomAnchorController`; adding a second scroll
  owner that holds position while virtualized rows grow would replace the follow contract for
  every streamed answer. Left out rather than changing how Paseo reads streams.
- **active-first.** Paseo exposes manual, created and updated ordering and persists manual
  order. Lifting running rows would silently override that choice; DSH can reorder its single
  host layout because it has no such contract.

## Known gaps

- **Counted work header wording.** DSH writes "2 thoughts, 1 tool call". Paseo's strings are
  upstream's; the fold structure and motion are implemented, the wording is not replaced.
- **Live status words.** DSH's waiting line names the state ("Reading file.ts"). That needs
  strings Paseo does not have, so the loader and elapsed time stay.
- **Expanded body scroll cap.** DSH caps a process body at `min(400px, 50vh)`. Paseo's stream
  lays every folded row out as a sibling of the transcript, so the body card is drawn in
  segments and cannot own one ScrollView; the overview group card still caps its own inner
  scroll. The body grows with its rows until folded.
- **Native build.** The branch was verified in the web build and by unit tests; no iOS/Android
  binary was produced here. The Anthropic faces are static Text Regular cuts, so native weight
  synthesis is unverified.
- **Paired captures.** DSH publishes desktop screenshots only. Compact captures are compared
  against `refs/specs/UX-SPEC.md`; there is no DSH 390 px image to pair pixel-for-pixel.

## Out-of-scope decisions

`surface` (a Chat/Code product switch), `header-band` (Windows caption row), `home-ripple`
(pointer-driven decoration), `date-groups` (grouping toggle), `sidebar-peek` (desktop hover
preview), `session-title` (inline rename interaction), `active-shelf`, `manual-unread`,
`row-skip` (upstream already virtualizes), `sound-cues`, and the DSH-only account, ban-screen,
peakrate and sodium surfaces add capability or data Paseo does not have. Conversation width is
not a new control: Paseo already exposes the setting, and the screen keeps the user's value.
