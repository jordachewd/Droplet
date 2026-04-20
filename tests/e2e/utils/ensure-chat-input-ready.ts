import { expect, type Page } from "@playwright/test";

const ONBOARDING_QUIZ_STEPS = 4;

export async function ensureChatInputReady(page: Page): Promise<void> {
  await page.goto("/app/new");
  await page.waitForURL(/\/app(\/onboarding)?(\?.*)?$/, {
    timeout: 15000,
  });

  const onboardingWizard = page.locator(".OnboardingWizard");
  if (await onboardingWizard.isVisible()) {
    for (let stepIndex = 0; stepIndex < ONBOARDING_QUIZ_STEPS; stepIndex += 1) {
      const firstOption = page
        .locator(".OnboardingQuizStep [role='radio']")
        .first();
      await expect(firstOption).toBeVisible({ timeout: 10000 });
      await firstOption.click();
      await page.waitForTimeout(350);
    }

    const firstPersonaCard = page.locator(".OnboardingPersonaCard").first();
    await expect(firstPersonaCard).toBeVisible({ timeout: 10000 });
    await firstPersonaCard.click();

    await page.getByRole("button", { name: "Continue" }).click();

    const startConversationButton = page.getByRole("button", {
      name: "Start your first conversation",
    });
    await expect(startConversationButton).toBeVisible({ timeout: 10000 });
    await startConversationButton.click();
  }

  const chatInputField = page.locator("#chatInput");
  await expect(chatInputField).toBeVisible({ timeout: 15000 });
  await expect(chatInputField).toBeEditable();
}
