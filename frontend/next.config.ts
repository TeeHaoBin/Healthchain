import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/placeholder.svg**',
      },
      {
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
