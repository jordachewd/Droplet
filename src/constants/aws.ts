import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "@/lib/utils/require-env";

export const awsS3Client = new S3Client({
  region: requireEnv("AWS_S3_REGION"),
  credentials: {
    accessKeyId: requireEnv("AWS_S3_ACCESS_ID"),
    secretAccessKey: requireEnv("AWS_S3_SECRET_KEY"),
  },
});
