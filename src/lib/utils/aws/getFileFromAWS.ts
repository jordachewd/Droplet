import "server-only";
import { awsS3Client } from "@/constants/aws";
import {
  GetObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { normalizeS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";

export default async function getFileFromAWS(
  objectKey: string,
): Promise<GetObjectCommandOutput> {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET environment variable is not defined");
  }

  return awsS3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: normalizeS3ObjectKey(objectKey),
    }),
  );
}
