import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Image optimization — allow Firebase Storage domain.
   * Shop photos and verification images are stored in Firebase Storage.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
