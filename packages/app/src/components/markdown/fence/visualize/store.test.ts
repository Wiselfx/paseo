import { describe, expect, it, vi } from "vitest";
import { openVizPanel, vizDocKey, vizIdForCode, vizOpenTarget } from "./store";

describe("viz store", () => {
  it("namespaces doc keys and hashes content deterministically", () => {
    expect(vizDocKey("v1")).toBe("vizdoc:v1");
    expect(vizIdForCode("<div>a</div>")).toBe(vizIdForCode("<div>a</div>"));
    expect(vizIdForCode("<div>a</div>")).not.toBe(vizIdForCode("<div>b</div>"));
  });

  it("builds viz open targets", () => {
    expect(vizOpenTarget("srv:ws", "v1")).toEqual({
      workspaceKey: "srv:ws",
      target: { kind: "viz", vizId: "v1" },
    });
  });

  it("opens the panel with the content-hashed tab", async () => {
    const openTab = vi.fn();
    const vizId = await openVizPanel({
      serverId: "srv",
      workspaceId: "ws",
      code: "<div>hi</div>",
      agentId: "agent1",
      openTab: (workspaceKey, target) => openTab(workspaceKey, target),
    });
    expect(vizId).toBe(vizIdForCode("<div>hi</div>"));
    expect(openTab).toHaveBeenCalledOnce();
    expect(openTab).toHaveBeenCalledWith("srv:ws", { kind: "viz", vizId });
  });

  it("refuses unkeyed workspaces", async () => {
    const openTab = vi.fn();
    expect(
      await openVizPanel({ serverId: "", workspaceId: "", code: "x", openTab: () => {} }),
    ).toBe(null);
    expect(openTab).not.toHaveBeenCalled();
  });
});
