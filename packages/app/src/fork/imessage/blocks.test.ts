import { describe, expect, it } from "vitest";

import { completeBlocks, splitMessageBlocks } from "./blocks";

describe("splitMessageBlocks", () => {
  it("holds everything while the first paragraph is still arriving", () => {
    expect(splitMessageBlocks("Loading the")).toEqual({ completed: [], tail: "Loading the" });
  });

  it("commits a paragraph once a blank line follows it", () => {
    const blocks = splitMessageBlocks("First para.\n\nSecond is st");
    expect(blocks.completed).toEqual(["First para."]);
    expect(blocks.tail).toBe("Second is st");
  });

  it("keeps a list attached to the paragraph that introduced it", () => {
    const text = "Steps:\n\n- one\n- two\n\nDone";
    expect(splitMessageBlocks(text).completed).toEqual(["Steps:", "- one\n- two"]);
  });

  it("does not split inside a fenced block", () => {
    const text = "Here:\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter";
    expect(splitMessageBlocks(text).completed).toEqual([
      "Here:",
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
    ]);
  });

  it("holds an unterminated fence instead of popping half of it", () => {
    const blocks = splitMessageBlocks("Intro\n\n```ts\nconst a = 1;\n");
    expect(blocks.completed).toEqual(["Intro"]);
    expect(blocks.tail).toBe("```ts\nconst a = 1;\n");
  });

  it("treats a tilde fence the same way, and requires a matching marker", () => {
    const blocks = splitMessageBlocks("~~~\nx\n~~~\n\n~~~\ny");
    expect(blocks.completed).toEqual(["~~~\nx\n~~~"]);
    expect(blocks.tail).toBe("~~~\ny");
  });

  it("returns nothing for an empty message", () => {
    expect(splitMessageBlocks("   \n\n")).toEqual({ completed: [], tail: "" });
  });

  it("normalises CRLF so a Windows-style blank line still ends a block", () => {
    expect(splitMessageBlocks("One\r\n\r\nTwo").completed).toEqual(["One"]);
  });
});

describe("completeBlocks", () => {
  it("releases the tail when the turn ends", () => {
    expect(completeBlocks({ completed: ["a"], tail: "b" })).toEqual(["a", "b"]);
  });

  it("does not append an empty tail", () => {
    expect(completeBlocks({ completed: ["a"], tail: "  " })).toEqual(["a"]);
  });
});
