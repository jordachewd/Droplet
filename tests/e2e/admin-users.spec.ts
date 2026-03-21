import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";
import { withMongoConnection } from "./utils/mongo";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();

interface SeededAdminUserFixture {
  clerkId: string;
  email: string;
  username: string;
}

function normalizeSeedKey(seedKey: string): string {
  return seedKey
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(-16);
}

async function seedAdminUserFixture(
  seedKey: string,
): Promise<SeededAdminUserFixture> {
  const normalizedSeedKey = normalizeSeedKey(seedKey);
  const username = `e2e-admin-user-${normalizedSeedKey}`;
  const email = `${username}@example.com`;
  const clerkId = `e2e_admin_${normalizedSeedKey}`;
  const now = new Date();

  await withMongoConnection(async (connection) => {
    const usersCollection = connection.collection("users");
    const tasksCollection = connection.collection("tasks");

    await usersCollection.insertOne({
      clerkId,
      username,
      email,
      role: "client",
      suspended: false,
      registerAt: now,
      firstName: "Admin",
      lastName: "Behavioral",
      updatedAt: now,
      dailyConversationsStarted: 4,
      dailyConversationWindowStart: now,
      plan: {
        id: 1,
        name: "Pro",
        amount: 19,
        billing: "Monthly",
        startedOn: now,
        expiresOn: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        stripeId: `stripe_${normalizedSeedKey}`,
        imageGenerations: 2,
        audioGenerations: 1,
        videoGenerations: 0,
        usagePeriodStart: now,
        trialUsage: {
          trialImageGenerations: 0,
          trialAudioGenerations: 0,
          trialVideoGenerations: 0,
          trialUsagePeriodStart: now,
        },
      },
    });

    await tasksCollection.insertOne({
      userId: clerkId,
      title: `E2E Admin Usage ${normalizedSeedKey}`,
      personaId: "strategist",
      usage: 0,
      promptCount: 6,
      mediaCount: 0,
      estimatedBytes: 1024,
      status: "active",
      messages: [
        {
          whois: "user",
          role: "user",
          content: [{ type: "text", text: "Usage seed prompt" }],
        },
        {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: "Usage seed reply" }],
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  });

  return { clerkId, email, username };
}

async function cleanupAdminUserFixture(
  fixture: SeededAdminUserFixture | null,
): Promise<void> {
  if (!fixture) {
    return;
  }

  await withMongoConnection(async (connection) => {
    await connection
      .collection("tasks")
      .deleteMany({ userId: fixture.clerkId });
    await connection
      .collection("usageevents")
      .deleteMany({ userId: fixture.clerkId });
    await connection
      .collection("transactions")
      .deleteMany({ clerkId: fixture.clerkId });
    await connection
      .collection("users")
      .deleteOne({ clerkId: fixture.clerkId });
  });
}

test.describe("admin dashboard and user management", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.use({ storageState: adminAuthFile });

  let seededUser: SeededAdminUserFixture | null = null;

  test.beforeEach(async ({}, testInfo) => {
    seededUser = await seedAdminUserFixture(
      `${Date.now()}-${testInfo.project.name}-${testInfo.title}`,
    );
  });

  test.afterEach(async () => {
    await cleanupAdminUserFixture(seededUser);
    seededUser = null;
  });

  test("searches for a seeded user and shows the matching account row", async ({
    page,
  }) => {
    if (!seededUser) {
      throw new Error("Missing seeded admin user fixture.");
    }

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeVisible();
    await expect(page.locator(".AdminDashboardPage a")).toHaveCount(7);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    await page.getByLabel("Search users").fill(seededUser.username);
    await page.getByRole("button", { name: "Search" }).click();

    const seededUserLink = page.getByRole("link", {
      name: seededUser.username,
    });
    await expect(seededUserLink).toBeVisible();
    await expect(page.locator(".AdminUsersTable")).toContainText(
      seededUser.email,
    );
  });

  test("opens seeded user detail and verifies usage data is rendered", async ({
    page,
  }) => {
    if (!seededUser) {
      throw new Error("Missing seeded admin user fixture.");
    }

    await page.goto(
      `/admin/users?q=${encodeURIComponent(seededUser.username)}`,
    );

    const seededUserLink = page.getByRole("link", {
      name: seededUser.username,
    });
    await expect(seededUserLink).toBeVisible();
    await seededUserLink.click();

    await expect(page).toHaveURL(/\/admin\/users\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "Usage Snapshot" }),
    ).toBeVisible();

    const dailyConversationsCard = page
      .locator(".admin-surface-subtle")
      .filter({ hasText: "Daily Conversations" });
    await expect(dailyConversationsCard).toContainText("4 /");

    const promptsCard = page
      .locator(".admin-surface-subtle")
      .filter({ hasText: "Prompts / Conversation (Peak)" });
    await expect(promptsCard).toContainText("6 /");

    const imageUsageCard = page
      .locator(".admin-surface-subtle")
      .filter({ hasText: "Image Generations" });
    await expect(imageUsageCard).toContainText("2 /");

    await expect(
      page.getByRole("button", { name: /Suspend User|Reinstate User/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove User" }),
    ).toBeVisible();
  });
});
