import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  outputFileTracingExcludes: {
    "/**": ["./.algoverse-data/**/*", "./.algoverse-study/**/*", "./.env*"],
  },
};

export default nextConfig;
