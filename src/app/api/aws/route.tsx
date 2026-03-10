import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import {
  buildS3ObjectKey,
  isUserOwnedS3ObjectKey,
  normalizeS3ObjectKey,
  resolveS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";
import { generateString } from "@/lib/utils/generateString";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MAX_BASE64_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeFolderPath(folder: string): string {
  return normalizeS3ObjectKey(folder).replace(/\/+$/g, "");
}

function resolveDeleteObjectKey(
  payload: Record<string, unknown>,
): string | null {
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
        { message: "User not authenticated." },
        { status: 401 },
      );
    }

    const { taskId, imgBuffer } = await req.json();

    if (
      typeof taskId !== "string" ||
      typeof imgBuffer !== "string" ||
      !taskId ||
      !imgBuffer
    ) {
      return NextResponse.json(
        { message: "TaskId and image buffer are required." },
        { status: 400 },
      );
    }

    const normalizedImgBuffer = imgBuffer.replace(/^data:[^;]+;base64,/, "");
    const payloadSizeBytes = Buffer.byteLength(normalizedImgBuffer, "base64");

    if (payloadSizeBytes > MAX_BASE64_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Image payload exceeds 10MB limit." },
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
  } catch (error: unknown) {
    console.error("AWS API Error:", error);

    return NextResponse.json(
      { message: "File upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user?.id) {
      return NextResponse.json(
        { message: "User not authenticated." },
        { status: 401 },
      );
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const objectKey = resolveDeleteObjectKey(payload);

    if (!objectKey) {
      return NextResponse.json(
        {
          message:
            "objectKey, fileUrl, or folder and fileName are required for deletion.",
        },
        { status: 400 },
      );
    }

    if (!isUserOwnedS3ObjectKey(user.id, objectKey)) {
      return NextResponse.json(
        {
          message: "Forbidden: file does not belong to the authenticated user.",
        },
        { status: 403 },
      );
    }

    await deleteFileFromAWS(objectKey);

    return NextResponse.json({
      message: "Image deleted successfully",
      objectKey,
    });
  } catch (error) {
    console.error("AWS delete error:", error);

    return NextResponse.json(
      { message: "File deletion failed" },
      { status: 500 },
    );
  }
}
