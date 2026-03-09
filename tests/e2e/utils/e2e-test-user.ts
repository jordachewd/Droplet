import { getEnvValue } from "./dotenv-local";

type E2ETestUser = {
  identifier: string;
  password: string;
};

const missingCredentialsError =
  "Set E2E_TEST_USERNAME or E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env.local.";

export function getE2ETestUser(): E2ETestUser | null {
  const username = getEnvValue("E2E_TEST_USERNAME");
  const email = getEnvValue("E2E_TEST_EMAIL");
  const password = getEnvValue("E2E_TEST_PASSWORD");
  const identifier = username || email;

  if (!identifier || !password) {
    return null;
  }

  return { identifier, password };
}

export function requireE2ETestUser(): E2ETestUser {
  const user = getE2ETestUser();

  if (!user) {
    throw new Error(missingCredentialsError);
  }

  return user;
}

export { missingCredentialsError };
