import { expect, test } from "@playwright/test";

test("shows the reconciled pricing and FAQ copy on the public pricing page", async ({
  page,
}) => {
  await page.goto("/plans");

  await expect(
    page.getByText("Free forever", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("$19")).toBeVisible();
  await expect(page.getByText("$39")).toBeVisible();
  await expect(page.getByText("All 9 personas")).toHaveCount(3);

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
