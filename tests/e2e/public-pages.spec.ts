import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const guestFile = path.join(__dirname, ".clerk/guest.json");

test.describe.configure({ mode: "serial" });

async function gotoAndExpectPublicRoute(page: Page, route: string) {
  const response = await page.goto(route);

  expect(
    response,
    `Expected a main document response for ${route}.`,
  ).not.toBeNull();
}

async function expectVisiblePageHeading(page: Page) {
  await expect(page.getByRole("heading").first()).toBeVisible();
}

function isClerkAuthRedirect(url: string) {
  return (
    /\/sign-in/.test(url) ||
    /clerk\.accounts\.dev\/v1\/client\/handshake/.test(url) ||
    /clerk\.accounts\.dev\/.*\/sign-in/.test(url)
  );
}

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

test.use({ storageState: guestFile });

test("renders the landing page hero and public CTAs", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/");

  await expect(page).toHaveTitle(/Droplet/i);
  await expectVisiblePageHeading(page);
  await expect(page.locator('a[href="/app/new"]').first()).toBeVisible();
  await expect(page.locator('a[href="/sign-up"]').first()).toBeVisible();
  await expect(page.locator(".Workflow")).toBeVisible();
  await expect(page.locator(".PersonaSpotlight")).toBeVisible();
});

test("toggles dark mode and keeps it after reload", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/");

  const darkModeButton = page.getByRole("switch", {
    name: "Toggle theme mode",
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
  await gotoAndExpectPublicRoute(page, "/this-route-does-not-exist");

  await expect(page).toHaveURL(/this-route-does-not-exist/);
  await expect(page.getByText(/ERROR:\s*404/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page Not Found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
});

test("renders the about page with multiple content sections", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/about");

  await expectVisiblePageHeading(page);

  const sectionHeadings = page.locator(
    "#AboutPageWrapper h2, #AboutPageWrapper h3",
  );
  expect(await sectionHeadings.count()).toBeGreaterThanOrEqual(3);
  const contentParagraphs = page.locator("#AboutPageWrapper p");
  expect(await contentParagraphs.count()).toBeGreaterThanOrEqual(6);
});

test("renders the public plans page with structural plan-card checks", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/plans");

  await expectVisiblePageHeading(page);
  await expectPlanCardStructure(page);
});

test("redirects unauthenticated users away from checkout-success into sign-in", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/checkout-success");

  await expect
    .poll(() => isClerkAuthRedirect(page.url()), {
      message: `Expected /checkout-success to enter Clerk sign-in flow. Current URL: ${page.url()}`,
    })
    .toBe(true);
});

test("renders the FAQ section on the public plans page with multiple accordion items", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/plans");

  await expect(page.locator(".Faqs")).toBeVisible();

  const faqItems = page.locator(".Faqs details");
  expect(await faqItems.count()).toBeGreaterThanOrEqual(3);

  const firstFaq = faqItems.first();
  await firstFaq.locator("summary").click({ force: true });
  await expect(firstFaq).toHaveAttribute("open", "");
});

test("renders the personas page with persona cards", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/personas");

  await expectVisiblePageHeading(page);
  await expect(page.locator(".PersonaCard")).toHaveCount(6);
});

test("renders the privacy policy page with legal content", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/privacy");

  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What Droplet collects" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This policy is provided for informational purposes. Legal review recommended before production publication.",
    ),
  ).toBeVisible();
});

test("renders the cookie policy page with legal content", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/cookies");

  await expect(
    page.getByRole("heading", { name: "Cookie Policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Essential authentication cookies" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Managing browser preferences" }),
  ).toBeVisible();
});

test("renders the terms page with legal content", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/terms");

  await expectVisiblePageHeading(page);
  const termsSectionHeadings = page.locator("main h2, section h2");
  expect(await termsSectionHeadings.count()).toBeGreaterThanOrEqual(2);
});

test("footer legal links navigate to the correct public routes", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/");

  await page.locator(".Footer").locator('a[href="/privacy"]').click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expectVisiblePageHeading(page);

  await gotoAndExpectPublicRoute(page, "/");

  await page
    .locator(".Footer")
    .locator('a[href="/terms"]')
    .click({ force: true });
  await expect(page).toHaveURL(/\/terms$/);
  await expectVisiblePageHeading(page);
});

test("desktop header links navigate across the public pages", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/");

  const viewportWidth = await page.evaluate(() => window.innerWidth);
  test.skip(
    viewportWidth < 768,
    "Header navigation links are hidden on smaller viewports.",
  );
  const desktopMainNav = page
    .locator(".Header nav[aria-label='Main navigation']")
    .first();
  await expect(desktopMainNav).toBeVisible();

  await desktopMainNav.locator('a[href="/about"]').first().click();
  await expect(page).toHaveURL(/\/about$/);
  await expectVisiblePageHeading(page);

  await desktopMainNav.locator('a[href="/personas"]').first().click();
  await expect(page).toHaveURL(/\/personas$/);
  await expectVisiblePageHeading(page);

  await desktopMainNav.locator('a[href="/plans"]').first().click();
  await expect(page).toHaveURL(/\/plans$/);
  await expectVisiblePageHeading(page);
});
