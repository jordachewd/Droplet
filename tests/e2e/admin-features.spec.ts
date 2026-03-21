import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";
import { withMongoConnection } from "./utils/mongo";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();
const createdPublicPageSlugs = new Set<string>();

test.describe("admin transactions, usage, settings, and website", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Admin website editor flow is currently stabilized on Chromium only.",
    );
  });

  test.afterAll(async () => {
    if (createdPublicPageSlugs.size === 0) {
      return;
    }

    await withMongoConnection(async (connection) => {
      await connection.collection("publicpages").deleteMany({
        slug: { $in: [...createdPublicPageSlugs] },
      });
    });
    createdPublicPageSlugs.clear();
  });
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
    await expect(page.getByText("Top Personas")).toBeVisible();
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
    createdPublicPageSlugs.add(pageSlug);

    await page.getByLabel("Title").fill(pageTitle);
    await page.getByLabel("Slug").fill(pageSlug);
    await page.getByRole("button", { name: "Create Page" }).click();
    await expect(page.locator(".AdminWebsitePage")).toContainText(pageSlug, {
      timeout: 20_000,
    });

    const createdPageRow = page
      .locator(".AdminWebsitePage .divide-y > div")
      .filter({ has: page.locator("span", { hasText: pageSlug }) })
      .first();
    await expect(createdPageRow).toBeVisible({ timeout: 15_000 });

    await createdPageRow.scrollIntoViewIfNeeded();
    const editLink = createdPageRow.getByRole("link", { name: "Edit" });
    const editHref = await editLink.getAttribute("href");

    await expect(editLink).toBeVisible();
    await expect(editHref).toMatch(/^\/admin\/website\/[^/]+$/);

    if (!editHref) {
      throw new Error("Created page edit link is missing href.");
    }

    await page.goto(editHref);

    await expect(page.locator(".TiptapEditor")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
  });
});
