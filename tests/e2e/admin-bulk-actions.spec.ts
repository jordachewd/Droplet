import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  getE2EAdminUser,
  missingAdminCredentialsError,
} from "./utils/e2e-test-user";
import { withMongoConnection } from "./utils/mongo";

const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const e2eAdminUser = getE2EAdminUser();

interface SeededBulkUser {
  clerkId: string;
  email: string;
  userId: string;
  username: string;
}

interface SeededBulkUsersResult {
  searchToken: string;
  users: SeededBulkUser[];
}

function normalizeSeedKey(seedKey: string): string {
  return seedKey
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(-16);
}

function buildUserPlan(now: Date, seed: string) {
  return {
    id: 0,
    name: "Lite",
    amount: 0,
    billing: "Monthly",
    startedOn: now,
    expiresOn: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    stripeId: `stripe_${seed}`,
    imageGenerations: 0,
    audioGenerations: 0,
    videoGenerations: 0,
    usagePeriodStart: now,
    trialUsage: {
      trialImageGenerations: 0,
      trialAudioGenerations: 0,
      trialVideoGenerations: 0,
      trialUsagePeriodStart: now,
    },
  };
}

async function seedBulkUsers(params: {
  count: number;
  seedKey: string;
}): Promise<SeededBulkUsersResult> {
  const normalizedSeedKey = normalizeSeedKey(params.seedKey);
  const searchToken = `e2e-bulk-${normalizedSeedKey}`;

  return withMongoConnection(async (connection) => {
    const usersCollection = connection.collection("users");
    const now = Date.now();
    const users: SeededBulkUser[] = [];

    for (let index = 0; index < params.count; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const username = `${searchToken}-${suffix}`;
      const email = `${username}@example.com`;
      const clerkId = `${searchToken}_clerk_${suffix}`;
      const createdAt = new Date(now - index * 1000);
      const insertResult = await usersCollection.insertOne({
        clerkId,
        username,
        email,
        role: "client",
        suspended: false,
        registerAt: createdAt,
        firstName: "Bulk",
        lastName: "Fixture",
        updatedAt: createdAt,
        dailyConversationsStarted: 0,
        dailyConversationWindowStart: createdAt,
        plan: buildUserPlan(createdAt, `${normalizedSeedKey}_${suffix}`),
      });

      users.push({
        clerkId,
        email,
        userId: insertResult.insertedId.toString(),
        username,
      });
    }

    return { searchToken, users };
  });
}

async function seedTransactionFixture(seedKey: string): Promise<{
  transactionId: string;
  user: SeededBulkUser;
}> {
  const normalizedSeedKey = normalizeSeedKey(seedKey);

  return withMongoConnection(async (connection) => {
    const usersCollection = connection.collection("users");
    const transactionsCollection = connection.collection("transactions");
    const now = new Date();
    const username = `e2e-bulk-txn-${normalizedSeedKey}`;
    const email = `${username}@example.com`;
    const clerkId = `e2e_bulk_txn_${normalizedSeedKey}`;
    const userInsert = await usersCollection.insertOne({
      clerkId,
      username,
      email,
      role: "client",
      suspended: false,
      registerAt: now,
      firstName: "Bulk",
      lastName: "Transaction",
      updatedAt: now,
      dailyConversationsStarted: 0,
      dailyConversationWindowStart: now,
      plan: {
        ...buildUserPlan(now, normalizedSeedKey),
        id: 1,
        name: "Pro",
        amount: 19,
      },
    });

    const transactionInsert = await transactionsCollection.insertOne({
      userId: userInsert.insertedId,
      clerkId,
      stripeId: `cs_e2e_bulk_${normalizedSeedKey}`,
      createdAt: now,
      expiresOn: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      amount: 19,
      plan: "Pro",
      billing: "Monthly",
    });

    return {
      transactionId: transactionInsert.insertedId.toString(),
      user: {
        clerkId,
        email,
        userId: userInsert.insertedId.toString(),
        username,
      },
    };
  });
}

