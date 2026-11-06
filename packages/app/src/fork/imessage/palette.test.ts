import { describe, expect, it } from "vitest";

import {
  MESSAGES_PALETTE,
  bubblePalette,
  isLightSurface,
  relativeLuminance,
} from "./palette";

describe("relativeLuminance", () => {
  it("reads black and white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
  });

  it("survives shorthand and alpha", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1);
    expect(relativeLuminance("#000000ff")).toBe(0);
  });

  it("treats junk as black rather than throwing", () => {
    expect(relativeLuminance("not-a-colour")).toBe(0);
    expect(relativeLuminance("#12")).toBe(0);
  });
});

describe("isLightSurface", () => {
  it("classifies the two page colours", () => {
    expect(isLightSurface("#ffffff")).toBe(true);
    expect(isLightSurface("#181B1A")).toBe(false);
    expect(isLightSurface("#000000")).toBe(false);
  });
});

describe("bubblePalette", () => {
  it("is blue for you and grey for them, in both appearances", () => {
    expect(bubblePalette("user", "light").background).toBe(MESSAGES_PALETTE.light.outgoing);
    expect(bubblePalette("user", "dark").background).toBe(MESSAGES_PALETTE.dark.outgoing);
    expect(bubblePalette("agent", "light").background).toBe("#E9E9EB");
    expect(bubblePalette("agent", "dark").background).toBe("#262629");
  });

  it("keeps the tail identical to the body, so the seam never shows", () => {
    for (const side of ["user", "agent"] as const) {
      for (const appearance of ["light", "dark"] as const) {
        const palette = bubblePalette(side, appearance);
        expect(palette.tail).toBe(palette.background);
      }
    }
  });

  it("puts white on blue and the measured ink on grey", () => {
    expect(bubblePalette("user", "light").foreground).toBe("#FFFFFF");
    expect(bubblePalette("user", "dark").foreground).toBe("#FFFFFF");
    expect(bubblePalette("agent", "light").foreground).toBe("#000000");
    expect(bubblePalette("agent", "dark").foreground).toBe("#FFFFFF");
  });

  it("carries the measured screen-space endpoints", () => {
    expect(bubblePalette("user", "light").gradient).toEqual({
      top: "#5AC8FA",
      bottom: "#0088FF",
      screenHeight: 874,
    });
    expect(bubblePalette("user", "dark").gradient.top).toBe("#409CFF");
  });

  it("uses the measured secondary label for marks inside the bubble", () => {
    expect(bubblePalette("agent", "light").muted).toBe("#8A8A8E");
    expect(bubblePalette("agent", "dark").muted).toBe("#8D8D93");
  });
});
