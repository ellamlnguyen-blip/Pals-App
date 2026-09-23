import type { NextConfig } from "next";
import { parseAppEnvironment } from "@pals/config";

parseAppEnvironment(process.env.APP_ENV);

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return ["/people", "/people/:path*"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
      ],
    }));
  },
  agentRules: false,
  transpilePackages: [
    "@pals/config",
    "@pals/design-tokens",
    "@pals/validation",
  ],
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
