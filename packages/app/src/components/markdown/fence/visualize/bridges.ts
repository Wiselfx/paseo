import AsyncStorage from "@react-native-async-storage/async-storage";
import { dispatchComposerAgentMessage } from "@/composer/actions";
import { resolveComposerAttachmentSubmitFormat } from "@/composer/attachments/submit";
import { createMessageSubmissionWriter } from "@/composer/submission/writer";
import { useSessionStore } from "@/stores/session-store";
import { encodeImages } from "@/utils/encode-images";

/**
 * Viz bridges: the stage acts with the user's voice in the session that
 * rendered it. sendPrompt dispatches through the stock composer send path
 * (steer into a running turn, normal turn otherwise). State persists per
 * fence content hash across reloads, 64KB cap per key.
 */

export const VIZ_STATE_CAP_BYTES = 64 * 1024;

export function vizStateKey(codeHash: string): string {
  return `vizstate:${codeHash}`;
}

export async function vizGetState(codeHash: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(vizStateKey(codeHash));
  } catch {
    return null;
  }
}

export async function vizSetState(codeHash: string, value: string): Promise<boolean> {
  if (value.length > VIZ_STATE_CAP_BYTES) return false;
  try {
    await AsyncStorage.setItem(vizStateKey(codeHash), value);
    return true;
  } catch {
    return false;
  }
}

export async function sendVizPrompt(
  serverId: string | undefined,
  agentId: string | undefined,
  text: string,
): Promise<"sent" | "noop"> {
  const trimmed = text.trim();
  if (!trimmed || !serverId || !agentId) return "noop";
  const session = useSessionStore.getState().sessions[serverId];
  const client = session?.client;
  if (!client) return "noop";
  const supportsForgeAttachments = session?.serverInfo?.features?.forgeSearch === true;
  await dispatchComposerAgentMessage({
    client,
    agentId,
    text: trimmed,
    attachments: [],
    attachmentSubmitFormat: resolveComposerAttachmentSubmitFormat({ supportsForgeAttachments }),
    encodeImages,
    submission: createMessageSubmissionWriter(serverId),
    activeTurnBehavior: "steer",
  });
  return "sent";
}
