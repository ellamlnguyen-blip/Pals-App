import { analytics } from "./analytics";

// Compile-time contract; this file is included by the web TypeScript check.
function analyticsTypeContract() {
  void analytics.capture("hangout_created");
  // @ts-expect-error Unknown event names are outside the allowlist.
  void analytics.capture("pageview");
  // @ts-expect-error Callers cannot add application properties.
  void analytics.capture("hangout_created", { hangout_id: "source-id" });
}

void analyticsTypeContract;
