import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

test.describe("user profile and plans pages", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("renders profile details and plan catalog with upgrade CTAs", async ({
    page,
  }) => {
    const { email } = requireE2ETestUser();

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.locator(".ProfileHero")).toBeVisible();

    if (email) {
      await expect(page.getByText(email)).toBeVisible();
    }

    const currentPlanName = (
      (await page.locator(".PlanPromo h2 span").first().textContent()) ?? ""
    ).trim();
    if (currentPlanName) {
      expect(["Lite", "Pro", "Premium"]).toContain(currentPlanName);
    }

    await page.goto("/app/plans");
    await expect(
      page.getByRole("heading", { name: /upgrade your plan/i }),
    ).toBeVisible();
    const planCards = page.locator(".PlanCard");
    await expect(planCards).toHaveCount(3);

    const proCard = planCards.filter({
      has: page.getByRole("heading", { name: "Pro" }),
    });
    const premiumCard = planCards.filter({
      has: page.getByRole("heading", { name: "Premium" }),
    });

    await expect(proCard).toContainText("$19");
    await expect(premiumCard).toContainText("$39");

    const subscribeButtons = page.getByRole("button", { name: "Subscribe" });
    if ((await subscribeButtons.count()) > 0) {
      await expect(subscribeButtons.first()).toBeVisible();
    }

    const upgradeLink = page.getByRole("link", { name: "Upgrade now" });
    if ((await upgradeLink.count()) > 0) {
      await expect(upgradeLink.first()).toBeVisible();
    }
  });
});
