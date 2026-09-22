import type { NextConfig } from "next";
import { parseAppEnvironment } from "@pals/config";

parseAppEnvironment(process.env.APP_ENV);

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  transpilePackages: [
    "@pals/config",
    "@pals/design-tokens",
    "@pals/validation",
  ],
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
export default config;
