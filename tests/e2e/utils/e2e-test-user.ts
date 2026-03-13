import { getEnvValue } from "./dotenv-local";

type E2ETestUser = {
  email?: string;
  identifier: string;
  password: string;
  username?: string;
};

const missingCredentialsError =
  "Set E2E_TEST_USERNAME or E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env.local.";
const missingAdminCredentialsError =
  "Set E2E_ADMIN_USERNAME or E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.local.";

function resolveE2EUserFromEnv({
  usernameKey,
  emailKey,
  passwordKey,
}: {
  usernameKey: string;
  emailKey: string;
  passwordKey: string;
}): E2ETestUser | null {
  const username = getEnvValue(usernameKey);
  const email = getEnvValue(emailKey);
  const password = getEnvValue(passwordKey);
  const identifier = email || username;

  if (!identifier || !password) {
    return null;
  }

  return { email, identifier, password, username };
}

export function getE2ETestUser(): E2ETestUser | null {
  return resolveE2EUserFromEnv({
    usernameKey: "E2E_TEST_USERNAME",
    emailKey: "E2E_TEST_EMAIL",
    passwordKey: "E2E_TEST_PASSWORD",
  });
}

export function getE2EAdminUser(): E2ETestUser | null {
  return resolveE2EUserFromEnv({
    usernameKey: "E2E_ADMIN_USERNAME",
    emailKey: "E2E_ADMIN_EMAIL",
    passwordKey: "E2E_ADMIN_PASSWORD",
  });
}

export function requireE2ETestUser(): E2ETestUser {
  const user = getE2ETestUser();

  if (!user) {
    throw new Error(missingCredentialsError);
  }

  return user;
}

export function requireE2EAdminUser(): E2ETestUser {
  const user = getE2EAdminUser();

  if (!user) {
    throw new Error(missingAdminCredentialsError);
  }

  return user;
}

export { missingAdminCredentialsError, missingCredentialsError };
