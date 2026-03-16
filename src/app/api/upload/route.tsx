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
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const uploadFormDataSchema = z
  .object({
    file: z.instanceof(File),
  })
  .strict();

type UploadFormData = z.infer<typeof uploadFormDataSchema>;

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
    const parsedFormData = uploadFormDataSchema.safeParse({
      file: formData.get("file"),
    });

    if (!parsedFormData.success) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const { file }: UploadFormData = parsedFormData.data;

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

    return NextResponse.json({ fileName, fileUrl, objectKey });
  } catch {
    return NextResponse.json(
      { message: "Failed to upload file." },
      { status: 500 },
    );
  }
}
