/**
 * Handles file upload requests.
 *
 * The POST function processes incoming file upload requests. It extracts the file from the request,
 * saves it to the "public/uploads" directory with a unique name, and returns the file name in the response.
 *
 * If the file is not provided in the request, it responds with an error message and a 400 status code.
 * If any error occurs during the file handling process, it responds with a 500 status code and an error message.
 *
 * @param {NextRequest} req - The incoming request object containing the file to be uploaded.
 * @returns {Promise<NextResponse>} - A promise that resolves to a response object containing the file name or an error message.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUploadFileExtension,
  validateUploadFile,
} from "@/lib/utils/upload-file-validation";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { buildS3ObjectKey } from "@/lib/utils/aws/s3-file-reference";
import { connectToDatabase } from "@/lib/database/mongoose";
import Upload from "@/lib/database/models/upload.model";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

export const maxDuration = 30;

const uploadFormDataSchema = z
  .object({
    file: z.instanceof(File),
    taskId: z.string().trim().min(1).optional(),
  })
  .strict();

type UploadFormData = z.infer<typeof uploadFormDataSchema>;

const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 30;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const activeUser = await requireActiveUser(userId);
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

    const rateLimit = await enforceSlidingWindowRateLimit({
      key: `upload:${userId}`,
      limit: UPLOAD_RATE_LIMIT_MAX_REQUESTS,
      windowMs: UPLOAD_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again shortly." },
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

    const formData = await req.formData();
    const rawTaskId = formData.get("taskId");
    const normalizedTaskId =
      typeof rawTaskId === "string" && rawTaskId.trim().length > 0
        ? rawTaskId.trim()
        : undefined;
    const parsedFormData = uploadFormDataSchema.safeParse({
      file: formData.get("file"),
      taskId: normalizedTaskId,
    });

    if (!parsedFormData.success) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const { file, taskId }: UploadFormData = parsedFormData.data;

    const validation = validateUploadFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status || 400 },
      );
    }

    const fileExtension = getUploadFileExtension(file.type);
    if (!fileExtension) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif.",
        },
        { status: 400 },
      );
    }
    const fileName = `uploaded_file_${Date.now()}.${fileExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `${userId}/uploads`;
    const objectKey = buildS3ObjectKey(folder, fileName);
    const fileUrl = await uploadFileToAWS(buffer, fileName, file.type, folder);

    await connectToDatabase();
    await Upload.create({
      userId,
      fileName,
      objectKey,
      s3Url: fileUrl,
      contentType: file.type,
      sizeBytes: file.size,
      taskId,
      createdAt: new Date(),
    });

    return NextResponse.json({ fileName, fileUrl, objectKey });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
