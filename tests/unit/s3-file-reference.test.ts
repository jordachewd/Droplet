import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPrivateS3AssetUrl,
  buildS3ObjectKey,
  isUserOwnedS3ObjectKey,
  resolveS3ObjectKey,
  resolveStoredAssetUrl,
} from "@/lib/utils/aws/s3-file-reference";

describe("s3-file-reference", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a private asset route URL from an object key", () => {
    expect(buildPrivateS3AssetUrl("user_123/images/file.png")).toBe(
      "/api/download?key=user_123%2Fimages%2Ffile.png",
    );
  });

  it("builds an object key from folder and file name", () => {
    expect(buildS3ObjectKey("user_123/images", "file.png")).toBe(
      "user_123/images/file.png",
    );
  });

  it("resolves the S3 key from an internal app asset URL", () => {
    expect(
      resolveS3ObjectKey("/api/download?key=user_123%2Fimages%2Ffile.png"),
    ).toBe("user_123/images/file.png");
  });

  it("resolves the S3 key from a legacy public bucket URL", () => {
    vi.stubEnv("AWS_S3_BUCKET", "bucket-name");
    vi.stubEnv("AWS_S3_REGION", "eu-central-1");

    expect(
      resolveS3ObjectKey(
        "https://bucket-name.s3.eu-central-1.amazonaws.com/user_123/images/image%23v1%2B.png",
      ),
    ).toBe("user_123/images/image#v1+.png");
  });

  it("returns null for arbitrary strings that are not object keys", () => {
    expect(resolveS3ObjectKey("not-a-url")).toBeNull();
  });

  it("wraps external URLs in the app proxy route", () => {
    expect(resolveStoredAssetUrl("https://img.clerk.com/avatar.png")).toBe(
      "/api/download?url=https%3A%2F%2Fimg.clerk.com%2Favatar.png",
    );
  });

  it("matches user ownership by object-key prefix", () => {
    expect(isUserOwnedS3ObjectKey("user_123", "user_123/images/file.png")).toBe(
      true,
    );
    expect(
      isUserOwnedS3ObjectKey("user_123", "other_user/images/file.png"),
    ).toBe(false);
  });
});
