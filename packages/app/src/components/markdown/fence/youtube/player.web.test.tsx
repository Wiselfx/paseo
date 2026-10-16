import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeInlinePlayer } from "./player.web";

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

vi.mock("@/utils/open-external-url", () => ({
  openExternalUrl: vi.fn(),
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

describe("YouTubeInlinePlayer web", () => {
  it("renders a nocookie iframe, not a WebView", () => {
    act(() => {
      // withUnistyles is mocked as passthrough, so inject theme directly.
      root?.render(<YouTubeInlinePlayer videoId="4q6UGCyHZCI" theme={theme as never} />);
    });
    const el = container as HTMLElement;
    const iframe = el.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/4q6UGCyHZCI?rel=0",
    );
    expect(el.textContent).toContain("youtube.com · 4q6UGCyHZCI");
  });
});
