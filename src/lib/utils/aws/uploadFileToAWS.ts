import "server-only";
import { awsS3Client } from "@/constants/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  buildPrivateS3AssetUrl,
  buildS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";

// Function to upload files to AWS S3
export default async function uploadFileToAWS(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string,
): Promise<string> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET;

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET environment variable is not defined");
    }

    const filePath = buildS3ObjectKey(folder, fileName);

    const params = {
      Bucket: bucketName,
      Key: filePath,
      Body: file,
      ContentType: contentType,
    };

    const putObjectToAWS = new PutObjectCommand(params);

    await awsS3Client.send(putObjectToAWS);

    return buildPrivateS3AssetUrl(filePath);
  } catch (error) {
    throw new Error("File upload failed", { cause: error });
  }
}
