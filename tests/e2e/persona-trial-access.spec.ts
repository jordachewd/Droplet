import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { getE2ETestUser, missingCredentialsError } from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

function createMockOpenAiRouteHandler() {
  return async (route: Route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      messages?: Array<{ whois?: string }>;
      personaId?: string;
    };

    const personaId = body.personaId ?? "strategist";
    const promptCount = (body.messages ?? []).filter(
      (message) => message.whois === "user",
    ).length;
    const promptLimit = personaId === "teacher" ? 5 : 10;

    if (promptCount > promptLimit) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          taskId: `e2e-${personaId}-conversation`,
          personaId,
          taskData: {
            whois: "assistant",
            role: "assistant",
            content: [
              {
                type: "text",
                text: "You've reached the trial limit for this persona conversation. Upgrade your plan to continue.",
              },
            ],
          },
          stopReason: "trial_limit_reached",
          endAction: "upgrade_plan",
          taskStatus: "ended",
          acceptedPrompt: false,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        taskId: `e2e-${personaId}-conversation`,
        personaId,
        taskData: {
          whois: "assistant",
          role: "assistant",
          content: [
            {
              type: "text",
              text: `Mock ${personaId} reply #${promptCount}`,
            },
          ],
        },
        acceptedPrompt: true,
      }),
    });
  };
}

async function sendPromptAndExpectReply({
  page,
  prompt,
  expectedReply,
}: {
  page: Page;
  prompt: string;
  expectedReply: RegExp | string;
}) {
  await page.locator("#chatInput").fill(prompt);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(expectedReply)).toBeVisible();
}

test.describe("persona trial access flow", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Runs once on Chromium to avoid repeated side effects.",
    );
  });

  test("Lite user can select a trial persona and start a conversation", async ({
    page,
  }) => {
    await page.route("**/api/openai", createMockOpenAiRouteHandler());

    try {
      await page.goto("/app?persona=teacher");
      await sendPromptAndExpectReply({
        page,
        prompt: "Trial persona first prompt",
        expectedReply: "Mock teacher reply #1",
      });
    } finally {
      await page.unroute("**/api/openai");
    }
  });

  test("Trial persona conversation stops at 5 prompts with upgrade CTA", async ({
    page,
  }) => {
    await page.route("**/api/openai", createMockOpenAiRouteHandler());

    try {
      await page.goto("/app?persona=teacher");

      for (let index = 1; index <= 5; index += 1) {
        await sendPromptAndExpectReply({
          page,
          prompt: `Trial prompt ${index}`,
          expectedReply: `Mock teacher reply #${index}`,
        });
      }

      await page.locator("#chatInput").fill("Trial prompt 6");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.locator(".ChatBodyEndNotice")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Upgrade your plan" }),
      ).toBeVisible();
    } finally {
      await page.unroute("**/api/openai");
    }
  });

  test("Full-access persona conversation uses the 10 prompt plan limit", async ({
    page,
  }) => {
    await page.route("**/api/openai", createMockOpenAiRouteHandler());

    try {
      await page.goto("/app?persona=strategist");

      for (let index = 1; index <= 10; index += 1) {
        await sendPromptAndExpectReply({
          page,
          prompt: `Full prompt ${index}`,
          expectedReply: `Mock strategist reply #${index}`,
        });
      }

      await expect(page.locator(".ChatBodyEndNotice")).toHaveCount(0);

      await page.locator("#chatInput").fill("Full prompt 11");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.locator(".ChatBodyEndNotice")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Upgrade your plan" }),
      ).toBeVisible();
    } finally {
      await page.unroute("**/api/openai");
    }
  });

  test("Persona picker shows Trial badge for limited personas", async ({
    page,
  }) => {
    await page.goto("/app/new");

    const teacherCard = page
      .locator(".PersonaCard")
      .filter({
        has: page.getByRole("heading", { name: "Teacher" }),
      })
      .first();

    await expect(
      teacherCard.locator("span").filter({ hasText: /^Trial$/ }).first(),
    ).toBeVisible();
  });
});
