import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDisclosureHold } from "@/agent-stream/disclosure";
import { useOverviewSummaryLabel } from "@/tool-calls/detail-level/overview/label";
import { WorkGroupCard } from "@/tool-calls/work-group";
import type { TurnSummaryItem } from "@/types/stream";

/**
 * The row a collapsed turn leaves under its user message, styled like a process card.
 * Pressing it opens the turn's rows beneath it.
 */
export const TurnSummaryLine = memo(function TurnSummaryLine({
  item,
  onExpandedChange,
}: {
  item: TurnSummaryItem;
  onExpandedChange: (hostId: string, expanded: boolean) => void;
}) {
  const { t } = useTranslation();
  const label = useOverviewSummaryLabel(item.tools) || t("turnSummary.details");
  const hold = useDisclosureHold();
  const toggle = useCallback(
    () => hold(() => onExpandedChange(item.hostId, !item.expanded)),
    [hold, onExpandedChange, item.expanded, item.hostId],
  );

  return (
    <WorkGroupCard testID="turn-summary" label={label} expanded={item.expanded} onToggle={toggle} />
  );
});
