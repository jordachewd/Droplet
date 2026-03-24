import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPrivateS3AssetUrl,
  buildS3ObjectKey,
  getFileNameFromS3ObjectKey,
  isUserOwnedS3ObjectKey,
  normalizeS3ObjectKey,
  resolveS3ObjectKey,
  resolveStoredAssetUrl,
} from "@/lib/utils/aws/s3-file-reference";

describe("s3-file-reference utilities", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes object keys by trimming, decoding, and removing leading slashes", () => {
    expect(normalizeS3ObjectKey("  /user_1%2Fimages%2Fphoto.png  ")).toBe(
      "user_1/images/photo.png",
    );
  });

  it("builds object key from folder and filename with normalized segments", () => {
    expect(buildS3ObjectKey("/user_1/images/", "/photo.png")).toBe(
      "user_1/images/photo.png",
    );
    expect(buildS3ObjectKey("/", "photo.png")).toBe("photo.png");
  });

  it("builds private asset URL with optional download and filename flags", () => {
    expect(
      buildPrivateS3AssetUrl("user_1/images/photo.png", {
        download: true,
        filename: "avatar.png",
      }),
    ).toBe(
      "/api/download?key=user_1%2Fimages%2Fphoto.png&download=1&filename=avatar.png",
    );
  });

  it("resolves key from private asset route URLs", () => {
    expect(
      resolveS3ObjectKey(
        "/api/download?key=user_1%2Fimages%2Fphoto.png&download=1",
      ),
    ).toBe("user_1/images/photo.png");

    expect(resolveS3ObjectKey("/api/download?download=1")).toBeNull();
  });

  it("resolves key from configured bucket host URL", () => {
    vi.stubEnv("AWS_S3_BUCKET", "droplet-bucket");
    vi.stubEnv("AWS_S3_REGION", "us-east-1");

    expect(
      resolveS3ObjectKey(
        "https://droplet-bucket.s3.us-east-1.amazonaws.com/user_1/files/report.pdf",
      ),
    ).toBe("user_1/files/report.pdf");
  });

  it("returns null for empty, data URLs, and external absolute URLs", () => {
    expect(resolveS3ObjectKey("")).toBeNull();
    expect(resolveS3ObjectKey("data:image/png;base64,abc123")).toBeNull();
    expect(resolveS3ObjectKey("https://example.com/a/b.png")).toBeNull();
  });

  it("resolves raw relative object key candidates and rejects API routes", () => {
    expect(resolveS3ObjectKey("/user_1/images/photo.png")).toBe(
      "user_1/images/photo.png",
    );
    expect(resolveS3ObjectKey("user_1/images/photo.png")).toBe(
      "user_1/images/photo.png",
    );
    expect(resolveS3ObjectKey("/api/download")).toBeNull();
  });

  it("checks ownership by matching userId key prefix", () => {
    expect(isUserOwnedS3ObjectKey("user_1", "user_1/images/photo.png")).toBe(
      true,
    );
    expect(isUserOwnedS3ObjectKey("user_2", "user_1/images/photo.png")).toBe(
      false,
    );
  });

  it("extracts filename from object key or private route URL", () => {
    expect(getFileNameFromS3ObjectKey("user_1/docs/file.txt")).toBe("file.txt");
    expect(
      getFileNameFromS3ObjectKey("/api/download?key=user_1%2Fdocs%2Fscan.pdf"),
    ).toBe("scan.pdf");
  });

  it("resolves stored asset URLs across data URLs, object keys, and public URLs", () => {
    expect(resolveStoredAssetUrl("", { download: true })).toBe("");
    expect(resolveStoredAssetUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
    expect(
      resolveStoredAssetUrl("user_1/images/photo.png", {
        filename: "photo.png",
      }),
    ).toBe("/api/download?key=user_1%2Fimages%2Fphoto.png&filename=photo.png");
    expect(resolveStoredAssetUrl("relative-file.txt")).toBe(
      "relative-file.txt",
    );
    expect(
      resolveStoredAssetUrl("https://example.com/some file.png", {
        download: true,
      }),
    ).toBe(
      "/api/download?url=https%3A%2F%2Fexample.com%2Fsome%2520file.png&download=1",
    );
  });
});
