import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import {
  buildS3ObjectKey,
  isUserOwnedS3ObjectKey,
  normalizeS3ObjectKey,
  resolveS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";
import { generateString } from "@/lib/utils/generateString";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_BASE64_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const AWS_RATE_LIMIT_MAX_REQUESTS = 30;
const AWS_RATE_LIMIT_WINDOW_MS = 60_000;

const awsUploadBodySchema = z
  .object({
    taskId: nonEmptyStringSchema,
    imgBuffer: nonEmptyStringSchema,
  })
  .strict();

const awsDeleteBodySchema = z
  .object({
    objectKey: nonEmptyStringSchema.optional(),
    key: nonEmptyStringSchema.optional(),
    fileUrl: nonEmptyStringSchema.optional(),
    folder: nonEmptyStringSchema.optional(),
    fileName: nonEmptyStringSchema.optional(),
  })
  .strict();

type AwsDeleteBody = z.infer<typeof awsDeleteBodySchema>;

async function enforceAwsRouteRateLimit(
  userId: string,
): Promise<NextResponse | null> {
  const rateLimit = await enforceSlidingWindowRateLimit({
    key: `aws:${userId}`,
    limit: AWS_RATE_LIMIT_MAX_REQUESTS,
    windowMs: AWS_RATE_LIMIT_WINDOW_MS,
  });

  if (rateLimit.success) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    },
  );
}

function normalizeFolderPath(folder: string): string {
  return normalizeS3ObjectKey(folder).replace(/\/+$/g, "");
}

function resolveDeleteObjectKey(payload: AwsDeleteBody): string | null {
  const objectKeyCandidate =
    typeof payload.objectKey === "string"
      ? payload.objectKey
      : typeof payload.key === "string"
        ? payload.key
        : typeof payload.fileUrl === "string"
          ? payload.fileUrl
          : null;

  if (typeof objectKeyCandidate === "string" && objectKeyCandidate.trim()) {
    return resolveS3ObjectKey(objectKeyCandidate);
  }

  if (
    typeof payload.folder === "string" &&
    typeof payload.fileName === "string" &&
    payload.folder.trim() &&
    payload.fileName.trim()
  ) {
    return buildS3ObjectKey(
      normalizeFolderPath(payload.folder),
      payload.fileName.trim(),
    );
  }

  return null;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: "User not authenticated." },
        { status: 401 },
      );
    }
    const activeUser = await requireActiveUser(user.id);
    if (activeUser.status === "not_provisioned") {
      return NextResponse.json(
        {
          error: "Account not yet provisioned. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    if (activeUser.status === "suspended") {
      return NextResponse.json(
        { error: "Account suspended." },
        { status: 403 },
      );
    }

    const rateLimitResponse = await enforceAwsRouteRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsedBody = awsUploadBodySchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "TaskId and image buffer are required." },
        { status: 400 },
      );
    }

    const { taskId, imgBuffer } = parsedBody.data;

    const normalizedImgBuffer = imgBuffer.replace(/^data:[^;]+;base64,/, "");
    const payloadSizeBytes = Buffer.byteLength(normalizedImgBuffer, "base64");

    if (payloadSizeBytes > MAX_BASE64_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image payload exceeds 10MB limit." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(normalizedImgBuffer, "base64");
    const fileName = `${taskId}_image_${generateString()}.png`;
    const mimeType = "image/png";
    const folder = `${user.id}/${taskId}`;
    const objectKey = buildS3ObjectKey(folder, fileName);

    const fileUrl = await uploadFileToAWS(buffer, fileName, mimeType, folder);

    if (!fileUrl) {
      throw new Error("uploadFileToAWS returned undefined");
    }

    return NextResponse.json({ fileUrl, objectKey }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: "User not authenticated." },
        { status: 401 },
      );
    }
    const activeUser = await requireActiveUser(user.id);
    if (activeUser.status === "not_provisioned") {
      return NextResponse.json(
        {
          error: "Account not yet provisioned. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    if (activeUser.status === "suspended") {
      return NextResponse.json(
        { error: "Account suspended." },
        { status: 403 },
      );
    }

    const rateLimitResponse = await enforceAwsRouteRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsedBody = awsDeleteBodySchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            "objectKey, fileUrl, or folder and fileName are required for deletion.",
        },
        { status: 400 },
      );
    }

    const objectKey = resolveDeleteObjectKey(parsedBody.data);

    if (!objectKey) {
      return NextResponse.json(
        {
          error:
            "objectKey, fileUrl, or folder and fileName are required for deletion.",
        },
        { status: 400 },
      );
    }

    if (!isUserOwnedS3ObjectKey(user.id, objectKey)) {
      return NextResponse.json(
        {
          error: "Forbidden: file does not belong to the authenticated user.",
        },
        { status: 403 },
      );
    }

    await deleteFileFromAWS(objectKey);

    return NextResponse.json({
      message: "Image deleted successfully",
      objectKey,
    });
  } catch {
    return NextResponse.json(
      { error: "File deletion failed" },
      { status: 500 },
    );
  }
}
