import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendVizPrompt,
  VIZ_STATE_CAP_BYTES,
  vizGetState,
  vizSetState,
  vizStateKey,
} from "./bridges";

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  clients: new Map<string, { id: string }>(),
  dispatch: vi.fn(),
  submission: vi.fn(),
  resolveFormat: vi.fn(() => "inline" as const),
  encodeImages: vi.fn(async () => undefined),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mocks.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mocks.storage.set(key, value);
    },
  },
}));

vi.mock("@/composer/actions", () => ({
  dispatchComposerAgentMessage: (input: unknown) => mocks.dispatch(input),
}));

vi.mock("@/composer/attachments/submit", () => ({
  resolveComposerAttachmentSubmitFormat: () => mocks.resolveFormat(),
}));

vi.mock("@/composer/submission/writer", () => ({
  createMessageSubmissionWriter: (...args: unknown[]) => mocks.submission(...args),
}));

vi.mock("@/utils/encode-images", () => ({
  encodeImages: mocks.encodeImages,
}));

vi.mock("@/stores/session-store", () => ({
  useSessionStore: {
    getState: () => ({
      sessions: Object.fromEntries(
        [...mocks.clients].map(([serverId, client]) => [
          serverId,
          { client, serverInfo: { features: { forgeSearch: false } } },
        ]),
      ),
    }),
  },
}));

beforeEach(() => {
  mocks.storage.clear();
  mocks.clients.clear();
  mocks.dispatch.mockClear();
  mocks.submission.mockClear();
});

describe("viz state storage", () => {
  it("namespaces keys by fence content hash", () => {
    expect(vizStateKey("vabc")).toBe("vizstate:vabc");
  });

  it("round-trips a value", async () => {
    expect(await vizSetState("vabc", "picked=2")).toBe(true);
    expect(await vizGetState("vabc")).toBe("picked=2");
    expect(await vizGetState("other")).toBe(null);
  });

  it("refuses a value past the cap", async () => {
    expect(await vizSetState("vabc", "x".repeat(VIZ_STATE_CAP_BYTES + 1))).toBe(false);
    expect(await vizGetState("vabc")).toBe(null);
  });
});

describe("viz sendPrompt", () => {
  it("steers the rendering session through the composer send path", async () => {
    mocks.clients.set("srv", { id: "client1" });

    expect(await sendVizPrompt("srv", "agent1", "  show Q3  ")).toBe("sent");
    expect(mocks.dispatch).toHaveBeenCalledOnce();
    expect(mocks.dispatch.mock.calls[0]?.[0]).toMatchObject({
      agentId: "agent1",
      text: "show Q3",
      attachments: [],
      activeTurnBehavior: "steer",
    });
    expect(mocks.submission).toHaveBeenCalledWith("srv");
  });

  it("does nothing without text, ids, or a connected session", async () => {
    mocks.clients.set("srv", { id: "client1" });

    expect(await sendVizPrompt("srv", "agent1", "   ")).toBe("noop");
    expect(await sendVizPrompt(undefined, "agent1", "show")).toBe("noop");
    expect(await sendVizPrompt("srv", undefined, "show")).toBe("noop");
    expect(await sendVizPrompt("gone", "agent1", "show")).toBe("noop");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
