import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();

test.describe("admin settings propagation", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.use({ storageState: adminAuthFile });
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Runs once on Chromium to avoid repeated settings mutation across browsers.",
  );

  test("updates support email in admin settings and propagates to plans page", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    const supportTab = page.getByRole("tab", { name: "Support" });
    await supportTab.click();
    await expect(supportTab).toHaveAttribute("aria-selected", "true");
    const supportAlert = page.locator(".AdminSupportSection [role='alert']");

    const supportInput = page.locator("input[name='supportEmail']:visible");
    await expect(supportInput).toBeVisible();

    const originalSupportEmail = await supportInput.inputValue();
    const nextSupportEmail = `e2e-support+${Date.now()}@example.com`;

    try {
      await supportInput.fill(nextSupportEmail);
      await page.getByRole("button", { name: "Save Support Email" }).click();
      await expect(supportAlert).toBeVisible();
      await expect(supportAlert).toContainText("Settings updated.");

      await page.goto("/plans");
      const contactSupportLink = page.getByRole("link", {
        name: "Contact support",
      });
      await expect(contactSupportLink).toBeVisible();
      await expect(contactSupportLink).toHaveAttribute(
        "href",
        `mailto:${nextSupportEmail}`,
      );
    } finally {
      await page.goto("/admin/settings");
      await page.evaluate(() => {
        window.localStorage.setItem(
          "droplet-admin-settings-active-tab",
          "support",
        );
      });
      await page.reload();
      const resetSupportAlert = page.locator(
        ".AdminSupportSection [role='alert']",
      );

      const resetInput = page.locator("input[name='supportEmail']:visible");
      if ((await resetInput.count()) === 0) {
        return;
      }

      await resetInput.fill(originalSupportEmail);
      await page.getByRole("button", { name: "Save Support Email" }).click();
      await expect(resetSupportAlert).toContainText("Settings updated.");
    }
  });
});
