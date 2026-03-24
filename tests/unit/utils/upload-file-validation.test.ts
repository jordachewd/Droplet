import { describe, expect, it } from "vitest";
import {
  getUploadFileExtension,
  MAX_UPLOAD_SIZE_BYTES,
  validateUploadFile,
} from "@/lib/utils/upload-file-validation";

describe("validateUploadFile", () => {
  it("returns 400 when no file is provided", () => {
    expect(validateUploadFile(null)).toEqual({
      isValid: false,
      message: "No file uploaded.",
      status: 400,
    });
  });

  it("returns 400 when MIME type is not allowed", () => {
    expect(
      validateUploadFile({
        size: 1024,
        type: "application/pdf",
      }),
    ).toEqual({
      isValid: false,
      message:
        "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif.",
      status: 400,
    });
  });

  it("returns 400 when file size is zero or negative", () => {
    expect(
      validateUploadFile({
        size: 0,
        type: "image/png",
      }),
    ).toEqual({
      isValid: false,
      message: "File is empty.",
      status: 400,
    });
  });

  it("returns 400 when file exceeds maximum allowed size", () => {
    expect(
      validateUploadFile({
        size: MAX_UPLOAD_SIZE_BYTES + 1,
        type: "image/png",
      }),
    ).toEqual({
      isValid: false,
      message: `File is too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
      status: 400,
    });
  });

  it("accepts valid image files up to max size", () => {
    expect(
      validateUploadFile({
        size: MAX_UPLOAD_SIZE_BYTES,
        type: "image/webp",
      }),
    ).toEqual({ isValid: true });
  });
});

describe("getUploadFileExtension", () => {
  it("returns mapped extension for supported MIME types", () => {
    expect(getUploadFileExtension("image/jpeg")).toBe("jpg");
    expect(getUploadFileExtension("image/png")).toBe("png");
    expect(getUploadFileExtension("image/webp")).toBe("webp");
    expect(getUploadFileExtension("image/gif")).toBe("gif");
  });

  it("returns null for unsupported MIME types", () => {
    expect(getUploadFileExtension("application/pdf")).toBeNull();
  });
});
