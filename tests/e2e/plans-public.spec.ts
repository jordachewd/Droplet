import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const guestFile = path.join(__dirname, ".clerk/guest.json");

test.use({ storageState: guestFile });

async function assertPlanCardStructure(page: Page) {
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

    const contentParagraphs = planCard.locator("p");
    expect(await contentParagraphs.count()).toBeGreaterThanOrEqual(3);
  }
}

test("shows the public plans page with structural pricing and FAQ content", async ({
  page,
}) => {
  await page.goto("/plans");

  await assertPlanCardStructure(page);
  await expect(page.getByLabel("Toggle yearly billing")).toHaveCount(0);
  await expect(page.getByText("Save 40%", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Yearly", { exact: true })).toHaveCount(0);

  const faqItems = page.locator(".Faqs details");
  expect(await faqItems.count()).toBeGreaterThanOrEqual(3);

  const firstFaq = faqItems.first();
  await firstFaq.locator("summary").click({ force: true });
  await expect(firstFaq).toHaveAttribute("open", "");

  const supportEmailLink = page.locator('a[href^="mailto:"]').first();
  await expect(supportEmailLink).toBeVisible();
  const supportEmailHref = await supportEmailLink.getAttribute("href");
  expect(supportEmailHref ?? "").toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i);
});
