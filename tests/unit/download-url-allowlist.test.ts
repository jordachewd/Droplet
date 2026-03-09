import { afterEach, describe, expect, it } from "vitest";
import {
  DOWNLOAD_ALLOWLIST_ENV_KEY,
  getAllowedDownloadHosts,
  isAllowedDownloadUrl,
} from "@/lib/utils/download-url-allowlist";

describe("download-url-allowlist", () => {
  const originalAllowlist = process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];

  afterEach(() => {
    if (typeof originalAllowlist === "string") {
      process.env[DOWNLOAD_ALLOWLIST_ENV_KEY] = originalAllowlist;
      return;
    }

    delete process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];
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

  it("rejects malformed URLs", () => {
    expect(isAllowedDownloadUrl("not-a-url")).toBe(false);
  });
});
