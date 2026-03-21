import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const guestFile = path.join(__dirname, ".clerk/guest.json");
const e2eTestUser = getE2ETestUser();

function isClerkAuthRedirect(url: string) {
  return (
    /\/sign-in/.test(url) ||
    /clerk\.accounts\.dev\/v1\/client\/handshake/.test(url) ||
    /clerk\.accounts\.dev\/.*\/sign-in/.test(url)
  );
}

async function ensureAuthenticatedChatPage(page: Page) {
  await page.goto("/app/new", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (/\/sign-in(?:\/|$|\?)/.test(page.url())) {
    const { identifier, password, username } = requireE2ETestUser();

    await page
      .getByRole("textbox", { name: "Email address or username" })
      .fill(username ?? identifier);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
  }

  await expect(page).toHaveURL(/\/app(?:\/new|\?.*)?$/);
}

test.describe("error handling", () => {
  test.describe("authenticated chat error states", () => {
    test.skip(!e2eTestUser, missingCredentialsError);
    test.skip(
      ({ browserName }) => browserName !== "chromium",
      "Runs once on Chromium to avoid repeated API route interception across all browser projects.",
    );
    test.use({ storageState: authFile });

    test("shows an error alert when /api/openai returns 500", async ({
      page,
    }) => {
      await page.route("**/api/openai", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "The AI service is temporarily unavailable. Please try again shortly.",
          }),
        });
      });

      try {
        await ensureAuthenticatedChatPage(page);

        if (/\/app\/new(?:\/|$|\?)/.test(page.url())) {
          await page.goto("/app?persona=strategist", {
            waitUntil: "domcontentloaded",
          });
        }

        const messageInput = page.getByRole("textbox", {
          name: "Message input",
        });
        const sendButton = page.getByRole("button", { name: "Send message" });
        const starterPromptButton = page.getByRole("button", {
          name: /Build me a 30-day roadmap to launch my side project\./i,
        });

        await expect(messageInput).toBeVisible();
        await starterPromptButton.click();
        await expect(messageInput).toHaveValue(
          "Build me a 30-day roadmap to launch my side project.",
        );
        await expect(sendButton).toBeEnabled();
        await sendButton.click();

        const alert = page.locator(".AlertMessage [role='alert']");
        await expect(alert).toBeVisible();
        await expect(alert).toContainText(
          "The AI service is temporarily unavailable. Please try again shortly.",
        );
      } finally {
        await page.unroute("**/api/openai").catch(() => undefined);
      }
    });
  });

  test.describe("unauthenticated access error states", () => {
    test.use({ storageState: guestFile });

    test("redirects unauthenticated users to sign-in for protected routes", async ({
      page,
    }) => {
      await page.goto("/app", { waitUntil: "domcontentloaded" });

      await expect
        .poll(() => isClerkAuthRedirect(page.url()), {
          message: `Expected /app to enter the Clerk sign-in flow. Current URL: ${page.url()}`,
        })
        .toBe(true);
    });
  });
});
