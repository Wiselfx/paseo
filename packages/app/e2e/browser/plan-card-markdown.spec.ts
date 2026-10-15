import { expect, test } from "../support/fixtures";
import { waitForPermissionPrompt } from "../support/helpers/permissions";
import { openAgentRoute, seedMockAgentWorkspace } from "../support/helpers/mock-agent";

// Literal shell commands and copyright markers must survive Markdown rendering.
test.describe("Plan card markdown", () => {
  test("renders plan text verbatim", async ({ page }) => {
    test.setTimeout(180_000);

    const session = await seedMockAgentWorkspace({
      repoPrefix: "plan-card-markdown-",
      title: "Plan card markdown e2e",
      initialPrompt: "Emit synthetic plan approval.",
    });

    try {
      await openAgentRoute(page, session);
      await waitForPermissionPrompt(page, 120_000);

      const planCard = page.getByTestId("permission-plan-card");
      await expect(planCard.locator(".enrm-text")).toBeVisible();
      await expect(planCard).toContainText("(c)");
      await expect(planCard).toContainText('--name="my repo"');
      await expect(planCard).toContainText("---buzz");
      await expect(planCard).not.toContainText("©");
      await expect(planCard).not.toContainText("—buzz");
    } finally {
      await session.cleanup();
    }
  });
});

test("chat and file preview share the library renderer and resolve file links", async ({
  page,
}, testInfo) => {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const source =
    "First paragraph.\n\nSecond paragraph.\n\n```ts\nconst answer = 42;\n```\n\n> A quote\n\n| Key || Value |\n| --- | --- | --- |\n| Answer || 42 |\n\nOpen `README.md` or `src/说明.md:2-3`.\n\n[Space file](my%20file.ts) and `my%20file.ts`.";
  const session = await seedMockAgentWorkspace({
    repoPrefix: "shared-markdown-",
    title: "Shared Markdown",
    featureValues: { mockAssistantResponse: source },
    initialPrompt: "Show Markdown",
  });
  try {
    await writeFile(`${session.cwd}/README.md`, source);
    await writeFile(`${session.cwd}/my file.ts`, "Explicit link opened the space filename.");
    await writeFile(
      `${session.cwd}/my%20file.ts`,
      "Inline code opened the literal percent filename.",
    );
    await mkdir(`${session.cwd}/packages/app/src`, { recursive: true });
    await writeFile(
      `${session.cwd}/packages/app/src/说明.md`,
      "# Nested file\n\nUnicode suffix lookup succeeded.",
    );
    await session.client.waitForFinish(session.agentId, 30_000);
    await openAgentRoute(page, session);
    const message = page.getByTestId("assistant-message");
    await expect(message).toHaveCount(1);
    await expect(message.locator(".enrm-text > p").first()).toContainText("First paragraph.");
    await expect(message.locator(".enrm-text > p").nth(1)).toContainText("Second paragraph.");
    await expect(message.locator("blockquote")).toContainText("A quote");
    await expect(message.getByRole("table")).toContainText("42");
    await expect(message.getByRole("cell").nth(0)).toHaveText("Answer");
    await expect(message.getByRole("cell").nth(1)).toHaveText("");
    await expect(message.getByRole("cell").nth(2)).toHaveText("42");
    await message.getByRole("link", { name: "README.md" }).click();
    const preview = page.getByTestId("markdown-preview-frame");
    await expect(preview.locator(".enrm-text")).toContainText("Second paragraph.");
    await expect(preview.getByRole("table")).toContainText("42");
    await page.getByRole("button", { name: "Shared Markdown", exact: true }).click();
    await message.getByRole("link", { name: "src/说明.md:2-3" }).click();
    await expect(page.getByText("Unicode suffix lookup succeeded.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Shared Markdown", exact: true }).click();
    await message.getByRole("link", { name: "Space file", exact: true }).click();
    await expect(
      page.getByText("Explicit link opened the space filename.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Shared Markdown", exact: true }).click();
    await message.getByRole("link", { name: "my%20file.ts", exact: true }).click();
    await expect(
      page.getByText("Inline code opened the literal percent filename.", { exact: true }),
    ).toBeVisible();
    await testInfo.attach("shared-renderer", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  } finally {
    await session.cleanup();
  }
});
