import { Readable } from "node:stream";
import getFileFromAWS from "@/lib/utils/aws/getFileFromAWS";
import {
  getFileNameFromS3ObjectKey,
  isUserOwnedS3ObjectKey,
  resolveS3ObjectKey,
} from "@/lib/utils/aws/s3-file-reference";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedDownloadUrl } from "@/lib/utils/download-url-allowlist";
import { normalizePublicAssetUrl } from "@/lib/utils/normalize-public-asset-url";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { enforceSlidingWindowRateLimit } from "@/lib/utils/rate-limit";
import { auth } from "@clerk/nextjs/server";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";
import { z } from "zod";

export const maxDuration = 60;

const DOWNLOAD_RATE_LIMIT_MAX_REQUESTS = 60;
const DOWNLOAD_RATE_LIMIT_WINDOW_MS = 60_000;

function isDownloadRequest(downloadValue: string | null): boolean {
  return downloadValue === "1" || downloadValue === "true";
}

const downloadQuerySchema = z
  .object({
    key: nonEmptyStringSchema.optional(),
    url: nonEmptyStringSchema.optional(),
    download: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine((value) => Boolean(value.key || value.url), {
    message: "A file key or URL is required",
  });

type DownloadQuery = z.infer<typeof downloadQuerySchema>;

function sanitizeFileName(fileName: string): string {
  const sanitizedFileName = fileName
    .replace(/[\\/\u0000-\u001f\u007f"]/g, "_")
    .trim();

  return sanitizedFileName || "downloaded-file";
}

function getFileNameFromUrl(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    return (
      sanitizeFileName(
        decodeURIComponent(parsedUrl.pathname.split("/").pop() || ""),
      ) || "downloaded-file"
    );
  } catch {
    // URL/path parse failure is non-fatal; fallback to a safe default filename.
    return "downloaded-file";
  }
}

function buildProxyHeaders(options: {
  contentType?: string | null;
  contentLength?: number;
  contentRange?: string | null;
  contentDispositionFileName: string;
  download: boolean;
  eTag?: string | null;
  lastModified?: Date;
  acceptRanges?: string | null;
}): Headers {
  const headers = new Headers({
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `${
      options.download ? "attachment" : "inline"
    }; filename="${sanitizeFileName(options.contentDispositionFileName)}"`,
    "Content-Type": options.contentType || "application/octet-stream",
    "Accept-Ranges": options.acceptRanges ?? "bytes",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  });

  if (typeof options.contentLength === "number") {
    headers.set("Content-Length", String(options.contentLength));
  }

  if (options.eTag) {
    headers.set("ETag", options.eTag);
  }

  if (options.contentRange) {
    headers.set("Content-Range", options.contentRange);
  }

  if (options.lastModified) {
    if (!Number.isNaN(options.lastModified.getTime())) {
      headers.set("Last-Modified", options.lastModified.toUTCString());
    }
  }

  return headers;
}

function toReadableStream(body: unknown): ReadableStream<Uint8Array> | null {
  if (!body) {
    return null;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream<Uint8Array>;
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    });
  }

  return null;
}

function parseByteRangeHeader(rangeHeader: string | null): string | null {
  if (!rangeHeader) {
    return null;
  }

  const normalizedRangeHeader = rangeHeader.trim();

  return normalizedRangeHeader.toLowerCase().startsWith("bytes=")
    ? normalizedRangeHeader
    : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Authentication required", { status: 401 });
    }
    const activeUser = await requireActiveUser(userId);
    if (activeUser.status === "not_provisioned") {
      return new NextResponse(
        "Account not yet provisioned. Please try again in a moment.",
        {
          status: 503,
        },
      );
    }
    if (activeUser.status === "suspended") {
      return new NextResponse("Account suspended.", { status: 403 });
    }

    const rateLimit = await enforceSlidingWindowRateLimit({
      key: `download:${userId}`,
      limit: DOWNLOAD_RATE_LIMIT_MAX_REQUESTS,
      windowMs: DOWNLOAD_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.success) {
      return new NextResponse("Too many requests. Please try again shortly.", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      });
    }

    const parsedQuery = downloadQuerySchema.safeParse({
      key: req.nextUrl.searchParams.get("key") ?? undefined,
      url: req.nextUrl.searchParams.get("url") ?? undefined,
      download: req.nextUrl.searchParams.get("download") ?? undefined,
      filename: req.nextUrl.searchParams.get("filename") ?? undefined,
    });

    if (!parsedQuery.success) {
      return new NextResponse("A file key or URL is required", { status: 400 });
    }

    const {
      key: objectKeyParam,
      url: imageUrl,
      download: downloadParam,
      filename: requestedFileName,
    }: DownloadQuery = parsedQuery.data;
    const byteRange = parseByteRangeHeader(req.headers.get("range"));
    const download = isDownloadRequest(downloadParam ?? null);
    const normalizedImageUrl = imageUrl
      ? normalizePublicAssetUrl(imageUrl)
      : null;

    const resolvedObjectKey =
      typeof objectKeyParam === "string" && objectKeyParam.trim()
        ? resolveS3ObjectKey(objectKeyParam)
        : normalizedImageUrl
          ? resolveS3ObjectKey(normalizedImageUrl)
          : null;

    if (objectKeyParam && !resolvedObjectKey && !normalizedImageUrl) {
      return new NextResponse("Invalid file key", { status: 400 });
    }

    if (resolvedObjectKey) {
      if (!isUserOwnedS3ObjectKey(userId, resolvedObjectKey)) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const response = await getFileFromAWS(
        resolvedObjectKey,
        byteRange ? { range: byteRange } : undefined,
      );
      const body = toReadableStream(response.Body);

      if (!body) {
        throw new Error("S3 file response body is empty");
      }

      return new NextResponse(body, {
        status: response.ContentRange ? 206 : 200,
        headers: buildProxyHeaders({
          acceptRanges: response.AcceptRanges ?? "bytes",
          contentDispositionFileName:
            requestedFileName || getFileNameFromS3ObjectKey(resolvedObjectKey),
          contentLength: response.ContentLength,
          contentRange: response.ContentRange,
          contentType: response.ContentType,
          download,
          eTag: response.ETag,
          lastModified: response.LastModified,
        }),
      });
    }

    if (!normalizedImageUrl || !isAllowedDownloadUrl(normalizedImageUrl)) {
      return new NextResponse("This URL is not allowed for download", {
        status: 400,
      });
    }

    const response = await fetch(normalizedImageUrl, {
      headers: byteRange ? { Range: byteRange } : undefined,
    });
    if (!response.ok) {
      return new NextResponse("Failed to fetch file", { status: 502 });
    }

    if (!response.body) {
      throw new Error("External file response body is empty");
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: buildProxyHeaders({
        acceptRanges: response.headers.get("Accept-Ranges") ?? "bytes",
        contentDispositionFileName:
          requestedFileName || getFileNameFromUrl(normalizedImageUrl),
        contentLength:
          Number(response.headers.get("Content-Length")) || undefined,
        contentRange: response.headers.get("Content-Range"),
        contentType: response.headers.get("Content-Type"),
        download,
        eTag: response.headers.get("ETag"),
        lastModified: response.headers.get("Last-Modified")
          ? new Date(response.headers.get("Last-Modified") as string)
          : undefined,
      }),
    });
  } catch (error) {
    const errorName =
      typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : "";

    if (errorName === "NoSuchKey" || errorName === "NotFound") {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse("Server error", { status: 500 });
  }
}
