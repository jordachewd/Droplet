function encodePathSegment(segment: string): string {
  if (!segment) {
    return segment;
  }

  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

export function normalizePublicAssetUrl(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return rawUrl;
    }

    const normalizedPathname = parsedUrl.pathname
      .split("/")
      .map((segment) => encodePathSegment(segment))
      .join("/");

    if (!parsedUrl.hash) {
      return `${parsedUrl.origin}${normalizedPathname}${parsedUrl.search}`;
    }

    const encodedHash = encodePathSegment(parsedUrl.hash.slice(1));

    return `${parsedUrl.origin}${normalizedPathname}%23${encodedHash}${parsedUrl.search}`;
  } catch {
    return rawUrl;
  }
}
