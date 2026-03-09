import { describe, expect, it } from "vitest";
import {
  getUploadFileExtension,
  MAX_UPLOAD_SIZE_BYTES,
  validateUploadFile,
} from "@/lib/utils/upload-file-validation";

describe("upload-file-validation", () => {
  it("rejects missing files", () => {
    const result = validateUploadFile(null);

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects unsupported mime types", () => {
    const result = validateUploadFile({
      type: "application/pdf",
      size: 50,
    });

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects files above max size", () => {
    const result = validateUploadFile({
      type: "image/png",
      size: MAX_UPLOAD_SIZE_BYTES + 1,
    });

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(400);
  });

  it("accepts valid image uploads", () => {
    const result = validateUploadFile({
      type: "image/webp",
      size: 1_024,
    });

    expect(result).toEqual({ isValid: true });
  });

  it("resolves file extensions from allowed mime types", () => {
    expect(getUploadFileExtension("image/jpeg")).toBe("jpg");
    expect(getUploadFileExtension("image/png")).toBe("png");
  });

  it("returns null for unknown mime types", () => {
    expect(getUploadFileExtension("application/pdf")).toBeNull();
  });
});
