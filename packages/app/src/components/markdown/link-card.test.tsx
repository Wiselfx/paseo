import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLinkCard } from "./link-card";

const { theme } = vi.hoisted(() => {
  const hoistedTheme = {
    colors: {
      surface1: "#111",
      foreground: "#fff",
      foregroundMuted: "#aaa",
      border: "#555",
    },
  };
  return { theme: hoistedTheme };
});

vi.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: (factory: unknown) => (typeof factory === "function" ? factory(theme) : factory),
  },
}));

vi.mock("@/constants/platform", () => ({
  isWeb: true,
  isNative: false,
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

function render(element: React.ReactElement) {
  act(() => {
    root?.render(element);
  });
  return container as HTMLElement;
}

describe("AssistantLinkCard", () => {
  it("shows domain, trimmed URL, and favicon", () => {
    const el = render(
      <AssistantLinkCard url="https://sub.x.test:8080/a/b?x=1#f" onPress={() => undefined} />,
    );
    expect(el.textContent).toContain("sub.x.test");
    expect(el.textContent).toContain("sub.x.test:8080/a/b");
    expect(el.textContent).not.toContain("?x=1");
    const img = el.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "https://www.google.com/s2/favicons?domain=sub.x.test&sz=64",
    );
  });
});
