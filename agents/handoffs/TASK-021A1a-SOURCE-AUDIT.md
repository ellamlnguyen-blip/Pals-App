# TASK-021A1a final-definition source audit

Baseline: `f4ba5cd6affdd8eae7611a15cbed39d33e39b756`. Documentation-only preimplementation audit. Latest CREATE/REPLACE function definition across all 20 migrations is listed; historical definitions remain unchanged. Dropped `private.validate_primary_photo()` is excluded; dropped/recreated moderation and participant functions are represented by their replacement final signatures. No runtime evidence is claimed. This stage adds authority primitives only; all existing functions, student RLS, grants, triggers, Storage and operator behavior remain unchanged. A1b owns live enforcement; A1c owns deferred capabilities.

| Final function and arguments | Final migration | A1 allocation |
| --- | --- | --- |
| `private.account_is_active()` | `20260921000100_identity_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.advance_large_hangout_epoch()` | `20260925000100_local_large_hangout_safeguards.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.bump_profile_revision()` | `20260922000200_owner_profile_enrichment.sql` | a: reused unchanged; b/c caller audit |
| `private.can_read_hangout(target uuid, private_details boolean default false)` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `private.can_read_hangout_roster(target uuid, subject uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.chat_authorized(p_hangout_id uuid)` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `private.chat_immutable_message()` | `20260923000200_local_hangout_chat.sql` | b: ordinary/source or retained safety/operator audit |
| `private.chat_lock_evidence(p_hangout_id uuid, p_actor uuid, p_campus uuid)` | `20260923000200_local_hangout_chat.sql` | b: ordinary/source or retained safety/operator audit |
| `private.chat_require(p_hangout_id uuid)` | `20260923000200_local_hangout_chat.sql` | b: ordinary/source or retained safety/operator audit |
| `private.check_hangout_revision(h public.hangouts, expected bigint)` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.clear_departing_cohost()` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `private.clear_reopened_case_sanction()` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `private.dm_active_caller()` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.dm_eligible(p_peer uuid)` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.dm_enabled()` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.dm_immutable()` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.dm_lock_evidence(p_actor uuid,p_peer uuid)` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.dm_require()` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.effective_hangout_cohost(p_hangout_id uuid, p_actor uuid)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `private.enforce_hangout_ownership()` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `private.enforce_joined_host()` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.enforce_participant_transition()` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.friendship_eligible(target uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.friendship_enabled()` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.friendship_lock_eligibility(actor uuid, target uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.friendship_lock_pair(a uuid, b uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.hangouts_enabled()` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.has_verified_membership()` | `20260922000100_verified_onboarding.sql` | b: ordinary/source or retained safety/operator audit |
| `private.lock_hangout(target uuid)` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `private.moderation_actor()` | `20260924000100_local_moderation_review.sql` | b: ordinary/source or retained safety/operator audit |
| `private.moderation_report_allowed(p_actor uuid,p_report uuid, p_for_action boolean default false)` | `20260924000100_local_moderation_review.sql` | b: ordinary/source or retained safety/operator audit |
| `private.notification_chat_source()` | `20260923000500_local_notifications_hangouts.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_dm_message_source()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_dm_pair_source()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_emit(p_recipient uuid,p_kind text,p_source uuid,p_target uuid,p_code text,p_actor uuid,p_category text)` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_emit_hangout(p_event uuid,p_hangout uuid,p_actor uuid,p_code text)` | `20260923000500_local_notifications_hangouts.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_enabled()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_friend_source()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_lock_recipient(p_recipient uuid)` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.notification_require_owner()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.people_active_owner()` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.people_enabled()` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.people_ready_campus()` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.people_require_read_committed()` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.people_visible(subject uuid, campus uuid)` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.profile_trim(value text)` | `20260922000200_owner_profile_enrichment.sql` | a: reused unchanged; b/c caller audit |
| `private.protect_profile_photo_delete()` | `20260922000200_owner_profile_enrichment.sql` | b: ordinary/source or retained safety/operator audit |
| `private.provision_account()` | `20260921000100_identity_foundation.sql` | a: reused unchanged; b/c caller audit |
| `private.ready_campus()` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.ready_subject_campus(subject uuid, campus uuid)` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.record_large_hangout_join(p_hangout_id uuid)` | `20260925000100_local_large_hangout_safeguards.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.reject_large_hangout_signal_change()` | `20260925000100_local_large_hangout_safeguards.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.reject_moderation_evidence_change()` | `20260924000200_local_account_enforcement.sql` | b: ordinary/source or retained safety/operator audit |
| `private.require_active_photo_write()` | `20260924000200_local_account_enforcement.sql` | b: ordinary/source or retained safety/operator audit |
| `private.require_active_profile_write()` | `20260924000200_local_account_enforcement.sql` | b: ordinary/source or retained safety/operator audit |
| `private.require_active_student_source_write()` | `20260924000200_local_account_enforcement.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_enabled()` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_lock_hangout_evidence(p_actor uuid,p_campus uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_lock_visible_evidence(p_actor uuid,p_peer uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_pair_blocked(a uuid,b uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_peer_evidence(p_actor uuid,p_peer uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_reconcile_existing_blocks()` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_record_joined_overlap(p_hangout uuid,p_actor uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `private.safety_report_peer_source(p_actor uuid,p_peer uuid)` | `20260923000700_local_safety_reports.sql` | b: ordinary/source or retained safety/operator audit |
| `private.social_hangout_mutation_lock()` | `20260923000600_local_global_blocks.sql` | a: reused unchanged; b/c caller audit |
| `private.sync_confirmed_membership()` | `20260922000100_verified_onboarding.sql` | a: reused unchanged; b/c caller audit |
| `private.valid_profile_list(items text[], maximum integer, item_limit integer)` | `20260922000200_owner_profile_enrichment.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.valid_profile_prompts(items jsonb)` | `20260922000200_owner_profile_enrichment.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `private.validate_hangout_input(p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text,p_ends_at timestamptz,p_campus_zone text,p_visibility text,p_location_precision text,p_eligibility jsonb)` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.validate_hangout_instructions(value text)` | `20260922000300_hangout_foundation.sql` | b: ordinary/source or retained safety/operator audit |
| `private.validate_profile_photos()` | `20260922000200_owner_profile_enrichment.sql` | b: ordinary/source or retained safety/operator audit |
| `public.accept_friend_request(p_peer_id uuid, p_generation_id uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.answer_own_attendance(p_hangout_id uuid,p_attended boolean, p_expected_revision bigint)` | `20260924000400_local_attendance.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.apply_account_moderation_action(p_report_id uuid,p_request_id uuid,p_expected_case_revision bigint, p_action text,p_reason text)` | `20260924000200_local_account_enforcement.sql` | b: ordinary/source or retained safety/operator audit |
| `public.apply_hangout_moderation_action(p_report_id uuid,p_request_id uuid,p_expected_case_revision bigint,p_reason text)` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `public.browse_people(p_search text default null, p_graduation_year integer default null, p_major text default null, p_after_name text default null, p_after_id uuid default null, p_limit integer default 24)` | `20260922000600_people_id_cursor.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.cancel_friend_request(p_peer_id uuid, p_generation_id uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.cancel_hangout(p_hangout_id uuid,p_expected_revision bigint)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.create_dm_request(p_target_id uuid,p_request_id uuid,p_body text)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.create_friend_request(p_target_id uuid, p_request_id uuid)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.create_hangout(p_request_id uuid,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.decline_friend_request(p_peer_id uuid, p_generation_id uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.demote_hangout_cohost(p_hangout_id uuid, p_account_id uuid, p_expected_revision bigint)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.get_access_state()` | `20260922000100_verified_onboarding.sql` | b: ordinary/source or retained safety/operator audit |
| `public.get_dm_status(p_peer_id uuid)` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.get_friendship(p_peer_id uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.get_hangout_large_state(p_hangout_id uuid)` | `20260925000100_local_large_hangout_safeguards.sql` | b: ordinary/source or retained safety/operator audit |
| `public.get_hangout_participant_state(p_hangout_id uuid,p_account_id uuid)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.get_moderation_report(p_report_id uuid)` | `20260924000300_local_hangout_disable.sql` | b: ordinary/source or retained safety/operator audit |
| `public.get_notification_preferences()` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.get_own_attendance(p_hangout_id uuid)` | `20260924000400_local_attendance.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.get_people_detail(p_account_id uuid)` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.get_people_preference()` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.join_hangout(p_hangout_id uuid)` | `20260925000100_local_large_hangout_safeguards.sql` | b: ordinary/source or retained safety/operator audit |
| `public.leave_hangout(p_hangout_id uuid)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.list_dm_inbox(p_after_created_at timestamptz default null, p_after_generation_id uuid default null,p_limit integer default 24)` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.list_friendships(p_after_peer_id uuid default null, p_limit integer default 24)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.list_hangout_cohosts(p_hangout_id uuid, p_after_account_id uuid default null, p_limit integer default 24)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.list_hangout_roster_roles(p_hangout_id uuid, p_after_account_id uuid default null, p_limit integer default 24)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.list_moderation_reports(p_after_submitted_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)` | `20260924000100_local_moderation_review.sql` | b: ordinary/source or retained safety/operator audit |
| `public.list_my_retained_hangout_ids(p_after_id uuid default null,p_limit integer default 24)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.list_notifications(p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)` | `20260925000200_local_cohost_authority.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.list_own_attendance(p_before_hangout_id uuid default null)` | `20260924000400_local_attendance.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.list_people_blocked_ids(p_after_id uuid default null,p_limit integer default 24)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.mark_notification_read(p_notification_id uuid)` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.promote_hangout_cohost(p_hangout_id uuid, p_account_id uuid, p_expected_revision bigint)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.query_saved_hangouts(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_time_filter text, p_joining_filter text, p_cutoff timestamptz)` | `20260925000100_local_large_hangout_safeguards.sql` | b: ordinary/source or retained safety/operator audit |
| `public.read_dm_messages(p_peer_id uuid,p_generation_id uuid, p_after_sequence bigint default null,p_limit integer default 50)` | `20260923000300_local_direct_messages.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.read_hangout_messages(p_hangout_id uuid, p_after_sequence bigint default null, p_limit integer default 50)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.remove_hangout_participant(p_hangout_id uuid, p_account_id uuid, p_expected_revision bigint)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.send_dm_message(p_peer_id uuid,p_generation_id uuid, p_request_id uuid,p_body text)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.send_hangout_message(p_hangout_id uuid, p_request_id uuid, p_body text)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.set_hangout_joining(p_hangout_id uuid,p_expected_revision bigint,p_joining_state text)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.set_notification_preference(p_category text,p_enabled boolean)` | `20260923000400_local_notifications_social.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.set_people_block(p_account_id uuid,p_blocked boolean)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.set_people_preference(p_opted_in boolean)` | `20260922000400_people_text_directory.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.set_safety_block(p_account_id uuid,p_blocked boolean)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.step_down_hangout_cohost(p_hangout_id uuid, p_expected_revision bigint)` | `20260925000200_local_cohost_authority.sql` | b: ordinary/source or retained safety/operator audit |
| `public.submit_safety_report(p_request_id uuid,p_target_mode text,p_target_id uuid, p_category text,p_narrative text default null)` | `20260923000700_local_safety_reports.sql` | b: ordinary/source or retained safety/operator audit |
| `public.transition_dm(p_peer_id uuid,p_generation_id uuid,p_action text, p_reply_request_id uuid default null,p_reply_body text default null)` | `20260923000600_local_global_blocks.sql` | b: ordinary/source or retained safety/operator audit |
| `public.transition_friendship(p_peer_id uuid, p_generation_id uuid, p_action text)` | `20260923000600_local_global_blocks.sql` | c: deferred capability audit (b also owns live caller/peer checks) |
| `public.transition_moderation_case(p_report_id uuid,p_request_id uuid, p_expected_revision bigint,p_action text,p_note text default null, p_duplicate_report_id uuid default null)` | `20260924000100_local_moderation_review.sql` | b: ordinary/source or retained safety/operator audit |
| `public.unfriend(p_peer_id uuid, p_generation_id uuid)` | `20260923000100_local_friendship.sql` | c: deferred capability audit (b also owns live caller/peer checks) |

## Direct and trigger paths

- Identity foundation: accounts/universities/membership/platform roles grants and owner reads; profiles column grants and RLS. Verified onboarding: Auth synchronization trigger; Storage owner SELECT/INSERT/DELETE policies; access-state helper. No admission backfill or manager inheritance.
- Owner enrichment final photo triggers: profile row UPDATE precedes `validate_profile_photos` Storage KEY SHARE; Storage DELETE precedes `protect_profile_photo_delete` profile UPDATE. Account-enforcement adds account SHARE live status triggers after direct row acquisition. These direct paths do not acquire the social advisory key.
- Global-block migration final Hangout and social evidence lock helpers: social boundary first, Hangout/source locks then feature gates/accounts/Auth/membership/campus/profile/Storage/People preference. Later account enforcement and Hangout-disable/cohost definitions retain their independent checks. A1a changes none.
- Moderation actor: moderation advisory key `(17017,1)`, gate SHARE, actor account SHARE, platform role SHARE; target account UPDATE for sanctions. This path does not take the social boundary. Admission-manager status SHARE must conflict with this account UPDATE.
- Trusted Auth email updates acquire Auth row before synchronization writes membership; account deletion cascades from Auth. Campus writes do not acquire the social key. Admission activation must lock these actual evidence rows, with safe abort where lock inversion occurs.
- New A1a tables/functions/grants and test mappings will be added to the final implementation inventory after lock-review clearance. Existing function inventory is a declaration of unchanged scope, not a substitute for A1b/c tests.
