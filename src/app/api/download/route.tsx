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
import { auth } from "@clerk/nextjs/server";

function isDownloadRequest(downloadValue: string | null): boolean {
  return downloadValue === "1" || downloadValue === "true";
}

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
    return "downloaded-file";
  }
}

function buildProxyHeaders(options: {
  contentType?: string | null;
  contentLength?: number;
  contentDispositionFileName: string;
  download: boolean;
  eTag?: string | null;
  lastModified?: Date;
}): Headers {
  const headers = new Headers({
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `${
      options.download ? "attachment" : "inline"
    }; filename="${sanitizeFileName(options.contentDispositionFileName)}"`,
    "Content-Type": options.contentType || "application/octet-stream",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  });

  if (typeof options.contentLength === "number") {
    headers.set("Content-Length", String(options.contentLength));
  }

  if (options.eTag) {
    headers.set("ETag", options.eTag);
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Authentication required", { status: 401 });
    }

    const objectKeyParam = req.nextUrl.searchParams.get("key");
    const imageUrl = req.nextUrl.searchParams.get("url");
    const download = isDownloadRequest(
      req.nextUrl.searchParams.get("download"),
    );
    const requestedFileName = req.nextUrl.searchParams.get("filename");
    const normalizedImageUrl = imageUrl
      ? normalizePublicAssetUrl(imageUrl)
      : null;

    if (!objectKeyParam && !imageUrl) {
      return new NextResponse("A file key or URL is required", { status: 400 });
    }

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

      const response = await getFileFromAWS(resolvedObjectKey);
      const body = toReadableStream(response.Body);

      if (!body) {
        throw new Error("S3 file response body is empty");
      }

      return new NextResponse(body, {
        headers: buildProxyHeaders({
          contentDispositionFileName:
            requestedFileName || getFileNameFromS3ObjectKey(resolvedObjectKey),
          contentLength: response.ContentLength,
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

    const response = await fetch(normalizedImageUrl);
    if (!response.ok) {
      return new NextResponse("Failed to fetch file", { status: 502 });
    }

    if (!response.body) {
      throw new Error("External file response body is empty");
    }

    return new NextResponse(response.body, {
      headers: buildProxyHeaders({
        contentDispositionFileName:
          requestedFileName || getFileNameFromUrl(normalizedImageUrl),
        contentLength:
          Number(response.headers.get("Content-Length")) || undefined,
        contentType: response.headers.get("Content-Type"),
        download,
        eTag: response.headers.get("ETag"),
        lastModified: response.headers.get("Last-Modified")
          ? new Date(response.headers.get("Last-Modified") as string)
          : undefined,
      }),
    });
  } catch (error) {
    console.error("Error fetching image:", error);
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
