import path from "node:path";
import mongoose from "mongoose";
import { expect, test } from "@playwright/test";
import { getEnvValue } from "./utils/dotenv-local";
import {
  getE2ETestUser,
  missingCredentialsError,
  requireE2ETestUser,
} from "./utils/e2e-test-user";

const authFile = path.join(__dirname, ".clerk/user.json");
const e2eTestUser = getE2ETestUser();

async function withMongoConnection<T>(
  run: (connection: mongoose.Connection) => Promise<T>,
): Promise<T> {
  const mongoUrl = process.env.MONGODB_URL ?? getEnvValue("MONGODB_URL");
  const mongoDbName =
    process.env.MONGODB_DB_NAME ?? getEnvValue("MONGODB_DB_NAME");

  if (!mongoUrl || !mongoDbName) {
    throw new Error(
      "Set MONGODB_URL and MONGODB_DB_NAME in .env.local for E2E database setup.",
    );
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
    return await run(connection);
  } finally {
    await connection.close();
  }
}

async function resolveClientClerkId(): Promise<string> {
  const { email, username } = requireE2ETestUser();

  return withMongoConnection(async (connection) => {
    const usersCollection = connection.collection("users");
    const user = await usersCollection.findOne(
      {
        $or: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : []),
        ],
      },
      { projection: { clerkId: 1 } },
    );

    if (!user?.clerkId || typeof user.clerkId !== "string") {
      throw new Error("Unable to resolve E2E client clerkId for task seeding.");
    }

    return user.clerkId;
  });
}

async function seedConversation(params: {
  clerkId: string;
  title: string;
  prompt: string;
  assistantReply: string;
}): Promise<string> {
  return withMongoConnection(async (connection) => {
    const tasksCollection = connection.collection("tasks");
    const now = new Date();
    const insertedTaskId = new mongoose.Types.ObjectId();

    await tasksCollection.insertOne({
      _id: insertedTaskId,
      userId: params.clerkId,
      title: params.title,
      personaId: "strategist",
      usage: 0,
      promptCount: 1,
      mediaCount: 0,
      estimatedBytes: 2048,
      status: "active",
      messages: [
        {
          whois: "user",
          role: "user",
          content: [{ type: "text", text: params.prompt }],
        },
        {
          whois: "assistant",
          role: "assistant",
          content: [{ type: "text", text: params.assistantReply }],
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return insertedTaskId.toString();
  });
}

async function deleteConversation(taskId: string): Promise<void> {
  await withMongoConnection(async (connection) => {
    await connection.collection("tasks").deleteOne({
      _id: new mongoose.Types.ObjectId(taskId),
    });
  });
}

test.describe("conversation lifecycle", () => {
  test.skip(!e2eTestUser, missingCredentialsError);
  test.use({ storageState: authFile });
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Runs once on Chromium to avoid repeated AI/DB side effects across all browser projects.",
  );

  test("creates, lists, resumes, and deletes a conversation", async ({
    page,
  }) => {
    const prompt = "Please summarize this lifecycle check.";
    const assistantReply = "Lifecycle check complete.";
    const conversationTitle = `E2E lifecycle ${Date.now()}`;
    const clerkId = await resolveClientClerkId();
    const seededTaskId = await seedConversation({
      clerkId,
      title: conversationTitle,
      prompt,
      assistantReply,
    });

    try {
      await page.route("**/api/openai", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            taskId: seededTaskId,
            personaId: "strategist",
            taskData: {
              whois: "assistant",
              role: "assistant",
              content: [{ type: "text", text: assistantReply }],
            },
            acceptedPrompt: true,
          }),
        });
      });

      await page.goto("/app/new");
      await expect(
        page.getByRole("heading", { name: "Start a New Conversation" }),
      ).toBeVisible();
      await expect(page.locator(".PersonaCard")).toHaveCount(10);

      await page
        .locator(".PersonaCard")
        .filter({
          has: page.getByRole("heading", { name: "Strategist" }),
        })
        .first()
        .click();

      await expect(page).toHaveURL(/\/app\?persona=strategist$/);

      const promptInput = page.locator("#chatInput");
      await promptInput.fill(prompt);
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText(assistantReply)).toBeVisible();

      await page.goto("/app/library");
      await expect(
        page.getByRole("heading", { name: "Conversation Library" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: conversationTitle }),
      ).toBeVisible();

      await page.getByRole("heading", { name: conversationTitle }).click();
      await expect(page).toHaveURL(new RegExp(`/app/c/${seededTaskId}$`));
      await expect(page.getByText(prompt)).toBeVisible();

      await page.goto("/app/library");
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .locator("#LibraryPage")
        .getByRole("button", { name: `Delete ${conversationTitle}` })
        .click();

      await expect(
        page.getByRole("heading", { name: conversationTitle }),
      ).toHaveCount(0);
    } finally {
      await page.unroute("**/api/openai");
      await deleteConversation(seededTaskId);
    }
  });
});
