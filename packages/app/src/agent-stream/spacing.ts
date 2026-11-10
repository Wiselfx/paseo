import type { StreamItem } from "@/types/stream";
import { SPACING } from "@/styles/theme";

export function getAssistantMessageSpacing(params: {
  item: StreamItem;
  hasFooterBelow?: boolean;
}): "default" | "compactBottom" {
  return params.item.kind === "assistant_message" && params.hasFooterBelow
    ? "compactBottom"
    : "default";
}

const isUserMessageItem = (item?: StreamItem | null) => item?.kind === "user_message";
/** A row of the agent's work, including the summary row that stands in for a folded turn's. */
const isWorkItem = (item?: StreamItem | null) =>
  item?.kind === "tool_call" ||
  item?.kind === "thought" ||
  item?.kind === "todo_list" ||
  item?.kind === "turn_summary";

export function getGapBetweenStreamItems(
  item: StreamItem | null,
  belowItem: StreamItem | null,
): number {
  if (!item || !belowItem) {
    return 0;
  }

  if (isUserMessageItem(item) && isUserMessageItem(belowItem)) {
    return SPACING[1];
  }
  // A prompt stands 20 above whatever answers it: one step more than the prose-to-work gap.
  if (isUserMessageItem(item)) {
    return SPACING[4] + SPACING[1];
  }
  if (isWorkItem(item) && isWorkItem(belowItem)) {
    return 0;
  }
  // A work card and the prose it feeds are one block, so they sit closer than two turns.
  if (item.kind === "assistant_message" && isWorkItem(belowItem)) {
    return SPACING[4];
  }
  if (isWorkItem(item) && belowItem.kind === "assistant_message") {
    return SPACING[4];
  }
  // The end of an answer and the next prompt are a turn boundary.
  if (item.kind === "assistant_message" && isUserMessageItem(belowItem)) {
    return SPACING[8];
  }
  return SPACING[4];
}
