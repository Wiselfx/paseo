import { describe, expect, it } from "vitest";
import { hoistBareRemoteImages } from "./markdown-image-links";
import { linkifyLocalPaths } from "./markdown-local-paths";

describe("hoistBareRemoteImages", () => {
  it("converts bare image URLs to image markdown", () => {
    expect(hoistBareRemoteImages("see https://example.com/shot.png")).toContain(
      "![](https://example.com/shot.png)",
    );
  });
  it("keeps query strings and trims trailing punctuation", () => {
    expect(hoistBareRemoteImages("see https://example.com/a.jpg?x=1.")).toContain(
      "![](https://example.com/a.jpg?x=1)",
    );
  });
  it("leaves authored links, code, and non-images alone", () => {
    expect(hoistBareRemoteImages("[t](https://example.com/a.png)")).not.toContain("![](");
    expect(hoistBareRemoteImages("`https://example.com/a.png`")).not.toContain("![](");
    expect(hoistBareRemoteImages("see https://example.com/page")).not.toContain("![](");
  });
});

describe("linkifyLocalPaths", () => {
  it("converts bare local images to image markdown", () => {
    expect(linkifyLocalPaths("see /tmp/shot.png")).toContain("![shot.png](/tmp/shot.png)");
  });
  it("converts other bare paths to file links", () => {
    expect(linkifyLocalPaths("open /tmp/paseo/package.json")).toContain(
      "[/tmp/paseo/package.json](file:///tmp/paseo/package.json)",
    );
  });
  it("leaves code and authored links alone", () => {
    expect(linkifyLocalPaths("run `/tmp/a.png`")).not.toContain("![");
    expect(linkifyLocalPaths("[a](/tmp/a.png)")).not.toContain("![");
  });
});
