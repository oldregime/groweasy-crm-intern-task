import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: 'https://proud-cheetah-3.loca.lt/api/:path*' // using the latest localtunnel URL
      }
    ]
  }
};

export default nextConfig;
