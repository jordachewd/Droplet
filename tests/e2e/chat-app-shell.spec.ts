import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

type SidebarDestination = {
  expectedPath: RegExp;
  linkName: RegExp | string;
  verify: (page: Page) => Promise<void>;
};

const sidebarDestinations: SidebarDestination[] = [
  {
    linkName: /new (chat|conversation)/i,
    expectedPath: /\/app\/new$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Start a New Conversation" }),
      ).toBeVisible();
      await expect(page.locator(".PersonaCard")).toHaveCount(9);
    },
  },
  {
    linkName: "Library",
    expectedPath: /\/app\/library$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Conversation Library" }),
      ).toBeVisible();
    },
  },
  {
    linkName: "Personas",
    expectedPath: /\/app\/personas$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "AI Personas" }),
      ).toBeVisible();
    },
  },
  {
    linkName: "Profile",
    expectedPath: /\/app\/profile$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Profile" }),
      ).toBeVisible();
    },
  },
  {
    linkName: "Plans",
    expectedPath: /\/app\/plans$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: /upgrade your plan/i }),
      ).toBeVisible();
    },
  },
];

async function ensureSidebarOpen(page: Page) {
  const openSidebarButton = page.getByRole("button", { name: "Open sidebar" });
  const showMenuButton = page.getByRole("button", { name: "Show menu" });

  if (await openSidebarButton.isVisible()) {
    await openSidebarButton.click();
  }

  if (await showMenuButton.isVisible()) {
    await showMenuButton.click();
  }

  await expect(page.locator("aside#chat-sidebar")).toBeVisible();
}

async function ensureAuthenticatedAppPage(page: Page) {
  await page.goto("/app");

  if (/\/sign-in(?:\/|$|\?)/.test(page.url())) {
    const { identifier, password, username } = requireE2ETestUser();

    await page
      .getByRole("textbox", { name: "Email address or username" })
      .fill(username ?? identifier);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
  }

  await expect(page).toHaveURL(/\/app(?:\?.*)?$/);
}

test.describe("authenticated app shell and navigation", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });

  test("renders the app shell and routes from the sidebar", async ({
    page,
  }) => {
    await ensureAuthenticatedAppPage(page);
    await ensureSidebarOpen(page);

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByText("Persona Studio")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeVisible();

    for (const destination of sidebarDestinations) {
      await test.step(`navigates to ${destination.expectedPath}`, async () => {
        await ensureAuthenticatedAppPage(page);
        await ensureSidebarOpen(page);

        await page
          .locator("aside#chat-sidebar")
          .getByRole("link", { name: destination.linkName })
          .click();

        await expect(page).toHaveURL(destination.expectedPath);
        await destination.verify(page);
      });
    }
  });
});
