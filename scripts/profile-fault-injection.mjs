// Local test-runner preload only. Not imported by application code or builds.
import fs from "node:fs";
const file = process.env.PALS_PROFILE_FAULT_FILE;
if (file && process.env.APP_ENV === "local") {
  const original = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    const url =
      typeof input === "string" ? input : (input.url ?? String(input));
    const method = init?.method ?? input.method ?? "GET";
    let queue = [];
    try {
      queue = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
    const next = queue[0];
    if (
      next &&
      url.startsWith("http://127.0.0.1:54321/") &&
      method === next.method &&
      url.includes(next.path)
    ) {
      fs.writeFileSync(file, JSON.stringify(queue.slice(1)), { mode: 0o600 });
      if (next.afterCommit) {
        const response = await original(input, init);
        await response.arrayBuffer();
      }
      return new Response(
        JSON.stringify({ message: "Synthetic local transport failure" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    return original(input, init);
  };
}
