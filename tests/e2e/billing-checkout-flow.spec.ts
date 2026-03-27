import path from "node:path";
import { expect, test } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

test.describe("billing and checkout flow", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("renders plan checkout actions and fallback checkout confirmation state", async ({
    page,
  }) => {
    await page.goto("/app/plans");
    await expect(page).toHaveURL(/\/app\/plans$/);
    await expect(page.locator(".PlanCard").first()).toBeVisible();
    expect(await page.locator(".Checkout").count()).toBeGreaterThan(0);
    await expect(
      page.getByRole("button", { name: "Subscribe" }).first(),
    ).toBeVisible();

    await page.goto("/checkout-success?session_id=invalid-session-id");
    await expect(
      page.getByRole("heading", { name: "Payment confirmation unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to plans" }),
    ).toHaveAttribute("href", "/app/plans");
  });
});
