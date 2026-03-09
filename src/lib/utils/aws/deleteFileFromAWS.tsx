import { awsS3Client } from "@/constants/aws";
import {
  DeleteObjectCommand,
  waitUntilObjectNotExists,
} from "@aws-sdk/client-s3";

// Function to delete single object from S3
export default async function deleteFileFromAWS(
  username: string,
  fileName: string,
  folder: string,
): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET as string;
  const filePath = `${username}/${folder}/${fileName}`;
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
