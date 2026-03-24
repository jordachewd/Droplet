import { describe, expect, it, vi } from "vitest";
import {
  buildMockNextRequest,
  createTestClerkUser,
  createTestTransaction,
  mockAdminAuth,
  mockAuth,
  mockClerkUser,
  mockMongooseModel,
  readJsonResponse,
} from "./index";

describe("test-support helpers", () => {
  it("creates typed transaction and clerk user fixtures", () => {
    const transaction = createTestTransaction({
      plan: "Pro",
      amount: 19,
    });
    const clerkUser = createTestClerkUser({
      id: "user_fixture_1",
      username: "fixture-user",
    });

    expect(transaction.plan).toBe("Pro");
    expect(transaction.amount).toBe(19);
    expect(clerkUser.id).toBe("user_fixture_1");
    expect(clerkUser.username).toBe("fixture-user");
  });

  it("builds a NextRequest mock with formData", async () => {
    const formData = new FormData();
    formData.set("message", "hello");

    const request = buildMockNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/upload",
      formData,
    });
    const parsed = await request.formData();

    expect(parsed.get("message")).toBe("hello");
  });

  it("reads a typed JSON response", async () => {
    const response = new Response(
      JSON.stringify({
        ok: true,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const payload = await readJsonResponse<{ ok: boolean }>(response);

    expect(payload.ok).toBe(true);
  });

  it("mocks auth context for regular and admin users", async () => {
    const authMock = vi.fn<() => Promise<unknown>>();

    const regularAuth = mockAuth(authMock, { userId: "user_123" });
    const adminAuth = mockAdminAuth(authMock, "admin_123");
    const resolvedAdminAuth = (await authMock()) as {
      userId: string | null;
      sessionClaims?: { metadata?: { role?: string } };
    };

    expect(regularAuth.userId).toBe("user_123");
    expect(adminAuth.userId).toBe("admin_123");
    expect(resolvedAdminAuth.userId).toBe("admin_123");
    expect(resolvedAdminAuth.sessionClaims?.metadata?.role).toBe("admin");
  });

  it("mocks clerk getUser responses", async () => {
    const getUserMock = vi.fn<() => Promise<unknown>>();
    const mockedUser = mockClerkUser(getUserMock, {
      id: "user_clerk_1",
      firstName: "Clerk",
    });
    const resolvedUser = (await getUserMock()) as {
      id: string;
      firstName: string;
    };

    expect(mockedUser.id).toBe("user_clerk_1");
    expect(resolvedUser.id).toBe("user_clerk_1");
    expect(resolvedUser.firstName).toBe("Clerk");
  });

  it("creates chainable mongoose query mocks", async () => {
    const query = mockMongooseModel({
      value: 42,
    });
    const leanResult = await query.select({}).sort({}).limit(10).skip(0).lean();
    const execResult = await query.exec();

    expect(leanResult).toEqual({ value: 42 });
    expect(execResult).toEqual({ value: 42 });
    expect(query.select).toHaveBeenCalled();
    expect(query.sort).toHaveBeenCalled();
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.skip).toHaveBeenCalledWith(0);
  });
});
