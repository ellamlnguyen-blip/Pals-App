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
      if (next.holdAfterResponse) {
        const response = await original(input, init);
        // The clone consumes the real PostgREST response before the page may
        // continue, so the test can commit a revocation without a DB lock.
        await response.clone().arrayBuffer();
        fs.writeFileSync(`${file}.response-reached`, "reached", {
          mode: 0o600,
        });
        const deadline = Date.now() + 30_000;
        while (!fs.existsSync(`${file}.response-release`)) {
          if (Date.now() >= deadline)
            throw new Error("Local response hold timed out");
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        return response;
      }
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
