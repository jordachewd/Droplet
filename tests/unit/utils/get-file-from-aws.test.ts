import { GetObjectCommand } from "@aws-sdk/client-s3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { awsS3Client } from "@/constants/aws";
import getFileFromAWS from "@/lib/utils/aws/getFileFromAWS";
import { normalizeS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";
import { createTestTask, createTestUser } from "../test-support";

vi.mock("@/constants/aws", () => ({
  awsS3Client: {
    send: vi.fn(),
  },
}));

vi.mock("@/lib/utils/aws/s3-file-reference", () => ({
  normalizeS3ObjectKey: vi.fn((value: string) => `normalized/${value}`),
}));

describe("getFileFromAWS", () => {
  const previousBucket = process.env.AWS_S3_BUCKET;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AWS_S3_BUCKET;
  });

  afterAll(() => {
    if (previousBucket) {
      process.env.AWS_S3_BUCKET = previousBucket;
      return;
    }
    delete process.env.AWS_S3_BUCKET;
  });

  it("throws when AWS_S3_BUCKET is missing", async () => {
    await expect(getFileFromAWS("user_123/file.wav")).rejects.toThrow(
      "AWS_S3_BUCKET environment variable is not defined",
    );
    expect(awsS3Client.send).not.toHaveBeenCalled();
  });

  it("normalizes the key and calls S3 get object", async () => {
    const user = createTestUser();
    const task = createTestTask();
    process.env.AWS_S3_BUCKET = "droplet-bucket";

    vi.mocked(awsS3Client.send).mockResolvedValueOnce({
      Body: "stream",
    } as unknown as Awaited<ReturnType<typeof awsS3Client.send>>);

    const objectKey = `${user.clerkId}/audio/${task._id}.wav`;
    await getFileFromAWS(objectKey);

    const sentCommand = vi.mocked(awsS3Client.send).mock.calls[0]?.[0];

    expect(normalizeS3ObjectKey).toHaveBeenCalledWith(objectKey);
    expect(sentCommand).toBeInstanceOf(GetObjectCommand);
    expect((sentCommand as GetObjectCommand).input).toEqual({
      Bucket: "droplet-bucket",
      Key: `normalized/${objectKey}`,
    });
  });

  it("forwards byte range requests to S3", async () => {
    process.env.AWS_S3_BUCKET = "droplet-bucket";
    const objectKey = "user_123/audio/sample.wav";

    vi.mocked(awsS3Client.send).mockResolvedValueOnce({
      Body: "stream",
    } as unknown as Awaited<ReturnType<typeof awsS3Client.send>>);

    await getFileFromAWS(objectKey, { range: "bytes=0-1023" });

    const sentCommand = vi.mocked(awsS3Client.send).mock.calls[0]?.[0];

    expect((sentCommand as GetObjectCommand).input).toEqual({
      Bucket: "droplet-bucket",
      Key: `normalized/${objectKey}`,
      Range: "bytes=0-1023",
    });
  });
});
