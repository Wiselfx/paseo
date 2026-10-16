import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkspaceTabTarget } from "@/workspace-tabs/model";
import { useWorkspaceLayoutStore } from "@/stores/workspace-layout-store";
import { buildWorkspaceTabPersistenceKey } from "@/workspace-tabs/model";

/**
 * Viz panel docs: one record per fence content. Opening the same fence
 * reuses its tab (content-versioned); edits arrive as new fence content
 * with a new record. Records persist across reloads; the tab holds only
 * the vizId.
 */

export interface VisualizeStageProps {
  code: string;
  serverId?: string;
  agentId?: string;
  workspaceId?: string;
  expanded?: boolean;
  uncapped?: boolean;
}

export interface VizDoc {
  code: string;
  title: string;
  serverId?: string;
  agentId?: string;
  updatedAt: number;
}

export function vizDocKey(vizId: string): string {
  return `vizdoc:${vizId}`;
}

export function vizIdForCode(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  return `v${Math.abs(h).toString(36)}`;
}

export async function readVizDoc(vizId: string): Promise<VizDoc | null> {
  const cached = docCache.get(vizId);
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(vizDocKey(vizId));
    if (!raw) return null;
    const doc = JSON.parse(raw) as Partial<VizDoc>;
    if (typeof doc.code !== "string") return null;
    const full: VizDoc = {
      code: doc.code,
      title: typeof doc.title === "string" ? doc.title : "Visualization",
      serverId: typeof doc.serverId === "string" ? doc.serverId : undefined,
      agentId: typeof doc.agentId === "string" ? doc.agentId : undefined,
      updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : 0,
    };
    docCache.set(vizId, full);
    return full;
  } catch {
    return null;
  }
}

const docCache = new Map<string, VizDoc>();

export function readVizDocSync(vizId: string): VizDoc | null {
  return docCache.get(vizId) ?? null;
}

export async function writeVizDoc(vizId: string, doc: VizDoc): Promise<void> {
  docCache.set(vizId, doc);
  try {
    await AsyncStorage.setItem(vizDocKey(vizId), JSON.stringify(doc));
  } catch {
    // Panel falls back to a missing-doc notice.
  }
}

export interface VizOpenTarget {
  workspaceKey: string;
  target: Extract<WorkspaceTabTarget, { kind: "viz" }>;
}

export function vizOpenTarget(workspaceKey: string, vizId: string): VizOpenTarget {
  return { workspaceKey, target: { kind: "viz", vizId } };
}

export async function openVizPanel(input: {
  serverId: string;
  workspaceId: string;
  code: string;
  title?: string;
  agentId?: string;
  openTab?: (workspaceKey: string, target: VizOpenTarget["target"]) => void;
}): Promise<string | null> {
  const workspaceKey = buildWorkspaceTabPersistenceKey({
    serverId: input.serverId,
    workspaceId: input.workspaceId,
  });
  if (!workspaceKey) return null;
  const vizId = vizIdForCode(input.code);
  await writeVizDoc(vizId, {
    code: input.code,
    title: input.title?.trim() || "Visualization",
    serverId: input.serverId,
    agentId: input.agentId,
    updatedAt: Date.now(),
  });
  const open = input.openTab ?? ((key, target) => openVizTab(key, target));
  open(workspaceKey, { kind: "viz", vizId });
  return vizId;
}

export function openVizTab(workspaceKey: string, target: VizOpenTarget["target"]): void {
  useWorkspaceLayoutStore.getState().openTab({ workspaceKey, target, intent: "reveal" });
}
