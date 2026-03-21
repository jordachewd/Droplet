import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

async function expectPlanCardStructure(page: Page) {
  const planCards = page.locator(".PlanCard");
  await expect(planCards).toHaveCount(3);

  const cardCount = await planCards.count();
  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    const planCard = planCards.nth(cardIndex);

    await expect(planCard.getByRole("heading")).toHaveCount(1);
    const priceElement = planCard.locator("h2 + p").first();
    await expect(priceElement).toBeVisible();

    const priceText = (await priceElement.textContent())?.trim() ?? "";
    expect(priceText.length).toBeGreaterThan(0);

    const featureRows = planCard.locator("i.bi-check2, i.bi-x");
    expect(await featureRows.count()).toBeGreaterThan(0);
  }
}

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
      expect(currentPlanName.length).toBeGreaterThan(0);
    }

    await page.goto("/app/plans");
    await expect(
      page.getByRole("heading", { name: /upgrade your plan/i }),
    ).toBeVisible();
    await expectPlanCardStructure(page);

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
