# build.md

## Requirements

- `gh` authed, `repo` scope.
- npm >= 11. Debian system npm (9.x) fails parsing the lockfile.
- Server outputs built before typecheck: `npm run build:server`
  (`build:app-deps` for app-only). Without them, desktop/cli
  typecheck fails on missing `@getpaseo/server/*` modules.
- Daemon host and live bundle path.

## Sync

1. `git fetch upstream && git merge upstream/main` on a sync branch.
2. Push, open PR. Conflicts require review.

## Build

1. `gh workflow run build.yml --ref <branch>`. Record the run id.
2. `gh run watch <id>`. Red builds install nothing.

## Install

1. Download the artifact from the green run. Nothing else qualifies.
2. Assert the renderer chunk and the menu change are in the bundle.
   Record BUILD_ID.
3. Back up the live bundle. Swap. Restart the daemon.
4. Curl the health endpoint. Failure restores the backup.
5. Move the `stable` tag to the verified install.

## Rules

- `main` accepts merged PRs only.
- Red builds and wrong-ref artifacts are never installed.
- The daemon is never restarted from inside itself.
- Every result gets `review.md`. Clean runs: gates only.
