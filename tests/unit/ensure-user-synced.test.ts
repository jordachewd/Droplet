import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

const mockUserCreate = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserFindById = vi.fn();

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    findById: (...args: unknown[]) => mockUserFindById(...args),
    create: (...args: unknown[]) => mockUserCreate(...args),
  },
}));

import { clerkClient } from "@clerk/nextjs/server";
import { ensureUserSynced } from "@/lib/utils/ensure-user-synced";

const CLERK_USER_ID = "user_abc123def456";

const MOCK_EXISTING_USER = {
  _id: "mongo_id_1",
  clerkId: CLERK_USER_ID,
  username: "alice",
  email: "alice@example.com",
  role: "client",
  plan: { name: "Pro", id: 1 },
  firstName: "Alice",
  lastName: "Smith",
  userimg: "https://img.clerk.com/alice.jpg",
  registerAt: "2026-01-01T00:00:00.000Z",
};

const MOCK_CLERK_USER = {
  id: CLERK_USER_ID,
  username: "alice",
  firstName: "Alice",
  lastName: "Smith",
  imageUrl: "https://img.clerk.com/alice.jpg",
  createdAt: 1735689600000,
  primaryEmailAddressId: "email_1",
  emailAddresses: [{ id: "email_1", emailAddress: "alice@example.com" }],
};

function mockFindOneChain(result: unknown) {
  const leanMock = vi.fn().mockResolvedValue(result);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  mockUserFindOne.mockReturnValue({ select: selectMock });
}

function mockFindByIdChain(result: unknown) {
  const leanMock = vi.fn().mockResolvedValue(result);
  const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
  mockUserFindById.mockReturnValue({ select: selectMock });
}

const mockUpdateUserMetadata = vi.fn().mockResolvedValue({});
const mockGetUser = vi.fn();

describe("ensureUserSynced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: mockGetUser,
        updateUserMetadata: mockUpdateUserMetadata,
      },
    } as never);
    mockGetUser.mockResolvedValue(MOCK_CLERK_USER);
  });

  it("returns existing user without modification if already in MongoDB", async () => {
    mockFindOneChain(MOCK_EXISTING_USER);

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result).toEqual(MOCK_EXISTING_USER);
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("creates MongoDB user from Clerk data when user record is missing", async () => {
    mockFindOneChain(null);
    const createdUser = {
      _id: "new_mongo_id",
      clerkId: CLERK_USER_ID,
      username: "alice",
      email: "alice@example.com",
      role: "client",
      plan: { name: "Lite", id: 0 },
    };
    mockUserCreate.mockResolvedValue(createdUser);
    mockFindByIdChain({
      ...createdUser,
      firstName: "Alice",
      lastName: "Smith",
      userimg: "https://img.clerk.com/alice.jpg",
      registerAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result).toBeTruthy();
    expect(result?.clerkId).toBe(CLERK_USER_ID);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: CLERK_USER_ID,
        email: "alice@example.com",
        username: "alice",
      }),
    );
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(
      CLERK_USER_ID,
      expect.objectContaining({
        publicMetadata: expect.objectContaining({
          userId: "new_mongo_id",
          role: "client",
        }),
      }),
    );
  });

  it("sets Lite plan defaults on self-healing creation", async () => {
    mockFindOneChain(null);
    const createdUser = {
      _id: "new_mongo_id",
      clerkId: CLERK_USER_ID,
      role: "client",
      plan: { name: "Lite", id: 0 },
    };
    mockUserCreate.mockResolvedValue(createdUser);
    mockFindByIdChain(createdUser);

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result?.plan?.name).toBe("Lite");
  });

  it("returns null when Clerk API fails", async () => {
    mockFindOneChain(null);
    mockGetUser.mockRejectedValue(new Error("Clerk API unavailable"));

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result).toBeNull();
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("returns null when MongoDB creation fails", async () => {
    mockFindOneChain(null);
    mockUserCreate.mockRejectedValue(new Error("MongoDB write failure"));

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result).toBeNull();
  });

  it("returns null when Clerk user has no email addresses", async () => {
    mockFindOneChain(null);
    mockGetUser.mockResolvedValue({
      ...MOCK_CLERK_USER,
      emailAddresses: [],
      primaryEmailAddressId: null,
    });

    const result = await ensureUserSynced(CLERK_USER_ID);

    expect(result).toBeNull();
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("generates fallback username when Clerk user has no username", async () => {
    mockFindOneChain(null);
    mockGetUser.mockResolvedValue({
      ...MOCK_CLERK_USER,
      username: null,
    });
    const createdUser = {
      _id: "new_mongo_id",
      clerkId: CLERK_USER_ID,
      role: "client",
    };
    mockUserCreate.mockResolvedValue(createdUser);
    mockFindByIdChain(createdUser);

    await ensureUserSynced(CLERK_USER_ID);

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        username: expect.stringContaining("alice"),
      }),
    );
  });
});
