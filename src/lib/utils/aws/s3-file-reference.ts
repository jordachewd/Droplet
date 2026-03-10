import { normalizePublicAssetUrl } from "@/lib/utils/normalize-public-asset-url";

const INTERNAL_APP_ORIGIN = "https://cellesseon.local";
export const PRIVATE_ASSET_ROUTE_PATH = "/api/download";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isRawS3ObjectKeyCandidate(value: string): boolean {
  const normalizedValue = value.replace(/^\/+/, "");

  return normalizedValue.includes("/") && !normalizedValue.startsWith("api/");
}

function getConfiguredBucketHost(): string | null {
  const bucketName = process.env.AWS_S3_BUCKET?.trim().toLowerCase();
  const region = process.env.AWS_S3_REGION?.trim().toLowerCase();

  if (!bucketName || !region) {
    return null;
  }

  return `${bucketName}.s3.${region}.amazonaws.com`;
}

export function normalizeS3ObjectKey(rawKey: string): string {
  return safeDecodeURIComponent(rawKey.trim()).replace(/^\/+/, "");
}

export function buildS3ObjectKey(folder: string, fileName: string): string {
  const normalizedFolder = normalizeS3ObjectKey(folder).replace(/\/+$/g, "");
  const normalizedFileName = normalizeS3ObjectKey(fileName);

  if (!normalizedFolder) {
    return normalizedFileName;
  }

  return `${normalizedFolder}/${normalizedFileName}`;
}

export function buildPrivateS3AssetUrl(
  objectKey: string,
  options?: { download?: boolean; filename?: string },
): string {
  const params = new URLSearchParams({
    key: normalizeS3ObjectKey(objectKey),
  });

  if (options?.download) {
    params.set("download", "1");
  }

  if (options?.filename) {
    params.set("filename", options.filename);
  }

  return `${PRIVATE_ASSET_ROUTE_PATH}?${params.toString()}`;
}

export function resolveS3ObjectKey(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue || trimmedValue.startsWith("data:")) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue, INTERNAL_APP_ORIGIN);

    if (parsedUrl.pathname === PRIVATE_ASSET_ROUTE_PATH) {
      const key = parsedUrl.searchParams.get("key");

      return key ? normalizeS3ObjectKey(key) : null;
    }

    const bucketHost = getConfiguredBucketHost();

    if (bucketHost && parsedUrl.hostname.toLowerCase() === bucketHost) {
      return normalizeS3ObjectKey(parsedUrl.pathname);
    }

    if (/^https?:/i.test(trimmedValue)) {
      return null;
    }

    if (
      parsedUrl.origin === INTERNAL_APP_ORIGIN &&
      trimmedValue.startsWith("/")
    ) {
      return isRawS3ObjectKeyCandidate(trimmedValue)
        ? normalizeS3ObjectKey(trimmedValue)
        : null;
    }
  } catch {
    return isRawS3ObjectKeyCandidate(trimmedValue)
      ? normalizeS3ObjectKey(trimmedValue)
      : null;
  }

  return isRawS3ObjectKeyCandidate(trimmedValue)
    ? normalizeS3ObjectKey(trimmedValue)
    : null;
}

export function isUserOwnedS3ObjectKey(
  userId: string,
  objectKey: string,
): boolean {
  const normalizedObjectKey = normalizeS3ObjectKey(objectKey);
  return normalizedObjectKey.startsWith(`${userId}/`);
}

export function getFileNameFromS3ObjectKey(objectKey: string): string {
  const normalizedObjectKey =
    resolveS3ObjectKey(objectKey) ?? normalizeS3ObjectKey(objectKey);

  return normalizedObjectKey.split("/").pop() || "downloaded-file";
}

export function resolveStoredAssetUrl(
  rawValue: string,
  options?: { download?: boolean; filename?: string },
): string {
  if (!rawValue) {
    return rawValue;
  }

  if (rawValue.startsWith("data:")) {
    return rawValue;
  }

  const normalizedUrl = normalizePublicAssetUrl(rawValue);
  const objectKey = resolveS3ObjectKey(normalizedUrl);

  if (objectKey) {
    return buildPrivateS3AssetUrl(objectKey, options);
  }

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const params = new URLSearchParams({ url: normalizedUrl });

  if (options?.download) {
    params.set("download", "1");
  }

  if (options?.filename) {
    params.set("filename", options.filename);
  }

  return `${PRIVATE_ASSET_ROUTE_PATH}?${params.toString()}`;
}
