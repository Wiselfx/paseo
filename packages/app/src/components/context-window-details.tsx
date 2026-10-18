import { Text, View } from "react-native";
import type { TFunction } from "i18next";
import { StyleSheet } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/shallow";
import { useSessionStore } from "@/stores/session-store";
import { AgentUsage } from "@/usage";
import {
  cacheHitRates,
  cacheModelCosts,
  cacheReadout,
  cacheWasteReadout,
  type CacheHitRates,
} from "./context-window-cache";
import { formatTokenCount } from "./context-window-meter.utils";

/**
 * Fork: name the window each rate belongs to. Pi shows the last turn's in its
 * status line and the session's in `/session`; without the label the two numbers
 * read as a contradiction.
 */
function cacheHitText(hit: CacheHitRates | null, t: TFunction): string | null {
  if (!hit) {
    return null;
  }
  if (hit.lastTurn && hit.session) {
    return t("contextWindow.cacheHit", { lastTurn: hit.lastTurn, session: hit.session });
  }
  if (hit.lastTurn) {
    return t("contextWindow.cacheHitLastTurn", { lastTurn: hit.lastTurn });
  }
  if (hit.session) {
    return t("contextWindow.cacheHitSession", { session: hit.session });
  }
  return null;
}

interface ContextWindowDetailsProps {
  serverId: string;
  agentId: string;
  context: {
    percentage: number;
    usedTokens: number;
    maxTokens: number;
  } | null;
  sessionCost: string | null;
  /** The hover card and tooltip title themselves; the sheet's header carries the title instead. */
  showTitle: boolean;
  /** Whether the usage cards have a Refresh button; without one they show their freshness. */
  refreshable: boolean;
}

/**
 * What the context window meter opens: how full the window is, then the usage of the agent's
 * account. The desktop hover card, the native wide tooltip, and the compact sheet all render it.
 */
export function ContextWindowDetails({
  serverId,
  agentId,
  context,
  sessionCost,
  showTitle,
  refreshable,
}: ContextWindowDetailsProps) {
  const { t } = useTranslation();
  const lastUsage = useSessionStore(
    useShallow((state) => state.sessions[serverId]?.agents.get(agentId)?.lastUsage ?? null),
  );
  const cache = cacheReadout(lastUsage, formatTokenCount);
  const cacheHit = cacheHitRates(lastUsage);
  const cacheWaste = cacheWasteReadout(lastUsage, formatTokenCount);
  const cacheModels = cacheModelCosts(lastUsage, formatTokenCount);
  const cacheHitLine = cacheHitText(cacheHit, t);
  const cacheModelLine =
    cacheModels.length > 1
      ? t("contextWindow.cacheCostByModel", {
          parts: cacheModels
            .map((entry) => `${entry.key} ${entry.cost} (${entry.tokens})`)
            .join(" · "),
        })
      : null;
  return (
    <>
      <View style={styles.summary}>
        {showTitle ? <Text style={styles.title}>{t("contextWindow.title")}</Text> : null}
        {context ? (
          <>
            <Text style={styles.text}>
              {t("contextWindow.used", { percentage: context.percentage })}
            </Text>
            <Text style={styles.detail}>
              {t("contextWindow.tokens", {
                used: formatTokenCount(context.usedTokens),
                max: formatTokenCount(context.maxTokens),
              })}
            </Text>
          </>
        ) : (
          <Text style={styles.detail}>{t("contextWindow.noData")}</Text>
        )}
        {sessionCost ? (
          <Text style={styles.detail}>{t("contextWindow.sessionCost", { cost: sessionCost })}</Text>
        ) : null}
        {/* Fork: the provider's own prompt-cache counters, displayed as reported. */}
        {cache ? (
          <Text style={styles.detail}>
            {cache.input
              ? t("contextWindow.cacheReadWithInput", { read: cache.read, input: cache.input })
              : t("contextWindow.cacheRead", { read: cache.read })}
          </Text>
        ) : null}
        {cacheHitLine ? <Text style={styles.detail}>{cacheHitLine}</Text> : null}
        {cacheWaste ? (
          <Text style={styles.detail}>
            {cacheWaste.cost
              ? t("contextWindow.cacheWaste", { tokens: cacheWaste.tokens, cost: cacheWaste.cost })
              : t("contextWindow.cacheWasteNoCost", { tokens: cacheWaste.tokens })}
          </Text>
        ) : null}
        {cacheModelLine ? <Text style={styles.detail}>{cacheModelLine}</Text> : null}
      </View>
      <AgentUsage serverId={serverId} agentId={agentId} refreshable={refreshable} />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  summary: {
    gap: theme.spacing[1.5],
    minWidth: 200,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  text: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: theme.fontSize.base * 1.4,
  },
  detail: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: theme.fontSize.sm * 1.4,
  },
}));
