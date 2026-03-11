import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { awsS3Client } from "@/constants/aws";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";

vi.mock("@/constants/aws", () => ({
  awsS3Client: {
    send: vi.fn(),
  },
}));

describe("uploadFileToAWS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AWS_S3_BUCKET", "bucket");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uploads the file and returns the private app asset URL", async () => {
    vi.mocked(awsS3Client.send).mockResolvedValue({} as never);

    const fileUrl = await uploadFileToAWS(
      Buffer.from("file-bytes"),
      "image.png",
      "image/png",
      "user_123/uploads",
    );

    expect(awsS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(fileUrl).toBe("/api/download?key=user_123%2Fuploads%2Fimage.png");
  });

  it("encodes unsafe characters in the returned app asset URL", async () => {
    vi.mocked(awsS3Client.send).mockResolvedValue({} as never);

    const fileUrl = await uploadFileToAWS(
      Buffer.from("file-bytes"),
      "image#v1+.png",
      "image/png",
      "user_123/uploads",
    );

    expect(fileUrl).toBe(
      "/api/download?key=user_123%2Fuploads%2Fimage%23v1%2B.png",
    );
  });

  it("throws a generic message when the AWS upload fails", async () => {
    vi.mocked(awsS3Client.send).mockRejectedValue(new Error("S3 unavailable"));

    await expect(
      uploadFileToAWS(
        Buffer.from("file-bytes"),
        "image.png",
        "image/png",
        "user_123/uploads",
      ),
    ).rejects.toThrow("File upload failed");
  });
});
