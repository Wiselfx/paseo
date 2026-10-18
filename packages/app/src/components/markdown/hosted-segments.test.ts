import { describe, expect, it } from "vitest";
import { splitHostedSegments } from "./hosted-segments";

const DOCUMENT = [
  "Intro prose.",
  "",
  "```mermaid",
  "graph TD; A-->B;",
  "```",
  "",
  "Middle prose.",
  "",
  "```youtube",
  "dQw4w9WgXcQ",
  "```",
  "",
  "```visualize",
  '{"markdown":"# Report"}',
  "```",
  "",
  "https://example.com/article",
  "",
  "Closing prose.",
].join("\n");

const kinds = (segments: { kind: string }[]) => segments.map((segment) => segment.kind);

describe("hosted fence segments", () => {
  it("keeps hosted blocks in document order on native", () => {
    expect(kinds(splitHostedSegments(DOCUMENT, "native"))).toEqual([
      "markdown",
      "mermaid",
      "markdown",
      "youtube",
      "markdown",
      "viz",
      "markdown",
      "card",
      "markdown",
    ]);
  });

  it("gives every segment a unique id", () => {
    const ids = splitHostedSegments(DOCUMENT, "native").map((segment) => segment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves diagrams to the library renderer on web", () => {
    const segments = splitHostedSegments(DOCUMENT, "web");
    expect(kinds(segments)).not.toContain("mermaid");
    expect(kinds(segments)).toContain("youtube");
    expect(segments.some((segment) => segment.source.includes("```mermaid"))).toBe(true);
  });

  it("returns plain prose as one library segment", () => {
    expect(splitHostedSegments("Just words.", "native")).toEqual([
      { kind: "markdown", id: "v0", source: "Just words." },
    ]);
  });
});
