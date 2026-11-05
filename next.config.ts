import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The redirect routes are the only thing customers touch; keep them free of
  // anything that could slow the first byte (no images, no fonts, no client JS).
  async headers() {
    return [
      {
        source: "/(t|q)/:code",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
