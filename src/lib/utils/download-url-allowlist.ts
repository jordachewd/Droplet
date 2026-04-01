import "server-only";
const DEFAULT_ALLOWED_DOWNLOAD_HOSTS = [
  "oaidalleapiprodscus.blob.core.windows.net",
  "img.clerk.com",
] as const;

const DOWNLOAD_ALLOWLIST_ENV_KEY = "DOWNLOAD_URL_ALLOWLIST";

function getAwsBucketHost(): string[] {
  const bucketName = process.env.AWS_S3_BUCKET?.trim().toLowerCase();
  const region = process.env.AWS_S3_REGION?.trim().toLowerCase();

  if (!bucketName || !region) {
    return [];
  }

  return [`${bucketName}.s3.${region}.amazonaws.com`];
}

function parseAllowedHostsFromEnv(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function getAllowedDownloadHosts(): Set<string> {
  const envValue = process.env[DOWNLOAD_ALLOWLIST_ENV_KEY];

  return new Set([
    ...DEFAULT_ALLOWED_DOWNLOAD_HOSTS,
    ...getAwsBucketHost(),
    ...parseAllowedHostsFromEnv(envValue),
  ]);
}

export function isAllowedDownloadUrl(
  rawUrl: string,
  allowedHosts: Set<string> = getAllowedDownloadHosts(),
): boolean {
  try {
    const parsed = new URL(rawUrl);
    const normalizedHost = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:") {
      return false;
    }

    return allowedHosts.has(normalizedHost);
  } catch {
    // URL/path parse failure is non-fatal; invalid URLs are treated as disallowed.
    return false;
  }
}

export { DOWNLOAD_ALLOWLIST_ENV_KEY };
