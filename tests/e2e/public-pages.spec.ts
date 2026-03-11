import { expect, test } from "@playwright/test";

test("renders the new public informational pages", async ({ page }) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "About Droplet" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "View plans" })).toBeVisible();

  await page.goto("/faqs");
  await expect(
    page.getByRole("heading", { name: "Frequently Asked Questions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contact support" }),
  ).toBeVisible();

  await page.goto("/cookies");
  await expect(
    page.getByRole("heading", { name: "Cookie Policy" }),
  ).toBeVisible();
});

test("footer legal links route to the published policy pages", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Privacy & Cookie Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByText(
      "This policy is provided for informational purposes. Legal review recommended before production publication.",
    ),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Terms & Conditions" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole("heading", { name: "Terms & Conditions" }),
  ).toBeVisible();
  await expect(page.getByText("$19")).toBeVisible();
  await expect(page.getByText("$39")).toBeVisible();
});
