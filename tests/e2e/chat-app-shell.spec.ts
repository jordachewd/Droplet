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
  const sidebar = page.locator("aside#chat-sidebar");
  const openSidebarButton = page.getByRole("button", { name: "Open sidebar" });

  if (await openSidebarButton.isVisible()) {
    await openSidebarButton.click();
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

async function clickSidebarLink(
  page: Page,
  linkName: SidebarDestination["linkName"],
) {
  const sidebar = page.locator("aside#chat-sidebar");
  const sidebarScrollContainer = sidebar.locator(".droplet-scrollbar").first();
  const sidebarLink = sidebar.getByRole("link", { name: linkName });

  await expect(sidebarLink).toBeVisible();
  await sidebarScrollContainer.evaluate((container) => {
    container.scrollTop = 0;
  });
  await sidebarLink.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await sidebarLink.click({ force: true });
}

async function resetDesktopSidebarPreference(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("droplet-sidebar-collapsed", "false");
    localStorage.setItem("cellesseon-sidebar-collapsed", "false");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
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
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Sidebar navigation smoke coverage is limited to Chromium for stability.",
  );
  test.use({ storageState: authFile });

  test("renders the app shell and routes from the sidebar", async ({
    page,
  }) => {
    await ensureAuthenticatedAppPage(page);
    await resetDesktopSidebarPreference(page);
    await ensureAuthenticatedAppPage(page);
    await ensureSidebarOpen(page);

    await expect(page.locator("main.ChatWrapper")).toBeVisible();
    await expect(page.getByText("Persona Studio")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeVisible();

    for (const destination of sidebarDestinations) {
      await test.step(`navigates to ${destination.expectedPath}`, async () => {
        await ensureAuthenticatedAppPage(page);
        await ensureNotSignedOut(page);
        await ensureSidebarOpen(page);

        await clickSidebarLink(page, destination.linkName);
        if (await ensureNotSignedOut(page)) {
          await clickSidebarLink(page, destination.linkName);
        }

        await expect(page).toHaveURL(destination.expectedPath);
        await destination.verify(page);
      });
    }
  });
});
