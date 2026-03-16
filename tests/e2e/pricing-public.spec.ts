import path from "node:path";
import { expect, test } from "@playwright/test";

const guestFile = path.join(__dirname, ".clerk/guest.json");

test.use({ storageState: guestFile });

test("shows the reconciled pricing and FAQ copy on the public pricing page", async ({
  page,
}) => {
  await page.goto("/plans");

  await expect(
    page.getByText("Free forever", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("$19", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$39", { exact: true }).first()).toBeVisible();
  await expect(
    page
      .locator(".PlanCard")
      .getByText("3 personas (full access) + try all others (limited access)"),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".PlanCard")
      .getByText("7 personas (full access) + try all others (limited access)"),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".PlanCard")
      .getByText("All 10 personas (unlimited)"),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".PlanCard")
      .getByText("Trial personas: 5 prompts, 3 images, 2 audio, 1 video / 30 days"),
  ).toHaveCount(2);
  await expect(page.getByLabel("Toggle yearly billing")).toHaveCount(0);
  await expect(page.getByText("Save 40%", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Yearly", { exact: true })).toHaveCount(0);

  await page
    .locator("summary")
    .filter({ hasText: "Does Droplet have a free plan?" })
    .click({ force: true });
  await page
    .locator("summary")
    .filter({
      hasText: "Who should I reach out to for assistance or inquiries?",
    })
    .click({ force: true });

  await expect(page.getByText("Does Droplet have a free plan?")).toBeVisible();
  await expect(
    page.locator("details").filter({
      hasText: "Who should I reach out to for assistance or inquiries?",
    }),
  ).toContainText("office@jordachewd.com");
});
