import { mkdirSync } from "node:fs";
import path from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import { getEnvValue } from "./utils/dotenv-local";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const clerkSetupError =
  "Set CLERK_SECRET_KEY or CLERK_TESTING_TOKEN in .env.local for Clerk Playwright auth helpers.";

const e2eTestUser = getE2ETestUser();

setup.describe.configure({ mode: "serial" });
setup.skip(!e2eTestUser, missingCredentialsError);

setup("configure Clerk Playwright helpers", async () => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= getEnvValue(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  process.env.CLERK_SECRET_KEY ??= getEnvValue("CLERK_SECRET_KEY");
  process.env.CLERK_TESTING_TOKEN ??= getEnvValue("CLERK_TESTING_TOKEN");

  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_TESTING_TOKEN) {
    throw new Error(clerkSetupError);
  }

  await clerkSetup();
});

setup("authenticate E2E user and persist storage state", async ({ page }) => {
  const { identifier, password } = requireE2ETestUser();

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier,
      password,
    },
  });

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
