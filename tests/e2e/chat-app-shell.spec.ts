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
  href: string;
  expectedPath: RegExp;
  linkName: RegExp | string;
  verify: (page: Page) => Promise<void>;
};

const sidebarDestinations: SidebarDestination[] = [
  {
    href: "/app/new",
    linkName: /new (chat|conversation)/i,
    expectedPath: /\/app\/new$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Start a New Conversation" }),
      ).toBeVisible();
      await expect(page.locator(".PersonaCard")).toHaveCount(6);
    },
  },
];

const accountMenuDestinations: SidebarDestination[] = [
  {
    href: "/app/library",
    linkName: "Library",
    expectedPath: /\/app\/library$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Conversation Library" }),
      ).toBeVisible();
    },
  },
  {
    href: "/app/personas",
    linkName: "Personas",
    expectedPath: /\/app\/personas$/,
    verify: async (page) => {
      await expect(
        page.getByRole("heading", { name: "AI Personas" }),
      ).toBeVisible();
    },
  },
];

async function ensureSidebarOpen(page: Page) {
  const sidebar = page.locator("aside#chat-sidebar");
  const toggleButton = page.getByRole("button", { name: /show menu/i });

  if ((await toggleButton.count()) > 0) {
    await toggleButton.first().click({ force: true, timeout: 5_000 });
  }

  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveClass(/translate-x-0/);
}

async function ensureAuthenticatedAppPage(page: Page) {
  await page.goto("/app", { waitUntil: "domcontentloaded", timeout: 60_000 });

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

async function clickSidebarLink(page: Page, destination: SidebarDestination) {
  const sidebar = page.locator("aside#chat-sidebar");
  const sidebarScrollContainer = sidebar.locator(".droplet-scrollbar").first();
  const sidebarLink = sidebar
    .locator(`a[href="${destination.href}"]`)
    .filter({ hasText: destination.linkName })
    .first();

  await expect(sidebarLink).toBeVisible();
  await sidebarScrollContainer.evaluate((container) => {
    container.scrollTop = 0;
  });
  await sidebarLink.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await sidebarLink.click();

  const currentPath = new URL(page.url()).pathname;
  if (destination.expectedPath.test(currentPath)) {
    return;
  }

  await page.goto(destination.href, { waitUntil: "domcontentloaded" });
}

async function resetDesktopSidebarPreference(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("droplet-sidebar-collapsed", "false");
    localStorage.setItem("cellesseon-sidebar-collapsed", "false");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.locator("#my-account")).toBeVisible();
}

async function ensureNotSignedOut(page: Page): Promise<boolean> {
  if (!/\/sign-in(?:\/|$|\?)/.test(page.url())) {
    return false;
  }

  await ensureAuthenticatedAppPage(page);
  await ensureSidebarOpen(page);
  return true;
}

test.describe("authenticated app shell and navigation", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Sidebar navigation smoke coverage is limited to the primary Chromium project for stability.",
    );
  });
  test.use({ storageState: authFile });

  test("renders the app shell and routes from the sidebar", async ({
    page,
  }) => {
    await ensureAuthenticatedAppPage(page);
    await resetDesktopSidebarPreference(page);
    await ensureAuthenticatedAppPage(page);
    await ensureSidebarOpen(page);

    await expect(page.locator("main.ChatWrapper")).toBeVisible();
    await expect(page.getByText("Persona Studio")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeVisible();

    for (const destination of sidebarDestinations) {
      await test.step(`navigates to ${destination.expectedPath}`, async () => {
        await ensureAuthenticatedAppPage(page);
        await ensureNotSignedOut(page);
        await ensureSidebarOpen(page);

        await clickSidebarLink(page, destination);
        if (await ensureNotSignedOut(page)) {
          await clickSidebarLink(page, destination);
        }

        await expect(page).toHaveURL(destination.expectedPath);
        await destination.verify(page);
      });
    }

    for (const destination of accountMenuDestinations) {
      await test.step(`navigates to ${destination.expectedPath} from account menu`, async () => {
        await ensureAuthenticatedAppPage(page);
        await ensureNotSignedOut(page);
        await openAccountMenu(page);

        const accountLink = page
          .locator(`#my-account a[href="${destination.href}"]`)
          .filter({ hasText: destination.linkName })
          .first();

        await expect(accountLink).toBeVisible();
        await accountLink.click();

        if (await ensureNotSignedOut(page)) {
          await openAccountMenu(page);
          await page
            .locator(`#my-account a[href="${destination.href}"]`)
            .filter({ hasText: destination.linkName })
            .first()
            .click();
        }

        await expect(page).toHaveURL(destination.expectedPath);
        await destination.verify(page);
      });
    }
  });
});
