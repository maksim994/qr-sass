import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3.mvmolkov.ru", pathname: "/**" },
      { protocol: "https", hostname: "g-qr.ru", pathname: "/**" },
    ],
  },
};

export default nextConfig;
