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

test.use({ storageState: guestFile });

test("renders the landing page hero and public CTAs", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/");

  await expect(
    page.getByRole("heading", {
      name: "Chat, create, and get things done.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try it for free" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
});

test("renders the about page with multiple content sections", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/about");

  await expect(
    page.getByRole("heading", { name: "About Droplet" }),
  ).toBeVisible();

  const aboutSections = page.locator(".AboutPage article");
  expect(await aboutSections.count()).toBeGreaterThanOrEqual(3);

  await expect(
    page.getByRole("heading", {
      name: "Droplet is an AI workspace shaped by specialist personas.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Pick a persona, start a conversation, and keep momentum in one place.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The full catalog is available across all plans.",
    }),
  ).toBeVisible();
});

test("renders the public plans page with all plan cards and approved prices", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/plans");

  await expect(
    page.getByRole("heading", { name: /choose your plan/i }),
  ).toBeVisible();

  const planCards = page.locator(".PlanCard");
  await expect(planCards).toHaveCount(3);

  const liteCard = planCards.filter({
    has: page.getByRole("heading", { name: "Lite" }),
  });
  const proCard = planCards.filter({
    has: page.getByRole("heading", { name: "Pro" }),
  });
  const premiumCard = planCards.filter({
    has: page.getByRole("heading", { name: "Premium" }),
  });

  await expect(liteCard).toContainText("Free");
  await expect(proCard).toContainText("$19");
  await expect(premiumCard).toContainText("$39");
});

test("renders the public FAQs page with multiple accordion items", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/faqs");

  await expect(
    page.getByRole("heading", { name: "Frequently Asked Questions" }),
  ).toBeVisible();

  const faqItems = page.locator("summary");
  expect(await faqItems.count()).toBeGreaterThanOrEqual(3);

  await expect(
    faqItems.filter({
      hasText:
        "How does Droplet ensure the security of my personal information?",
    }),
  ).toHaveCount(1);
  await expect(
    faqItems.filter({
      hasText: "Who should I reach out to for assistance or inquiries?",
    }),
  ).toHaveCount(1);
  await expect(
    faqItems.filter({ hasText: "Does Droplet have a free plan?" }),
  ).toHaveCount(1);
});

test("renders the personas page with persona cards", async ({ page }) => {
  await gotoAndExpectPublicRoute(page, "/personas");

  await expect(
    page.getByRole("heading", { name: "Choose Your AI Persona" }),
  ).toBeVisible();
  await expect(page.locator(".PersonaCard")).toHaveCount(9);
  await expect(page.getByRole("heading", { name: "Strategist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teacher" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Creator" })).toBeVisible();
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

  await expect(
    page.getByRole("heading", { name: "Terms & Conditions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment terms" }),
  ).toBeVisible();
  await expect(page.getByText("$19")).toBeVisible();
  await expect(page.getByText("$39")).toBeVisible();
});

test("footer legal links navigate to the correct public routes", async ({
  page,
}) => {
  await gotoAndExpectPublicRoute(page, "/");

  await page
    .locator(".Footer")
    .getByRole("link", { name: "Privacy & Cookie Policy", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();

  await page
    .locator(".Footer")
    .getByRole("link", { name: "Terms & Conditions", exact: true })
    .click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole("heading", { name: "Terms & Conditions" }),
  ).toBeVisible();
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

  await page
    .locator(".Header")
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "About Droplet" }),
  ).toBeVisible();

  await page
    .locator(".Header")
    .getByRole("link", { name: "Personas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(
    page.getByRole("heading", { name: "Choose Your AI Persona" }),
  ).toBeVisible();

  await page
    .locator(".Header")
    .getByRole("link", { name: "Plans", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plans$/);
  await expect(
    page.getByRole("heading", { name: /choose your plan/i }),
  ).toBeVisible();

  await page
    .locator(".Header")
    .getByRole("link", { name: "FAQs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/faqs$/);
  await expect(
    page.getByRole("heading", { name: "Frequently Asked Questions" }),
  ).toBeVisible();
});
