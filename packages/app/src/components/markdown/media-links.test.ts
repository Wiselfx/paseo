import { describe, expect, it } from "vitest";
import {
  displayUrl,
  domainForUrl,
  isLocalImagePath,
  isLocalPath,
  isRemoteImageUrl,
  isSoleParagraphContent,
  matchBareLocalPaths,
} from "./media-links";

describe("isRemoteImageUrl", () => {
  it("matches image extensions with query strings", () => {
    expect(isRemoteImageUrl("https://x.test/a.png")).toBe(true);
    expect(isRemoteImageUrl("https://x.test/a.JPEG?w=2")).toBe(true);
    expect(isRemoteImageUrl("https://x.test/a.webp#frag")).toBe(true);
  });
  it("rejects pages and non-http schemes", () => {
    expect(isRemoteImageUrl("https://github.com/")).toBe(false);
    expect(isRemoteImageUrl("https://x.test/a.png.exe")).toBe(false);
    expect(isRemoteImageUrl("file:///tmp/a.png")).toBe(false);
  });
});

describe("isLocalImagePath / isLocalPath", () => {
  it("accepts absolute and home-relative image paths", () => {
    expect(isLocalImagePath("/tmp/shot.png")).toBe(true);
    expect(isLocalImagePath("~/pics/a.jpg")).toBe(true);
    expect(isLocalImagePath("/tmp/shot.png.")).toBe(true);
  });
  it("rejects relatives, pages, and non-images", () => {
    expect(isLocalImagePath("tmp/shot.png")).toBe(false);
    expect(isLocalImagePath("/tmp/notes.txt")).toBe(false);
    expect(isLocalImagePath("https://x.test/a.png")).toBe(false);
  });
  it("isLocalPath accepts any absolute path", () => {
    expect(isLocalPath("/tmp/notes.txt")).toBe(true);
    expect(isLocalPath("~/x")).toBe(true);
    expect(isLocalPath("rel/x")).toBe(false);
  });
});

describe("matchBareLocalPaths", () => {
  it("finds paths and trims sentence punctuation", () => {
    expect(matchBareLocalPaths("see /tmp/a.png.")).toEqual(["/tmp/a.png"]);
    expect(matchBareLocalPaths("a ~/x/b.jpg, b /y/c.txt")).toEqual(["~/x/b.jpg", "/y/c.txt"]);
  });
  it("finds nothing in plain prose", () => {
    expect(matchBareLocalPaths("no paths here")).toEqual([]);
  });
});

describe("displayUrl / domainForUrl", () => {
  it("strips scheme, secrets, query, and fragment", () => {
    expect(displayUrl("https://user:pw@x.test/a/b?x=1#f")).toBe("x.test/a/b");
    expect(displayUrl("https://x.test/")).toBe("x.test");
  });
  it("extracts the host", () => {
    expect(domainForUrl("https://sub.x.test:8080/a")).toBe("sub.x.test");
    expect(domainForUrl("notaurl")).toBe("notaurl");
  });
});

describe("isSoleParagraphContent", () => {
  const text = (key: string, content: string) =>
    ({ type: "text", key, content, children: [] }) as never;
  const link = (key: string) => ({ type: "link", key, children: [] }) as never;
  const para = (children: never[]) => [{ type: "paragraph", key: "p", children }] as never;

  it("accepts a lone link", () => {
    expect(isSoleParagraphContent("l", para([link("l")]))).toBe(true);
  });
  it("accepts a link with whitespace around it", () => {
    expect(isSoleParagraphContent("l", para([text("a", "  "), link("l"), text("b", "\n")]))).toBe(
      true,
    );
  });
  it("rejects links embedded in prose", () => {
    expect(isSoleParagraphContent("l", para([text("a", "see "), link("l")]))).toBe(false);
  });
  it("rejects missing paragraphs", () => {
    expect(isSoleParagraphContent("l", [])).toBe(false);
  });
});
