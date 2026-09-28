import test from "node:test";
import { runMatrix } from "./helpers/pilot-cohost-chat-matrix.mjs";
test(
  "B3b L3 all272 actual identities and170 source-cleared mappings",
  { concurrency: false, timeout: 600000 },
  () => runMatrix("L3"),
);
