import path from "node:path";
import { expect, test } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

test.describe("chat conversation flow", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Runs once on Chromium to avoid repeated mocked conversation side effects.",
  );

  test("starts a chat and renders assistant response from API", async ({
    page,
  }) => {
    await page.route("**/api/openai", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          taskId: "task_mock_1",
          personaId: "strategist",
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [{ type: "text", text: "mocked-assistant-response" }],
          },
          acceptedPrompt: true,
        }),
      });
    });

    try {
      await page.goto("/app/new");
      await expect(page.locator(".PersonaCard").first()).toBeVisible();
      await page.locator(".PersonaCard").first().click();

      await expect(page.locator("#chatInput")).toBeVisible();
      await page.locator("#chatInput").fill("structural-e2e-chat-prompt");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText("mocked-assistant-response")).toBeVisible();
      await expect(page).toHaveURL(/\/app/);
    } finally {
      await page.unroute("**/api/openai");
    }
  });
});
