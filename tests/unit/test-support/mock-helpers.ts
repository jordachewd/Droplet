import type { auth } from "@clerk/nextjs/server";
import { vi } from "vitest";
import { createTestClerkUser, type TestClerkUser } from "./factories";

type AuthResult = Awaited<ReturnType<typeof auth>>;

type AsyncResolvedValueMock<T> = {
  mockResolvedValue(value: T): unknown;
};

type AuthOverrides = {
  userId?: string | null;
  isAuthenticated?: boolean;
  sessionId?: string | null;
  sessionClaims?: Record<string, unknown> | null;
};

export type MongooseQueryMock<TResult> = {
  select: ReturnType<
    typeof vi.fn<(projection?: unknown) => MongooseQueryMock<TResult>>
  >;
  sort: ReturnType<
    typeof vi.fn<(sort?: unknown) => MongooseQueryMock<TResult>>
  >;
  limit: ReturnType<
    typeof vi.fn<(value: number) => MongooseQueryMock<TResult>>
  >;
  skip: ReturnType<typeof vi.fn<(value: number) => MongooseQueryMock<TResult>>>;
  lean: ReturnType<typeof vi.fn<() => Promise<TResult>>>;
  exec: ReturnType<typeof vi.fn<() => Promise<TResult>>>;
};

function createBaseAuthResult(): AuthResult {
  const redirectToSignIn = ((returnBackUrl?: string | URL) => {
    throw new Error(
      `[test-support] redirectToSignIn mock invoked${returnBackUrl ? ` (${String(returnBackUrl)})` : ""}.`,
    );
  }) as AuthResult["redirectToSignIn"];

  const redirectToSignUp = ((returnBackUrl?: string | URL) => {
    throw new Error(
      `[test-support] redirectToSignUp mock invoked${returnBackUrl ? ` (${String(returnBackUrl)})` : ""}.`,
    );
  }) as AuthResult["redirectToSignUp"];

  return {
    sessionClaims: null,
    sessionId: null,
    sessionStatus: null,
    actor: null,
    tokenType: "session_token",
    userId: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: null,
    factorVerificationAge: null,
    getToken: async () => null,
    has: () => false,
    debug: () => ({}),
    isAuthenticated: false,
    redirectToSignIn,
    redirectToSignUp,
  } as AuthResult;
}

export function mockAuth<TResolved>(
  authMock: AsyncResolvedValueMock<TResolved>,
  overrides: AuthOverrides = {},
): AuthResult {
  const authResult = {
    ...createBaseAuthResult(),
    ...overrides,
  } as AuthResult;

  authMock.mockResolvedValue(authResult as TResolved);
  return authResult;
}

export function mockAdminAuth<TResolved>(
  authMock: AsyncResolvedValueMock<TResolved>,
  userId = "admin_user_123",
): AuthResult {
  return mockAuth(authMock, {
    userId,
    sessionId: "session_admin_123",
    isAuthenticated: true,
    sessionClaims: {
      metadata: { role: "admin" },
    } as AuthResult["sessionClaims"],
  });
}

export function mockClerkUser<TUser extends TestClerkUser = TestClerkUser>(
  getUserMock: AsyncResolvedValueMock<TUser>,
  overrides: Partial<TestClerkUser> = {},
): TUser {
  const user = createTestClerkUser(overrides) as TUser;
  getUserMock.mockResolvedValue(user);
  return user;
}

export function mockMongooseModel<TResult>(
  resolvedValue: TResult,
): MongooseQueryMock<TResult> {
  const query: MongooseQueryMock<TResult> = {
    select: vi.fn(),
    sort: vi.fn(),
    limit: vi.fn(),
    skip: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue as Awaited<TResult>);
  query.exec.mockResolvedValue(resolvedValue as Awaited<TResult>);

  return query;
}
