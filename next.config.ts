import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  // Leave room for multipart headers around the allowed 10 MB file.
  experimental: { proxyClientMaxBodySize: "11mb" },
  serverExternalPackages: ["@prisma/client", "prisma"],
  trailingSlash: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
  async redirects() {
    return [
      {
        source: "/:path+/",
        destination: "/:path+",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.qr-s.ru" }],
        destination: "https://qr-s.ru/:path*",
        permanent: true,
      },
    ];
  },
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
