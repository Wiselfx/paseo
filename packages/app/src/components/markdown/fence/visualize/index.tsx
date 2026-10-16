import { VisualizeStage } from "./stage";

export { splitVisualizeFences } from "./segments";
export { buildVizDocument, isVizHeightMessage, VIZ_CSP, VIZ_HEIGHT_MESSAGE } from "./document";

/**
 * ```visualize fence: code is a self-contained HTML fragment (style first,
 * content, script last). Offline v1: no network inside the stage.
 */
export function VisualizeFence({ code }: { code: string }) {
  if (!code.trim()) return null;
  return <VisualizeStage code={code} />;
}
