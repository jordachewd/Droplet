import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClerkClient } from "@clerk/backend";
import mongoose from "mongoose";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import { getEnvValue } from "./utils/dotenv-local";
import {
  getE2ETestUser,
  getE2EAdminUser,
  missingAdminCredentialsError,
  missingCredentialsError,
  requireE2EAdminUser,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const adminAuthFile = path.join(__dirname, ".clerk/admin.json");
const guestFile = path.join(__dirname, ".clerk/guest.json");
const clerkSetupError =
  "Set CLERK_SECRET_KEY or CLERK_TESTING_TOKEN in .env.local for Clerk Playwright auth helpers.";
const mongoSetupError =
  "Set MONGODB_URL and MONGODB_DB_NAME in .env.local for E2E database setup.";

const e2eTestUser = getE2ETestUser();
const e2eAdminUser = getE2EAdminUser();

async function ensureE2EAppUser(params: {
  clerkId: string;
  email?: string;
  firstName?: string | null;
  imageUrl?: string;
  lastName?: string | null;
  role: "client" | "admin";
  username?: string | null;
}): Promise<string> {
  const mongoUrl = process.env.MONGODB_URL ?? getEnvValue("MONGODB_URL");
  const mongoDbName =
    process.env.MONGODB_DB_NAME ?? getEnvValue("MONGODB_DB_NAME");

  if (!mongoUrl || !mongoDbName) {
    throw new Error(mongoSetupError);
  }

  const resolvedEmail = params.email;
  const resolvedUsername =
    params.username ??
    resolvedEmail?.split("@")[0] ??
    `e2e-${params.clerkId.slice(-8)}`;

  if (!resolvedEmail) {
    throw new Error("E2E test user requires an email address.");
  }

  const connection = await mongoose
    .createConnection(mongoUrl, {
      dbName: mongoDbName,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();

  try {
    const now = new Date();
    const usersCollection = connection.collection("users");
    const filter = {
      $or: [
        { clerkId: params.clerkId },
        { email: resolvedEmail },
        { username: resolvedUsername },
      ],
    };

    await usersCollection.updateOne(
      filter,
      {
        $set: {
          clerkId: params.clerkId,
          email: resolvedEmail,
          firstName: params.firstName ?? "E2E",
          lastName: params.lastName ?? "User",
          role: params.role,
          updatedAt: now,
          userimg: params.imageUrl,
          username: resolvedUsername,
        },
        $setOnInsert: {
          plan: {
            amount: 0,
            audioGenerations: 0,
            billing: "Monthly",
            expiresOn: new Date("9999-12-31T23:59:59.999Z"),
            id: 0,
            imageGenerations: 0,
            name: "Lite",
            startedOn: now,
            usagePeriodStart: now,
          },
          registerAt: now,
        },
      },
      { upsert: true },
    );

    const appUser = await usersCollection.findOne(
      { clerkId: params.clerkId },
      { projection: { _id: 1 } },
    );

    if (!appUser?._id) {
      throw new Error("Failed to provision the E2E app user.");
    }

    return appUser._id.toString();
  } finally {
    await connection.close();
  }
}

async function ensureE2EUserWithRole({
  credentials,
  role,
  firstName,
  lastName,
}: {
  credentials: ReturnType<typeof requireE2ETestUser>;
  role: "client" | "admin";
  firstName: string;
  lastName: string;
}): Promise<void> {
  const secretKey =
    process.env.CLERK_SECRET_KEY ?? getEnvValue("CLERK_SECRET_KEY");

  if (!secretKey) {
    throw new Error(clerkSetupError);
  }

  const { email, password, username } = credentials;
  const clerkClient = createClerkClient({ secretKey });
  const [emailMatches, usernameMatches] = await Promise.all([
    email ? clerkClient.users.getUserList({ emailAddress: [email] }) : null,
    username ? clerkClient.users.getUserList({ username: [username] }) : null,
  ]);

  const existingUser =
    emailMatches?.data[0] ??
    usernameMatches?.data[0] ??
    (emailMatches?.data ?? []).find((user) => user.username === username) ??
    null;

  const clerkUser = existingUser
    ? await clerkClient.users.updateUser(existingUser.id, {
        ...(username ? { username } : {}),
        firstName,
        lastName,
        password,
        skipLegalChecks: true,
        skipPasswordChecks: true,
      })
    : await clerkClient.users.createUser({
        ...(email ? { emailAddress: [email] } : {}),
        ...(username ? { username } : {}),
        firstName,
        lastName,
        password,
        skipLegalChecks: true,
        skipPasswordChecks: true,
      });

  const appUserId = await ensureE2EAppUser({
    clerkId: clerkUser.id,
    email: email ?? clerkUser.primaryEmailAddress?.emailAddress,
    firstName: clerkUser.firstName,
    imageUrl: clerkUser.imageUrl,
    lastName: clerkUser.lastName,
    role,
    username: username ?? clerkUser.username,
  });

  await clerkClient.users.updateUserMetadata(clerkUser.id, {
    publicMetadata: {
      role,
      userId: appUserId,
      ...(clerkUser.imageUrl ? { userImg: clerkUser.imageUrl } : {}),
    },
  });
}

setup.describe.configure({ mode: "serial" });
setup.skip(!e2eTestUser, missingCredentialsError);

setup("configure Clerk Playwright helpers", async () => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= getEnvValue(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  process.env.CLERK_SECRET_KEY ??= getEnvValue("CLERK_SECRET_KEY");
  process.env.CLERK_TESTING_TOKEN ??= getEnvValue("CLERK_TESTING_TOKEN");

  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_TESTING_TOKEN) {
    throw new Error(clerkSetupError);
  }

  await clerkSetup();
});

setup("persist guest storage state", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Chat, create, and get things done.",
    }),
  ).toBeVisible();

  mkdirSync(path.dirname(guestFile), { recursive: true });
  await page.context().storageState({ path: guestFile });
});

setup("authenticate E2E user and persist storage state", async ({ page }) => {
  const { identifier, password } = requireE2ETestUser();

  await ensureE2EUserWithRole({
    credentials: requireE2ETestUser(),
    role: "client",
    firstName: "E2E",
    lastName: "User",
  });

  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier,
      password,
    },
  });

  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});

setup(
  "authenticate E2E admin user and persist storage state",
  async ({ page }) => {
    setup.skip(!e2eAdminUser, missingAdminCredentialsError);

    const { identifier, password } = requireE2EAdminUser();

    await ensureE2EUserWithRole({
      credentials: requireE2EAdminUser(),
      role: "admin",
      firstName: "E2E",
      lastName: "Admin",
    });

    await setupClerkTestingToken({ page });
    await page.goto("/");
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier,
        password,
      },
    });

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeVisible();

    mkdirSync(path.dirname(adminAuthFile), { recursive: true });
    await page.context().storageState({ path: adminAuthFile });
  },
);
