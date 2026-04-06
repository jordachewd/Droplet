import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/checkout/plan-status/route";
import { auth } from "@clerk/nextjs/server";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { mockAuth } from "../test-support";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/require-active-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/user.model", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

interface UserPlanProjection {
  plan?: {
    name?: "Lite" | "Pro" | "Premium";
    stripeId?: string | null;
  };
}

function mockUserPlanProjection(result: UserPlanProjection | null): void {
  const query = {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  };

  vi.mocked(User.findOne).mockReturnValue(
    query as unknown as ReturnType<typeof User.findOne>,
  );
}

function buildRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/checkout/plan-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(vi.mocked(auth), {
      userId: "clerk_user_123",
      isAuthenticated: true,
      sessionId: "session_123",
    });
    vi.mocked(requireActiveUser).mockResolvedValue({ status: "active" });
    vi.mocked(connectToDatabase).mockResolvedValue(
      {} as Awaited<ReturnType<typeof connectToDatabase>>,
    );
    mockUserPlanProjection({
      plan: {
        name: "Pro",
        stripeId: "cs_test_paid_123",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockAuth(vi.mocked(auth), {
      userId: null,
      isAuthenticated: false,
      sessionId: null,
    });

    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentication required.");
    expect(requireActiveUser).not.toHaveBeenCalled();
  });

  it("returns 503 when account is not provisioned", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue({
      status: "not_provisioned",
    });

    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Account not yet provisioned");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("returns 403 when account is suspended", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue({ status: "suspended" });

    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Account suspended.");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when session_id is missing", async () => {
    const response = await GET(
      buildRequest("http://localhost/api/checkout/plan-status"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("A valid session_id is required.");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("returns confirmed=true when user plan stripeId matches session id", async () => {
    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      confirmed: true,
      planName: "Pro",
    });
  });

  it("returns confirmed=false when user plan stripeId does not match session id", async () => {
    mockUserPlanProjection({
      plan: {
        name: "Lite",
        stripeId: "cs_other",
      },
    });

    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      confirmed: false,
      planName: "Lite",
    });
  });

  it("returns 503 when user record cannot be found", async () => {
    mockUserPlanProjection(null);

    const response = await GET(
      buildRequest(
        "http://localhost/api/checkout/plan-status?session_id=cs_test_paid_123",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Account not yet provisioned");
  });
});
