import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages its own functions; self-hosted builds need standalone output.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  reactStrictMode: true,
  async headers() {
    return [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] }];
  },
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
