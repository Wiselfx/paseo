import { describe, expect, it, vi } from "vitest";
import { splitVisualizeFences } from "./segments";
import {
  buildVizDocument,
  isVizHeightMessage,
  isVizLoadMessage,
  isVizPromptMessage,
  isVizSaveMessage,
  VIZ_CSP,
} from "./document";
import { sendVizPrompt, vizStateKey, VIZ_STATE_CAP_BYTES } from "./bridges";
import { useSessionStore } from "@/stores/session-store";

describe("splitVisualizeFences", () => {
  it("extracts visualize fences", () => {
    const segments = splitVisualizeFences("before\n```visualize\n<div>hi</div>\n```\nafter");
    expect(segments.map((s) => s.kind)).toEqual(["markdown", "viz", "markdown"]);
    expect(segments[1].source).toBe("<div>hi</div>");
  });

  it("ignores other fence languages", () => {
    expect(splitVisualizeFences("```mermaid\ngraph\n```")).toHaveLength(1);
  });

  it("paints unclosed fences partial (streaming), settles on complete", () => {
    const segments = splitVisualizeFences("```visualize\n<div>hi");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("viz");
  });
});

describe("buildVizDocument", () => {
  it("defines bridges before fence content", () => {
    const doc = buildVizDocument("<div>hi</div>", "dark");
    const bridgeAt = doc.indexOf("window.sendPrompt");
    const codeAt = doc.indexOf("<div>hi</div>");
    expect(bridgeAt).toBeGreaterThan(-1);
    expect(codeAt).toBeGreaterThan(-1);
    expect(bridgeAt).toBeLessThan(codeAt);
  });

    const doc = buildVizDocument("<div>hi</div>", "dark");
    expect(doc).toContain(VIZ_CSP);
    expect(doc).toContain("--viz-accent");
    expect(doc).toContain("viz:height");
    expect(doc).toContain("<div>hi</div>");
  });

  it("carries hostile strings without breaking out", () => {
    const hostile = "</script><script>alert(1)</script></iframe><svg onload=x>";
    const doc = buildVizDocument(hostile, "light");
    expect(doc).toContain(hostile);
    expect(doc.indexOf("</body></html>")).toBeGreaterThan(doc.indexOf(hostile));
  });

  it("validates height messages", () => {
    expect(isVizHeightMessage({ type: "viz:height", height: 300 })).toBe(true);
    expect(isVizHeightMessage({ type: "viz:height", height: -5 })).toBe(false);
    expect(isVizHeightMessage({ type: "other", height: 300 })).toBe(false);
    expect(isVizHeightMessage(null)).toBe(false);
  });

  it("validates bridge messages", () => {
    expect(isVizPromptMessage({ type: "viz:prompt", text: "hi" })).toBe(true);
    expect(isVizPromptMessage({ type: "viz:prompt", text: 5 })).toBe(false);
    expect(isVizSaveMessage({ type: "viz:save", key: "k", value: "v" })).toBe(true);
    expect(isVizSaveMessage({ type: "viz:save", key: "k" })).toBe(false);
    expect(isVizLoadMessage({ type: "viz:load", key: "k", nonce: 1 })).toBe(true);
    expect(isVizLoadMessage({ type: "viz:load", key: "k", nonce: "1" })).toBe(false);
  });

  it("namespaces state keys and caps values", () => {
    expect(vizStateKey("abc")).toBe("vizstate:abc");
    expect(VIZ_STATE_CAP_BYTES).toBe(64 * 1024);
  });

  it("sends prompts through the session client with steer", async () => {
    const sendAgentMessage = vi.fn(
      async (_agentId: string, _text: string, _opts?: { activeTurnBehavior?: string }) => {},
    );
    const prev = useSessionStore.getState();
    useSessionStore.setState({
      sessions: {
        ...prev.sessions,
        srv1: {
          ...(prev.sessions.srv1 as object),
          client: { sendAgentMessage },
          agentStreamTail: new Map(),
          agentStreamHead: new Map(),
          messageSubmissions: new Map(),
        },
      },
    } as unknown as Partial<typeof prev>);
    const result = await sendVizPrompt("srv1", "agent1", "break it down");
    expect(result).toBe("sent");
    expect(sendAgentMessage).toHaveBeenCalledOnce();
    const [calledAgentId, calledText, calledOpts] = sendAgentMessage.mock.calls[0] ?? [];
    expect(calledAgentId).toBe("agent1");
    expect(calledText).toBe("break it down");
    expect(calledOpts?.activeTurnBehavior).toBe("steer");
  });

  it("noops prompts without session, agent, or text", async () => {
    expect(await sendVizPrompt(undefined, "a", "hi")).toBe("noop");
    expect(await sendVizPrompt("srv1", undefined, "hi")).toBe("noop");
    expect(await sendVizPrompt("srv1", "a", "  ")).toBe("noop");
    expect(await sendVizPrompt("nosuch", "a", "hi")).toBe("noop");
  });
});
