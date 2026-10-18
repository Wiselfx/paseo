import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeMiniPlayer } from "./mini";

const { theme } = vi.hoisted(() => {
  const hoistedTheme = {
    colors: {
      surface2: "#222",
      foregroundMuted: "#aaa",
    },
  };
  return { theme: hoistedTheme };
});

vi.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: (factory: unknown) => (typeof factory === "function" ? factory(theme) : factory),
  },
  withUnistyles: (component: unknown) => component,
}));

vi.mock("@/constants/platform", () => ({
  isWeb: true,
  isNative: false,
}));

vi.mock("./player", () => ({
  YouTubePlayerScreen: ({ videoId }: { videoId: string }) => (
    <div data-testid="player">{videoId}</div>
  ),
}));

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeEach(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
  vi.stubGlobal("Node", dom.window.Node);
  vi.stubGlobal("navigator", dom.window.navigator);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

function render(code: string) {
  act(() => {
    root?.render(<YouTubeMiniPlayer code={code} />);
  });
  return container as HTMLElement;
}

describe("inline YouTube player", () => {
  it("shows the poster for a watch URL and a bare URL alike", () => {
    for (const code of [
      "https://www.youtube.com/watch?v=4q6UGCyHZCI",
      "https://youtu.be/4q6UGCyHZCI",
    ]) {
      const el = render(code);
      expect(el.querySelector("img")?.getAttribute("src")).toBe(
        "https://i.ytimg.com/vi/4q6UGCyHZCI/hqdefault.jpg",
      );
      expect(el.querySelector("[aria-label]")?.getAttribute("aria-label")).toBe(
        "Play YouTube video 4q6UGCyHZCI",
      );
      act(() => {
        root?.unmount();
      });
      root = createRoot(el);
    }
  });

  it("loads the player in place of the poster on press", () => {
    const el = render("https://www.youtube.com/watch?v=4q6UGCyHZCI");
    const button = el.querySelector('[role="button"]') as HTMLElement;
    expect(button).toBeTruthy();

    act(() => {
      button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    expect(el.querySelector("[data-testid=player]")?.textContent).toBe("4q6UGCyHZCI");
    expect(el.querySelector("img")).toBeNull();
  });

  it("renders nothing for text that holds no video", () => {
    expect(render("not a link").querySelector("img")).toBeNull();
  });
});
