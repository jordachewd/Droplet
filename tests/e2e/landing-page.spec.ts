import path from "node:path";
import { expect, test } from "@playwright/test";

const guestFile = path.join(__dirname, ".clerk/guest.json");

test.use({ storageState: guestFile });

test("loads landing page for unauthenticated users", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Droplet/i);
  await expect(
    page.getByRole("heading", {
      name: "Chat, create, and get things done.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try it for free" }),
  ).toBeVisible();

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  if (viewportWidth >= 768) {
    await expect(
      page.getByRole("link", { name: "About", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Plans", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "FAQs", exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Not another empty prompt box." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Different jobs need different voices.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
});

test("toggles dark mode and persists it after reload", async ({ page }) => {
  await page.goto("/");

  const darkModeButton = page.getByRole("button", {
    name: "Switch to dark mode",
  });
  await darkModeButton.click();

  await expect(page.locator("html")).toHaveAttribute(
    "data-droplet-theme",
    "dark",
  );

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute(
    "data-droplet-theme",
    "dark",
  );
});

test("renders custom 404 page for unknown routes", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");

  await expect(page).toHaveURL(/this-route-does-not-exist/);
  await expect(page.getByText("HTTP 404")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page Not Found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
});
