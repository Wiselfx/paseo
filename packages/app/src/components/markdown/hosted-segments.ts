import { splitMermaidFences } from "./fence/mermaid/segments";
import { splitVisualizeFences } from "./fence/visualize/segments";
import { splitYouTubeFences } from "./fence/youtube/segments";
import { splitLinkCards } from "./link-card-segments";

export interface HostedSegment {
  kind: string;
  id: string;
  source: string;
}

interface SegmentStage {
  prefix: string;
  split: (markdown: string) => HostedSegment[];
}

/**
 * Fork media: the fence kinds the app hosts outside the library's engine, in
 * pipeline order. Each stage takes its blocks out of the markdown and hands the
 * remainder to the next stage, so hosted blocks keep document order. Mermaid is
 * native-only — the web renderer draws diagrams through the library.
 */
const HOSTED_SEGMENT_STAGES: readonly SegmentStage[] = [
  { prefix: "m", split: splitMermaidFences },
  { prefix: "y", split: splitYouTubeFences },
  { prefix: "c", split: splitLinkCards },
  { prefix: "v", split: splitVisualizeFences },
];

const WEB_HOSTED_SEGMENT_STAGES = HOSTED_SEGMENT_STAGES.slice(1);

/** Library segments are the pieces no stage claimed; their ids come from the last stage. */
export function splitHostedSegments(markdown: string, platform: "web" | "native"): HostedSegment[] {
  const out: HostedSegment[] = [];
  appendStages(
    markdown,
    platform === "web" ? WEB_HOSTED_SEGMENT_STAGES : HOSTED_SEGMENT_STAGES,
    out,
    "",
  );
  return out;
}

function appendStages(
  markdown: string,
  stages: readonly SegmentStage[],
  out: HostedSegment[],
  prefix: string,
): void {
  const [stage, ...rest] = stages;
  if (!stage) {
    out.push({ kind: "markdown", id: `${prefix}${out.length}`, source: markdown });
    return;
  }
  for (const piece of stage.split(markdown)) {
    if (piece.kind === "markdown") appendStages(piece.source, rest, out, stage.prefix);
    else out.push({ ...piece, id: `${stage.prefix}${out.length}` });
  }
}
