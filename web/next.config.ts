import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  outputFileTracingRoot: path.join(__dirname, '..'),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
