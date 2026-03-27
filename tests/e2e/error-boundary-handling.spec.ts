import path from "node:path";
import { expect, test } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();
const chatAlert = ".AlertMessage [role='alert']";

test.describe("error boundary handling", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("renders the dedicated 500 fallback page", async ({ page }) => {
    await page.goto("/500");
    await expect(page.getByText("ERROR: 500")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Server Error" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("shows in-chat error feedback when API returns a server failure", async ({
    page,
  }) => {
    await page.route("**/api/openai", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "e2e-forced-server-error",
        }),
      });
    });

    try {
      await page.goto("/app/new");
      const firstPersonaCard = page.locator(".PersonaCard").first();
      const personaCardCount = await firstPersonaCard.count();
      if (personaCardCount > 0) {
        await firstPersonaCard.click();
      }

      const chatInputField = page.locator("#chatInput");
      await expect(chatInputField).toBeVisible({ timeout: 15000 });
      await expect(chatInputField).toBeEditable();
      await chatInputField.fill("trigger error handling");

      const sendButton = page.getByRole("button", { name: "Send message" });
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      await expect(page.locator(chatAlert)).toContainText(
        "e2e-forced-server-error",
      );
      await expect(page.locator("#chatInput")).toBeVisible();
    } finally {
      await page.unroute("**/api/openai");
    }
  });
});
