import { describe, expect, it } from "vitest";

import { isBareLink, linkHost } from "./link-preview";

describe("linkHost", () => {
  it("drops the scheme, www and the path", () => {
    expect(linkHost("https://www.apple.com/iphone?x=1")).toBe("apple.com");
    expect(linkHost("http://example.org")).toBe("example.org");
  });
});

describe("isBareLink", () => {
  it("accepts a block that is one URL and nothing else", () => {
    expect(isBareLink("  https://apple.com  ")).toBe(true);
    expect(isBareLink("ftp://apple.com")).toBe(false);
    expect(isBareLink("see https://apple.com")).toBe(false);
    expect(isBareLink("https://apple.com and more")).toBe(false);
  });
});
