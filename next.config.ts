import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages its own functions; self-hosted builds need standalone output.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  reactStrictMode: true,
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
