import { VisualizeStage } from "./stage";

export { splitVisualizeFences } from "./segments";
export { buildVizDocument, isVizHeightMessage, VIZ_CSP, VIZ_HEIGHT_MESSAGE } from "./document";
export { sendVizPrompt, vizGetState, vizSetState } from "./bridges";

/**
 * ```visualize fence: code is a self-contained HTML fragment (style first,
 * content, script last). Offline v1: no network inside the stage. Bridges
 * (sendPrompt/saveState/loadState) act with the user's voice in the session
 * that rendered the fence.
 */
export function VisualizeFence({
  code,
  serverId,
  agentId,
  workspaceId,
}: {
  code: string;
  serverId?: string;
  agentId?: string;
  workspaceId?: string;
}) {
  if (!code.trim()) return null;
  return (
    <VisualizeStage code={code} serverId={serverId} agentId={agentId} workspaceId={workspaceId} />
  );
}
