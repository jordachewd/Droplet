import { describe, expect, it } from "vitest";
import { normalizePublicAssetUrl } from "@/lib/utils/normalize-public-asset-url";

describe("normalizePublicAssetUrl", () => {
  it("encodes reserved path characters in asset URLs", () => {
    expect(
      normalizePublicAssetUrl(
        "https://bucket.s3.region.amazonaws.com/user_123/images/image#v1+.png",
      ),
    ).toBe(
      "https://bucket.s3.region.amazonaws.com/user_123/images/image%23v1%2B.png",
    );
  });

  it("does not double-encode an already normalized URL", () => {
    expect(
      normalizePublicAssetUrl(
        "https://bucket.s3.region.amazonaws.com/user_123/images/image%23v1%2B.png",
      ),
    ).toBe(
      "https://bucket.s3.region.amazonaws.com/user_123/images/image%23v1%2B.png",
    );
  });

  it("returns the original value when the input is not a valid URL", () => {
    expect(normalizePublicAssetUrl("not-a-url")).toBe("not-a-url");
  });

  it("does not alter data URLs used for local previews", () => {
    const dataUrl = "data:image/png;base64,ZmFrZQ==";

    expect(normalizePublicAssetUrl(dataUrl)).toBe(dataUrl);
  });
});
