import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 4 MB files plus multipart overhead stay below Vercel's 4.5 MB request cap.
  experimental: { serverActions: { bodySizeLimit: "4400kb" } },
};

export default nextConfig;
