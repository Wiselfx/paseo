import React, { memo, useCallback, type ReactNode } from "react";
import { useDisclosureHold } from "@/agent-stream/disclosure";
import { useIsCompactFormFactor } from "@/constants/layout";
import { useOverviewSummaryLabel } from "./label";
import type { OverviewToolCallGroup } from "./model";
import { WorkGroupCard } from "@/tool-calls/work-group";

interface OverviewGroupProps {
  group: OverviewToolCallGroup;
  expanded: boolean;
  isLastInSequence: boolean;
  onExpandedChange: (groupId: string, expanded: boolean) => void;
  children: ReactNode;
}

export const OverviewToolCallGroupView = memo(function OverviewToolCallGroupView({
  group,
  expanded,
  isLastInSequence,
  onExpandedChange,
  children,
}: OverviewGroupProps) {
  const isCompact = useIsCompactFormFactor();
  const aggregateSummary = useOverviewSummaryLabel(group.summary);
  const hold = useDisclosureHold();
  const toggle = useCallback(() => {
    const apply = () => onExpandedChange(group.run.id, !expanded);
    // Compact grows the card in place; desktop keeps the row anchored through the fold.
    if (isCompact) apply();
    else hold(apply);
  }, [expanded, group.run.id, hold, isCompact, onExpandedChange]);

  return (
    <WorkGroupCard
      testID="tool-call-group"
      label={aggregateSummary}
      isLoading={group.isLoading}
      expanded={expanded}
      isLastInSequence={isLastInSequence}
      onToggle={toggle}
    >
      {expanded ? children : null}
    </WorkGroupCard>
  );
});
