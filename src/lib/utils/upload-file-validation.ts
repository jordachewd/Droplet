const UPLOAD_MIME_TYPE_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type UploadMimeType = keyof typeof UPLOAD_MIME_TYPE_TO_EXTENSION;

const ALLOWED_UPLOAD_MIME_TYPES = new Set<string>(
  Object.keys(UPLOAD_MIME_TYPE_TO_EXTENSION),
);

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

function isUploadMimeType(mimeType: string): mimeType is UploadMimeType {
  return mimeType in UPLOAD_MIME_TYPE_TO_EXTENSION;
}

type UploadFileLike = {
  size: number;
  type: string;
};

type UploadValidationResult = {
  isValid: boolean;
  message?: string;
  status?: number;
};

export function validateUploadFile(
  file: UploadFileLike | null,
): UploadValidationResult {
  if (!file) {
    return {
      isValid: false,
      message: "No file uploaded.",
      status: 400,
    };
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    return {
      isValid: false,
      message:
        "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif.",
      status: 400,
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      isValid: false,
      message: `File is too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
      status: 400,
    };
  }

  return { isValid: true };
}

export function getUploadFileExtension(mimeType: string): string | null {
  if (!isUploadMimeType(mimeType)) {
    return null;
  }

  return UPLOAD_MIME_TYPE_TO_EXTENSION[mimeType];
}