async function cleanupSeededUsers(clerkIds: string[]): Promise<void> {
  if (clerkIds.length === 0) {
    return;
  }

  const uniqueClerkIds = [...new Set(clerkIds)];

  await withMongoConnection(async (connection) => {
    await connection.collection("tasks").deleteMany({
      userId: { $in: uniqueClerkIds },
    });
    await connection.collection("usageevents").deleteMany({
      userId: { $in: uniqueClerkIds },
    });
    await connection.collection("transactions").deleteMany({
      clerkId: { $in: uniqueClerkIds },
    });
    await connection.collection("users").deleteMany({
      clerkId: { $in: uniqueClerkIds },
    });
  });
}

test.describe("admin bulk actions and pagination selection reset", () => {
  test.skip(!e2eAdminUser, missingAdminCredentialsError);
  test.use({ storageState: adminAuthFile });

  let seededClerkIds: string[] = [];

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Admin bulk action flows are currently stabilized on Chromium only.",
    );
  });

  test.afterEach(async () => {
    await cleanupSeededUsers(seededClerkIds);
    seededClerkIds = [];
  });

  test("suspends selected users after confirmation", async ({
    page,
  }, testInfo) => {
    const seededUsers = await seedBulkUsers({
      count: 1,
      seedKey: `${Date.now()}-${testInfo.title}-suspend`,
    });
    seededClerkIds.push(...seededUsers.users.map((user) => user.clerkId));
    const targetUser = seededUsers.users[0];

    await page.goto(
      `/admin/users?q=${encodeURIComponent(seededUsers.searchToken)}`,
    );

    await expect(
      page.getByRole("link", { name: targetUser.username }),
    ).toBeVisible();

    await page.getByLabel(`Select ${targetUser.username}`).check();
    await page.getByRole("button", { name: "Bulk Suspend" }).click();

    const confirmationDialog = page.locator(".ConfirmationModal");
    await expect(confirmationDialog).toBeVisible();
    await expect(confirmationDialog).toContainText(
      "Are you sure you want to suspend all selected users?",
    );
    await confirmationDialog.getByRole("button", { name: "Confirm" }).click();

    const userRow = page
      .locator(".AdminUsersTable .divide-y > div")
      .filter({ has: page.getByRole("link", { name: targetUser.username }) });
    await expect(userRow).toContainText("Suspended");
  });

  test("deletes selected transactions after confirmation", async ({
    page,
  }, testInfo) => {
    const seededTransaction = await seedTransactionFixture(
      `${Date.now()}-${testInfo.title}-transaction`,
    );
    seededClerkIds.push(seededTransaction.user.clerkId);

    await page.goto("/admin/transactions");

    await expect(page.locator(".AdminTransactionsTable")).toContainText(
      seededTransaction.user.email,
    );

    await page
      .getByLabel(`Select transaction ${seededTransaction.transactionId}`)
      .check();
    await page.getByRole("button", { name: "Bulk Remove" }).click();

    const confirmationDialog = page.locator(".ConfirmationModal");
    await expect(confirmationDialog).toBeVisible();
    await expect(confirmationDialog).toContainText(
      "Are you sure you want to remove all selected transactions?",
    );
    await confirmationDialog.getByRole("button", { name: "Confirm" }).click();

    await expect(page.locator(".AdminTransactionsTable")).not.toContainText(
      seededTransaction.user.email,
    );
  });

  test("clears selection when moving to users page 2", async ({
    page,
  }, testInfo) => {
    const seededUsers = await seedBulkUsers({
      count: 26,
      seedKey: `${Date.now()}-${testInfo.title}-pagination`,
    });
    seededClerkIds.push(...seededUsers.users.map((user) => user.clerkId));
    const firstPageUser = seededUsers.users[0];

    await page.goto(
      `/admin/users?q=${encodeURIComponent(seededUsers.searchToken)}`,
    );
    await expect(
      page.getByRole("link", { name: firstPageUser.username }),
    ).toBeVisible();

    await page.getByLabel(`Select ${firstPageUser.username}`).check();
    await expect(page.getByText("1 selected")).toBeVisible();

    await page.getByRole("link", { name: "Next" }).click();

    await expect(page).toHaveURL(/\/admin\/users\?page=2&q=/);
    await expect(page.getByLabel("Select all users")).not.toBeChecked();
    await expect(page.getByText("1 selected")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Bulk Suspend" }),
    ).toHaveCount(0);
  });
});
