import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { auth } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

function buildRequestWithFormData(formData: FormData): NextRequest {
  return {
    formData: async () => formData,
  } as unknown as NextRequest;
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as never);
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "https://bucket.s3.region.amazonaws.com/user_123/uploads/uploaded_file_1700000000000.png",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = buildRequestWithFormData(new FormData());

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Authentication required.");
  });

  it("returns 400 when file is missing", async () => {
    const req = buildRequestWithFormData(new FormData());

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("No file uploaded.");
  });

  it("returns 400 for invalid file type", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "doc.pdf", {
        type: "application/pdf",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid file type");
  });

  it("uploads valid file to S3 and returns filename and URL", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "image.png", {
        type: "image/png",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.fileName).toBe("uploaded_file_1700000000000.png");
    expect(payload.fileUrl).toContain("uploaded_file_1700000000000.png");
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      "uploaded_file_1700000000000.png",
      "image/png",
      "user_123/uploads",
    );
  });

  it("returns 500 when S3 upload fails", async () => {
    vi.mocked(uploadFileToAWS).mockRejectedValue(new Error("S3 error"));

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1])], "image.png", { type: "image/png" }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("Failed to upload file.");
  });
});
