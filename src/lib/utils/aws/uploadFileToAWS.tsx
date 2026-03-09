import { awsS3Client } from "@/constants/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Function to upload images to AWS S3
export default async function uploadFileToAWS(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string,
): Promise<string> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_S3_REGION;

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET environment variable is not defined");
    }

    if (!region) {
      throw new Error("AWS_S3_REGION environment variable is not defined");
    }

    const filePath = `${folder}/${fileName}`;

    const params = {
      Bucket: bucketName,
      Key: filePath,
      Body: file,
      ContentType: contentType,
    };

    const putObjectToAWS = new PutObjectCommand(params);

    await awsS3Client.send(putObjectToAWS);

    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filePath}`;

    return fileUrl;
  } catch (error) {
    console.error("AWS S3 Upload Error:", error);
    throw new Error("File upload failed");
  }
}
