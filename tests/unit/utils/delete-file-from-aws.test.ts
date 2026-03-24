import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { awsS3Client } from "@/constants/aws";
import { normalizeS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";
import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import { waitUntilObjectNotExists } from "@aws-sdk/client-s3";

const deleteObjectCommandMock = vi.hoisted(() =>
  vi.fn(function DeleteObjectCommand(
    this: { command: string; input: { Bucket: string; Key: string } },
    params: { Bucket: string; Key: string },
  ) {
    this.command = "DeleteObjectCommand";
    this.input = params;
  }),
);

vi.mock("@/constants/aws", () => ({
  awsS3Client: {
    send: vi.fn(),
  },
}));

vi.mock("@/lib/utils/aws/s3-file-reference", () => ({
  normalizeS3ObjectKey: vi.fn((objectKey: string) => objectKey),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: deleteObjectCommandMock,
  waitUntilObjectNotExists: vi.fn(),
}));

describe("deleteFileFromAWS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AWS_S3_BUCKET", "droplet-bucket");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deletes the normalized object key and waits until S3 confirms deletion", async () => {
    vi.mocked(normalizeS3ObjectKey).mockReturnValueOnce(
      "user_123/images/file.png",
    );
    vi.mocked(awsS3Client.send).mockResolvedValueOnce({} as never);
    vi.mocked(waitUntilObjectNotExists).mockResolvedValueOnce({} as never);

    await deleteFileFromAWS(
      "https://bucket.s3.amazonaws.com/user_123/images/file.png",
    );

    expect(normalizeS3ObjectKey).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/user_123/images/file.png",
    );
    expect(deleteObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "droplet-bucket",
      Key: "user_123/images/file.png",
    });
    expect(awsS3Client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "DeleteObjectCommand",
        input: {
          Bucket: "droplet-bucket",
          Key: "user_123/images/file.png",
        },
      }),
    );
    expect(waitUntilObjectNotExists).toHaveBeenCalledWith(
      { client: awsS3Client, maxWaitTime: 30 },
      { Bucket: "droplet-bucket", Key: "user_123/images/file.png" },
    );
  });

  it("throws when AWS_S3_BUCKET is not defined", async () => {
    vi.unstubAllEnvs();

    await expect(deleteFileFromAWS("user_123/images/file.png")).rejects.toThrow(
      "AWS_S3_BUCKET environment variable is not defined",
    );

    expect(normalizeS3ObjectKey).not.toHaveBeenCalled();
    expect(awsS3Client.send).not.toHaveBeenCalled();
    expect(waitUntilObjectNotExists).not.toHaveBeenCalled();
  });

  it("propagates S3 delete errors and skips the waiter call", async () => {
    vi.mocked(awsS3Client.send).mockRejectedValueOnce(new Error("S3 failed"));

    await expect(deleteFileFromAWS("user_123/images/file.png")).rejects.toThrow(
      "S3 failed",
    );

    expect(waitUntilObjectNotExists).not.toHaveBeenCalled();
  });

  it("propagates waiter errors after issuing the delete command", async () => {
    vi.mocked(awsS3Client.send).mockResolvedValueOnce({} as never);
    vi.mocked(waitUntilObjectNotExists).mockRejectedValueOnce(
      new Error("Timed out waiting for delete"),
    );

    await expect(deleteFileFromAWS("user_123/images/file.png")).rejects.toThrow(
      "Timed out waiting for delete",
    );

    expect(awsS3Client.send).toHaveBeenCalledOnce();
    expect(waitUntilObjectNotExists).toHaveBeenCalledOnce();
  });
});
