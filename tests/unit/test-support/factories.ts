type MockRequestOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  method?: string;
  url?: string;
};

type TestUserPlan = {
  name: string;
  expiresOn: Date;
  imageGenerations: number;
  audioGenerations: number;
  videoGenerations: number;
  usagePeriodStart: Date;
  trialUsage: {
    trialImageGenerations: number;
    trialAudioGenerations: number;
    trialVideoGenerations: number;
    trialUsagePeriodStart: Date;
  };
};

type TestUser = {
  clerkId: string;
  role: string;
  plan: TestUserPlan;
};

type TestTask = {
  _id: string;
  title: string;
  personaId: string;
  messages: Array<{
    role: string;
    whois: string;
    content: unknown;
  }>;
  usage: number;
  promptCount: number;
  mediaCount: number;
  estimatedBytes: number;
  status: string;
  updatedAt: string;
  endedReason?: string;
  endAction?: string;
};

type TestTransaction = {
  _id: string;
  userId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  stripeId: string;
  createdAt: Date;
};

type TestEntitlements = {
  planName: string;
  supportsImageGeneration: boolean;
  supportsAudioGeneration: boolean;
  supportsVideoGeneration: boolean;
  imageLimitReached: boolean;
  audioLimitReached: boolean;
  videoLimitReached: boolean;
  allowedPersonaIds: string[];
};

export function createTestUser(
  overrides: Omit<Partial<TestUser>, "plan"> & {
    plan?: Partial<TestUserPlan>;
  } = {},
): TestUser {
  const defaultPlan: TestUserPlan = {
    name: "Lite",
    expiresOn: new Date(Date.now() + 86_400_000),
    imageGenerations: 0,
    audioGenerations: 0,
    videoGenerations: 0,
    usagePeriodStart: new Date(),
    trialUsage: {
      trialImageGenerations: 0,
      trialAudioGenerations: 0,
      trialVideoGenerations: 0,
      trialUsagePeriodStart: new Date(),
    },
  };

  const { plan, ...rest } = overrides;

  return {
    clerkId: "user_123",
    role: "client",
    plan: {
      ...defaultPlan,
      ...plan,
      trialUsage: {
        ...defaultPlan.trialUsage,
        ...(plan?.trialUsage ?? {}),
      },
    },
    ...rest,
  };
}

export function createTestTask(overrides: Partial<TestTask> = {}): TestTask {
  return {
    _id: "507f1f77bcf86cd799439011",
    title: "Conversation",
    personaId: "strategist",
    messages: [
      {
        role: "user",
        whois: "user",
        content: [{ type: "text", text: "Earlier prompt" }],
      },
    ],
    usage: 3,
    promptCount: 1,
    mediaCount: 0,
    estimatedBytes: 512,
    status: "active",
    updatedAt: "2026-03-11T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestTransaction(
  overrides: Partial<TestTransaction> = {},
): TestTransaction {
  return {
    _id: "txn_507f1f77bcf86cd799439011",
    userId: "user_123",
    planName: "Pro",
    amount: 1900,
    currency: "USD",
    status: "completed",
    stripeId: "pi_test_123",
    createdAt: new Date("2026-03-11T00:00:00.000Z"),
    ...overrides,
  };
}

export function createTestEntitlements(
  overrides: Partial<TestEntitlements> = {},
): TestEntitlements {
  return {
    planName: "Lite",
    supportsImageGeneration: true,
    supportsAudioGeneration: true,
    supportsVideoGeneration: true,
    imageLimitReached: false,
    audioLimitReached: false,
    videoLimitReached: false,
    allowedPersonaIds: ["strategist", "developer"],
    ...overrides,
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
