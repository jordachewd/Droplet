import { awsS3Client } from "@/constants/aws";
import { normalizeS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";
import {
  DeleteObjectCommand,
  waitUntilObjectNotExists,
} from "@aws-sdk/client-s3";

// Function to delete single object from S3
export default async function deleteFileFromAWS(
  objectKey: string,
): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET environment variable is not defined");
  }

  const filePath = normalizeS3ObjectKey(objectKey);
  const params = {
    Bucket: bucketName,
    Key: filePath,
  };
  const awsCommand = new DeleteObjectCommand(params);
  await awsS3Client.send(awsCommand);
  await waitUntilObjectNotExists(
    { client: awsS3Client, maxWaitTime: 30 },
    { Bucket: bucketName, Key: filePath },
  );
}
