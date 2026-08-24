import { afterEach, describe, expect, it, vi } from "vitest";

const originalAllowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS;

async function importNextConfig() {
  vi.resetModules();
  return import("../../../next.config");
}

describe("next.config", () => {
  afterEach(() => {
    if (typeof originalAllowedDevOrigins === "string") {
      process.env.NEXT_ALLOWED_DEV_ORIGINS = originalAllowedDevOrigins;
    } else {
      delete process.env.NEXT_ALLOWED_DEV_ORIGINS;
    }

    vi.resetModules();
  });

  it("defaults allowedDevOrigins to localhost values", async () => {
    delete process.env.NEXT_ALLOWED_DEV_ORIGINS;

    const { default: nextConfig } = await importNextConfig();

    expect(nextConfig.allowedDevOrigins).toEqual(["localhost", "127.0.0.1"]);
  });

  it("parses allowedDevOrigins from the environment", async () => {
    process.env.NEXT_ALLOWED_DEV_ORIGINS =
      "localhost, 172.20.208.1, localhost, 127.0.0.1";

    const { default: nextConfig } = await importNextConfig();

    expect(nextConfig.allowedDevOrigins).toEqual([
      "localhost",
      "172.20.208.1",
      "127.0.0.1",
    ]);
  });

  it("redirects /app/personas to /app/new for legacy bookmarks", async () => {
    const { default: nextConfig } = await importNextConfig();
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/app/personas",
          destination: "/app/new",
          permanent: false,
        }),
      ]),
    );
  });
});
