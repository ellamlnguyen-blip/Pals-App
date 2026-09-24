# TASK-017B1 planning review

Date: 2026-09-24  
Planning branch: `agent/TASK-017B1-contract` from remote-verified main `dcd89ae9a47d598493ab6382aa4d1535dec6ffea`  
Scope: documentation only; no B1 implementation or feature enablement

An independent read-only GPT-6 Sol medium security reviewer examined the bounded account-enforcement contract against Accepted ADR-0019/0020 and the completed Stage A backend. It required a current action-specific role on exact replay, so a former admin who remains a moderator cannot retrieve a prior ban/reinstatement result. It also found that a preissued Storage signed photo URL can outlive the account-status change because redemption does not consult current RLS. The contract now tests the role demotion and defers B1 implementation until the narrow photo policy in Proposed ADR-0021 is explicitly accepted.

The reviewer rechecked the corrected contract and ADR-0021 and found no remaining concrete contract/security blocker for publication. Official Supabase Storage guidance was added to clarify that hosted CDN caching can extend a signed URL's availability beyond token expiry; B1's verification remains disposable local. This is a proposal only, not accepted authority for an exception or for hosted moderation. Standard-speed selection was unavailable to verify.

After canonical publication, the coordinator must ask for an explicit ADR-0021 decision. A fresh B1 implementation branch starts only after acceptance, then requires local tests, exact-tip security review, handoff and canonical integration before B2.
