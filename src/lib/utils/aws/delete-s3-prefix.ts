import { awsS3Client } from "@/constants/aws";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function deleteS3Prefix(prefix: string): Promise<number> {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName || !prefix) {
    return 0;
  }

  let deletedObjectsCount = 0;
  let continuationToken: string | undefined;

  do {
    const listResponse = await awsS3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const objectKeys =
      listResponse.Contents?.flatMap((item) =>
        item.Key ? [{ Key: item.Key }] : [],
      ) ?? [];

    if (objectKeys.length > 0) {
      await awsS3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectKeys,
            Quiet: true,
          },
        }),
      );
      deletedObjectsCount += objectKeys.length;
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return deletedObjectsCount;
}
