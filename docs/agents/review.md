# review.md

## Gates

All pass. All deterministic. Every finding cites `file:line`.

- Files: only what `docs.md` lists. The rest needs justification
  in the PR.
- No lockfiles, build artifacts, unrelated refactors.
- Build green on the PR ref. `.base-ref` current on syncs.

## Probes

- Gesture: right-click and long-press both reach `openAtEvent`
  (`context-menu.tsx`).
- Player: nocookie embed, sane autoplay, embedding-disabled
  fallback.
- Desktop path unchanged unless the PR states otherwise.

## Merge conflicts

- Full function around each resolution, not the hunk.
- Platform branches and handler order checked.
- Style suppressions present after merge.

## Language

Flat and factual. No adjectives, no claims, no catchphrases.
Short sentences. Titles, bodies, comments, code comments.

## Output

`gh pr review --approve|--request-changes --body`. No other format.
