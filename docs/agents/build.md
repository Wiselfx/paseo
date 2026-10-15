# build.md — agent runbook for fork maintenance. Follow literally.

## Preconditions

- `gh` authed with `repo` scope. Daemon host + live bundle path known. Standing rule: never commit to `main` directly — work on `agent/<date>-<task>`, open a PR, human merges.

## Environment (local builds)

- npm >= 11. System npm (Debian 9.x) fails parsing the lockfile (`Invalid comparator`).
- Build server outputs before typechecking: `npm run build:server` (or `build:app-deps` for app-only). Without it, desktop/cli typecheck fails on missing `@getpaseo/server/*` modules. Pre-existing, not your code.
- Pre-commit hooks run lint + format + full workspace typecheck. Blocked commit = fix your files first, then check if the failure is yours.

## A. Upstream sync

1. `git fetch upstream && git merge upstream/main` on a sync branch (`agent/<date>-sync`).
2. Zero conflicts → push, open PR, go to C (review runs regardless).
3. Conflicts → resolve, open PR, stop. Judgment flow; human merges after review.

## B. Dispatch build

1. `gh workflow run build.yml --ref <branch-or-main>`. Record run id.
2. `gh run watch <id>` until done. Red = stop, report, touch nothing.

## C. Install / update

1. Download artifact from the green run only. Refuse anything else.
2. Assert bundle contains the renderer chunk + menu change. Record BUILD_ID.
3. Back up the live bundle first. Then swap. Then restart the daemon.
4. Curl the health endpoint. Failure = restore backup, report.
5. Move the `stable` tag to the verified install.

## Guardrails (ink)

- Never install red builds or wrong-ref artifacts.
- Never restart the daemon from an agent whose tool channel runs through it.
- After every run: execute `docs/agents/review.md` on the result. Clean run = mechanical gates only. Code change = full review + PR.
