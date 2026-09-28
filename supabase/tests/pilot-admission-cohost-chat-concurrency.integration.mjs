import test from "node:test";
import { runMatrix } from "./helpers/pilot-cohost-chat-matrix.mjs";
test(
  "B3b L2 all152 actual policy/roster two-order cells",
  { concurrency: false, timeout: 600000 },
  () => runMatrix("L2"),
);
