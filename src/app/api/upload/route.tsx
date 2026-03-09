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
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const formData = await req.formData();

    const file = formData.get("file") as File | null;

    const validation = validateUploadFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status || 400 },
      );
    }

    const safeFile = file as File;

    const fileExtension = getUploadFileExtension(safeFile.type);
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

    const buffer = Buffer.from(await safeFile.arrayBuffer());
    const folder = `${userId}/uploads`;
    const fileUrl = await uploadFileToAWS(
      buffer,
      fileName,
      safeFile.type,
      folder,
    );

    return NextResponse.json({ fileName, fileUrl });
  } catch {
    return NextResponse.json(
      { message: "Failed to upload file." },
      { status: 500 },
    );
  }
}
