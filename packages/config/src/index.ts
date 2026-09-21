export type AppEnvironment = "local" | "staging" | "production";

/** Deployment environment is separate from Next.js NODE_ENV (build mode). */
export function parseAppEnvironment(value?: string): AppEnvironment {
  if (value === undefined || value === "") return "local";
  if (value === "local" || value === "staging" || value === "production")
    return value;
  throw new Error("APP_ENV must be local, staging, or production.");
}
