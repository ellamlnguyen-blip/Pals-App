// Authoring only. Importing this module never contacts a target or registers tests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  quote,
  sql,
  localTarget,
  resetDisposable,
  assertClean,
  session,
  until,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  query,
  denialFor,
  assertCurrentOnly,
  census,
  censusQuery,
  assertOutcome as rawAssertOutcome,
  censusTables,
  campus,
  email,
  photoPath,
  selectedLaterLane,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
export const policyManifest = Object.freeze([
  {
    id: "L2.CH.availability_off.loss-first",
    route: "CH",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_off.operation-first",
    route: "CH",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_missing.loss-first",
    route: "CH",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_missing.operation-first",
    route: "CH",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_off.loss-first",
    route: "CH",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_off.operation-first",
    route: "CH",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_missing.loss-first",
    route: "CH",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_missing.operation-first",
    route: "CH",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_off.loss-first",
    route: "CH",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_off.operation-first",
    route: "CH",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_missing.loss-first",
    route: "CH",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_missing.operation-first",
    route: "CH",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_off.loss-first",
    route: "CH",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_off.operation-first",
    route: "CH",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_missing.loss-first",
    route: "CH",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_missing.operation-first",
    route: "CH",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_revoke.loss-first",
    route: "CH",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_revoke.operation-first",
    route: "CH",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_delete.loss-first",
    route: "CH",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_delete.operation-first",
    route: "CH",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_revoke.loss-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_revoke.operation-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_delete.loss-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_delete.operation-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_off.loss-first",
    route: "CP",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_off.operation-first",
    route: "CP",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_missing.loss-first",
    route: "CP",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_missing.operation-first",
    route: "CP",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_off.loss-first",
    route: "CP",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_off.operation-first",
    route: "CP",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_missing.loss-first",
    route: "CP",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_missing.operation-first",
    route: "CP",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_off.loss-first",
    route: "CP",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_off.operation-first",
    route: "CP",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_missing.loss-first",
    route: "CP",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_missing.operation-first",
    route: "CP",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_off.loss-first",
    route: "CP",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_off.operation-first",
    route: "CP",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_missing.loss-first",
    route: "CP",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_missing.operation-first",
    route: "CP",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_revoke.loss-first",
    route: "CP",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_revoke.operation-first",
    route: "CP",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_delete.loss-first",
    route: "CP",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_delete.operation-first",
    route: "CP",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_revoke.loss-first",
    route: "CP",
    subject: "peer",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_revoke.operation-first",
    route: "CP",
    subject: "peer",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_delete.loss-first",
    route: "CP",
    subject: "peer",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_delete.operation-first",
    route: "CP",
    subject: "peer",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_off.loss-first",
    route: "CB",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_off.operation-first",
    route: "CB",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_missing.loss-first",
    route: "CB",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_missing.operation-first",
    route: "CB",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_off.loss-first",
    route: "CB",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_off.operation-first",
    route: "CB",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_missing.loss-first",
    route: "CB",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_missing.operation-first",
    route: "CB",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_off.loss-first",
    route: "CB",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_off.operation-first",
    route: "CB",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_missing.loss-first",
    route: "CB",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_missing.operation-first",
    route: "CB",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_off.loss-first",
    route: "CB",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_off.operation-first",
    route: "CB",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_missing.loss-first",
    route: "CB",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_missing.operation-first",
    route: "CB",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_revoke.loss-first",
    route: "CB",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_revoke.operation-first",
    route: "CB",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_delete.loss-first",
    route: "CB",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_delete.operation-first",
    route: "CB",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_revoke.loss-first",
    route: "CB",
    subject: "peer",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_revoke.operation-first",
    route: "CB",
    subject: "peer",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_delete.loss-first",
    route: "CB",
    subject: "peer",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_delete.operation-first",
    route: "CB",
    subject: "peer",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
]);

// Only outgoing evidence is projected. All exact assertions keep original values.
const projectionCaseIDs = new Set([
  "L2.CH.availability_off.loss-first",
  "L2.CH.availability_off.operation-first",
  "L2.CH.availability_missing.loss-first",
  "L2.CH.availability_missing.operation-first",
  "L2.CH.purpose_off.loss-first",
  "L2.CH.purpose_off.operation-first",
  "L2.CH.purpose_missing.loss-first",
  "L2.CH.purpose_missing.operation-first",
  "L2.CH.source_gate_off.loss-first",
  "L2.CH.source_gate_off.operation-first",
  "L2.CH.source_gate_missing.loss-first",
  "L2.CH.source_gate_missing.operation-first",
  "L2.CH.safety_gate_off.loss-first",
  "L2.CH.safety_gate_off.operation-first",
  "L2.CH.safety_gate_missing.loss-first",
  "L2.CH.safety_gate_missing.operation-first",
  "L2.CH.actor.roster_revoke.loss-first",
  "L2.CH.actor.roster_revoke.operation-first",
  "L2.CH.actor.roster_delete.loss-first",
  "L2.CH.actor.roster_delete.operation-first",
  "L2.CH.immutable_host.roster_revoke.loss-first",
  "L2.CH.immutable_host.roster_revoke.operation-first",
  "L2.CH.immutable_host.roster_delete.loss-first",
  "L2.CH.immutable_host.roster_delete.operation-first",
  "L2.CP.availability_off.loss-first",
  "L2.CP.availability_off.operation-first",
  "L2.CP.availability_missing.loss-first",
  "L2.CP.availability_missing.operation-first",
  "L2.CP.purpose_off.loss-first",
  "L2.CP.purpose_off.operation-first",
  "L2.CP.purpose_missing.loss-first",
  "L2.CP.purpose_missing.operation-first",
  "L2.CP.source_gate_off.loss-first",
  "L2.CP.source_gate_off.operation-first",
  "L2.CP.source_gate_missing.loss-first",
  "L2.CP.source_gate_missing.operation-first",
  "L2.CP.safety_gate_off.loss-first",
  "L2.CP.safety_gate_off.operation-first",
  "L2.CP.safety_gate_missing.loss-first",
  "L2.CP.safety_gate_missing.operation-first",
  "L2.CP.actor.roster_revoke.loss-first",
  "L2.CP.actor.roster_revoke.operation-first",
  "L2.CP.actor.roster_delete.loss-first",
  "L2.CP.actor.roster_delete.operation-first",
  "L2.CP.peer.roster_revoke.loss-first",
  "L2.CP.peer.roster_revoke.operation-first",
  "L2.CP.peer.roster_delete.loss-first",
  "L2.CP.peer.roster_delete.operation-first",
  "L2.CB.availability_off.loss-first",
  "L2.CB.availability_off.operation-first",
  "L2.CB.availability_missing.loss-first",
  "L2.CB.availability_missing.operation-first",
  "L2.CB.purpose_off.loss-first",
  "L2.CB.purpose_off.operation-first",
  "L2.CB.purpose_missing.loss-first",
  "L2.CB.purpose_missing.operation-first",
  "L2.CB.source_gate_off.loss-first",
  "L2.CB.source_gate_off.operation-first",
  "L2.CB.source_gate_missing.loss-first",
  "L2.CB.source_gate_missing.operation-first",
  "L2.CB.safety_gate_off.loss-first",
  "L2.CB.safety_gate_off.operation-first",
  "L2.CB.safety_gate_missing.loss-first",
  "L2.CB.safety_gate_missing.operation-first",
  "L2.CB.actor.roster_revoke.loss-first",
  "L2.CB.actor.roster_revoke.operation-first",
  "L2.CB.actor.roster_delete.loss-first",
  "L2.CB.actor.roster_delete.operation-first",
  "L2.CB.peer.roster_revoke.loss-first",
  "L2.CB.peer.roster_revoke.operation-first",
  "L2.CB.peer.roster_delete.loss-first",
  "L2.CB.peer.roster_delete.operation-first",
  "L5.CH.source_disable.loss-first",
  "L5.CH.source_disable.operation-first",
  "L5.CH.source_cancel.loss-first",
  "L5.CH.source_cancel.operation-first",
  "L5.CH.actor_host_block_outbound.loss-first",
  "L5.CH.actor_host_block_outbound.operation-first",
  "L5.CH.actor_host_block_inbound.loss-first",
  "L5.CH.actor_host_block_inbound.operation-first",
  "L5.CP.peer_opt_out.loss-first",
  "L5.CP.peer_opt_out.operation-first",
  "L5.CP.peer_preference_delete.loss-first",
  "L5.CP.peer_preference_delete.operation-first",
  "L5.CP.actor_peer_block_outbound.loss-first",
  "L5.CP.actor_peer_block_outbound.operation-first",
  "L5.CP.actor_peer_block_inbound.loss-first",
  "L5.CP.actor_peer_block_inbound.operation-first",
  "L5.CB.peer_opt_out.loss-first",
  "L5.CB.peer_opt_out.operation-first",
  "L5.CB.peer_preference_delete.loss-first",
  "L5.CB.peer_preference_delete.operation-first",
  "L5.CB.actor_peer_block_outbound.loss-first",
  "L5.CB.actor_peer_block_outbound.operation-first",
  "L5.CB.actor_peer_block_inbound.loss-first",
  "L5.CB.actor_peer_block_inbound.operation-first",
  "L4.CH.availability_missing.serial",
  "L4.CH.purpose_missing.serial",
  "L4.CH.source_gate_missing.serial",
  "L4.CH.safety_gate_missing.serial",
  "L4.CH.actor.roster_missing.serial",
  "L4.CH.immutable_host.roster_missing.serial",
  "L4.CH.actor.activate_later",
  "L4.CH.immutable_host.activate_later",
  "L4.CP.availability_missing.serial",
  "L4.CP.purpose_missing.serial",
  "L4.CP.source_gate_missing.serial",
  "L4.CP.safety_gate_missing.serial",
  "L4.CP.actor.roster_missing.serial",
  "L4.CP.peer.roster_missing.serial",
  "L4.CP.actor.activate_later",
  "L4.CP.peer.activate_later",
  "L4.CB.availability_missing.serial",
  "L4.CB.purpose_missing.serial",
  "L4.CB.source_gate_missing.serial",
  "L4.CB.safety_gate_missing.serial",
  "L4.CB.actor.roster_missing.serial",
  "L4.CB.peer.roster_missing.serial",
  "L4.CB.actor.activate_later",
  "L4.CB.peer.activate_later",
]);
const projectionColumns = {
  "public.universities": [
    "active",
    "allowed_email_domains",
    "created_at",
    "id",
    "name",
    "slug",
  ],
  "public.accounts": ["created_at", "id", "status"],
  "public.university_memberships": [
    "created_at",
    "university_id",
    "user_id",
    "verification_email",
    "verified_at",
  ],
  "public.profiles": [
    "additional_photo_paths",
    "bio",
    "created_at",
    "down_to_do",
    "favorite_foods",
    "favorite_music",
    "graduation_year",
    "instagram",
    "interests",
    "is_complete",
    "major",
    "primary_photo_path",
    "prompts",
    "real_name",
    "revision",
    "user_id",
    "weird_fact",
  ],
  "public.platform_roles": ["created_at", "role", "user_id"],
  "public.hangouts": [
    "campus_zone",
    "created_at",
    "description",
    "ends_at",
    "host_id",
    "id",
    "joining_state",
    "location_precision",
    "public_latitude",
    "public_longitude",
    "public_place",
    "revision",
    "starts_at",
    "status",
    "title",
    "university_id",
    "updated_at",
    "visibility",
  ],
  "private.hangout_feature_gate": ["enabled", "singleton"],
  "private.hangout_create_requests": [
    "hangout_id",
    "host_id",
    "payload_fingerprint",
    "request_id",
  ],
  "public.hangout_participants": [
    "account_id",
    "hangout_id",
    "joined_at",
    "left_at",
    "removed_at",
    "state",
    "updated_at",
  ],
  "public.hangout_private_locations": [
    "hangout_id",
    "instructions",
    "updated_at",
  ],
  "private.people_feature_gate": ["enabled", "singleton"],
  "private.people_preferences": ["account_id", "opted_in"],
  "private.people_blocks": ["blocked_id", "blocker_id"],
  "private.friendship_feature_gate": ["enabled", "singleton"],
  "private.friendships": [
    "campus_id",
    "generation_id",
    "high_id",
    "low_id",
    "requester_id",
    "state",
  ],
  "private.friendship_create_requests": [
    "actor_id",
    "generation_id",
    "request_id",
    "target_id",
  ],
  "private.friendship_suppression": ["recipient_id", "requester_id"],
  "private.hangout_chat_feature_gate": ["enabled", "singleton"],
  "private.hangout_conversations": ["hangout_id", "id", "next_sequence"],
  "private.hangout_messages": [
    "author_id",
    "body",
    "conversation_id",
    "created_at",
    "id",
    "sequence",
  ],
  "private.hangout_message_requests": [
    "author_id",
    "hangout_id",
    "message_id",
    "payload_fingerprint",
    "request_id",
  ],
  "private.dm_feature_gate": ["enabled", "singleton"],
  "private.dm_pairs": [
    "campus_id",
    "created_at",
    "generation_id",
    "high_id",
    "initiator_id",
    "low_id",
    "next_sequence",
    "state",
  ],
  "private.dm_messages": [
    "author_id",
    "body",
    "created_at",
    "generation_id",
    "id",
    "sequence",
  ],
  "private.dm_retries": [
    "actor_id",
    "fingerprint",
    "generation_id",
    "kind",
    "message_id",
    "request_id",
    "target_id",
  ],
  "private.dm_suppression": ["initiator_id", "recipient_id"],
  "private.safety_reports": [
    "category",
    "id",
    "narrative",
    "provenance_kind",
    "provenance_ref_id",
    "reporter_id",
    "submitted_at",
    "target_id",
    "target_type",
  ],
  "private.safety_report_requests": [
    "input_fingerprint",
    "report_id",
    "reporter_id",
    "request_id",
  ],
  "private.moderation_feature_gate": ["enabled", "singleton"],
  "private.moderation_cases": [
    "disposition",
    "duplicate_report_id",
    "hangout_disable_id",
    "note",
    "report_id",
    "revision",
    "sanction_id",
    "state",
  ],
  "private.moderation_requests": [
    "fingerprint",
    "operator_id",
    "report_id",
    "request_id",
    "result_revision",
    "result_state",
  ],
  "private.moderation_audit": [
    "action",
    "duplicate_report_id",
    "hangout_disable_id",
    "id",
    "new_account_status",
    "new_hangout_disabled",
    "new_revision",
    "new_state",
    "occurred_at",
    "operator_id",
    "page_count",
    "page_report_ids",
    "previous_account_status",
    "previous_hangout_disabled",
    "previous_revision",
    "previous_state",
    "reason",
    "report_id",
    "request_id",
    "sanction_id",
    "subject_campus_id",
    "subject_target_id",
    "subject_target_type",
  ],
  "private.account_sanctions": [
    "action",
    "id",
    "new_status",
    "occurred_at",
    "operator_id",
    "previous_status",
    "reason",
    "report_id",
    "request_id",
    "subject_campus_id",
    "subject_id",
    "subject_type",
  ],
  "private.hangout_disables": [
    "hangout_id",
    "id",
    "new_disabled",
    "occurred_at",
    "operator_id",
    "previous_disabled",
    "reason",
    "report_id",
    "request_id",
    "subject_campus_id",
    "subject_type",
  ],
  "private.attendance_feature_gate": ["enabled", "singleton"],
  "private.attendance_answers": [
    "account_id",
    "answered_at",
    "attended",
    "hangout_id",
    "revision",
  ],
  "private.large_hangout_feature_gate": [
    "enabled",
    "ranking_epoch",
    "singleton",
  ],
  "private.large_hangout_signals": [
    "hangout_id",
    "observed_at",
    "policy_version",
    "threshold_value",
  ],
  "private.hangout_cohosts": ["account_id", "assigned_at", "hangout_id"],
  "private.pilot_account_admission": [
    "account_id",
    "created_at",
    "revision",
    "state",
    "updated_at",
  ],
  "private.pilot_admission_managers": ["revision", "singleton"],
  "private.pilot_capabilities": ["created_at", "enabled", "key"],
  "private.pilot_management_audit": [
    "id",
    "operation",
    "previous_value",
    "reason",
    "request_id",
  ],
  "private.pilot_management_requests": ["actor_id", "result_value"],
  "private.pilot_manager_audit": [
    "executor_original_role",
    "id",
    "previous_revision",
    "previous_state",
    "reason",
    "request_id",
  ],
  "auth.users": [
    "deleted_at",
    "email",
    "email_confirmed_at",
    "id",
    "raw_app_meta_data",
    "raw_user_meta_data",
  ],
  "storage.objects": [
    "bucket_id",
    "created_at",
    "id",
    "last_accessed_at",
    "name",
    "owner_id",
    "updated_at",
  ],
};
const projectionPhases = new Set([
  "independent-case-setup",
  "eligible-current-precheck",
  "eligible-precheck",
  "race",
  "holder-execution",
  "waiter-execution",
  "observe-required-wait",
  "release-and-assert-outcome",
  "post-loss-current-control",
  "success-evidence",
  "guarded-case-reset",
  "absence-denial",
  "manager-activation",
  "privileged-replacement",
  "state-race",
  "writer-companion-setup",
  "authorized-unblock-for-separate-current-denial",
  "actual-lock-observation",
  "release-and-exact-outcome",
  "absent-or-false-current-rollback-positive",
  "separate-companion-writer-preparation",
  "current-provenance-and-no-retained-recheck",
  "actual-state-race",
  "fresh-post-loss-lane-and-outcome",
]);
const projectionPartitions = new Set([
  "failed-no-success-credit",
  "owned-exit-unproven",
  "cleanup-failed",
  "failed-abort-exact-rollback",
  "failed-abort-rollback-mismatch",
  "serial-absence-denial",
  "serial-authorized-manager-activation-after-denial",
  "actual-observed-wait-required",
  "actual-state-loss-order",
  "actual-state-wait-required",
  "actual-state-boundary-retained-idempotent-repair",
  "actual-state-boundary-expected-writer-denial",
  "supplemental-failure-no-credit",
]);
// Fixed authored classifications have disclosure authority only in these fields.
const projectionLabels = {
  writer: new Set([
    "authenticated approved manager RPC",
    "privileged synthetic exact-prefix missing-row maintenance; NOT manager delete permission",
    "privileged synthetic source/safety direct row maintenance; NOT manager permission",
    "authenticated set_pilot_account_admission expected revision0",
  ]),
  wait_location: new Set([
    "social advisory serialization before pilot; NOT lower required lookup",
    "exact-prefix social/exclusive pilot boundary serialization; NOT lower lookup/absence proof",
    "required private.hangout_feature_gate tuple lookup/SHARE conflicts with actual UPDATE/DELETE",
    "required private.people_feature_gate tuple lookup/SHARE conflicts with actual UPDATE/DELETE",
    "required private.safety_feature_gate tuple lookup/SHARE conflicts with actual UPDATE/DELETE",
  ]),
  later_call: new Set(["fresh eligible current success"]),
  later_replacement: new Set([
    "privileged setup permits NEW rolled-back eligible call",
  ]),
  writer_effect_classification: new Set([
    "planned-committed-state-loss",
    "retained-repair-no-new-loss",
    "public-writer-denial-no-committed-loss-order",
  ]),
};
const diagnosticMessages = new Set([
  "Safety report unavailable",
  "Safety operation unavailable",
  "Pilot management unavailable",
  "Hangout operation not permitted",
  "Hangout chat unavailable",
  "Moderation unavailable",
]);
const diagnosticPairs = new Map([
  ["42501", diagnosticMessages],
  ["40P01", new Set(["deadlock detected"])],
  [
    "40001",
    new Set([
      "could not serialize access due to concurrent update",
      "could not serialize access due to read/write dependencies among transactions",
    ]),
  ],
  ["57014", new Set(["canceling statement due to statement timeout"])],
  ["55P03", new Set(["canceling statement due to lock timeout"])],
]);
const unavailable = () => ({ available: false });
function own(value, key) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value ?? {}, key);
    return descriptor && Object.hasOwn(descriptor, "value")
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}
function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
// Typed canonical encoding hashes original own data, never getters/toJSON/error
// rendering. Cycles, accessor/symbol data and resource overflow are unavailable.
export function outgoingValue(value) {
  const type = valueType(value);
  if (typeof value === "string" && /<redacted(?:-token)?>|<absent>/.test(value))
    return { type, available: false, original_value_unavailable: true };
  let nodes = 0;
  const seen = new Set();
  function encode(v, depth = 0) {
    if (++nodes > 100000 || depth > 64) throw new Error("unavailable");
    const t = valueType(v);
    if (t === "string" && /<redacted(?:-token)?>|<absent>/.test(v))
      throw new Error("unavailable");
    if (t === "undefined") return [t];
    if (t === "bigint") return [t, String(v)];
    if (t === "number") return [t, Object.is(v, -0) ? "-0" : String(v)];
    if (["null", "string", "boolean"].includes(t)) return [t, v];
    if (!["object", "array"].includes(t) || seen.has(v))
      throw new Error("unavailable");
    seen.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Object.getOwnPropertySymbols(v).length) throw new Error("unavailable");
    const result = [
      t,
      Object.keys(descriptors)
        .sort()
        .map((key) => {
          const d = descriptors[key];
          if (!Object.hasOwn(d, "value")) throw new Error("unavailable");
          return [key, encode(d.value, depth + 1)];
        }),
    ];
    seen.delete(v);
    return result;
  }
  try {
    return {
      type,
      available: true,
      sha256: createHash("sha256")
        .update(JSON.stringify(encode(value)))
        .digest("hex"),
    };
  } catch {
    return { type, available: false };
  }
}
function trusted(value, allowlist) {
  return typeof value === "string" && allowlist.has(value)
    ? value
    : outgoingValue(value);
}
function integer(value, positive = false) {
  return Number.isSafeInteger(value) && value >= (positive ? 1 : 0)
    ? value
    : unavailable();
}
// Call only with an owned exactDiagnostic row or the complete wrapper. A code
// or neutral-looking string anywhere else has no diagnostic disclosure authority.
export function safeDiagnostic(input) {
  let code, message;
  if (typeof input === "string") {
    const match = /^Disposable SQL error: ([A-Z0-9]{5}): ([^\r\n]+)$/.exec(
      input,
    );
    if (match && match[0] === input) [, code, message] = match;
  } else if (input && typeof input === "object" && !Array.isArray(input)) {
    const keys = Object.getOwnPropertyNames(input).sort();
    if (
      Object.getOwnPropertySymbols(input).length === 0 &&
      keys.length === 2 &&
      keys[0] === "code" &&
      keys[1] === "message"
    ) {
      code = own(input, "code");
      message = own(input, "message");
    }
  }
  if (diagnosticPairs.get(code)?.has(message)) return { code, message };
  return { code: "unavailable", detail: outgoingValue(input) };
}
export function projectCensusEvidence(snapshot) {
  return Object.fromEntries(
    censusTables.map((table) => {
      const rows = own(snapshot, table);
      return [
        table,
        Array.isArray(rows)
          ? { count: rows.length, ...outgoingValue(rows) }
          : unavailable(),
      ];
    }),
  );
}
function censusSummary(summary) {
  return Object.fromEntries(
    censusTables.map((table) => {
      const item = own(summary, table),
        count = own(item, "count"),
        hash = own(item, "sha256");
      return [
        table,
        Number.isSafeInteger(count) &&
        count >= 0 &&
        typeof hash === "string" &&
        /^[a-f0-9]{64}$/.test(hash)
          ? { count, sha256: hash, available: true, supplied_summary: true }
          : unavailable(),
      ];
    }),
  );
}
export function projectDifferences(input) {
  if (!Array.isArray(input)) return unavailable();
  return input.map((item) => {
    const segments = own(item, "segments");
    const result = {
      expected: outgoingValue(own(item, "expected")),
      actual: outgoingValue(own(item, "actual")),
    };
    if (!Array.isArray(segments))
      return {
        ...result,
        path: outgoingValue(own(item, "field")),
        path_precision: "legacy-ambiguous",
      };
    const table = segments[0],
      index = segments[1],
      column = segments[2];
    if (!censusTables.includes(table))
      return {
        ...result,
        path: outgoingValue(segments),
        path_precision: "opaque",
      };
    result.table = table;
    if (
      typeof index === "string" &&
      /^(0|[1-9][0-9]*)$/.test(index) &&
      Number.isSafeInteger(Number(index))
    )
      result.row_index = Number(index);
    else if (segments.length > 1) result.row_segment = outgoingValue(index);
    if (projectionColumns[table]?.includes(column)) result.column = column;
    else if (segments.length > 2) result.column_segment = outgoingValue(column);
    if (segments.length > 3)
      result.opaque_segments = segments.slice(3).map(outgoingValue);
    result.path_precision = "structural";
    return result;
  });
}
function lockEvidence(input) {
  if (Array.isArray(input)) return input.map(lockEvidence);
  if (!input || typeof input !== "object") return outgoingValue(input);
  const result = {};
  for (const key of ["holder_pid", "waiter_pid", "pid"])
    if (own(input, key) !== undefined)
      result[key] = integer(own(input, key), true);
  if (Array.isArray(own(input, "blocking_pids")))
    result.blocking_pids = own(input, "blocking_pids").map((v) =>
      integer(v, true),
    );
  for (const key of ["ungranted_locks", "locks"])
    if (Array.isArray(own(input, key)))
      result[key] = own(input, key).map((lock) => {
        const projected = {};
        for (const name of ["locktype", "mode", "relation"])
          projected[name] = trusted(
            own(lock, name),
            new Set(
              name === "locktype"
                ? [
                    "advisory",
                    "transactionid",
                    "tuple",
                    "relation",
                    "virtualxid",
                  ]
                : name === "mode"
                  ? [
                      "ShareLock",
                      "ExclusiveLock",
                      "RowShareLock",
                      "RowExclusiveLock",
                      "AccessShareLock",
                      "AccessExclusiveLock",
                    ]
                  : censusTables,
            ),
          );
        for (const name of ["classid", "objid", "objsubid"])
          if (own(lock, name) !== undefined)
            projected[name] = integer(own(lock, name));
        projected.transactionid = outgoingValue(own(lock, "transactionid"));
        if (typeof own(lock, "granted") === "boolean")
          projected.granted = own(lock, "granted");
        return projected;
      });
  result.withheld = outgoingValue(input);
  return result;
}
function setupEvidence(input) {
  const result = {};
  for (const key of [
    "source_owned_rowsets_verified",
    "provider_identity_and_time_fields_verified",
    "provider_defaults_source_verified",
    "provider_anchor_classification_pending_review",
  ])
    result[key] =
      typeof own(input, key) === "boolean" ? own(input, key) : unavailable();
  const fields = own(input, "provider_opaque_immutable_anchor_fields");
  result.provider_opaque_immutable_anchor_fields = Array.isArray(fields)
    ? fields.map(outgoingValue)
    : unavailable();
  return result;
}
const booleanFields = new Set([
  "successful_wait_order_credit",
  "original_error_preserved",
  "reset_forbidden",
  "cleanupIncomplete",
  "failureRecorded",
  "full54_values_verified",
  "full54_verified",
  "holder_commit_preserved",
  "lower_current_tuple_wait_credit",
  "state_observation_verified",
]);
const zeroFields = new Set([
  "observed_wait_credit",
  "frozen_lane_upgrade_or_fallback_credit",
]);
// Default deny: fields outside this contextual schema are represented by hashes
// of both the original key and value. No raw object or scalar fallback exists.
export function projectOutgoingEvidence(input) {
  const result = {};
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { unavailable: outgoingValue(input) };
  for (const key of Object.keys(input)) {
    const value = own(input, key);
    if (key === "id" || key === "failedCellID")
      result[key] = trusted(value, projectionCaseIDs);
    else if (key === "phase") result[key] = trusted(value, projectionPhases);
    else if (key === "partition")
      result[key] = trusted(value, projectionPartitions);
    else if (Object.hasOwn(projectionLabels, key))
      result[key] = trusted(value, projectionLabels[key]);
    else if (booleanFields.has(key))
      result[key] = typeof value === "boolean" ? value : unavailable();
    else if (key === "committed_loss_order_credit")
      result[key] = value === 0 || value === 1 ? value : unavailable();
    else if (zeroFields.has(key))
      result[key] = value === 0 ? 0 : outgoingValue(value);
    else if (["committed_census", "holder_snapshot"].includes(key))
      result[key] = projectCensusEvidence(value);
    else if (["committed_census_summary", "before", "after"].includes(key))
      result[key] = censusSummary(value);
    else if (key === "differences") result[key] = projectDifferences(value);
    else if (["lock_observation", "observation"].includes(key))
      result[key] = lockEvidence(value);
    else if (
      ["holder_pid", "waiter_pid", "blocking_pids", "ungranted_locks"].includes(
        key,
      )
    )
      result[key] = lockEvidence({ [key]: value })[key];
    else if (key === "setup_qualification") result[key] = setupEvidence(value);
    else if (key === "diagnostics")
      result[key] = Array.isArray(value)
        ? value.map(safeDiagnostic)
        : unavailable();
    else if (["diagnostic", "absence_denial"].includes(key))
      result[key] = safeDiagnostic(value);
    else if (
      [
        "available_public_result",
        "actual_public_result",
        "public_result",
        "result",
        "actual_manager_result",
        "available_manager_result",
      ].includes(key)
    ) {
      // RPC output is withheld: receipt UUIDs never gain authority by their shape.
      result[key] =
        value &&
        typeof value === "object" &&
        Object.keys(value).length === 2 &&
        own(value, "code") !== undefined &&
        own(value, "message") !== undefined
          ? safeDiagnostic(value)
          : outgoingValue(value);
    } else if (["cleanup_diagnostics", "error", "census_failure"].includes(key))
      result[key] = outgoingValue(value);
    else
      (result.withheld_fields ??= []).push({
        key: outgoingValue(key),
        value: outgoingValue(value),
      });
  }
  return result;
}
const privateSuiteErrors = new WeakMap();
export function originalSuiteError(error) {
  return privateSuiteErrors.get(error) ?? error;
}
export function neutralSuiteError(error) {
  const original = originalSuiteError(error);
  const safe = privateSuiteErrors.has(error)
    ? error
    : new Error("B3c fixture failed; projected evidence only");
  privateSuiteErrors.set(safe, original);
  safe.evidence = projectOutgoingEvidence({
    id: own(original, "failedCellID"),
    cleanupIncomplete: own(original, "cleanupIncomplete") === true,
    reset_forbidden: own(original, "cleanupIncomplete") === true,
    failureRecorded: own(original, "failureRecorded") === true,
    successful_wait_order_credit: false,
    observed_wait_credit: 0,
  });
  // Fixed stack avoids reporter-specific inspection of the original error.
  safe.stack = "Error: B3c fixture failed; projected evidence only";
  return safe;
}
export function credentialFree(value) {
  if (Array.isArray(value)) return value.map(credentialFree);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        /password|secret|token|authorization|cookie|credential|api_key|apikey|access_key/i.test(
          key,
        )
          ? "<redacted>"
          : credentialFree(v),
      ]),
    );
  if (typeof value === "string")
    return value
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "<redacted-token>",
      )
      .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@");
  return value;
}

