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
390×844 and 1440×900 in light and dark (kept in `evidence/`, never committed).

| DSH feature        | In?           | Paseo surface                                    | Files                                                       | Status   |
| ------------------ | ------------- | ------------------------------------------------ | ----------------------------------------------------------- | -------- |
| brand              | yes           | palette, mark                                    | `styles/claude-tokens.ts`, `theme.ts`                       | reviewed |
| surface            | no            | Chat/Code switch is a DSH product feature        | —                                                           | out      |
| header-band        | no            | Windows desktop caption row                      | —                                                           | out      |
| caret              | yes           | composer caret                                   | `composer/input/input.tsx`                                  | planned  |
| composer           | yes           | composer card, chips, footer tray                | `composer/**`                                               | planned  |
| chat-fold          | yes           | process group fold, thought rows                 | `agent-stream/view.tsx`, `tool-calls/**`                    | planned  |
| chat-reveal        | yes           | streamed text pacing                             | `agent-stream/text-reveal.ts`                               | planned  |
| chat-follow        | yes           | tail follow, scroll pill                         | `agent-stream/view.tsx`                                     | planned  |
| chat-anchor        | yes           | answer anchor on reveal                          | `agent-stream/**`                                           | planned  |
| chat-send          | yes           | sent message entrance                            | `agent-stream/**`                                           | planned  |
| chat-wait          | partial       | loader look; no new status strings               | `synced-loader.tsx`                                         | planned  |
| chat-files         | yes           | file-change rows in process                      | `tool-calls/**`                                             | planned  |
| process-column     | yes           | grouped tool card layout                         | `tool-calls/detail-level/**`                                | planned  |
| conversation-width | no            | adds a width setting                             | —                                                           | out      |
| message-actions    | yes           | message hover actions                            | `components/message.tsx`                                    | planned  |
| permissions        | yes           | permission card                                  | `agent-stream/view.tsx`                                     | planned  |
| question-card      | yes           | question form card                               | `components/question-form-card.tsx`                         | planned  |
| turn-nav           | yes           | turn rail                                        | `agent-stream/chat-outline/**`                              | planned  |
| mascot             | blocked       | crab art is Anthropic's, license grants no reuse | `screens/new-workspace-screen.tsx`                          | blocked  |
| home               | yes           | new-session hero                                 | `screens/new-workspace-screen.tsx`                          | planned  |
| home-ripple        | no            | pointer-driven decorative field                  | —                                                           | out      |
| hero-menu          | yes           | hero menu look                                   | `screens/new-workspace/**`                                  | planned  |
| date-groups        | no            | adds a grouping toggle and sectioning            | —                                                           | out      |
| sidebar-entries    | yes           | sidebar rows and footer                          | `components/left-sidebar.tsx`, `sidebar-workspace-list.tsx` | planned  |
| sidebar-status     | yes           | status dots, running row                         | `agent-status-dot.tsx`, `sidebar-workspace-list.tsx`        | planned  |
| sidebar-peek       | no            | desktop hover-peek                               | —                                                           | out      |
| session-title      | no            | inline rename field is a new interaction         | —                                                           | out      |
| session-actions    | yes           | row menu look                                    | `sidebar-workspace-list.tsx`                                | planned  |
| active-first       | yes           | running rows first                               | `sidebar-workspace-list.tsx`                                | planned  |
| active-shelf       | no            | adds a bell and a running list                   | —                                                           | out      |
| manual-unread      | no            | adds a read-state action                         | —                                                           | out      |
| row-skip           | no            | upstream already virtualizes                     | —                                                           | out      |
| sound-cues         | no            | new audio                                        | —                                                           | out      |
| view-tabs          | yes (desktop) | workspace tab strip look                         | `workspace-tabs/**`                                         | planned  |
| width-handle       | yes (desktop) | resize handle look                               | `resize-handle.tsx`                                         | planned  |
| rightbar-fit       | yes (desktop) | pane fit rules                                   | `workspace/**`                                              | planned  |
| bottom-panel-fit   | yes (desktop) | bottom sheet fit                                 | `panels/**`                                                 | planned  |
| search             | yes           | search sheet look                                | `command-center/**`                                         | planned  |
| settings           | yes           | settings cards/rows                              | `styles/settings.ts`                                        | planned  |
| workspace          | yes           | workspace panel chrome                           | `screens/workspace/**`                                      | planned  |
| model              | yes           | model picker look                                | `composer/agent-controls/**`                                | planned  |
| effort             | yes           | thinking picker look                             | `composer/agent-controls/**`                                | planned  |
| context-stats      | yes           | context meter look                               | `components/context-window-meter.tsx`                       | planned  |
| account            | no            | DSH account panel                                | —                                                           | out      |
| ban-screen         | no            | DSH product surface                              | —                                                           | out      |
| peakrate           | no            | DSH product surface                              | —                                                           | out      |
| sodium             | no            | rendering engine, not a look                     | —                                                           | out      |

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

Recorded per package at integration time.

## How to rebase on upstream

Filled in at the last checkpoint.

## Performance

Before/after numbers, measured with upstream's tooling, recorded here.

## Known gaps

- **Mascot.** DSH's crab is Anthropic's character and the plugin's license excludes it; the
  Deepy and Whalegirl sheets are licensed to that plugin only. No original sprite was drawn, so
  the home hero has no mascot.
- **Counted work header wording.** DSH writes "2 thoughts, 1 tool call". Paseo's strings are
  upstream's; the fold structure and motion are implemented, the wording is not replaced.
- **Live status words.** DSH's waiting line names the state ("Reading file.ts"). That needs
  strings Paseo does not have, so the loader and elapsed time stay.
