import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@questlog/types"],
  webpack: (config) => {
    // Allow webpack to resolve .js imports as .ts/.tsx when consuming
    // TypeScript ESM packages that use explicit .js extensions (Node16/NodeNext).
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
