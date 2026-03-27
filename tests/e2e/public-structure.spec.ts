import path from "node:path";
import { expect, test } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const guestFile = path.join(__dirname, ".clerk/guest.json");
const e2eTestUser = getE2ETestUser();

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/plans",
  "/personas",
  "/privacy",
  "/cookies",
  "/terms",
] as const;

test.skip(!e2eTestUser, missingCredentialsError);
test.use({ storageState: guestFile });

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} renders structural layout`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
}