export function differences(expected, actual, path = "$", segments = []) {
  if (expected === actual) return [];
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return [...keys].flatMap((k) =>
      differences(expected[k], actual[k], `${path}.${k}`, [...segments, k]),
    );
  }
  return [{ field: path, segments, expected, actual }];
}
export function verifiedOutcome(input) {
  const delta = differences(input.expectedAfter ?? input.before, input.after);
  if (delta.length) {
    const error = new Error("Exact full54 outcome mismatch");
    error.preciseDifferences = delta;
    throw error;
  }
  return rawAssertOutcome(input);
}
export function exactDiagnostic(output) {
  const rows = [...output.matchAll(/ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g)];
  return rows.map((row) => ({
    code: row[1],
    message: credentialFree(row[2].trim()),
  }));
}
export function projectFailureEvidence(
  inputError,
  context,
  snapshot = null,
  censusDiagnostic = null,
) {
  const error = originalSuiteError(inputError);
  return projectOutgoingEvidence({
    id: context?.id ?? "<suite>",
    phase: context?.phase ?? "<unknown>",
    partition: "failed-no-success-credit",
    successful_wait_order_credit: false,
    observed_wait_credit: 0,
    lock_observation: context?.observation ?? null,
    available_public_result: context?.publicResult ?? null,
    available_manager_result: context?.managerResult ?? null,
    setup_qualification: context?.setupQualification ?? null,
    diagnostics: [
      ...(context?.diagnostics ?? []),
      ...(error.sqlDiagnostics ?? []),
      error.message,
    ],
    cleanup_diagnostics: error.cleanupDiagnostics ?? [],
    error,
    differences: error.preciseDifferences ?? [],
    committed_census: snapshot,
    holder_snapshot: context?.holderSnapshot ?? null,
    census_failure: censusDiagnostic,
  });
}
export function captureFailure(inputError, context) {
  const error = originalSuiteError(inputError);
  if (error.failureRecorded) {
    console.error(
      JSON.stringify(
        projectOutgoingEvidence({
          id: context?.id ?? error.failedCellID,
          phase: context?.phase,
          partition: "supplemental-failure-no-credit",
          original_error_preserved: true,
          differences:
            error.rollbackDifferences ?? error.preciseDifferences ?? [],
          cleanup_diagnostics: error.cleanupDiagnostics ?? [],
          diagnostics: [
            ...(context?.diagnostics ?? []),
            ...(error.sqlDiagnostics ?? []),
          ],
          reset_forbidden: error.cleanupIncomplete === true,
          successful_wait_order_credit: false,
          observed_wait_credit: 0,
        }),
      ),
    );
    return;
  }
  let snapshot = null,
    censusDiagnostic = null;
  try {
    snapshot = census();
  } catch (cause) {
    censusDiagnostic = cause;
  }
  console.error(
    JSON.stringify(
      projectFailureEvidence(error, context, snapshot, censusDiagnostic),
    ),
  );
  error.failureRecorded = true;
  error.failedCellID = context?.id ?? "<suite>";
}
export async function finishOwnedSessions(sessions, inputError = null) {
  const originalError =
    inputError === null ? null : originalSuiteError(inputError);
  const closed = await Promise.allSettled(
    sessions.filter(Boolean).map(async (s) => {
      await s.close();
      const exit = await s.done;
      // close alone permits an ordinary nonzero. After an exception it cannot
      // certify the prior failed SQL outcome or earn guarded-reset permission.
      if (
        !Array.isArray(exit) ||
        exit.length !== 2 ||
        !Number.isSafeInteger(exit[0]) ||
        exit[0] < 0 ||
        exit[1] !== null ||
        (originalError !== null && exit[0] !== 0)
      )
        throw new Error("owned exit not certified; no reset permission");
    }),
  );
  if (closed.some((r) => r.status === "rejected")) {
    const error =
      originalError ??
      new Error("owned child cleanup incomplete; no reset permission");
    error.cleanupIncomplete = true;
    error.cleanupDiagnostics = [
      ...(error.cleanupDiagnostics ?? []),
      ...closed.filter((r) => r.status === "rejected").map((r) => r.reason),
    ];
    console.error(
      JSON.stringify(
        projectOutgoingEvidence({
          id: error.failedCellID ?? "<owned-session>",
          partition: "owned-exit-unproven",
          cleanup_diagnostics: error.cleanupDiagnostics,
          reset_forbidden: true,
          differences: error.cleanupDiagnostics.flatMap(
            (failure) => originalSuiteError(failure)?.preciseDifferences ?? [],
          ),
          original_error_preserved: originalError !== null,
          successful_wait_order_credit: false,
          observed_wait_credit: 0,
        }),
      ),
    );
    throw neutralSuiteError(error);
  }
}
export function guardedFinalCleanup(cleanupSafe, inputError = null) {
  const originalError =
    inputError === null ? null : originalSuiteError(inputError);
  if (!cleanupSafe || originalError?.cleanupIncomplete) return;
  try {
    resetDisposable("current27");
    assertClean();
  } catch (cleanup) {
    const error = originalError ?? cleanup;
    error.cleanupDiagnostics = [...(error.cleanupDiagnostics ?? []), cleanup];
    console.error(
      JSON.stringify(
        projectOutgoingEvidence({
          id: error.failedCellID ?? "<suite>",
          partition: "cleanup-failed",
          original_error_preserved: originalError !== null,
          diagnostic: cleanup.message,
          differences: cleanup.preciseDifferences ?? [],
          successful_wait_order_credit: false,
          observed_wait_credit: 0,
        }),
      ),
    );
    throw neutralSuiteError(error);
  }
}
export function assertCaseSetup(
  clean,
  after,
  route,
  window,
  actorPreference = "absent",
) {
  assert.deepEqual(Object.keys(after).sort(), censusTables.slice().sort());
  const expected = structuredClone(clean);
  const all = [route.actor, route.host, route.peer, route.manager],
    ready = all.slice(0, 3);
  const select = (table, key, id) => {
    const rows = after[table].filter((r) => r[key] === id);
    assert.equal(rows.length, 1, `${table} exact ${key} binding`);
    return rows[0];
  };
  const stamp = (table, key, id, field) =>
    dynamicTime(select(table, key, id)[field], window);
  const profile = (id, eligible) => ({
    user_id: id,
    real_name: eligible ? "Current safety fixture" : null,
    graduation_year: eligible ? 2028 : null,
    major: eligible ? "Math" : null,
    bio: eligible ? "Local" : null,
    primary_photo_path: eligible ? photoPath(id) : null,
    is_complete: eligible,
    created_at: stamp("public.profiles", "user_id", id, "created_at"),
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    prompts: [],
    instagram: null,
    additional_photo_paths: [],
    revision: eligible ? 1 : 0,
  });
  expected["public.accounts"] = all.map((id) => ({
    id,
    status: "active",
    created_at: stamp("public.accounts", "id", id, "created_at"),
  }));
  expected["public.profiles"] = all.map((id) =>
    profile(id, id !== route.manager),
  );
  expected["auth.users"] = all.map((id) => ({
    id,
    email: email(id),
    email_confirmed_at: stamp("auth.users", "id", id, "email_confirmed_at"),
    deleted_at: null,
    raw_user_meta_data: null,
    raw_app_meta_data: null,
  }));
  expected["public.university_memberships"] = all.map((id) => ({
    user_id: id,
    university_id: campus,
    verified_at: select("auth.users", "id", id).email_confirmed_at,
    verification_email: email(id),
    created_at: stamp(
      "public.university_memberships",
      "user_id",
      id,
      "created_at",
    ),
  }));
  expected["private.pilot_account_admission"] = ready.map((id) => ({
    account_id: id,
    state: "active",
    revision: 1,
    created_at: stamp(
      "private.pilot_account_admission",
      "account_id",
      id,
      "created_at",
    ),
    updated_at: stamp(
      "private.pilot_account_admission",
      "account_id",
      id,
      "updated_at",
    ),
  }));
  expected["private.pilot_admission_managers"] = [
    {
      account_id: route.manager,
      state: "active",
      revision: 1,
      created_at: stamp(
        "private.pilot_admission_managers",
        "account_id",
        route.manager,
        "created_at",
      ),
      updated_at: stamp(
        "private.pilot_admission_managers",
        "account_id",
        route.manager,
        "updated_at",
      ),
    },
  ];
  const audits = after["private.pilot_manager_audit"];
  assert.equal(audits.length, 1);
  assert.match(audits[0].id, uuid);
  assert.ok(
    Number.isSafeInteger(audits[0].executor_backend_pid) &&
      audits[0].executor_backend_pid > 0,
  );
  expected["private.pilot_manager_audit"] = [
    {
      id: audits[0].id,
      account_id: route.manager,
      executor_session_user: "postgres",
      executor_original_role: "none",
      executor_backend_pid: audits[0].executor_backend_pid,
      previous_state: null,
      new_state: "active",
      previous_revision: 0,
      new_revision: 1,
      reason: "B3c synthetic manager",
      request_id: route.managerRequest,
      occurred_at: dynamicTime(audits[0].occurred_at, window),
    },
  ];
  expected["public.universities"] = [
    ...clean["public.universities"],
    {
      id: route.otherCampus,
      name: "Other synthetic campus",
      slug: "b3c-" + route.otherCampus,
      allowed_email_domains: ["unc.edu"],
      active: true,
      created_at: stamp(
        "public.universities",
        "id",
        route.otherCampus,
        "created_at",
      ),
    },
  ];
  expected["private.pilot_availability"] = clean[
    "private.pilot_availability"
  ].map((row) => ({ ...row, enabled: true }));
  expected["private.pilot_capabilities"] = clean[
    "private.pilot_capabilities"
  ].map((row) => ({
    ...row,
    enabled: ["hangouts", "people"].includes(row.key),
  }));
  for (const table of [
    "private.hangout_feature_gate",
    "private.people_feature_gate",
    "private.safety_feature_gate",
  ])
    expected[table] = [{ singleton: true, enabled: true }];
  expected["private.people_preferences"] = [
    { account_id: route.peer, opted_in: true },
    ...(actorPreference === false
      ? [{ account_id: route.actor, opted_in: false }]
      : []),
  ];
  // Provider defaults are opaque immutable before-value anchors only. This
  // assignment changes no Storage value after setup. Identity/owner/bucket/name
  // and generated UUID/times are independently constrained; no mutated delta
  // can use an opaque observed value as its expected authorization result.
  const storage = after["storage.objects"];
  assert.equal(storage.length, 3);
  assert.equal(
    new Set(storage.map((row) => row.id)).size,
    3,
    "three distinct generated object bindings",
  );
  const providerFields = new Set();
  expected["storage.objects"] = ready.map((id) => {
    const object = select("storage.objects", "name", photoPath(id));
    assert.match(object.id, uuid);
    assert.equal(object.bucket_id, "profile-photos");
    assert.equal(object.owner_id, id);
    const row = {
      id: object.id,
      bucket_id: "profile-photos",
      name: photoPath(id),
      owner_id: id,
    };
    for (const field of ["created_at", "updated_at", "last_accessed_at"])
      if (Object.hasOwn(object, field) && object[field] !== null) {
        row[field] = dynamicTime(object[field], window);
      }
    for (const field of Object.keys(object))
      if (!Object.hasOwn(row, field)) {
        providerFields.add(field);
        row[field] = structuredClone(object[field]);
      }
    return row;
  });
  if (route.id === "CH") {
    expected["public.hangouts"] = [
      {
        id: route.source,
        university_id: campus,
        host_id: route.host,
        title: "Undisclosed fixture",
        description: null,
        starts_at: dynamicTime(
          select("public.hangouts", "id", route.source).starts_at,
          {
            start: new Date(Date.parse(window.start) + 86400000).toISOString(),
            end: new Date(Date.parse(window.end) + 86400000).toISOString(),
          },
        ),
        ends_at: null,
        status: "published",
        joining_state: "open",
        visibility: "campus",
        public_place: "Approximate",
        public_latitude: 35.91,
        public_longitude: -79.05,
        campus_zone: null,
        location_precision: "approximate_area",
        revision: 1,
        created_at: stamp("public.hangouts", "id", route.source, "created_at"),
        updated_at: stamp("public.hangouts", "id", route.source, "updated_at"),
      },
    ];
    const participant = after["public.hangout_participants"];
    assert.equal(participant.length, 1);
    expected["public.hangout_participants"] = [
      {
        hangout_id: route.source,
        account_id: route.host,
        state: "joined",
        joined_at: dynamicTime(participant[0].joined_at, window),
        left_at: null,
        removed_at: null,
        updated_at: dynamicTime(participant[0].updated_at, window),
      },
    ];
    const place = after["public.hangout_private_locations"];
    assert.equal(place.length, 1);
    expected["public.hangout_private_locations"] = [
      {
        hangout_id: route.source,
        instructions: "Undisclosed synthetic instructions",
        updated_at: dynamicTime(place[0].updated_at, window),
      },
    ];
  }
  verifiedOutcome({
    result: "independent case setup with qualified provider anchors",
    expectedResult: "independent case setup with qualified provider anchors",
    before: clean,
    after,
    expectedAfter: exactSnapshot(clean, after, expected),
  });
  return {
    source_owned_rowsets_verified: true,
    provider_identity_and_time_fields_verified: true,
    provider_opaque_immutable_anchor_fields: [...providerFields].sort(),
    provider_defaults_source_verified: false,
    provider_anchor_classification_pending_review: true,
  };
}
export const bounds =
  "set statement_timeout='12s';set lock_timeout='10s';set idle_in_transaction_session_timeout='15s';";
