import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// CI/local helper: no credentials written to disk or printed. Local target only.
const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(
  execFileSync(cli, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
if (status.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Local Supabase required");
const faultDir = mkdtempSync(join(tmpdir(), "pals-profile-test-"));
const faultFile = join(faultDir, "faults.json");
writeFileSync(faultFile, "[]", { mode: 0o600 });
const env = {
  ...process.env,
  APP_ENV: "local",
  APP_ORIGIN: "http://127.0.0.1:3000",
  SUPABASE_URL: status.API_URL,
  SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  NEXT_TELEMETRY_DISABLED: "1",
  WEB_TEST_ORIGIN: "http://127.0.0.1:3000",
  PALS_PROFILE_FAULT_FILE: faultFile,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import ${JSON.stringify(fileURLToPath(new URL("./profile-fault-injection.mjs", import.meta.url)))}`,
};
const server = spawn("pnpm", ["dev:web"], {
  env,
  stdio: "ignore",
  detached: true,
});
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw new Error("Local Next server exited before readiness");
    try {
      if ((await fetch(`${env.APP_ORIGIN}/signin`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Local Next server did not become ready");
  const tests = spawn(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "supabase/tests/auth-storage.integration.mjs",
      "supabase/tests/profile-concurrency.integration.mjs",
      "supabase/tests/hangout-concurrency.integration.mjs",
      "supabase/tests/people-concurrency.integration.mjs",
    ],
    { env, stdio: "inherit" },
  );
  const [code] = await once(tests, "exit");
  process.exitCode = code ?? 1;
} finally {
  process.kill(-server.pid, "SIGTERM");
  rmSync(faultDir, { recursive: true, force: true });
}
