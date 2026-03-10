import { expect, test } from "@playwright/test";

test("loads landing page for unauthenticated users", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Droplet/i);
  await expect(
    page.getByRole("heading", {
      name: "A smarter way to chat, create, and get things done.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try it for free" }),
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

test("redirects unauthenticated users from private routes to sign-in", async ({
  page,
}) => {
  const privateRoutes = ["/app", "/profile", "/plans", "/dashboard"];

  for (const route of privateRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in/);
  }
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
