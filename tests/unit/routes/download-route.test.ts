import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/download/route";
import { auth } from "@clerk/nextjs/server";
import getFileFromAWS from "@/lib/utils/aws/getFileFromAWS";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { mockAuth } from "../test-support";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/aws/getFileFromAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/require-active-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));

type ActiveUserStatus = "active" | "suspended" | "not_provisioned";

function mockActiveUserStatus(status: ActiveUserStatus): void {
  vi.mocked(requireActiveUser).mockResolvedValue({ status });
}

function createStreamResponseBody(payload: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
}

describe("GET /api/download", () => {
  beforeEach(() => {
    mockAuth(vi.mocked(auth), {
      userId: "user_123",
      isAuthenticated: true,
      sessionId: "session_123",
    });
    mockActiveUserStatus("active");
    vi.mocked(getFileFromAWS).mockResolvedValue({
      Body: {
        transformToWebStream: () => createStreamResponseBody("image-bytes"),
      },
      ContentLength: 11,
      ContentType: "image/png",
      ETag: '"etag"',
      LastModified: new Date("2026-03-10T10:00:00.000Z"),
    } as unknown as Awaited<ReturnType<typeof getFileFromAWS>>);
    vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      retryAfterMs: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth(vi.mocked(auth), {
      userId: null,
      isAuthenticated: false,
      sessionId: null,
    });
    const req = new NextRequest("http://localhost:3000/api/download");

    const response = await GET(req);

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toContain("Authentication required");
    expect(requireActiveUser).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated account is suspended", async () => {
    mockActiveUserStatus("suspended");
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain("Account suspended");
    expect(getFileFromAWS).not.toHaveBeenCalled();
  });

  it("returns 503 when authenticated account cannot be provisioned", async () => {
    mockActiveUserStatus("not_provisioned");
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toContain(
      "Account not yet provisioned",
    );
    expect(getFileFromAWS).not.toHaveBeenCalled();
  });

  it("returns 429 when download rate limit is exceeded", async () => {
    vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 1_200,
      retryAfterMs: 1_200,
    });
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("2");
    await expect(response.text()).resolves.toContain("Too many requests");
    expect(getFileFromAWS).not.toHaveBeenCalled();
  });

  it("returns 400 when key and url query params are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/download");

    const response = await GET(req);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain(
      "A file key or URL is required",
    );
  });

  it("returns 403 when the requested S3 key is not owned by the user", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=other_user%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain("Forbidden");
    expect(getFileFromAWS).not.toHaveBeenCalled();
  });

  it("returns 400 when a key is provided but cannot be resolved", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=invalid-key-without-prefix",
    );

    const response = await GET(req);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("Invalid file key");
    expect(getFileFromAWS).not.toHaveBeenCalled();
  });

  it("streams owned S3 files through the app route", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Disposition")).toContain(
      'inline; filename="file.png"',
    );
    expect(getFileFromAWS).toHaveBeenCalledWith(
      "user_123/images/file.png",
      undefined,
    );
  });

  it("returns 206 partial content for S3 byte range requests", async () => {
    vi.mocked(getFileFromAWS).mockResolvedValueOnce({
      Body: {
        transformToWebStream: () => createStreamResponseBody("image"),
      },
      ContentLength: 5,
      ContentType: "image/png",
      ContentRange: "bytes 0-4/11",
      AcceptRanges: "bytes",
      ETag: '"etag-partial"',
      LastModified: new Date("2026-03-10T10:00:00.000Z"),
    } as unknown as Awaited<ReturnType<typeof getFileFromAWS>>);

    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
      {
        headers: {
          Range: "bytes=0-4",
        },
      },
    );

    const response = await GET(req);

    expect(response.status).toBe(206);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Range")).toBe("bytes 0-4/11");
    expect(getFileFromAWS).toHaveBeenCalledWith("user_123/images/file.png", {
      range: "bytes=0-4",
    });
  });

  it("resolves legacy public bucket URLs to private S3 object reads", async () => {
    vi.stubEnv("AWS_S3_BUCKET", "bucket-name");
    vi.stubEnv("AWS_S3_REGION", "eu-central-1");

    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://bucket-name.s3.eu-central-1.amazonaws.com/user_123/images/image%23v1%2B.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(getFileFromAWS).toHaveBeenCalledWith(
      "user_123/images/image#v1+.png",
      undefined,
    );
  });

  it("returns 400 for disallowed external hosts", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://example.com/file.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain(
      "This URL is not allowed for download",
    );
  });

  it("returns 502 when an allowlisted upstream fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
    );
    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://img.clerk.com/avatar.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(502);
    await expect(response.text()).resolves.toContain("Failed to fetch file");
  });

  it("proxies allowlisted external files with download headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(createStreamResponseBody("image-bytes"), {
          status: 200,
          headers: {
            "Content-Length": "11",
            "Content-Type": "image/png",
          },
        }),
      ),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://img.clerk.com/avatar.png&download=1&filename=avatar.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="avatar.png"',
    );
  });

  it("sanitizes user-provided download filenames before setting headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(createStreamResponseBody("image-bytes"), {
          status: 200,
          headers: {
            "Content-Length": "11",
            "Content-Type": "image/png",
          },
        }),
      ),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://img.clerk.com/avatar.png&download=1&filename=folder/sub%5Cavatar%22%0A.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="folder_sub_avatar__.png"',
    );
  });
});
