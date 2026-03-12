import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const guestFile = path.join(__dirname, ".clerk/guest.json");
const e2eTestUser = getE2ETestUser();

const protectedAppRoutes = [
  "/app",
  "/app/profile",
  "/app/plans",
  "/app/library",
] as const;

const protectedAdminRoutes = [
  "/admin",
  "/admin/users",
  "/admin/settings",
] as const;

const publicRoutes = [
  { route: "/", heading: "Chat, create, and get things done." },
  { route: "/about", heading: "About Droplet" },
  { route: "/plans", heading: /choose your plan/i },
  { route: "/faqs", heading: "Frequently Asked Questions" },
] as const;

function isClerkAuthRedirect(url: string) {
  return (
    /\/sign-in/.test(url) ||
    /clerk\.accounts\.dev\/v1\/client\/handshake/.test(url) ||
    /clerk\.accounts\.dev\/.*\/sign-in/.test(url)
  );
}

async function expectRedirectToSignIn(page: Page, route: string) {
  const response = await page.goto(route);

  expect(
    response,
    `Expected a main document response when navigating to ${route}.`,
  ).not.toBeNull();
  await expect
    .poll(() => isClerkAuthRedirect(page.url()), {
      message: `Expected ${route} to enter the Clerk sign-in flow. Current URL: ${page.url()}`,
    })
    .toBe(true);
}

async function expectPublicPageAccessible(
  page: Page,
  route: string,
  heading: RegExp | string,
) {
  const response = await page.goto(route);

  expect(
    response,
    `Expected a main document response when navigating to ${route}.`,
  ).not.toBeNull();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect.poll(() => isClerkAuthRedirect(page.url())).toBe(false);
}

test.describe("auth boundary enforcement", () => {
  test.use({ storageState: guestFile });

  test("redirects unauthenticated users from protected app routes to sign-in", async ({
    page,
  }) => {
    for (const route of protectedAppRoutes) {
      await test.step(`redirects ${route}`, async () => {
        await expectRedirectToSignIn(page, route);
      });
    }
  });

  test("redirects unauthenticated users from protected admin routes to sign-in", async ({
    page,
  }) => {
    for (const route of protectedAdminRoutes) {
      await test.step(`redirects ${route}`, async () => {
        await expectRedirectToSignIn(page, route);
      });
    }
  });

  test("keeps public pages accessible without authentication", async ({
    page,
  }) => {
    for (const { route, heading } of publicRoutes) {
      await test.step(`keeps ${route} public`, async () => {
        await expectPublicPageAccessible(page, route, heading);
      });
    }
  });
});

test.describe("non-admin boundary enforcement", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("blocks authenticated non-admin users from admin routes", async ({
    page,
  }) => {
    for (const route of protectedAdminRoutes) {
      await test.step(`blocks ${route}`, async () => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/403$/);
        await expect(
          page.getByRole("heading", { name: "Forbidden" }),
        ).toBeVisible();
      });
    }
  });
});
