import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { awsS3Client } from "@/constants/aws";
import deleteS3Prefix from "@/lib/utils/aws/delete-s3-prefix";
import { createTestUser } from "../test-support";

vi.mock("@/constants/aws", () => ({
  awsS3Client: {
    send: vi.fn(),
  },
}));

describe("delete-s3-prefix", () => {
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

  it("returns zero when bucket env is missing or prefix is empty", async () => {
    const user = createTestUser();

    await expect(deleteS3Prefix(`${user.clerkId}/`)).resolves.toBe(0);
    process.env.AWS_S3_BUCKET = "droplet-bucket";
    await expect(deleteS3Prefix("")).resolves.toBe(0);

    expect(awsS3Client.send).not.toHaveBeenCalled();
  });

  it("lists and deletes all objects across paginated responses", async () => {
    const user = createTestUser();
    process.env.AWS_S3_BUCKET = "droplet-bucket";

    vi.mocked(awsS3Client.send)
      .mockResolvedValueOnce({
        Contents: [{ Key: `${user.clerkId}/files/a.txt` }, { Key: null }],
        NextContinuationToken: "next_page",
      } as unknown as Awaited<ReturnType<typeof awsS3Client.send>>)
      .mockResolvedValueOnce(
        {} as unknown as Awaited<ReturnType<typeof awsS3Client.send>>,
      )
      .mockResolvedValueOnce({
        Contents: [{ Key: `${user.clerkId}/files/b.txt` }],
      } as unknown as Awaited<ReturnType<typeof awsS3Client.send>>)
      .mockResolvedValueOnce(
        {} as unknown as Awaited<ReturnType<typeof awsS3Client.send>>,
      );

    const deletedCount = await deleteS3Prefix(`${user.clerkId}/files/`);

    expect(deletedCount).toBe(2);
    expect(awsS3Client.send).toHaveBeenCalledTimes(4);

    const firstCall = vi.mocked(awsS3Client.send).mock.calls[0]?.[0];
    const secondCall = vi.mocked(awsS3Client.send).mock.calls[1]?.[0];
    const thirdCall = vi.mocked(awsS3Client.send).mock.calls[2]?.[0];
    const fourthCall = vi.mocked(awsS3Client.send).mock.calls[3]?.[0];

    expect(firstCall).toBeInstanceOf(ListObjectsV2Command);
    expect(secondCall).toBeInstanceOf(DeleteObjectsCommand);
    expect(thirdCall).toBeInstanceOf(ListObjectsV2Command);
    expect(fourthCall).toBeInstanceOf(DeleteObjectsCommand);
  });
});
