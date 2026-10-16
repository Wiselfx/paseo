# visualize

Render interactive HTML inline in chat. Explicit fence only.

## Protocol

1. Emit one ` ```visualize ` fence per visualization. Style first, content, script last.
2. No `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` — fragment only.
3. Streaming fences paint partial and settle on complete. One fence per block.
4. Describe what it shows in prose, never the source.

## Stage

- Sandboxed document, scripts allowed, opaque origin, no parent access.
- Offline v1: no network inside. No CDN libraries yet.
- Theme vars provided: `--viz-fg`, `--viz-bg`, `--viz-accent`. Use them, no hardcoded colors.
- Inline surface, one screenful max (800px). Taller content clips.
- Height is automatic. No bridges yet: `sendPrompt`/`saveState` do not exist in v1.

## Negative scope

- No bare-URL detection. No markers. No export button.
- Scripts run on every paint, including streaming repaints. Keep them idempotent.
- Never exfiltrate: no fetch, no beacons, no external frames. The CSP blocks them; do not work around it.
