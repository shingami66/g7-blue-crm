import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // 25 MiB business file limit plus 20 KiB multipart request overhead.
      bodySizeLimit: 25 * 1024 * 1024 + 20 * 1024,
    },
  },
  /* config options here */
};

export default nextConfig;
