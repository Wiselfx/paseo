# review.md — reviewer agent rubric. You are not the author. Verify; don't trust the PR description.

## Mechanical gates (all must pass; all deterministic)

- Files-touched whitelist: the 5 fork files in `docs.md`, nothing else. Anything else = request changes unless justified in the PR.
- No lockfiles, build artifacts, or unrelated refactors.
- Build workflow green on the PR ref. `.base-ref` updated on syncs.

## Correctness probes

- Gesture: do BOTH web right-click and touch long-press still open the menu? (`context-menu.tsx` — early-return gone, `openAtEvent` reached on both paths.)
- Player: nocookie embed, sane autoplay, embedding-disabled fallback present.
- Desktop behavior byte-identical (nothing in the touched files may alter the `isWeb === false` desktop path except intentionally).

## Subtle-wrongness probes

- Re-read the full function around every conflict resolution, not just the hunk.
- Check platform branches (`isWeb`/`isNative`) and handler ordering (`openAtEvent` vs prop callbacks).
- Confirm style suppressions (`touch-callout`, `user-select`) survived the merge.

## Language

Flat and factual. No marketing adjectives, no grand claims, no catchphrases. Short sentences. If unsure how to phrase something, shorten it until only facts remain. Applies to titles, bodies, comments, and code comments.

## Evidence rule

Every finding cites `file:line`. No vibes-based approvals.

## Output

Post the verdict with `gh pr review --approve|--request-changes --body <findings>`. Clean mechanical run with no code change: gates only, one-line verdict.
