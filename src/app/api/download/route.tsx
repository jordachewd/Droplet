/**
 * API route for downloading an image from a given URL.
 * This route handles GET requests, fetches the image from the provided URL,
 * and returns it as a downloadable file.
 *
 * Handles GET requests to download an image from a specified URL.
 *
 * @param {Request} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response containing the image blob or an error message.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAllowedDownloadUrl } from "@/lib/utils/download-url-allowlist";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Authentication required", { status: 401 });
    }

    const imageUrl = req.nextUrl.searchParams.get("url");
    if (!imageUrl) {
      return new NextResponse("Image URL is required", { status: 400 });
    }

    if (!isAllowedDownloadUrl(imageUrl)) {
      return new NextResponse("This URL is not allowed for download", {
        status: 400,
      });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: 500 });
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": 'attachment; filename="downloaded-image.png"',
      },
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
