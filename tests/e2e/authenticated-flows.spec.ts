import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

test.describe("authenticated user flows", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("opens profile and plans pages after sign-in", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    await page.goto("/plans");
    await expect(
      page.getByRole("heading", { name: /your plan/i }),
    ).toBeVisible();
  });

  test("redirects non-admin users from dashboard to forbidden screen", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/403$/);
    await expect(
      page.getByRole("heading", { name: "Forbidden" }),
    ).toBeVisible();
  });
});

test.describe("authenticated logout flow", () => {
  test.skip(!e2eTestUser, missingCredentialsError);

  test("allows logout from avatar menu", async ({ page }) => {
    const { identifier, password } = requireE2ETestUser();

    await page.goto("/");
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier,
        password,
      },
    });
    await page.waitForURL(/\/($|\?)/, { timeout: 30_000 });

    const accountButton = page.getByRole("button", { name: "Account menu" });
    await expect(accountButton).toBeVisible();
    await accountButton.click();
    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "login" })).toBeVisible();
  });
});
