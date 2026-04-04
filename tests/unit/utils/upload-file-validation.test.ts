import { describe, expect, it } from "vitest";
import {
  doesImageMagicBytesMatchMimeType,
  getUploadFileExtension,
  MAX_UPLOAD_SIZE_BYTES,
  validateImageMagicBytes,
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

describe("validateImageMagicBytes", () => {
  it("accepts JPEG, PNG, GIF, and WebP signatures", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]).buffer;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      .buffer;
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer;
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x2a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]).buffer;

    expect(validateImageMagicBytes(jpeg)).toBe(true);
    expect(validateImageMagicBytes(png)).toBe(true);
    expect(validateImageMagicBytes(gif)).toBe(true);
    expect(validateImageMagicBytes(webp)).toBe(true);
  });

  it("rejects unknown signatures", () => {
    const textBuffer = new TextEncoder().encode("not-an-image").buffer;
    expect(validateImageMagicBytes(textBuffer)).toBe(false);
  });
});

describe("doesImageMagicBytesMatchMimeType", () => {
  it("returns true when magic bytes match declared MIME type", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      .buffer;

    expect(doesImageMagicBytesMatchMimeType(png, "image/png")).toBe(true);
  });

  it("returns false when magic bytes and MIME type mismatch", () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer;

    expect(doesImageMagicBytesMatchMimeType(gif, "image/png")).toBe(false);
  });
});
