import type { NextConfig } from "next";
import { parseAppEnvironment } from "@pals/config";

parseAppEnvironment(process.env.APP_ENV);

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  transpilePackages: ["@pals/config", "@pals/design-tokens"],
};
export default config;
