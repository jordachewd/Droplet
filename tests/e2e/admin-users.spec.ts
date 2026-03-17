import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();

test.describe("admin dashboard and user management", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.use({ storageState: adminAuthFile });

  test("renders admin dashboard, user list, and user detail actions", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeVisible();
    await expect(page.locator(".AdminDashboardPage a")).toHaveCount(7);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    const firstUserLink = page
      .locator(".AdminUsersPage a[href^='/admin/users/']")
      .first();
    await expect(firstUserLink).toBeVisible();
    await firstUserLink.click();

    await expect(page).toHaveURL(/\/admin\/users\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "Account Details" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Suspend User|Reinstate User/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove User" }),
    ).toBeVisible();
  });
});
