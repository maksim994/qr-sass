import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  async rewrites() {
    return [
      // IndexNow: ключ 8–128 символов (исключает robots.txt и др.)
      { source: "/:key([a-zA-Z0-9-]{8,128}).txt", destination: "/api/indexnow-key/:key" },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3.mvmolkov.ru", pathname: "/**" },
      { protocol: "https", hostname: "g-qr.ru", pathname: "/**" },
    ],
  },
};

export default nextConfig;
