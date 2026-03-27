import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

test.describe("authenticated accessibility", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("app profile route has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/app/profile");
    await expect(page.getByRole("main")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const blockingViolations = results.violations.filter((violation) => {
      return violation.impact === "serious" || violation.impact === "critical";
    });

    expect(blockingViolations).toEqual([]);
  });
});
