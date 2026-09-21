import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { settings: { next: { rootDir: ["apps/web", "apps/admin"] } } },
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/**", "@pals/web", "@pals/admin", "@pals/mobile"],
              message:
                "Shared packages must not depend on app implementations.",
            },
            {
              group: [
                "next",
                "next/*",
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
              ],
              message: "Keep shared packages independent of web UI frameworks.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/next-env.d.ts",
    "**/node_modules/**",
    "**/dist/**",
  ]),
]);
