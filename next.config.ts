import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Disable source maps in production to avoid 404 errors
  productionBrowserSourceMaps: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
