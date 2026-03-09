import deleteFileFromAWS from "@/lib/utils/aws/deleteFileFromAWS";
import uploadFileToAWS from "@/lib/utils/aws/uploadFileToAWS";
import { generateString } from "@/lib/utils/generateString";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MAX_BASE64_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeFolderPath(folder: string): string {
  return folder.trim().replace(/^\/+|\/+$/g, "");
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

    const fileUrl = await uploadFileToAWS(buffer, fileName, mimeType, folder);

    if (!fileUrl) {
      throw new Error("uploadFileToAWS returned undefined");
    }

    return NextResponse.json({ fileUrl }, { status: 200 });
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

    const { folder, fileName } = await req.json();

    if (
      typeof folder !== "string" ||
      typeof fileName !== "string" ||
      !folder.trim() ||
      !fileName.trim()
    ) {
      return NextResponse.json(
        { message: "Folder and fileName are required for deletion." },
        { status: 400 },
      );
    }

    const normalizedFolder = normalizeFolderPath(folder);
    const userOwnedPrefix = `${user.id}/`;

    if (!normalizedFolder.startsWith(userOwnedPrefix)) {
      return NextResponse.json(
        {
          message:
            "Forbidden: folder does not belong to the authenticated user.",
        },
        { status: 403 },
      );
    }

    const userScopedFolder = normalizedFolder.slice(userOwnedPrefix.length);

    if (!userScopedFolder) {
      return NextResponse.json(
        { message: "Invalid folder path." },
        { status: 400 },
      );
    }

    await deleteFileFromAWS(user.id, fileName, userScopedFolder);

    return NextResponse.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("AWS delete error:", error);

    return NextResponse.json(
      { message: "File deletion failed" },
      { status: 500 },
    );
  }
}
