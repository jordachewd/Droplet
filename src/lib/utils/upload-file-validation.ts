import "server-only";

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

const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC_BYTES = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
] as const;
const GIF_MAGIC_BYTES = [0x47, 0x49, 0x46, 0x38] as const;
const WEBP_RIFF_MAGIC_BYTES = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_WEBP_MAGIC_BYTES = [0x57, 0x45, 0x42, 0x50] as const;

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

  if (file.size <= 0) {
    return {
      isValid: false,
      message: "File is empty.",
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

function hasSignatureAtOffset(
  bytes: Uint8Array,
  signature: readonly number[],
  offset: number = 0,
): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function detectUploadMimeTypeFromMagicBytes(
  buffer: ArrayBuffer,
): UploadMimeType | null {
  const bytes = new Uint8Array(buffer);

  if (hasSignatureAtOffset(bytes, JPEG_MAGIC_BYTES)) {
    return "image/jpeg";
  }

  if (hasSignatureAtOffset(bytes, PNG_MAGIC_BYTES)) {
    return "image/png";
  }

  if (hasSignatureAtOffset(bytes, GIF_MAGIC_BYTES)) {
    return "image/gif";
  }

  if (
    hasSignatureAtOffset(bytes, WEBP_RIFF_MAGIC_BYTES) &&
    hasSignatureAtOffset(bytes, WEBP_WEBP_MAGIC_BYTES, 8)
  ) {
    return "image/webp";
  }

  return null;
}

export function validateImageMagicBytes(buffer: ArrayBuffer): boolean {
  return detectUploadMimeTypeFromMagicBytes(buffer) !== null;
}

export function doesImageMagicBytesMatchMimeType(
  buffer: ArrayBuffer,
  mimeType: string,
): boolean {
  const detectedMimeType = detectUploadMimeTypeFromMagicBytes(buffer);
  return detectedMimeType !== null && detectedMimeType === mimeType;
}
