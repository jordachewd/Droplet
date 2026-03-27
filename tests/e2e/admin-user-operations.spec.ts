import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  getE2ETestUser,
  missingAdminCredentialsError,
  missingCredentialsError,
} from "./utils/e2e-test-user";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();
const e2eTestUser = getE2ETestUser();
const userSearchIdentifier = e2eTestUser?.identifier ?? null;
const adminAlert = ".AlertMessage [role='alert']";

test.describe("admin user operations", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.skip(!userSearchIdentifier, missingCredentialsError);
  test.use({ storageState: adminAuthFile });
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Runs once on Chromium to avoid repeated user state mutation across browsers.",
  );

  test("views user details and can suspend then restore account state", async ({
    page,
  }) => {
    await page.goto(
      `/admin/users?q=${encodeURIComponent(userSearchIdentifier ?? "")}`,
    );
    await expect(page).toHaveURL(/\/admin\/users\?/);

    const userRowLink = page
      .locator(".AdminUsersTable tbody tr a[href^='/admin/users/']")
      .first();
    await expect(userRowLink).toBeVisible();
    await userRowLink.click();

    await expect(page).toHaveURL(/\/admin\/users\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "Account Details" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Admin Actions" }),
    ).toBeVisible();

    const actionButton = page.getByRole("button", {
      name: /Suspend User|Reinstate User/,
    });
    await expect(actionButton).toBeVisible();
    const initialActionLabel =
      (await actionButton.textContent())?.trim() ?? "Suspend User";
    const expectedPostActionLabel =
      initialActionLabel === "Suspend User" ? "Reinstate User" : "Suspend User";
    const expectedFirstAlertText =
      initialActionLabel === "Suspend User"
        ? "User suspended."
        : "User reinstated.";
    const expectedRevertAlertText =
      expectedPostActionLabel === "Suspend User"
        ? "User suspended."
        : "User reinstated.";

    await actionButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator(adminAlert)).toContainText(
      expectedFirstAlertText,
    );
    await expect(
      page.getByRole("button", { name: expectedPostActionLabel }),
    ).toBeVisible();

    await page.getByRole("button", { name: expectedPostActionLabel }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator(adminAlert)).toContainText(
      expectedRevertAlertText,
    );
    await expect(
      page.getByRole("button", { name: initialActionLabel }),
    ).toBeVisible();
  });
});
