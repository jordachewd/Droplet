import "server-only";

import { awsS3Client } from "@/constants/aws";
import { resolveS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";
import { ContentItem, Message } from "@/types";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const VISION_PRESIGNED_URL_TTL_SECONDS = 15 * 60;
const INTERNAL_DOWNLOAD_ROUTE_PATH = "/api/download";

function isInternalDownloadKeyUrl(rawUrl: string): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(rawUrl, "https://droplet.local");
    return (
      parsedUrl.pathname === INTERNAL_DOWNLOAD_ROUTE_PATH &&
      parsedUrl.searchParams.has("key")
    );
  } catch {
    // Invalid user-provided URLs are expected here; treat them as non-internal.
    return false;
  }
}

async function buildVisionPresignedUrl(
  objectKey: string,
): Promise<string | null> {
  const bucketName = process.env.AWS_S3_BUCKET?.trim();

  if (!bucketName) {
    process.stderr.write(
      "[generateResponse] Failed to build vision pre-signed URL: missing AWS_S3_BUCKET\n",
    );
    return null;
  }

  try {
    return await getSignedUrl(
      awsS3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
      {
        expiresIn: VISION_PRESIGNED_URL_TTL_SECONDS,
      },
    );
  } catch (error) {
    process.stderr.write(
      `[generateResponse] Failed to build vision pre-signed URL for objectKey=${objectKey}: ${error instanceof Error ? error.message : "unknown"}\n`,
    );
    return null;
  }
}

export async function resolveImageInputUrlsForOpenAI(
  messages: Message[],
): Promise<Message[]> {
  let hasChanges = false;
  const transformedMessages: Message[] = [];

  for (const message of messages) {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      transformedMessages.push(message);
      continue;
    }

    let messageChanged = false;
    const transformedContent: ContentItem[] = [];

    for (const item of message.content) {
      if (
        item.type !== "image_url" ||
        typeof item.image_url?.url !== "string"
      ) {
        transformedContent.push(item);
        continue;
      }

      const imageUrl = item.image_url.url;

      if (!isInternalDownloadKeyUrl(imageUrl)) {
        transformedContent.push(item);
        continue;
      }

      const objectKey = resolveS3ObjectKey(imageUrl);

      if (!objectKey) {
        transformedContent.push(item);
        continue;
      }

      const presignedUrl = await buildVisionPresignedUrl(objectKey);

      if (!presignedUrl) {
        transformedContent.push(item);
        continue;
      }

      messageChanged = true;
      hasChanges = true;

      transformedContent.push({
        ...item,
        image_url: {
          url: presignedUrl,
        },
      });
    }

    transformedMessages.push(
      messageChanged ? { ...message, content: transformedContent } : message,
    );
  }

  return hasChanges ? transformedMessages : messages;
}
