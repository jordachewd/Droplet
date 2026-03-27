import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";

const authState = vi.hoisted(() => ({
  userId: null as string | null,
  role: null as string | null,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (
    handler: (
      auth: () => Promise<{
        userId: string | null;
        sessionClaims?: { metadata?: { role?: string } };
      }>,
      req: NextRequest,
    ) => unknown,
  ) => {
    return (req: NextRequest) =>
      handler(
        async () => ({
          userId: authState.userId,
          sessionClaims: authState.role
            ? { metadata: { role: authState.role } }
            : undefined,
        }),
        req,
      );
  },
  createRouteMatcher: (patterns: string[]) => {
    return (req: NextRequest) => {
      const pathname = req.nextUrl.pathname;

      return patterns.some((pattern) => {
        if (pattern === "/") {
          return pathname === "/";
        }

        if (pattern.endsWith("(.*)")) {
          const basePath = pattern.slice(0, -4);
          return pathname === basePath || pathname.startsWith(`${basePath}/`);
        }

        return pathname === pattern;
      });
    };
  },
}));

import { proxy } from "@/proxy";

const mockEvent = {} as NextFetchEvent;

describe("proxy route protection", () => {
  beforeEach(() => {
    authState.userId = null;
    authState.role = null;
  });

  it("allows unauthenticated access to public routes", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = await proxy(request, mockEvent);

    expect(response).toBeUndefined();
  });

  it("allows unauthenticated webhook requests for Stripe and Clerk", async () => {
    const stripeWebhookRequest = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
    );
    const clerkWebhookRequest = new NextRequest(
      "http://localhost:3000/api/webhooks/clerk",
    );

    const stripeResponse = await proxy(stripeWebhookRequest, mockEvent);
    const clerkResponse = await proxy(clerkWebhookRequest, mockEvent);

    expect(stripeResponse).toBeUndefined();
    expect(clerkResponse).toBeUndefined();
  });

  it("allows unauthenticated access to status routes", async () => {
    const unauthRequest = new NextRequest("http://localhost:3000/401");
    const forbiddenRequest = new NextRequest("http://localhost:3000/403");
    const serverErrorRequest = new NextRequest("http://localhost:3000/500");

    const unauthResponse = await proxy(unauthRequest, mockEvent);
    const forbiddenResponse = await proxy(forbiddenRequest, mockEvent);
    const serverErrorResponse = await proxy(serverErrorRequest, mockEvent);

    expect(unauthResponse).toBeUndefined();
    expect(forbiddenResponse).toBeUndefined();
    expect(serverErrorResponse).toBeUndefined();
  });

  it("allows unknown unauthenticated routes so Next.js can render 404", async () => {
    const request = new NextRequest(
      "http://localhost:3000/this-route-does-not-exist",
    );
    const response = await proxy(request, mockEvent);

    expect(response).toBeUndefined();
  });

  it("redirects unauthenticated users from /app routes to /sign-in", async () => {
    const request = new NextRequest("http://localhost:3000/app/profile");
    const response = await proxy(request, mockEvent);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "http://localhost:3000/sign-in",
    );
  });

  it("redirects unauthenticated users from /admin routes to /sign-in", async () => {
    const request = new NextRequest("http://localhost:3000/admin");
    const response = await proxy(request, mockEvent);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "http://localhost:3000/sign-in",
    );
  });

  it("redirects non-admin users away from /admin", async () => {
    authState.userId = "user_123";
    authState.role = "user";

    const request = new NextRequest("http://localhost:3000/admin");
    const response = await proxy(request, mockEvent);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost:3000/403");
  });

  it("allows admin users to access /admin", async () => {
    authState.userId = "user_123";
    authState.role = "admin";

    const request = new NextRequest("http://localhost:3000/admin");
    const response = await proxy(request, mockEvent);

    expect(response).toBeUndefined();
  });
});