const reason = "B3c policy fixture";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function valueSQL(route, options = {}) {
  const q = query(route, options).trim().replace(/;$/, "");
  return route.id === "CB"
    ? `select 'RESULT:'||to_jsonb(v)::text from (${q}) q(v);`
    : `select 'RESULT:'||to_jsonb(q)::text from (${q}) q;`;
}
function marker(output, prefix) {
  const line = output.split("\n").find((v) => v.startsWith(prefix));
  assert.ok(line, `actual ${prefix} observation required`);
  return JSON.parse(line.slice(prefix.length));
}
export function successSQL(route, options = {}) {
  return `${auth(route.actor)}${valueSQL(route, options)}reset role;select 'SNAPSHOT:'||(${censusQuery})::text;`;
}
export function exactSnapshot(before, after, replacements) {
  const expected = structuredClone(before);
  for (const [table, rows] of Object.entries(replacements)) {
    // Ordering alone follows server JSONB sort. Each value comes from the explicit
    // expectation, never an automatically accepted observed row.
    if (rows.length !== after[table].length) {
      const error = new Error(`Exact row count mismatch in ${table}`);
      error.preciseDifferences = [
        {
          field: `${table}.length`,
          expected: rows.length,
          actual: after[table].length,
        },
      ];
      throw error;
    }
    const used = new Set();
    expected[table] = after[table].map((actual) => {
      const index = rows.findIndex(
        (row, i) =>
          !used.has(i) && JSON.stringify(row) === JSON.stringify(actual),
      );
      // Compare fields independently of JSON object key insertion order.
      const fallback =
        index < 0
          ? rows.findIndex((row, i) => {
              if (used.has(i)) return false;
              try {
                assert.deepEqual(row, actual);
                return true;
              } catch {
                return false;
              }
            })
          : index;
      if (fallback < 0) {
        const error = new Error(`Exact row fields mismatch in ${table}`);
        const candidate = rows.findIndex((row, i) => !used.has(i));
        error.preciseDifferences = differences(
          rows[candidate],
          actual,
          `${table}[${candidate}]`,
        );
        throw error;
      }
      used.add(fallback);
      return rows[fallback];
    });
  }
  return expected;
}
export function dynamicTime(value, window = null) {
  assert.ok(
    typeof value === "string" && Number.isFinite(Date.parse(value)),
    "actual server timestamp required",
  );
  if (window) {
    assert.ok(
      Date.parse(value) >= Date.parse(window.start) &&
        Date.parse(value) <= Date.parse(window.end),
      "server field lies inside independently observed operation window",
    );
  }
  return value;
}
export function assertSuccess(
  route,
  before,
  after,
  result,
  request = route.request,
) {
  let replacements;
  if (route.id === "CB") {
    assert.equal(result, true);
    replacements = {
      "private.people_blocks": [
        ...before["private.people_blocks"],
        { blocker_id: route.actor, blocked_id: route.peer },
      ],
    };
  } else {
    assert.deepEqual(Object.keys(result).sort(), [
      "receipt_id",
      "submitted_at",
    ]);
    assert.match(result.receipt_id, uuid);
    dynamicTime(result.submitted_at);
    const fingerprint = sql(
      `select md5(jsonb_build_array(${quote(route.mode)},${quote(route.target)}::uuid,'harassment',null)::text)`,
    );
    replacements = {
      "private.safety_reports": [
        ...before["private.safety_reports"],
        {
          id: result.receipt_id,
          submitted_at: result.submitted_at,
          reporter_id: route.actor,
          target_type: route.mode,
          target_id: route.target,
          category: "harassment",
          narrative: null,
          provenance_kind: route.provenance,
          provenance_ref_id: route.target,
        },
      ],
      "private.safety_report_requests": [
        ...before["private.safety_report_requests"],
        {
          reporter_id: route.actor,
          request_id: request,
          input_fingerprint: fingerprint,
          report_id: result.receipt_id,
        },
      ],
    };
  }
  return verifiedOutcome({
    result,
    expectedResult:
      route.id === "CB"
        ? true
        : { receipt_id: result.receipt_id, submitted_at: result.submitted_at },
    before,
    after,
    expectedAfter: exactSnapshot(before, after, replacements),
  });
}
export async function executeSuccess(
  route,
  { rollback = false, request = route.request } = {},
) {
  let owned, originalError;
  try {
    owned = session(`b3c_serial_${request.replaceAll("-", "").slice(0, 16)}`);
    owned.send(
      `${bounds}begin;${successSQL(route, { request })}${rollback ? "rollback" : "commit"};`,
    );
    owned.child.stdin.end();
    const done = await owned.done;
    assert.equal(done[0], 0);
    assert.doesNotMatch(owned.output(), /ERROR:/);
    return {
      result: marker(owned.output(), "RESULT:"),
      snapshot: marker(owned.output(), "SNAPSHOT:"),
    };
  } catch (error) {
    originalError = error;
    error.sqlDiagnostics = exactDiagnostic(owned?.output() ?? "");
    throw error;
  } finally {
    await finishOwnedSessions([owned], originalError);
  }
}
export function assertDenied(route, before, request) {
  assert.throws(
    () =>
      sql(
        `${bounds}begin;${auth(route.actor)}${query(route, { request })}commit;`,
      ),
    (error) =>
      error.message === `Disposable SQL error: 42501: ${denialFor(route)}`,
  );
  const after = census();
  return verifiedOutcome({
    result: { code: "42501", message: denialFor(route) },
    expectedResult: { code: "42501", message: denialFor(route) },
    before,
    after,
  });
}
export async function precheck(route) {
  assertCurrentOnly(route);
  const before = census();
  assert.equal(
    before["private.pilot_capabilities"].find((r) => r.key === "onboarding")
      .enabled,
    false,
    "onboarding-off positive",
  );
  const observed = await executeSuccess(route, { rollback: true });
  assertSuccess(route, before, observed.snapshot, observed.result);
  verifiedOutcome({
    result: "rollback",
    expectedResult: "rollback",
    before,
    after: census(),
  });
  assertCurrentOnly(route);
}
export function lossDefinition(cell, route) {
  const subject = cell.subject && route.subjects[cell.subject];
  const key = cell.loss.startsWith("availability")
    ? "availability"
    : route.purpose;
  const policyTable =
    key === "availability"
      ? "private.pilot_availability"
      : "private.pilot_capabilities";
  const policyWhere =
    key === "availability" ? "singleton" : `key=${quote(key)}`;
  const gateTable = cell.loss.startsWith("safety")
    ? "private.safety_feature_gate"
    : route.id === "CH"
      ? "private.hangout_feature_gate"
      : "private.people_feature_gate";
  const managerRequest = caseIds(`${cell.id}.manager-change`).request;
  if (
    cell.loss === "roster_revoke" ||
    cell.loss === "availability_off" ||
    cell.loss === "purpose_off"
  ) {
    const admission = cell.loss === "roster_revoke";
    const managerCall = admission
      ? `select * from public.set_pilot_account_admission(${quote(subject)},'revoked',1,${quote(reason)},${quote(managerRequest)});`
      : `select * from public.set_pilot_policy(${quote(key)},false,1,${quote(reason)},${quote(managerRequest)});`;
    return {
      sql: `${auth(route.manager)}select 'MANAGER_RESULT:'||to_jsonb(q)::text from (${managerCall.trim().replace(/;$/, "")}) q;reset role;`,
      manager: true,
      subject,
      key,
      request: managerRequest,
      admission,
      table: admission ? "private.pilot_account_admission" : policyTable,
      where: admission ? `account_id=${quote(subject)}` : policyWhere,
      writer: "authenticated approved manager RPC",
      wait: "social advisory serialization before pilot; NOT lower required lookup",
      missing: false,
    };
  }
  const roster = cell.loss === "roster_delete";
  const policy =
    cell.loss === "availability_missing" || cell.loss === "purpose_missing";
  const table = roster
    ? "private.pilot_account_admission"
    : policy
      ? policyTable
      : gateTable;
  const where = roster
    ? `account_id=${quote(subject)}`
    : policy
      ? policyWhere
      : "singleton";
  const missing = cell.loss.endsWith("missing") || roster;
  // Missing policy/roster maintenance uses the accepted exact prefix and gets
  // boundary credit only. Source/safety direct row writers get actual tuple
  // credit. Never manufacture a lower lookup wait with a common lock preamble.
  return {
    sql: `${roster || policy ? "select private.pilot_evidence_write_lock();" : ""}${missing ? "delete from" : "update"} ${table} ${missing ? "" : "set enabled=false"} where ${where};`,
    manager: false,
    boundary: roster || policy,
    subject,
    key,
    table,
    where,
    missing,
    writer:
      roster || policy
        ? "privileged synthetic exact-prefix missing-row maintenance; NOT manager delete permission"
        : "privileged synthetic source/safety direct row maintenance; NOT manager permission",
    wait:
      roster || policy
        ? "exact-prefix social/exclusive pilot boundary serialization; NOT lower lookup/absence proof"
        : `required ${table} tuple lookup/SHARE conflicts with actual UPDATE/DELETE`,
  };
}
function one(rows, predicate) {
  const found = rows.filter(predicate);
  assert.equal(found.length, 1);
  return found[0];
}
export function assertLoss(before, after, loss, route, window = null) {
  const predicate =
    loss.table === "private.pilot_account_admission"
      ? (r) => r.account_id === loss.subject
      : loss.table === "private.pilot_capabilities"
        ? (r) => r.key === loss.key
        : (r) => r.singleton === true;
  const old = one(before[loss.table], predicate),
    rows = before[loss.table].filter((r) => !predicate(r));
  const replacements = {};
  if (!loss.missing) {
    const actual = one(after[loss.table], predicate);
    const expected = {
      ...old,
      ...(loss.admission ? { state: "revoked" } : { enabled: false }),
    };
    if (loss.manager) {
      expected.revision = 2;
      expected.updated_at = dynamicTime(actual.updated_at, window);
      assert.notEqual(expected.updated_at, old.updated_at);
    }
    rows.push(expected);
  }
  replacements[loss.table] = rows;
  if (loss.manager) {
    const added = after["private.pilot_management_audit"].filter(
      (r) => r.actor_id === route.manager && r.request_id === loss.request,
    );
    assert.equal(added.length, 1);
    const a = added[0];
    assert.match(a.id, uuid);
    dynamicTime(a.occurred_at, window);
    const value = loss.admission ? "revoked" : false;
    const audit = {
      id: a.id,
      actor_id: route.manager,
      operation: loss.admission ? "admission" : "policy",
      target_id: loss.admission ? loss.subject : null,
      policy_key: loss.admission ? null : loss.key,
      previous_value: loss.admission ? "active" : true,
      new_value: value,
      previous_revision: 1,
      new_revision: 2,
      reason,
      request_id: loss.request,
      occurred_at: a.occurred_at,
    };
    const ledger = {
      actor_id: route.manager,
      request_id: loss.request,
      fingerprint: loss.admission
        ? ["admission", loss.subject, "revoked", 1, reason]
        : ["policy", loss.key, false, 1, reason],
      result_value: value,
      result_revision: 2,
      audit_id: a.id,
    };
    replacements["private.pilot_management_audit"] = [
      ...before["private.pilot_management_audit"],
      audit,
    ];
    replacements["private.pilot_management_requests"] = [
      ...before["private.pilot_management_requests"],
      ledger,
    ];
  }
  const expectedAfter = exactSnapshot(before, after, replacements);
  return verifiedOutcome({
    result: "loss committed",
    expectedResult: "loss committed",
    before,
    after,
    expectedAfter,
  });
}
async function observeRace(cell, route, loss, before, context) {
  let holder, waiter, originalError;
  const start = sql("select clock_timestamp()::text");
  const name =
    "b3c_" + caseIds(cell.id).request.replaceAll("-", "").slice(0, 24);
  try {
    holder = session(name + "_h");
    waiter = session(name + "_w");
    const operationFirst = cell.order === "operation-first";
    const lossSQL = `${loss.sql}select 'SNAPSHOT:'||(${censusQuery})::text;`;
    context.phase = "holder-execution";
    holder.send(
      `${bounds}begin;${operationFirst ? successSQL(route) : lossSQL}select 'HELD';`,
    );
    await until(() => holder.output().includes("HELD"));
    assert.doesNotMatch(
      holder.output(),
      /ERROR:/,
      "failed holder is not coverage",
    );
    context.phase = "waiter-execution";
    waiter.send(
      `${bounds}begin;${operationFirst ? lossSQL : successSQL(route)}select 'COMPLETED';commit;`,
    );
    const observationsSQL = `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',l.relation::regclass::text,'transactionid',l.transactionid,'classid',l.classid,'objid',l.objid,'objsubid',l.objsubid)) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(name + "_w")} where h.application_name=${quote(name + "_h")} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`;
    let observation;
    context.phase = "observe-required-wait";
    await until(() => {
      const raw = sql(observationsSQL);
      if (!raw) return false;
      observation = JSON.parse(raw);
      context.observation = observation;
      return true;
    });
    assert.notEqual(observation.holder_pid, observation.waiter_pid);
    assert.ok(observation.blocking_pids.includes(observation.holder_pid));
    assert.ok(observation.ungranted_locks.length > 0);
    if (loss.manager || loss.boundary)
      assert.ok(
        observation.ungranted_locks.some(
          (l) =>
            l.locktype === "advisory" && l.classid === 16016 && l.objid === 1,
        ),
        "actual approved/exact-prefix social boundary contention",
      );
    else
      assert.ok(
        observation.ungranted_locks.some((l) =>
          ["transactionid", "tuple"].includes(l.locktype),
        ),
        "actual required tuple contention; advisory-only wait forbidden",
      );
    context.phase = "release-and-assert-outcome";
    holder.send("commit;");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [h, w] = await Promise.all([holder.done, waiter.done]);
    context.diagnostics = [
      ...exactDiagnostic(holder.output()),
      ...exactDiagnostic(waiter.output()),
    ];
    assert.equal(h[0], 0);
    assert.doesNotMatch(holder.output(), /ERROR:/);
    const held = marker(holder.output(), "SNAPSHOT:");
    context.holderSnapshot = held;
    const window = { start, end: sql("select clock_timestamp()::text") };
    if (loss.manager) {
      const actual = marker(
        (operationFirst ? waiter : holder).output(),
        "MANAGER_RESULT:",
      );
      assert.deepEqual(
        actual,
        loss.admission
          ? { state: "revoked", revision: 2 }
          : { enabled: false, revision: 2 },
      );
    }
    if (operationFirst) {
      assert.equal(w[0], 0);
      assert.doesNotMatch(waiter.output(), /ERROR:/);
      assert.match(waiter.output(), /COMPLETED/);
      assertSuccess(route, before, held, marker(holder.output(), "RESULT:"));
      assertLoss(held, census(), loss, route, window);
    } else {
      assert.notEqual(w[0], 0);
      assert.deepEqual(
        exactDiagnostic(waiter.output()),
        [{ code: "42501", message: denialFor(route) }],
        "exact neutral SQL diagnostic only",
      );
      assert.doesNotMatch(
        waiter.output(),
        /40P01|40001|57014|55P03|COMPLETED|RESULT:|SNAPSHOT:/,
      );
      assertLoss(before, held, loss, route, window);
      verifiedOutcome({
        result: { code: "42501", message: denialFor(route) },
        expectedResult: { code: "42501", message: denialFor(route) },
        before: held,
        after: census(),
      });
    }
    const currentResult = operationFirst
      ? marker(holder.output(), "RESULT:")
      : null;
    return {
      id: cell.id,
      setup_qualification: context.setupQualification,
      ...observation,
      before: sanitized(before),
      after: sanitized(census()),
      actual_public_result: operationFirst
        ? route.id === "CB"
          ? currentResult
          : {
              fields: Object.keys(currentResult).sort(),
              receipt_sha256: createHash("sha256")
                .update(JSON.stringify(currentResult))
                .digest("hex"),
            }
        : { code: "42501", message: denialFor(route) },
      actual_manager_result: loss.manager
        ? marker((operationFirst ? waiter : holder).output(), "MANAGER_RESULT:")
        : null,
      writer: loss.writer,
      wait_location: loss.wait,
      result: operationFirst
        ? "success committed before loss"
        : { code: "42501", message: denialFor(route) },
      full54_values_verified: true,
    };
  } catch (error) {
    originalError = error;
    if (
      holder
        ?.output()
        .split("\n")
        .some((v) => v.startsWith("SNAPSHOT:"))
    ) {
      try {
        context.holderSnapshot = marker(holder.output(), "SNAPSHOT:");
      } catch {
        /* malformed snapshot remains unavailable */
      }
    }
    for (const owned of [holder, waiter].filter(Boolean)) {
      if (
        owned
          .output()
          .split("\n")
          .some((v) => v.startsWith("RESULT:"))
      ) {
        try {
          const result = marker(owned.output(), "RESULT:");
          context.publicResult =
            typeof result === "boolean"
              ? result
              : {
                  fields: Object.keys(result).sort(),
                  receipt_sha256: createHash("sha256")
                    .update(JSON.stringify(result))
                    .digest("hex"),
                };
        } catch {
          /* malformed result remains unavailable */
        }
      }
      if (
        owned
          .output()
          .split("\n")
          .some((v) => v.startsWith("MANAGER_RESULT:"))
      ) {
        try {
          context.managerResult = marker(owned.output(), "MANAGER_RESULT:");
        } catch {
          /* malformed manager result remains unavailable */
        }
      }
    }
    context.diagnostics = [
      ...exactDiagnostic(holder?.output() ?? ""),
      ...exactDiagnostic(waiter?.output() ?? ""),
    ];
    captureFailure(error, context);
    throw error;
  } finally {
    await finishOwnedSessions([holder, waiter], originalError);
  }
}
export async function removeOwnBlock(route) {
  const before = census();
  assert.equal(
    selectedLaterLane(route),
    "retained",
    "own committed block is lawful retained authority",
  );
  const result = JSON.parse(
    sql(
      `begin;${auth(route.actor)}select to_jsonb(public.set_safety_block(${quote(route.peer)},false));commit;`,
    ),
  );
  assert.equal(result, false);
  const after = census(),
    rows = before["private.people_blocks"].filter(
      (r) => !(r.blocker_id === route.actor && r.blocked_id === route.peer),
    );
  verifiedOutcome({
    result,
    expectedResult: false,
    before,
    after,
    expectedAfter: exactSnapshot(before, after, {
      "private.people_blocks": rows,
    }),
  });
  assertCurrentOnly(route);
}
export function requireReviewedPolicyTransport() {
  throw new Error(
    "B3c policy fixtures runtime blocked: frozen synchronous transport is unbounded; require reviewed transport amendment, gate follow-up, combined fixture/ownership review and explicit serial release before target contact",
  );
}
async function policyFixtures() {
  requireReviewedPolicyTransport();
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    policyManifest,
    matrix.cells.filter((c) => c.id.startsWith("L2.")),
  );
  assert.equal(policyManifest.length, 72);
  localTarget("current27");
  assertClean();
  let cleanupSafe = true,
    originalError,
    context;
  try {
    for (const cell of policyManifest) {
      context = { id: cell.id, phase: "independent-case-setup" };
      const clean = census(),
        setupStart = sql("select clock_timestamp()::text");
      const actorPreference = cell.id.includes("operation-first")
        ? false
        : "absent";
      const route = prepare(
        routes.find((r) => r.id === cell.route),
        {
          caseKey: cell.id,
          actorPreference: cell.id.includes("operation-first")
            ? false
            : "absent",
        },
      );
      context.setupQualification = assertCaseSetup(
        clean,
        census(),
        route,
        { start: setupStart, end: sql("select clock_timestamp()::text") },
        actorPreference,
      );
      context.phase = "eligible-current-precheck";
      await precheck(route);
      context.phase = "race";
      const before = census(),
        loss = lossDefinition(cell, route);
      const evidence = await observeRace(cell, route, loss, before, context);
      context.phase = "post-loss-current-control";
      if (cell.order === "operation-first") {
        if (route.id === "CB") {
          // A missing/off safety gate forbids an authorized unblock. Restore only
          // that independent safety fixture gate, checking its separate delta.
          if (loss.table === "private.safety_feature_gate") {
            const b = census();
            sql(
              `begin;${loss.missing ? "insert into private.safety_feature_gate(singleton,enabled) values(true,true)" : "update private.safety_feature_gate set enabled=true where singleton"};commit;`,
            );
            const a = census();
            verifiedOutcome({
              result: "synthetic safety restore",
              expectedResult: "synthetic safety restore",
              before: b,
              after: a,
              expectedAfter: exactSnapshot(b, a, {
                "private.safety_feature_gate": [
                  { enabled: true, singleton: true },
                ],
              }),
            });
          }
          await removeOwnBlock(route);
          if (loss.table === "private.safety_feature_gate") {
            const b = census();
            sql(`begin;${loss.sql}commit;`);
            assertLoss(b, census(), loss, route);
          }
        }
        assertCurrentOnly(route);
        assertDenied(route, census(), caseIds(cell.id + ".post-loss").request);
      }
      context.phase = "success-evidence";
      console.log(JSON.stringify(projectOutgoingEvidence(evidence)));
      context.phase = "guarded-case-reset";
      resetDisposable("current27");
    }
  } catch (error) {
    originalError = error;
    if (originalSuiteError(error).cleanupIncomplete) cleanupSafe = false;
    captureFailure(error, context);
    throw error;
  } finally {
    guardedFinalCleanup(cleanupSafe, originalError);
  }
}
// Dormant offline examples. Explicit invocation exercises pure/mocked data only;
// it never invokes a suite, census, SQL, target guard or reset.
export async function runOutgoingProjectionExamples() {
  let checks = 0;
  const check = (predicate) => {
    assert.ok(predicate);
    checks++;
  };
  const privateText = [
    "PRIVATE_TITLE_PROJECTION",
    "PRIVATE_NARRATIVE_PROJECTION",
    "private@example.invalid",
    "00000000-0000-4000-8000-000000000999",
    "Safety report unavailable",
    "eyJprivate.one.two",
    "postgres://user:private@provider.invalid/db",
    "PRIVATE_STORAGE_KEY_PROJECTION",
    "PRIVATE_AUTH_METADATA_PROJECTION",
  ];
  const snapshot = Object.fromEntries(censusTables.map((t) => [t, []]));
  snapshot["public.hangouts"] = [
    { title: privateText[0], description: privateText[1] },
  ];
  snapshot["auth.users"] = [
    {
      email: privateText[2],
      raw_user_meta_data: { [privateText[8]]: privateText[3] },
    },
  ];
  snapshot["storage.objects"] = [
    { [privateText[7]]: { token: privateText[5] } },
  ];
  snapshot["public.hangout_private_locations"] = [
    { instructions: privateText[4] },
  ];
  snapshot["private.safety_reports"] = [{ narrative: privateText[6] }];
  const changed = structuredClone(snapshot);
  changed["public.hangouts"][0].title = "PRIVATE_REPLACEMENT_PROJECTION";
  changed["storage.objects"][0][privateText[7]].token = "eyJdifferent.one.two";
  const delta = differences(snapshot, changed);
  check(delta[0].expected === privateText[0]);
  const precise = projectDifferences(delta);
  check(
    precise[0].table === "public.hangouts" &&
      precise[0].column === "title" &&
      precise[0].row_index === 0,
  );
  check(precise[1].column === undefined && precise[1].column_segment.available);
  check(precise[1].expected.sha256 !== precise[1].actual.sha256);
  const credentialA = outgoingValue({ password: "credential-original-one" });
  const credentialB = outgoingValue({ password: "credential-original-two" });
  check(credentialA.sha256 !== credentialB.sha256);
  check(outgoingValue("<redacted>").original_value_unavailable === true);
  check(outgoingValue({ token: "<redacted-token>" }).available === false);
  check(
    projectDifferences([
      {
        field: "$.storage.objects.0.private.title",
        expected: "<redacted>",
        actual: privateText[0],
      },
    ])[0].path_precision === "legacy-ambiguous",
  );
  const tricky = differences(
    { "public.hangouts": [{ "title.private.email": privateText[2] }] },
    { "public.hangouts": [{ "title.private.email": privateText[1] }] },
  );
  check(projectDifferences(tricky)[0].column === undefined);
  const cyclic = {};
  cyclic.self = cyclic;
  const accessor = Object.defineProperty({}, "private", {
    enumerable: true,
    get() {
      throw new Error(privateText[0]);
    },
  });
  check(outgoingValue(cyclic).available === false);
  check(outgoingValue(accessor).available === false);
  check(outgoingValue(() => privateText[0]).available === false);
  check(outgoingValue(Symbol(privateText[0])).available === false);
  check(outgoingValue(123n).available === true);
  for (const diagnostic of [
    { code: "42501", message: "Safety report unavailable" },
    { code: "40P01", message: "deadlock detected" },
    {
      code: "40001",
      message: "could not serialize access due to concurrent update",
    },
  ])
    check(safeDiagnostic(diagnostic).code === diagnostic.code);
  for (const diagnostic of [
    "Disposable SQL error: 42501: Safety report unavailable\n",
    "Disposable SQL error: 42501: Safety report unavailable\nPRIVATE_TITLE_PROJECTION",
    "prefix Disposable SQL error: 42501: Safety report unavailable",
    {
      code: "42501",
      message: "Safety report unavailable",
      cause: privateText[0],
    },
    { code: "42501", message: privateText[1] },
    "Disposable SQL error: ZZ999: PRIVATE_NARRATIVE_PROJECTION",
  ])
    check(safeDiagnostic(diagnostic).code === "unavailable");
  const summary = projectCensusEvidence(snapshot);
  check(
    Object.keys(summary).length === 54 && summary["auth.users"].count === 1,
  );
  check(
    Object.values(projectCensusEvidence(null)).every(
      (row) => row.available === false,
    ),
  );
  let raw;
  try {
    assert.deepEqual({ title: privateText[0] }, { title: privateText[1] });
  } catch (error) {
    raw = error;
  }
  raw.cause = new Error(privateText[2]);
  raw.preciseDifferences = delta;
  raw.sqlDiagnostics = [{ code: "40P01", message: "deadlock detected" }];
  const context = {
    id: policyManifest[0].id,
    phase: "holder-execution",
    holderSnapshot: snapshot,
    publicResult: { receipt_id: privateText[3] },
    managerResult: { arbitrary: privateText[0] },
    observation: {
      holder_pid: 101,
      waiter_pid: 102,
      blocking_pids: [101],
      ungranted_locks: [
        {
          locktype: "tuple",
          mode: "ShareLock",
          relation: "public.hangouts",
          transactionid: privateText[3],
        },
      ],
      arbitrary: privateText[0],
    },
    setupQualification: {
      source_owned_rowsets_verified: true,
      provider_opaque_immutable_anchor_fields: [privateText[7]],
    },
    diagnostics: [{ code: "42501", message: "Safety operation unavailable" }],
  };
  const failure = projectFailureEvidence(
    raw,
    context,
    snapshot,
    new Error(privateText[8]),
  );
  check(
    failure.id === context.id &&
      failure.phase === context.phase &&
      failure.observed_wait_credit === 0,
  );
  check(failure.diagnostics.some((row) => row.code === "40P01"));
  check(failure.lock_observation.holder_pid === 101);
  const success = projectOutgoingEvidence({
    id: context.id,
    setup_qualification: context.setupQualification,
    ...context.observation,
    before: sanitized(snapshot),
    after: sanitized(changed),
    actual_public_result: { receipt_id: privateText[3] },
    actual_manager_result: { state: "revoked", revision: 2 },
    result: "success committed before loss",
    writer: privateText[0],
    wait_location: privateText[1],
    full54_values_verified: true,
  });
  check(
    success.full54_values_verified === true &&
      Object.keys(success.before).length === 54,
  );
  const unknown = projectOutgoingEvidence({
    id: privateText[3],
    phase: privateText[4],
    partition: privateText[1],
    [privateText[7]]: privateText[8],
    observation: { unavailable: privateText[0] },
  });
  check(
    typeof unknown.phase === "object" && unknown.withheld_fields.length === 1,
  );
  const narrative = projectOutgoingEvidence({
    result: "Safety report unavailable",
  });
  check(typeof narrative.result === "object" && narrative.result.available);
  const neutral = neutralSuiteError(raw);
  check(
    originalSuiteError(neutral) === raw &&
      !Object.hasOwn(neutral, "cause") &&
      !Object.hasOwn(neutral, "actual") &&
      !Object.hasOwn(neutral, "expected"),
  );
  const logs = [],
    previous = console.error;
  console.error = (record) => logs.push(record);
  try {
    const cleanup = new Error(privateText[0]);
    cleanup.preciseDifferences = delta;
    let caught;
    try {
      await finishOwnedSessions(
        [
          {
            close: async () => {
              throw cleanup;
            },
            done: Promise.resolve([1, null]),
          },
        ],
        raw,
      );
    } catch (error) {
      caught = error;
    }
    check(originalSuiteError(caught) === raw && raw.cleanupIncomplete === true);
    check(caught.evidence.reset_forbidden === true);
    check(JSON.parse(logs[0]).differences[0].column === "title");
    check(
      neutralSuiteError(neutral) === neutral &&
        neutral.evidence.reset_forbidden === true,
    );
    const first = new Error(privateText[1]);
    try {
      await finishOwnedSessions(
        [{ close: async () => {}, done: Promise.resolve([1, null]) }],
        first,
      );
    } catch (error) {
      check(
        originalSuiteError(error) === first && error.evidence.reset_forbidden,
      );
    }
    await finishOwnedSessions([
      { close: async () => {}, done: Promise.resolve([0, null]) },
    ]);
    check(true);
    raw.failureRecorded = true;
    raw.failedCellID = context.id;
    raw.rollbackDifferences = delta;
    captureFailure(raw, { ...context, phase: "guarded-case-reset" });
    const supplemental = JSON.parse(logs.at(-1));
    check(
      supplemental.partition === "supplemental-failure-no-credit" &&
        supplemental.differences[0].column === "title",
    );
  } finally {
    console.error = previous;
  }
  const encoded = JSON.stringify({
    failure,
    success,
    unknown,
    narrative,
    neutral,
    logs,
    inspected: {
      message: neutral.message,
      stack: neutral.stack,
      own: Object.getOwnPropertyDescriptors(neutral),
    },
  });
  for (const text of [
    ...privateText.filter((v) => v !== "Safety report unavailable"),
    "PRIVATE_REPLACEMENT_PROJECTION",
    "credential-original-one",
    "credential-original-two",
    "eyJdifferent.one.two",
  ])
    check(!encoded.includes(text));
  return {
    checks,
    target_contact_attempts: 0,
    classification: "dormant pure/mocked author examples only",
  };
}

export async function runPolicyFixtures() {
  try {
    return await policyFixtures();
  } catch (error) {
    throw neutralSuiteError(error);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c exact72 policy/admission waits (requires separate serial release)",
    { timeout: 1_800_000 },
    runPolicyFixtures,
  );
