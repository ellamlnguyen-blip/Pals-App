import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { localTarget, assertClean } from "./pilot-admission-current-safety.mjs";
export function verifyClean() {
  localTarget("current27");
  assertClean();
  return {
    lane: "current27",
    tables: 54,
    synthetic_and_retained_records: 0,
    original_gates: "off",
    availability_revision: 1,
    capabilities: 13,
    capabilities_revision: 1,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(verifyClean()));
