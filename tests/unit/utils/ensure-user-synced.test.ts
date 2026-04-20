import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";
import { createTestClerkUser, createTestUser } from "../test-support";

const {
  connectToDatabaseMock,
  findOneMock,
  findByIdMock,
  createMock,
  clerkClientFactoryMock,
  getUserMock,
  updateUserMetadataMock,
  serializeForClientMock,
  isMongoDuplicateKeyErrorMock,
} = vi.hoisted(() => ({
  connectToDatabaseMock: vi.fn(),
  findOneMock: vi.fn(),
  findByIdMock: vi.fn(),
  createMock: vi.fn(),
  clerkClientFactoryMock: vi.fn(),
  getUserMock: vi.fn(),
  updateUserMetadataMock: vi.fn(),
  serializeForClientMock: vi.fn(),
  isMongoDuplicateKeyErrorMock: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: findOneMock,
    findById: findByIdMock,
    create: createMock,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientFactoryMock,
}));

vi.mock("@/lib/utils/serialize-for-client", () => ({
  default: serializeForClientMock,
}));

vi.mock("@/lib/utils/type-guards", () => ({
  isMongoDuplicateKeyError: isMongoDuplicateKeyErrorMock,
}));

type SelectLeanQuery<TValue> = {
  select: ReturnType<
    typeof vi.fn<(projection?: unknown) => SelectLeanQuery<TValue>>
  >;
  lean: ReturnType<typeof vi.fn<() => Promise<TValue>>>;
};

