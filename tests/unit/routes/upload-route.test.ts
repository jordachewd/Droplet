import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { auth } from "@clerk/nextjs/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/utils/upload-file-validation";

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

type AuthResult = Awaited<ReturnType<typeof auth>>;

function mockAuthUser(userId: string | null): void {
  vi.mocked(auth).mockResolvedValue({ userId } as AuthResult);
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    mockAuthUser("user_123");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "/api/download?key=user_123%2Fuploads%2Fuploaded_file_1700000000000.png",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuthUser(null);
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

  it("returns 400 when file exceeds max upload size", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [new Uint8Array(MAX_UPLOAD_SIZE_BYTES + 1)],
        "oversized-image.png",
        {
          type: "image/png",
        },
      ),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("File is too large");
  });

  it("accepts file exactly at max upload size", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_111);
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array(MAX_UPLOAD_SIZE_BYTES)], "image.png", {
        type: "image/png",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.fileName).toBe("uploaded_file_1700000000111.png");
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      "uploaded_file_1700000000111.png",
      "image/png",
      "user_123/uploads",
    );
  });

  it("returns 400 for empty file", async () => {
    const formData = new FormData();
    formData.set("file", new File([], "empty.png", { type: "image/png" }));

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("File is empty");
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
    expect(payload.objectKey).toBe(
      "user_123/uploads/uploaded_file_1700000000000.png",
    );
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
