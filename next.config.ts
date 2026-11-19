import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native argon2 binding must not be bundled.
  serverExternalPackages: ["@node-rs/argon2"],
  poweredByHeader: false,
};

export default nextConfig;
