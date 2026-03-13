import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();

test.describe("admin transactions, usage, settings, and website", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.use({ storageState: adminAuthFile });

  test("renders admin feature pages and opens the website editor", async ({
    page,
  }) => {
    await page.goto("/admin/transactions");
    await expect(
      page.getByRole("heading", { name: "Transactions" }),
    ).toBeVisible();

    await page.goto("/admin/usage");
    await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Top Users" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "By Model" })).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI Models" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Models" }),
    ).toBeVisible();

    await page.goto("/admin/website");
    await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Slug")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Page" }),
    ).toBeVisible();

    const pageTitle = `E2E Admin Page ${Date.now()}`;
    const pageSlug = `e2e-admin-${Date.now()}`;

    await page.getByLabel("Title").fill(pageTitle);
    await page.getByLabel("Slug").fill(pageSlug);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", { name: "Create Page" }).click(),
    ]);

    const createdPageRow = page
      .locator(".AdminWebsitePage .divide-y > div")
      .filter({ has: page.locator("span", { hasText: pageSlug }) })
      .first();
    await expect(createdPageRow).toBeVisible({ timeout: 15_000 });

    await createdPageRow.scrollIntoViewIfNeeded();
    await createdPageRow.getByRole("link", { name: "Edit" }).click();

    await expect(page).toHaveURL(/\/admin\/website\/[^/]+$/);
    await expect(page.locator(".TiptapEditor")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
  });
});
