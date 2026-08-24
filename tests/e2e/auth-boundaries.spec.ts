import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  getE2ETestUser,
  missingAdminCredentialsError,
  missingCredentialsError,
} from "./utils/e2e-test-user";

const guestFile = path.join(__dirname, ".clerk/guest.json");
const authFile = path.join(__dirname, ".clerk/user.json");
const adminAuthFile = path.join(__dirname, ".clerk/admin.json");

const e2eTestUser = getE2ETestUser();
const e2eAdminUser = getE2EAdminUser();

test.describe("route access boundaries", () => {
  test.describe("guest access", () => {
    test.skip(!e2eTestUser, missingCredentialsError);
    test.use({ storageState: guestFile });

    test("redirects guest users away from app and admin namespaces", async ({
      page,
    }) => {
      await page.goto("/app");
      await expect(page).toHaveURL(/\/sign-in$/);

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/sign-in$/);
    });
  });

  test.describe("authenticated access", () => {
    test.skip(!e2eTestUser, missingCredentialsError);
    test.use({ storageState: authFile });

    test("allows signed-in users to access app namespace", async ({ page }) => {
      await page.goto("/app/profile");
      await expect(page).toHaveURL(/\/app\/profile$/);
      await expect(page.locator("main").first()).toBeVisible();
    });
  });

  test.describe("admin access", () => {
    test.skip(!e2eAdminUser, missingAdminCredentialsError);
    test.use({ storageState: adminAuthFile });

    test("allows admin users to access admin namespace", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator("main").first()).toBeVisible();
    });
  });
});
