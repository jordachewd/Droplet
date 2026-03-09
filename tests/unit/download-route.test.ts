import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/download/route";
import { auth } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe("GET /api/download", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = new NextRequest("http://localhost:3000/api/download");

    const response = await GET(req);

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toContain("Authentication required");
  });

  it("returns 400 when url query param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/download");

    const response = await GET(req);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("Image URL is required");
  });

  it("returns 400 for disallowed hosts", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://example.com/file.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain(
      "This URL is not allowed for download",
    );
  });

  it("returns 500 when upstream fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
    );
    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://img.clerk.com/avatar.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toContain("Failed to fetch image");
  });

  it("streams image response with download headers for allowed URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("image-bytes", {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      ),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/download?url=https://img.clerk.com/avatar.png",
    );

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="downloaded-image.png"',
    );
  });
});
