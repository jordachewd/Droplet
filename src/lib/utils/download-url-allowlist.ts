const DEFAULT_ALLOWED_DOWNLOAD_HOSTS = [
  "oaidalleapiprodscus.blob.core.windows.net",
  "img.clerk.com",
] as const;

const DOWNLOAD_ALLOWLIST_ENV_KEY = "DOWNLOAD_URL_ALLOWLIST";

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
    return false;
  }
}

export { DOWNLOAD_ALLOWLIST_ENV_KEY };
