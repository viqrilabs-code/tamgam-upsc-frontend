import type { NextConfig } from "next";

// LLD D8: static export served by Firebase Hosting, with /api rewrites to Cloud Run.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