function createSelectLeanQuery<TValue>(value: TValue): SelectLeanQuery<TValue> {
  const query: SelectLeanQuery<TValue> = {
    select: vi.fn(),
    lean: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.lean.mockResolvedValue(value as Awaited<TValue>);

  return query;
}

function makeCreatedUserDocument(id: string, role = "client") {
  return {
    _id: {
      toString: () => id,
    },
    role,
  };
}

function createDeferred<TValue>() {
  let resolve: ((value: TValue | PromiseLike<TValue>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<TValue>((internalResolve, internalReject) => {
    resolve = internalResolve;
    reject = internalReject;
  });

  return {
    promise,
    resolve: (value: TValue | PromiseLike<TValue>) => resolve?.(value),
    reject: (reason?: unknown) => reject?.(reason),
  };
}

describe("ensure-user-synced", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "test");
    connectToDatabaseMock.mockResolvedValue(undefined);
    serializeForClientMock.mockImplementation((value: unknown) => value);
    isMongoDuplicateKeyErrorMock.mockReturnValue(false);

    clerkClientFactoryMock.mockResolvedValue({
      users: {
        getUser: getUserMock,
        updateUserMetadata: updateUserMetadataMock,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns existing Mongo user when already synced", async () => {
    const user = createTestUser({ clerkId: "user_existing_1" });
    const userQuery = createSelectLeanQuery(user);
    findOneMock.mockReturnValue(userQuery);

    const result = await ensureUserSynced(user.clerkId);

    expect(connectToDatabaseMock).toHaveBeenCalledTimes(1);
    expect(findOneMock).toHaveBeenCalledWith({ clerkId: user.clerkId });
    expect(userQuery.select).toHaveBeenCalledWith(
      "clerkId username email role plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart stripeCustomerId stripeSubscriptionId subscriptionStatus suspended onboardingCompleted preferences",
    );
    expect(result).toEqual(user);
    expect(clerkClientFactoryMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns null and logs when Clerk user has no email", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const clerkUser = createTestClerkUser({
      id: "user_missing_email_1",
      emailAddresses: [],
      primaryEmailAddressId: null,
    });

    findOneMock.mockReturnValue(createSelectLeanQuery(null));
    getUserMock.mockResolvedValue(clerkUser);

    const result = await ensureUserSynced(clerkUser.id);

    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain("No email found");

    stderrSpy.mockRestore();
  });

  it("self-heals missing users, creates Mongo record, and syncs metadata", async () => {
    const clerkUser = createTestClerkUser({
      id: "user_abc12345",
      username: null,
      emailAddresses: [
        {
          id: "email_primary",
          emailAddress: "Alpha.User@example.com",
        },
      ],
      primaryEmailAddressId: "email_primary",
      firstName: "Alpha",
      lastName: "User",
    });
    const createdUserId = "507f1f77bcf86cd799439099";
    const createdUser = createTestUser({
      _id: createdUserId,
      clerkId: clerkUser.id,
      username: "alpha-user-abc12345",
      email: "Alpha.User@example.com",
    });

    findOneMock.mockReturnValueOnce(createSelectLeanQuery(null));
    createMock.mockResolvedValue(makeCreatedUserDocument(createdUserId));
    findByIdMock.mockReturnValue(createSelectLeanQuery(createdUser));
    getUserMock.mockResolvedValue(clerkUser);
    updateUserMetadataMock.mockResolvedValue(undefined);

    const result = await ensureUserSynced(clerkUser.id);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: clerkUser.id,
        username: "alpha-user-abc12345",
        email: "Alpha.User@example.com",
      }),
    );
    expect(updateUserMetadataMock).toHaveBeenCalledWith(clerkUser.id, {
      publicMetadata: {
        userId: createdUserId,
        role: "client",
        userImg: clerkUser.imageUrl,
      },
    });
    expect(result).toEqual(createdUser);
  });

  it("continues when metadata sync fails after user creation", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const clerkUser = createTestClerkUser({
      id: "user_metadata_fail_1",
      username: "metadata-fail-user",
    });
    const createdUserId = "507f1f77bcf86cd799439100";
    const createdUser = createTestUser({
      _id: createdUserId,
      clerkId: clerkUser.id,
      username: "metadata-fail-user",
    });

    findOneMock.mockReturnValueOnce(createSelectLeanQuery(null));
    createMock.mockResolvedValue(makeCreatedUserDocument(createdUserId));
    findByIdMock.mockReturnValue(createSelectLeanQuery(createdUser));
    getUserMock.mockResolvedValue(clerkUser);
    updateUserMetadataMock.mockRejectedValue(new Error("metadata down"));

    const result = await ensureUserSynced(clerkUser.id);

    expect(result).toEqual(createdUser);
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
      "Metadata sync failed",
    );

    stderrSpy.mockRestore();
  });

  it("returns null when user is created but cannot be reloaded", async () => {
    const clerkUser = createTestClerkUser({
      id: "user_reload_missing_1",
      username: "missing-reload-user",
    });
    const createdUserId = "507f1f77bcf86cd799439102";

    findOneMock.mockReturnValueOnce(createSelectLeanQuery(null));
    createMock.mockResolvedValue(makeCreatedUserDocument(createdUserId));
    findByIdMock.mockReturnValue(createSelectLeanQuery(null));
    getUserMock.mockResolvedValue(clerkUser);
    updateUserMetadataMock.mockResolvedValue(undefined);

    const result = await ensureUserSynced(clerkUser.id);

    expect(result).toBeNull();
    expect(updateUserMetadataMock).toHaveBeenCalledWith(clerkUser.id, {
      publicMetadata: {
        userId: createdUserId,
        role: "client",
        userImg: clerkUser.imageUrl,
      },
    });
  });

  it("falls back to first Clerk email when primary email id is missing", async () => {
    const clerkUser = createTestClerkUser({
      id: "user_email_fallback_1",
      username: null,
      emailAddresses: [
        {
          id: "email_first",
          emailAddress: "fallback.first@example.com",
        },
        {
          id: "email_second",
          emailAddress: "fallback.second@example.com",
        },
      ],
      primaryEmailAddressId: "email_unknown",
    });
    const createdUserId = "507f1f77bcf86cd799439103";
    const createdUser = createTestUser({
      _id: createdUserId,
      clerkId: clerkUser.id,
      email: "fallback.first@example.com",
    });

    findOneMock.mockReturnValueOnce(createSelectLeanQuery(null));
    createMock.mockResolvedValue(makeCreatedUserDocument(createdUserId));
    findByIdMock.mockReturnValue(createSelectLeanQuery(createdUser));
    getUserMock.mockResolvedValue(clerkUser);
    updateUserMetadataMock.mockResolvedValue(undefined);

    const result = await ensureUserSynced(clerkUser.id);

    expect(result).toEqual(createdUser);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: clerkUser.id,
        email: "fallback.first@example.com",
      }),
    );
  });

  it("returns race winner when user creation fails with duplicate key", async () => {
    const clerkUser = createTestClerkUser({
      id: "user_duplicate_1",
      username: "race-winner",
    });
    const raceWinner = createTestUser({
      clerkId: clerkUser.id,
      username: "race-winner",
    });

    findOneMock
      .mockReturnValueOnce(createSelectLeanQuery(null))
      .mockReturnValueOnce(createSelectLeanQuery(raceWinner));
    getUserMock.mockResolvedValue(clerkUser);
    createMock.mockRejectedValue(new Error("duplicate key"));
    isMongoDuplicateKeyErrorMock.mockReturnValue(true);

    const result = await ensureUserSynced(clerkUser.id);

    expect(result).toEqual(raceWinner);
    expect(findOneMock).toHaveBeenCalledTimes(2);
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it("logs failure once per user window and returns null on create errors", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const clerkUser = createTestClerkUser({
      id: "user_create_error_1",
      username: "failing-user",
    });

    findOneMock.mockReturnValue(createSelectLeanQuery(null));
    getUserMock.mockResolvedValue(clerkUser);
    createMock.mockRejectedValue(new Error("db unavailable"));
    isMongoDuplicateKeyErrorMock.mockReturnValue(false);

    const firstResult = await ensureUserSynced(clerkUser.id);
    const secondResult = await ensureUserSynced(clerkUser.id);
    const failedLogs = stderrSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Failed for"),
    );

    expect(firstResult).toBeNull();
    expect(secondResult).toBeNull();
    expect(failedLogs).toHaveLength(1);

    stderrSpy.mockRestore();
  });

  it("caches results and deduplicates in-flight requests outside test environment", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const clerkUserId = "user_cached_1";
    const user = createTestUser({ clerkId: clerkUserId });
    const deferred = createDeferred<typeof user | null>();

    const pendingQuery: SelectLeanQuery<typeof user | null> = {
      select: vi.fn(),
      lean: vi.fn(),
    };
    pendingQuery.select.mockReturnValue(pendingQuery);
    pendingQuery.lean.mockImplementation(() => deferred.promise);
    findOneMock.mockReturnValue(pendingQuery);

    const inFlightOne = ensureUserSynced(clerkUserId);
    const inFlightTwo = ensureUserSynced(clerkUserId);

    await Promise.resolve();
    expect(findOneMock).toHaveBeenCalledTimes(1);

    deferred.resolve(user);
    const [firstResult, secondResult] = await Promise.all([
      inFlightOne,
      inFlightTwo,
    ]);
    expect(firstResult).toEqual(user);
    expect(secondResult).toEqual(user);

    const cachedResult = await ensureUserSynced(clerkUserId);
    expect(cachedResult).toEqual(user);
    expect(findOneMock).toHaveBeenCalledTimes(1);
  });
});
