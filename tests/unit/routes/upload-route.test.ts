import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { connectToDatabase } from "@/lib/database/mongoose";
import Upload from "@/lib/database/models/upload.model";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { auth } from "@clerk/nextjs/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/utils/upload-file-validation";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/database/models/upload.model", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/utils/require-active-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  enforceSlidingWindowRateLimit: vi.fn(),
}));

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const GIF_SIGNATURE = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const MOCK_UPLOAD_UUID = "550e8400-e29b-41d4-a716-446655440000";

function createPngBytes(size: number = PNG_SIGNATURE.length): Uint8Array {
  const byteSize = Math.max(size, PNG_SIGNATURE.length);
  const bytes = new Uint8Array(byteSize);
  bytes.set(PNG_SIGNATURE, 0);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  }

  const copiedBytes = new Uint8Array(bytes.byteLength);
  copiedBytes.set(bytes);
  return copiedBytes.buffer;
}

function buildRequestWithFormData(formData: FormData): NextRequest {
  return {
    formData: async () => formData,
  } as unknown as NextRequest;
}

type AuthResult = Awaited<ReturnType<typeof auth>>;

function mockAuthUser(userId: string | null): void {
  vi.mocked(auth).mockResolvedValue({ userId } as AuthResult);
}

type ActiveUserStatus = "active" | "suspended" | "not_provisioned";

function mockActiveUserStatus(status: ActiveUserStatus): void {
  vi.mocked(requireActiveUser).mockResolvedValue({ status });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    mockAuthUser("user_123");
    mockActiveUserStatus("active");
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(MOCK_UPLOAD_UUID);
    vi.mocked(connectToDatabase).mockResolvedValue(
      {} as Awaited<ReturnType<typeof connectToDatabase>>,
    );
    vi.mocked(Upload.create).mockResolvedValue({
      _id: "upload_1",
    } as unknown as Awaited<ReturnType<typeof Upload.create>>);
    vi.mocked(uploadFileToAWS).mockImplementation(async (_buffer, fileName) => {
      return `/api/download?key=user_123%2Fuploads%2F${fileName}`;
    });
    vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      retryAfterMs: 0,
    });
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
    expect(requireActiveUser).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated account is suspended", async () => {
    mockActiveUserStatus("suspended");
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Account suspended.");
    expect(uploadFileToAWS).not.toHaveBeenCalled();
  });

  it("returns 503 when authenticated account cannot be provisioned", async () => {
    mockActiveUserStatus("not_provisioned");
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Account not yet provisioned");
    expect(uploadFileToAWS).not.toHaveBeenCalled();
  });

  it("returns 429 when upload rate limit is exceeded", async () => {
    vi.mocked(enforceSlidingWindowRateLimit).mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: Date.now() + 1_800,
      retryAfterMs: 1_800,
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("2");
    expect(payload.error).toContain("Too many upload requests");
    expect(uploadFileToAWS).not.toHaveBeenCalled();
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
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [toArrayBuffer(createPngBytes(MAX_UPLOAD_SIZE_BYTES))],
        "image.png",
        {
          type: "image/png",
        },
      ),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.fileName).toBe(`uploaded_file_${MOCK_UPLOAD_UUID}.png`);
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      `uploaded_file_${MOCK_UPLOAD_UUID}.png`,
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
    const formData = new FormData();
    formData.set(
      "file",
      new File([toArrayBuffer(createPngBytes(16))], "image.png", {
        type: "image/png",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.fileName).toBe(`uploaded_file_${MOCK_UPLOAD_UUID}.png`);
    expect(payload.fileUrl).toContain(`uploaded_file_${MOCK_UPLOAD_UUID}.png`);
    expect(payload.objectKey).toBe(
      `user_123/uploads/uploaded_file_${MOCK_UPLOAD_UUID}.png`,
    );
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Upload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        fileName: `uploaded_file_${MOCK_UPLOAD_UUID}.png`,
        objectKey: `user_123/uploads/uploaded_file_${MOCK_UPLOAD_UUID}.png`,
        contentType: "image/png",
        sizeBytes: 16,
      }),
    );
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      `uploaded_file_${MOCK_UPLOAD_UUID}.png`,
      "image/png",
      "user_123/uploads",
    );
  });

  it("returns 500 when S3 upload fails", async () => {
    vi.mocked(uploadFileToAWS).mockRejectedValue(new Error("S3 error"));

    const formData = new FormData();
    formData.set(
      "file",
      new File([toArrayBuffer(createPngBytes(16))], "image.png", {
        type: "image/png",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Failed to upload file.");
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Upload.create).not.toHaveBeenCalled();
  });

  it("persists optional taskId when provided", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([toArrayBuffer(createPngBytes(16))], "image.png", {
        type: "image/png",
      }),
    );
    formData.set("taskId", "task_abc123");

    const response = await POST(buildRequestWithFormData(formData));

    expect(response.status).toBe(200);
    expect(Upload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task_abc123",
      }),
    );
  });

  it("returns 400 when file content does not match declared MIME type", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([toArrayBuffer(GIF_SIGNATURE)], "mismatch.png", {
        type: "image/png",
      }),
    );

    const response = await POST(buildRequestWithFormData(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("File content does not match declared type.");
    expect(uploadFileToAWS).not.toHaveBeenCalled();
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Upload.create).not.toHaveBeenCalled();
  });
});
