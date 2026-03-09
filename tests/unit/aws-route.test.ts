import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentUser } from "@clerk/nextjs/server";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import { generateString } from "@/lib/utils/generateString";
import { DELETE, POST } from "@/app/api/aws/route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/utils/aws/uploadFileToAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/aws/deleteFileFromAWS", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils/generateString", () => ({
  generateString: vi.fn(),
}));

function buildRequest(method: "POST" | "DELETE", payload: unknown): Request {
  return new Request("http://localhost:3000/api/aws", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("/api/aws route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_123",
      username: "jwd-user",
    } as never);
    vi.mocked(generateString).mockReturnValue("rand123");
    vi.mocked(uploadFileToAWS).mockResolvedValue(
      "https://bucket.s3.region.amazonaws.com/user_123/task_abc/task_abc_image_rand123.png",
    );
    vi.mocked(deleteFileFromAWS).mockResolvedValue(undefined);
  });

  it("returns 401 for upload when user is not authenticated", async () => {
    vi.mocked(currentUser).mockResolvedValue(null as never);

    const response = await POST(
      buildRequest("POST", { taskId: "task_abc", imgBuffer: "ZmFrZQ==" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("User not authenticated.");
  });

  it("returns 400 for upload when required payload is missing", async () => {
    const response = await POST(buildRequest("POST", { taskId: "task_abc" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("TaskId and image buffer are required.");
  });

  it("uploads image and returns fileUrl", async () => {
    const response = await POST(
      buildRequest("POST", {
        taskId: "task_abc",
        imgBuffer: Buffer.from("hello-world").toString("base64"),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(uploadFileToAWS).toHaveBeenCalledWith(
      expect.any(Buffer),
      "task_abc_image_rand123.png",
      "image/png",
      "user_123/task_abc",
    );
    expect(payload.fileUrl).toContain("task_abc_image_rand123.png");
  });

  it("returns 400 when upload payload exceeds 10MB", async () => {
    const tooLargePayload = Buffer.alloc(10 * 1024 * 1024 + 1).toString(
      "base64",
    );

    const response = await POST(
      buildRequest("POST", {
        taskId: "task_abc",
        imgBuffer: tooLargePayload,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("Image payload exceeds 10MB limit.");
    expect(uploadFileToAWS).not.toHaveBeenCalled();
  });

  it("returns 500 when upload fails", async () => {
    vi.mocked(uploadFileToAWS).mockRejectedValue(new Error("S3 unavailable"));

    const response = await POST(
      buildRequest("POST", {
        taskId: "task_abc",
        imgBuffer: Buffer.from("hello-world").toString("base64"),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("File upload failed");
    expect(payload.error).toBeUndefined();
  });

  it("returns 401 for delete when user is not authenticated", async () => {
    vi.mocked(currentUser).mockResolvedValue(null as never);

    const response = await DELETE(
      buildRequest("DELETE", { folder: "task_abc", fileName: "file.png" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe("User not authenticated.");
  });

  it("returns 400 for delete when payload is incomplete", async () => {
    const response = await DELETE(
      buildRequest("DELETE", { folder: "task_abc" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe(
      "Folder and fileName are required for deletion.",
    );
  });

  it("deletes image with user id path and returns success", async () => {
    const response = await DELETE(
      buildRequest("DELETE", {
        folder: "user_123/task_abc",
        fileName: "file.png",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteFileFromAWS).toHaveBeenCalledWith(
      "user_123",
      "file.png",
      "task_abc",
    );
    expect(payload.message).toBe("Image deleted successfully");
  });

  it("returns 403 when delete folder does not belong to the authenticated user", async () => {
    const response = await DELETE(
      buildRequest("DELETE", {
        folder: "other_user/task_abc",
        fileName: "file.png",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toContain("Forbidden");
    expect(deleteFileFromAWS).not.toHaveBeenCalled();
  });

  it("returns 500 when delete operation fails", async () => {
    vi.mocked(deleteFileFromAWS).mockRejectedValue(new Error("Delete failed"));

    const response = await DELETE(
      buildRequest("DELETE", {
        folder: "user_123/task_abc",
        fileName: "file.png",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("File deletion failed");
    expect(payload.error).toBeUndefined();
  });
});
