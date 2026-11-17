import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static assets in /public are served with max-age=0 by default, so every reload re-checks
  // the multi-MB 3D models. Cache them for a day, and allow a stale copy for a week while revalidating.
  async headers() {
    const longCache = [
      { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
    ];
    return [
      { source: "/models/:path*", headers: longCache },
      { source: "/logos/:path*", headers: longCache },
    ];
  },
};

export default nextConfig;
