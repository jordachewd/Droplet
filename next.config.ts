import type { NextConfig } from "next";

const awsBucketName = process.env.AWS_S3_BUCKET;
const awsRegion = process.env.AWS_S3_REGION;

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

  // Disable source maps in production to avoid 404 errors
  productionBrowserSourceMaps: false,
  devIndicators: false,
  images: {
    remotePatterns,
  },
};

export default nextConfig;
