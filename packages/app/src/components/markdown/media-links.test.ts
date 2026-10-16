import { describe, expect, it } from "vitest";
import {
  displayUrl,
  domainForUrl,
  isLocalImagePath,
  isLocalPath,
  isRemoteImageUrl,
  isSoleBlockContent,
  matchBareLocalPaths,
} from "./media-links";

describe("isRemoteImageUrl", () => {
  it("matches image extensions with query strings", () => {
    expect(isRemoteImageUrl("https://x.test/a.png")).toBe(true);
    expect(isRemoteImageUrl("https://x.test/a.JPEG?w=2")).toBe(true);
    expect(isRemoteImageUrl("https://x.test/a.webp#frag")).toBe(true);
    expect(isRemoteImageUrl("https://x.test/a.svg")).toBe(true);
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
    expect(isLocalImagePath("/tmp/logo.svg")).toBe(true);
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

describe("isSoleBlockContent", () => {
  const text = (key: string, content: string) =>
    ({ type: "text", key, content, children: [] }) as never;
  const link = (key: string) => ({ type: "link", key, children: [] }) as never;
  const wrap = (type: string, children: never[]) => [{ type, key: `${type}-0`, children }] as never;

  it("accepts a lone link in a textgroup (assistant block shape)", () => {
    expect(isSoleBlockContent("l", wrap("textgroup", [link("l")]))).toBe(true);
  });
  it("accepts a lone link in a paragraph", () => {
    expect(isSoleBlockContent("l", wrap("paragraph", [link("l")]))).toBe(true);
  });
  it("accepts a link with whitespace and line breaks around it", () => {
    const br = (type: string) => ({ type, key: `${type}-1`, content: "", children: [] }) as never;
    expect(
      isSoleBlockContent("l", wrap("textgroup", [text("a", "  "), link("l"), br("softbreak")])),
    ).toBe(true);
    expect(isSoleBlockContent("l", wrap("textgroup", [link("l"), br("hardbreak")]))).toBe(true);
  });
  it("rejects links embedded in prose", () => {
    expect(isSoleBlockContent("l", wrap("textgroup", [text("a", "see "), link("l")]))).toBe(false);
  });
  it("rejects links in list items and headings", () => {
    const li = { type: "list_item", key: "li", children: [] } as never;
    const h1 = { type: "heading1", key: "h1", children: [] } as never;
    expect(isSoleBlockContent("l", [...wrap("textgroup", [link("l")]), li])).toBe(false);
    expect(isSoleBlockContent("l", [...wrap("textgroup", [link("l")]), h1])).toBe(false);
  });
  it("rejects missing containers", () => {
    expect(isSoleBlockContent("l", [])).toBe(false);
  });
});
