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
    vi.stubEnv("AWS_S3_REGION", "region");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uploads the file and returns the public S3 URL", async () => {
    vi.mocked(awsS3Client.send).mockResolvedValue({} as never);

    const fileUrl = await uploadFileToAWS(
      Buffer.from("file-bytes"),
      "image.png",
      "image/png",
      "user_123/uploads",
    );

    expect(awsS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(fileUrl).toBe(
      "https://bucket.s3.region.amazonaws.com/user_123/uploads/image.png",
    );
  });

  it("logs the original AWS error and throws a generic message", async () => {
    const sdkError = new Error("S3 unavailable");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.mocked(awsS3Client.send).mockRejectedValue(sdkError);

    await expect(
      uploadFileToAWS(
        Buffer.from("file-bytes"),
        "image.png",
        "image/png",
        "user_123/uploads",
      ),
    ).rejects.toThrow("File upload failed");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "AWS S3 Upload Error:",
      sdkError,
    );
  });
});
