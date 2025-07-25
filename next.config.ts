import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // This will skip ESLint checks during `next build`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
