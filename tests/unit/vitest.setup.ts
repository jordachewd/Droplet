import { afterEach, beforeEach, vi } from "vitest";

const REQUIRED_TEST_ENV_DEFAULTS: Record<string, string> = {
  AWS_S3_REGION: "eu-central-1",
  AWS_S3_ACCESS_ID: "test-access-key",
  AWS_S3_SECRET_KEY: "test-secret-key",
  OPENAI_ORG: "org_test",
  OPENAI_PRJ: "proj_test",
  OPENAI_KEY: "sk-openai-test",
  STRIPE_SECRET_KEY: "sk-test",
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
  MONGODB_URL: "mongodb://localhost:27017/droplet-test",
};

for (const [key, value] of Object.entries(REQUIRED_TEST_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries(REQUIRED_TEST_ENV_DEFAULTS)) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
