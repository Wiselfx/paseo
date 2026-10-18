import { describe, expect, it } from "vitest";
import { darkTheme } from "@/styles/theme";
import { createMarkdownStyles } from "./styles";

/**
 * Fork expectations for shared Markdown styles, kept in a fork-owned file so
 * upstream's renderer.test.ts stays untouched.
 *
 * The fork carries two deliberate deviations from upstream inside `styles.ts`:
 * `image.borderRadius` 12 (upstream resets it to 8) and `image.maxHeight` 1200
 * (fork media cap). Everything else — the `...block` gap on image and
 * thematicBreak, `blockGap` from density — is upstream's and should be taken
 * as-is. These assertions exist so an upstream merge that silently drops
 * either value fails a test instead of shipping.
 */
describe("fork Markdown style values", () => {
  const blockGap = 16;
  const { markdownStyle } = createMarkdownStyles(darkTheme, { blockGap });

  it("keeps the fork radius and height cap on block images", () => {
    expect(markdownStyle.image).toMatchObject({
      borderRadius: 12,
      maxHeight: 1200,
      height: 320,
      resizeMode: "contain",
    });
  });

  it("takes the shared block gap on images and dividers, without a local margin", () => {
    expect(markdownStyle.image).toMatchObject({ marginTop: 0, marginBottom: blockGap });
    expect(markdownStyle.thematicBreak).toMatchObject({
      marginTop: 0,
      marginBottom: blockGap,
      height: 1,
    });
  });

  it("themes the divider with the border colour", () => {
    expect(markdownStyle.thematicBreak?.color).toBe(darkTheme.colors.border);
  });
});
