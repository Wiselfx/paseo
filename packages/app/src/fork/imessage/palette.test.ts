import { describe, expect, it } from "vitest";

import {
  AGENT_GREY,
  IMESSAGE_BLUE,
  bubblePalette,
  isLightSurface,
  relativeLuminance,
} from "./palette";

describe("relativeLuminance", () => {
  it("reads the ends of the range", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 3);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 3);
  });

  it("accepts short hex and ignores alpha", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 3);
    expect(relativeLuminance("#00000000")).toBeCloseTo(0, 3);
  });

  it("treats unparseable input as a dark surface", () => {
    expect(relativeLuminance("not-a-colour")).toBe(0);
  });
});

describe("isLightSurface", () => {
  it("classifies the app's real surfaces", () => {
    expect(isLightSurface("#ffffff")).toBe(true);
    expect(isLightSurface("#181B1A")).toBe(false);
    expect(isLightSurface("#000000")).toBe(false);
  });

  it("flips the agent grey with the surface", () => {
    expect(bubblePalette("agent", "#ffffff").background).toBe(AGENT_GREY.light);
    expect(bubblePalette("agent", "#181B1A").background).toBe(AGENT_GREY.dark);
  });

  it("keeps the user blue identical in both appearances", () => {
    expect(bubblePalette("user", "#ffffff").background).toBe(IMESSAGE_BLUE);
    expect(bubblePalette("user", "#181B1A").background).toBe(IMESSAGE_BLUE);
  });

  it("pairs each bubble with readable text", () => {
    const light = bubblePalette("agent", "#ffffff");
    const dark = bubblePalette("agent", "#181B1A");
    const contrast = (a: string, b: string) => {
      const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
        number,
        number,
      ];
      return (high + 0.05) / (low + 0.05);
    };
    expect(contrast(light.foreground, light.background)).toBeGreaterThan(12);
    expect(contrast(dark.foreground, dark.background)).toBeGreaterThan(9);
    expect(contrast(bubblePalette("user", "#fff").foreground, IMESSAGE_BLUE)).toBeGreaterThan(3.5);
  });
});
