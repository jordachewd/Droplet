import { describe, expect, it } from "vitest";
import { normalizePublicAssetUrl } from "@/lib/utils/normalize-public-asset-url";

describe("normalize-public-asset-url", () => {
  it("returns the raw value when the input is not a valid URL", () => {
    expect(normalizePublicAssetUrl("not-a-url")).toBe("not-a-url");
  });

  it("returns non-http(s) URLs unchanged", () => {
    const ftpUrl = "ftp://example.com/my file.png";
    expect(normalizePublicAssetUrl(ftpUrl)).toBe(ftpUrl);
  });

  it("encodes pathname segments and preserves query parameters", () => {
    const input =
      "https://example.com/public folder/my image.png?download=true&v=1";

    expect(normalizePublicAssetUrl(input)).toBe(
      "https://example.com/public%20folder/my%20image.png?download=true&v=1",
    );
  });

  it("does not double-encode already encoded pathname segments", () => {
    const input = "https://example.com/public%20folder/my%20image.png";

    expect(normalizePublicAssetUrl(input)).toBe(input);
  });

  it("encodes hash fragments into the URL body format expected by the app", () => {
    const input =
      "https://example.com/folder/my file.png?download=true#Section 1";

    expect(normalizePublicAssetUrl(input)).toBe(
      "https://example.com/folder/my%20file.png%23Section%201?download=true",
    );
  });
});
