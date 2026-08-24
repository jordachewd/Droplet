import type { NextConfig } from "next";

const awsBucketName = process.env.AWS_S3_BUCKET;
const awsRegion = process.env.AWS_S3_REGION;
const defaultAllowedDevOrigins = ["localhost", "127.0.0.1"];

function getAllowedDevOrigins(): string[] {
  const configuredOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS;

  if (!configuredOrigins) {
    return defaultAllowedDevOrigins;
  }

  const allowedDevOrigins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return allowedDevOrigins.length > 0
    ? [...new Set(allowedDevOrigins)]
    : defaultAllowedDevOrigins;
}

const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [
  {
    protocol: "https",
    hostname: "oaidalleapiprodscus.blob.core.windows.net",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "img.clerk.com",
    pathname: "/**",
  },
];

if (awsBucketName && awsRegion) {
  remotePatterns.push({
    protocol: "https",
    hostname: `${awsBucketName}.s3.${awsRegion}.amazonaws.com`,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: getAllowedDevOrigins(),
  async redirects() {
    return [
      {
        source: "/app/personas",
        destination: "/app/new",
        permanent: false,
      },
    ];
  },

  // Disable source maps in production to avoid 404 errors
  productionBrowserSourceMaps: false,
  devIndicators: false,
  images: {
    remotePatterns,
  },
};

export default nextConfig;
