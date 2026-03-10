import { afterEach, describe, expect, it } from "vitest";
import {
  DOWNLOAD_ALLOWLIST_ENV_KEY,
  getAllowedDownloadHosts,
  isAllowedDownloadUrl,
} from "@/lib/utils/download-url-allowlist";

describe("download-url-allowlist", () => {
  const originalAllowlist = process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];
  const originalBucket = process.env.AWS_S3_BUCKET;
  const originalRegion = process.env.AWS_S3_REGION;

  afterEach(() => {
    if (typeof originalAllowlist === "string") {
      process.env[DOWNLOAD_ALLOWLIST_ENV_KEY] = originalAllowlist;
    } else {
      delete process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];
    }

    if (typeof originalBucket === "string") {
      process.env.AWS_S3_BUCKET = originalBucket;
    } else {
      delete process.env.AWS_S3_BUCKET;
    }

    if (typeof originalRegion === "string") {
      process.env.AWS_S3_REGION = originalRegion;
    } else {
      delete process.env.AWS_S3_REGION;
    }
  });

  it("accepts known allowed https hosts", () => {
    expect(
      isAllowedDownloadUrl(
        "https://oaidalleapiprodscus.blob.core.windows.net/path/image.png",
      ),
    ).toBe(true);
  });

  it("rejects non-https URLs", () => {
    expect(isAllowedDownloadUrl("http://img.clerk.com/avatar.png")).toBe(false);
  });

  it("rejects hosts outside the allowlist", () => {
    expect(isAllowedDownloadUrl("https://example.com/image.png")).toBe(false);
  });

  it("merges additional hosts from environment", () => {
    process.env[DOWNLOAD_ALLOWLIST_ENV_KEY] = "assets.example.org";

    const hosts = getAllowedDownloadHosts();
    expect(hosts.has("assets.example.org")).toBe(true);
    expect(
      isAllowedDownloadUrl("https://assets.example.org/file.png", hosts),
    ).toBe(true);
  });

  it("allows the configured S3 bucket host automatically", () => {
    process.env.AWS_S3_BUCKET = "bucket-name";
    process.env.AWS_S3_REGION = "eu-central-1";

    const hosts = getAllowedDownloadHosts();

    expect(hosts.has("bucket-name.s3.eu-central-1.amazonaws.com")).toBe(true);
    expect(
      isAllowedDownloadUrl(
        "https://bucket-name.s3.eu-central-1.amazonaws.com/user_123/image.png",
        hosts,
      ),
    ).toBe(true);
  });

  it("rejects malformed URLs", () => {
    expect(isAllowedDownloadUrl("not-a-url")).toBe(false);
  });
});
