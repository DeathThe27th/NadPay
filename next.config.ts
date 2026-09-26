import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "fast-redact": "./lib/fast-redact-shim.ts",
    },
  },
  webpack(config) {
    // Privy's WalletConnect dependency tree has nested pino packages that
    // resolve this shared dependency inconsistently under webpack.
    config.resolve.alias = {
      ...config.resolve.alias,
      "fast-redact": path.resolve(process.cwd(), "lib/fast-redact-shim.ts"),
    };
    return config;
  },
};

export default nextConfig;
