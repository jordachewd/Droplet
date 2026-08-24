import type { NextRequest } from "next/server";
import type { BillingCycle, PlanData, PlanName } from "@/types/PlanData.d";
import type { PersonaId } from "@/types/PersonaData.d";
import type { TaskConversation } from "@/types/TaskData.d";
import type { TransactionType } from "@/types/TransactionData.d";
import type { UserData, UserRoles } from "@/types/UserData.d";
import type { ContentItem, Message, MessageRole } from "@/types";

type MockRequestOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  method?: string;
  url?: string;
};

type MockNextRequestOptions = MockRequestOptions & {
  formData?: FormData;
  nextUrl?: string;
};

type TestUserPlanOverrides = Omit<Partial<PlanData>, "trialUsage"> & {
  trialUsage?: Partial<NonNullable<PlanData["trialUsage"]>>;
};

type TestUserOverrides = Omit<Partial<UserData>, "plan"> & {
  plan?: TestUserPlanOverrides;
};

export type TestTransaction = {
  _id: string;
  stripeId: string;
  stripeInvoiceId?: string;
  userId: string;
  clerkId: string;
  createdAt: Date;
  expiresOn: Date;
  amount: number;
  plan: PlanName;
  billing: BillingCycle;
  type?: TransactionType;
};

export type TestClerkUser = {
  id: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
  primaryEmailAddressId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
};

const DEFAULT_PLAN_DATA: PlanData = {
  id: "0",
  name: "Lite",
  amount: 0,
  billing: "Monthly",
  startedOn: new Date(),
  expiresOn: new Date(Date.now() + 86_400_000),
  stripeId: undefined,
  imageGenerations: 0,
  audioGenerations: 0,
  usagePeriodStart: new Date(),
  trialUsage: {
    trialImageGenerations: 0,
    trialAudioGenerations: 0,
    trialUsagePeriodStart: new Date(),
  },
};

const DEFAULT_USER_DATA: UserData = {
  _id: "507f1f77bcf86cd799439011",
  clerkId: "user_123",
  username: "test-user",
  email: "test.user@example.com",
  role: "client",
  registerAt: new Date("2026-01-01T00:00:00.000Z"),
  firstName: "Test",
  lastName: "User",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  userimg: "https://example.com/avatar.png",
  suspended: false,
  dailyConversationsStarted: 0,
  dailyConversationWindowStart: null,
  plan: DEFAULT_PLAN_DATA,
  __v: 0,
};

const DEFAULT_TASK_DATA: TaskConversation = {
  _id: "507f1f77bcf86cd799439012",
  title: "Conversation",
  personaId: "strategist",
  messages: [
    {
      id: "msg_1",
      role: "user",
      whois: "user",
      content: [{ type: "text", text: "Earlier prompt" }],
    },
  ],
  usage: 1,
  promptCount: 1,
  mediaCount: 0,
  estimatedBytes: 512,
  status: "active",
  endedAt: undefined,
  endedReason: undefined,
  endAction: undefined,
  updatedAt: "2026-03-11T00:00:00.000Z",
};

const DEFAULT_TRANSACTION_DATA: TestTransaction = {
  _id: "507f1f77bcf86cd799439013",
  stripeId: "stripe_txn_123",
  userId: "507f1f77bcf86cd799439011",
  clerkId: "user_123",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresOn: new Date("2026-02-01T00:00:00.000Z"),
  amount: 0,
  plan: "Lite",
  billing: "Monthly",
  type: "one_time",
};

type TestMessageOverrides = Omit<Partial<Message>, "content" | "role"> & {
  content?: Message["content"];
  role?: MessageRole;
};

const DEFAULT_TEST_MESSAGE: Message = {
  id: "msg_default",
  role: "user",
  whois: "user",
  content: [{ type: "text", text: "Test message" }],
};

const DEFAULT_CLERK_USER: TestClerkUser = {
  id: "user_123",
  emailAddresses: [
    {
      id: "email_123",
      emailAddress: "test.user@example.com",
    },
  ],
  primaryEmailAddressId: "email_123",
  username: "test-user",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.png",
  createdAt: Date.parse("2026-01-01T00:00:00.000Z"),
};

function mergePlanData(overrides: TestUserPlanOverrides = {}): PlanData {
  const defaultTrialUsage = DEFAULT_PLAN_DATA.trialUsage ?? {};

  return {
    ...DEFAULT_PLAN_DATA,
    ...overrides,
    trialUsage: {
      ...defaultTrialUsage,
      ...(overrides.trialUsage ?? {}),
    },
  };
}

export function createTestUser(overrides: TestUserOverrides = {}): UserData {
  const { plan, ...rest } = overrides;

  return {
    ...DEFAULT_USER_DATA,
    ...rest,
    role: (rest.role ?? DEFAULT_USER_DATA.role) as UserRoles,
    plan: mergePlanData(plan),
  };
}

export function createTestTask(
  overrides: Partial<TaskConversation> = {},
): TaskConversation {
  return {
    ...DEFAULT_TASK_DATA,
    ...overrides,
    personaId: (overrides.personaId ??
      DEFAULT_TASK_DATA.personaId) as PersonaId,
    messages: overrides.messages ?? DEFAULT_TASK_DATA.messages,
  };
}

export function createTestMessage(
  overrides: TestMessageOverrides = {},
): Message {
  const resolvedContent =
    overrides.content ?? DEFAULT_TEST_MESSAGE.content ?? null;

  return {
    ...DEFAULT_TEST_MESSAGE,
    ...overrides,
    role: overrides.role ?? DEFAULT_TEST_MESSAGE.role,
    content: Array.isArray(resolvedContent)
      ? [...resolvedContent]
      : resolvedContent,
  };
}

export function createTextContentItem(text: string): ContentItem {
  return {
    type: "text",
    text,
  };
}

export function createTestTransaction(
  overrides: Partial<TestTransaction> = {},
): TestTransaction {
  return {
    ...DEFAULT_TRANSACTION_DATA,
    ...overrides,
  };
}

export function createTestClerkUser(
  overrides: Partial<TestClerkUser> = {},
): TestClerkUser {
  return {
    ...DEFAULT_CLERK_USER,
    ...overrides,
    emailAddresses:
      overrides.emailAddresses ?? DEFAULT_CLERK_USER.emailAddresses,
  };
}

export function buildMockRequest({
  payload,
  headers = {},
  method = "POST",
  url = "http://localhost:3000/api/openai",
}: MockRequestOptions = {}): Request {
  const hasJsonBody = payload !== undefined;

  return new Request(url, {
    method,
    headers: hasJsonBody
      ? { "Content-Type": "application/json", ...headers }
      : headers,
    body: hasJsonBody ? JSON.stringify(payload) : undefined,
  });
}

export function buildMockNextRequest({
  payload,
  formData,
  headers = {},
  method = "POST",
  url = "http://localhost:3000/api/openai",
  nextUrl,
}: MockNextRequestOptions = {}): NextRequest {
  const request = buildMockRequest({ payload, headers, method, url });

  if (!formData) {
    return request as NextRequest;
  }

  return {
    ...request,
    nextUrl: new URL(nextUrl ?? url),
    formData: async () => formData,
  } as unknown as NextRequest;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
