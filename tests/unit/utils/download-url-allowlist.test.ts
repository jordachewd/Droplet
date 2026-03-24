import { afterEach, describe, expect, it } from "vitest";
import {
  DOWNLOAD_ALLOWLIST_ENV_KEY,
  getAllowedDownloadHosts,
  isAllowedDownloadUrl,
} from "@/lib/utils/download-url-allowlist";
import { createTestUser } from "../test-support";

describe("download-url-allowlist", () => {
  const previousEnvValue = process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];
  const previousBucket = process.env.AWS_S3_BUCKET;
  const previousRegion = process.env.AWS_S3_REGION;

  afterEach(() => {
    if (previousEnvValue === undefined) {
      delete process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];
    } else {
      process.env[DOWNLOAD_ALLOWLIST_ENV_KEY] = previousEnvValue;
    }

    if (previousBucket === undefined) {
      delete process.env.AWS_S3_BUCKET;
    } else {
      process.env.AWS_S3_BUCKET = previousBucket;
    }

    if (previousRegion === undefined) {
      delete process.env.AWS_S3_REGION;
    } else {
      process.env.AWS_S3_REGION = previousRegion;
    }
  });

  it("builds allowed hosts from defaults, env, and aws bucket host", () => {
    process.env.AWS_S3_BUCKET = "Droplet-Bucket";
    process.env.AWS_S3_REGION = "EU-CENTRAL-1";
    process.env[DOWNLOAD_ALLOWLIST_ENV_KEY] =
      "cdn.example.com, media.example.com";

    const hosts = getAllowedDownloadHosts();

    expect(hosts.has("img.clerk.com")).toBe(true);
    expect(hosts.has("cdn.example.com")).toBe(true);
    expect(hosts.has("droplet-bucket.s3.eu-central-1.amazonaws.com")).toBe(
      true,
    );
  });

  it("allows only https urls on allowlisted hosts", () => {
    const user = createTestUser();
    const allowedHosts = new Set(["example.com"]);

    expect(
      isAllowedDownloadUrl(
        `https://example.com/${user.clerkId}/assets/file.png`,
        allowedHosts,
      ),
    ).toBe(true);
    expect(
      isAllowedDownloadUrl(
        `http://example.com/${user.clerkId}/assets/file.png`,
        allowedHosts,
      ),
    ).toBe(false);
    expect(
      isAllowedDownloadUrl(
        `https://not-allowed.com/${user.clerkId}/assets/file.png`,
        allowedHosts,
      ),
    ).toBe(false);
  });
});
