import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/download/route";
import { auth } from "@clerk/nextjs/server";
import getFileFromAWS from "@/lib/utils/aws/getFileFromAWS";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/aws/getFileFromAWS", () => ({
  default: vi.fn(),
}));

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
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
    vi.mocked(getFileFromAWS).mockResolvedValue({
      Body: {
        transformToWebStream: () => createStreamResponseBody("image-bytes"),
      },
      ContentLength: 11,
      ContentType: "image/png",
      ETag: '"etag"',
      LastModified: new Date("2026-03-10T10:00:00.000Z"),
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = new NextRequest("http://localhost:3000/api/download");

    const response = await GET(req);

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toContain("Authentication required");
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

  it("streams owned S3 files through the app route", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?key=user_123%2Fimages%2Ffile.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(
      'inline; filename="file.png"',
    );
    expect(getFileFromAWS).toHaveBeenCalledWith("user_123/images/file.png");
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
});
