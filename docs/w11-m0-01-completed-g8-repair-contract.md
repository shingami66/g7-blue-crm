# W11 M0-01 — Completed G8 DEV Authority Retirement Contract

**Evidence and decision date:** 29 October 2026
**Contract status:** `CORRECTIVE MIGRATION APPLIED; SINGLE AUTHORIZED RETRY SUCCEEDED; POSTFLIGHT VERIFIED; M0-01 CLOSED — CONTROLLER PASS`
**Task verdict:** `PASS`. The Controller records `M0-01 = CLOSED` based on the published repair and postflight evidence in Section 13.
**W11 readiness:** `NO-GO`. M0 overall and broader W11 gates remain open.

## 1. Baseline and authority boundary

- Repository: `D:/G7/g7-crm`, branch `main`; before editing, HEAD, `origin/main`, and live `origin/main` were `ce3a035c4bd58edd4a78c064b074c4d18384b524`; worktree and index were clean.
- Read-only target: Supabase DEV project `dpddrqjzqohexixgdqiq`.
- At the 28 October contract cutoff, this document recorded an Owner business disposition and designed a possible later DEV repair; it granted no implementation, migration, RPC, or data-mutation authority at that time. The separate 29 October authorization and execution are recorded in Section 12, and the later Controller closure verdict in Section 13.
- No Controller state or handover files are part of this contract.

## 2. Frozen one-case target

| Entity | ID | Required current state |
|---|---|---|
| Service | `c7ca6503-9746-4604-964a-cbe53c118009` | `Completed`, soft-deleted |
| Quotation | `87932c67-cdca-4d6c-bb20-691b59f8961f` | approved, current, undeleted, SAR 800.00 |
| Approved Billing Scope (ABS) | `513f1e78-5bfa-4ff2-a8a8-6986498d1987` | version 1, active approved, SAR 800.00 |

The case is **G8 Final Service lmu0p1**, Service `SVC-2026-9737`, linked to Customer `21db71fc-ac14-44c1-b5f6-03fcfcf64fc9` (`CUST-G8-lmu0p1`, synthetic G8 Test Corp). The Customer currently has `is_deleted=true` and `deleted_at IS NULL`.

## 3. Owner decision and bounded classification

Mozfer accepts the target as **synthetic G8 DEV verification data**. There is no real customer unbilled business obligation Mozfer intends to preserve. The active SAR 800.00 ABS authority should therefore be retired through a separately authorized, governed remediation.

The desired state preserves the Service as soft-deleted with its historical `Completed` status, the Customer unchanged, the quotation unchanged, and the ABS row, items, snapshots, and historical audit rows intact. Only the active ABS authority is to be retired.

- **G8 DEV verification provenance:** `VERIFIED`.
- **Exact historical mechanism that produced the stored Completed status:** `UNKNOWN`.
- **Historical financial impact:** `UNKNOWN`.

The SAR 800.00 is commercial authority only. It is not established as an invoice, receivable, cash, revenue, accounting balance, loss, or write-off. The missing invoice row and invoice-created audit reference do not prove zero historical impact. The G8 provenance decision does not identify every historical mutation path.

Do not restore the Service or Customer, create or reconstruct an invoice, create payment/receipt/revenue/receivable/accounting entries, change the quotation, or delete historical Service/quotation/ABS/item/audit records.

## 4. Read-only evidence

The reproducible single-case read and downstream guard query is [w11m0_01_completed_g8_preflight.sql](../supabase/verification/w11m0_01_completed_g8_preflight.sql). It is a single SELECT-only statement derived from the reviewed 14-case downstream guard query and fixed to the exact target IDs above.

The fresh DEV execution at **2026-10-28 05:46:04.291820+00** observed snapshot `14649:14649:`, one target case, pair-set MD5 `2982d5e4816907bf5cb50f046f740622`, and zero nonzero results across all 90 expanded downstream relation paths. The 26 October full inventory cutoff is unchanged.

| Evidence | Current observation |
|---|---|
| Service | Exact target exists, title `G8 Final Service lmu0p1`, created 2026-08-17 10:11:46.701237+00, soft-deleted 2026-08-17 10:13:40.350+00, status `Completed`, no cancellation reason. |
| Lifecycle | Version 1 / `w3-v1`; legacy `Completed`; commercial `approved`; payment `unassessed`; readiness `ready`; execution `ended`; completion `confirmed`; close `open`. Last lifecycle update is 2026-08-17 10:13:40.294923+00 by `test_g8_actor`. |
| Customer | Exact linked synthetic G8 Customer remains flagged deleted; no Customer mutation is proposed. |
| Quotation | Exact ID and Service relationship; approved, not deleted, not superseded; SAR 800.00 total. |
| ABS | Exact expected ID is the sole Service/Quotation scope; version 1, active approved, not voided or superseded; SAR 800.00 accepted total; currency SAR; line-safety `safe`. |
| ABS items | Exactly one accepted `Standard Production Package` item, quantity 1, SAR 800.00, zero VAT. Item JSON digest MD5 is `0f702aaea049a071bdcc9b13de930dd8`, using the same ordered `to_jsonb(item)::text` input as the existing fixed-case validator. This is a snapshot comparison value, not a financial classification. |
| Audit | Three current target audit events at 2026-08-17 10:11:48.006163+00: quotation approval, ABS approval, and Service `Quoted → Approved`. No event establishes an `In Progress → Completed` transition. |
| Invoice | Zero current invoice rows by the checked Service, Quotation, and ABS keys; zero matching `invoice.created` audit references keyed by Service or ABS. |
| Other links | Zero matched payments, allocations, credits/applications/refunds/reversals, receipts, commitments, supplier operations, expenses, bridge/source effects, revenue recognition, journal lines/links, or other checked paths; all 90 expanded guard-path counts are zero. |

The fresh 2026-10-28 05:39:59.893788+00 family read found this exact five-Service Customer group: `G8 Invoice Replay Service lmu0p1`, `G8 Concurrency Service lmu0p1`, `G8 Conflict Service lmu0p1`, `G8 Final Service lmu0p1`, and `G8 Lost-Response Service lmu0p1`. Equivalent generated five-Service families use suffixes `ctqe6e` and `3yhlwg`. For all three G8 Final Services, the accepted commercial value is SAR 800.00 with one `Standard Production Package` item. The two comparison Final cases (`ctqe6e` and `3yhlwg`) each have an `invoice.created` audit event; the target does not. This difference is relevant scenario evidence and does not establish an unrecorded transaction, invoice deletion, or historical financial impact.

Repository chronology independently records G8 family-specific Create Replay Safety as complete across Customer, Service, Quotation, Invoice, and Payment in the 17 August 2026 [G8 checkpoint](project-status.md). That record lists Customer commit `be96beaebbcfe17432ee0515eef68d4cb6cb19ac`, Service `ea61563163fcc73f1a2fdfed1c650807cf8eb77d`, Quotation `61fd5059e5c735466318d44be7487e71be64708f`, Invoice `04c89df83d5cea45722dbb0e4c3c23df91cc7232`, and Payment as an existing implementation verified without an implementation delta. The repository also contains the 17 August Service, Quotation, and Invoice replay-safety sources: [20260817100000](../supabase/migrations/20260817100000_g8_service_create_replay_safety.sql), [20260817120000](../supabase/migrations/20260817120000_g8_quotation_create_replay_safety.sql), and [20260817140000](../supabase/migrations/20260817140000_g8_invoice_create_replay_safety.sql). Together, exact G8 naming, timing, family shape, and repository chronology support synthetic DEV verification provenance, but do not prove the exact Completed transition mechanism or historical financial impact.

## 5. Existing 14-case mechanism and selected design

The already-applied migration is `20261027102347 / w11_m0_01_14_approved_abs_retirement`. Its helper and RPC deliberately freeze 14 Approved-Service triples, enforce a 14-row manifest, and only admit the exact guarded transition for soft-deleted Services in status `Approved`. Its downstream helper is likewise fixed to that 14-case cohort. The existing ABS lifecycle trigger also rejects a soft-deleted `Completed` Service, and ordinary `void_approved_billing_scope` has not been relaxed.

**Selected smallest durable mechanism:** a separate additive DEV migration with a new exact one-case target helper, one-case downstream helper, and service-role-only one-case RPC, plus narrow guarded extensions to the existing private ABS trigger functions. Keep the applied 14-case migration and `retire_w11_m0_01_approved_abs(text)` behavior unchanged. Do not change the 14-case manifest to fifteen or create a target-parameterized/general-purpose repair API.

Rejected alternatives:

- **Widen the existing 14-case helper/RPC:** breaks its fixed manifest/count and replay contract and blurs separate Owner authorization.
- **Call the ordinary ABS void RPC:** it intentionally rejects the soft-deleted `Completed` Service.
- **Restore Service/Customer first:** changes product state not authorized by the Owner decision and is unnecessary to retire only the stale active commercial authority.
- **Direct table update or deletion:** bypasses governed audit/authority and row-level transition protection.
- **Reconstruct invoice or accounting facts:** unsupported by evidence and explicitly outside the Owner decision.

## 6. Future migration, RPC, and trigger contract

The future migration must be separately reviewed and separately authorized for DEV. Its RPC should be a fixed-argument operation such as `public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)`; it accepts no Service, Quotation, ABS, amount, reason, or target-set argument. Internal constants and helper rows freeze the one exact triple, expected Customer, Service status/deletion timestamp, lifecycle state, approved/current quotation, active ABS version and exact SAR values, one-item count and digest.

Before any write, the RPC must:

1. Require exactly one active admin actor row for the supplied Owner actor ID and lock/validate that identity.
2. Acquire deterministic domain locks: Service first, then lifecycle, Customer, Quotation, ABS, and ABS items, each ordered by its primary key.
3. Revalidate every frozen precondition, including soft-deleted `Completed` Service state, unchanged Customer and approved/current quotation, exact active ABS values/items, and exactly one fixed manifest row.
4. Recompute the complete 90-path downstream guard inside the same transaction after locks. Any matching link, target mismatch, concurrent state change, or unexpected audit state raises `HOLD` and rolls back.
5. Set an exact private transaction context and actor only after validation. Update only the ABS retirement fields permitted by the trigger (`status`, `voided_at`, `voided_by`, `void_reason`, `updated_by`, `updated_at`); use the transaction timestamp and Owner actor consistently. Preserve all other ABS columns and all items/snapshots.
6. Insert the distinct Owner-authorized remediation audit record and prove postconditions in the same transaction. Any count mismatch or audit failure aborts the complete transaction.

The private trigger extensions must preserve the existing 14-case branch verbatim in meaning and add one exact context branch for this fixed Completed G8 triple. The existing ABS transition guard remains SECURITY INVOKER and requires the exact fixed target/context, `current_user = 'postgres'`, old `approved` to new `voided`, expected actor/timestamp/reason, and all non-retirement fields unchanged. The existing before-write guard is SECURITY DEFINER; extend its soft-deleted-Service exception only for the exact new context and fixed target while the Service remains `Completed`. The paired invoker guard ensures a direct application-role update cannot forge that context. The Completed branch must not permit any other Completed/Cancelled Service, target, or general void transition. Compare OLD/NEW JSON after removing only the six permitted retirement fields. Keep normal void behavior unchanged.

The function and private helpers remain owned by `postgres`, with pinned `search_path=pg_catalog, public`. Revoke helper and trigger-function EXECUTE from application roles; revoke the RPC from `PUBLIC`, `anon`, and `authenticated`, and grant EXECUTE only to `service_role`. Do not widen table grants, add an application UI/action, or expose arbitrary-ID repair capability.

## 7. Audit and replay contract

Use a distinct audit event with the exact remediation label:

`OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT`

Bind it to the exact Service/Quotation/ABS IDs, actor, and transaction timestamp. Record that the Owner accepted synthetic G8 DEV test-data disposition; record the unresolved historical mechanism and financial impact as `UNKNOWN`; state that SAR 800.00 was commercial authority only. The future execution authorization reference must identify the separate Owner authorization actually granted at that time.

The event must not use invoice cancellation, revenue/receivable recognition, payment, write-off, or known-Completed-transition wording. Use an explicit remediation audit event/action, not an ordinary invoice/void event that could misstate business history.

A retry may return an idempotent success only if the exact one-case ABS is already in the fully expected retired state and exactly one matching audit record exists with matching IDs, authorized actor, event, reason, authorization reference, and timestamp. Revalidate all preserved source state and all 90 downstream paths. Mixed/partial state, duplicate/mismatched audit, any new link, or drift returns `HOLD`; never adapt or retarget.

## 8. Required postflight and M0-01 exit evidence

A future successful execution must prove all of the following:

1. The exact ABS row still exists and its active authority is retired; its version, accepted amounts, source snapshot, and one item/digest remain unchanged.
2. The Service remains soft-deleted and historically `Completed`; lifecycle history and state remain unchanged.
3. The Customer remains unchanged; the Quotation remains approved/current and unchanged.
4. No invoice was created or modified; no payment, receipt, credit, revenue, receivable, bridge, journal, or other accounting fact was created or modified.
5. Exactly one matching Owner-authorized remediation audit event exists; no ordinary invoice-cancel or write-off event exists.
6. All 90 downstream links remain zero.
7. All 14 previously repaired Approved-Service ABS authorities remain retired and unchanged.
8. M0-02 and M0-03 records/evidence remain unchanged.

At the original contract-design stage, M0-01 closure required a later Controller verdict verifying that all 15 former active ABS exceptions on soft-deleted Services had governed disposition, all authorities were retired and verified, no new downstream anomaly appeared, and cause/financial-impact classifications remained accurately bounded. That criterion was satisfied by the Controller verdict in Section 13; this historical design text did not itself close M0-01.

## 9. Future focused validation and reviewer scope

Before any separately authorized execution, validate migration source tests for the exact target, fixed-one-row manifest, required field guards, item digest, all 90 paths, trigger boundary, service-role-only ACL, no direct table grants, transaction rollback, exact audit, replay, and negative mismatch cases. Apply once only through the repository-supported migration workflow after a fresh DEV preflight and immediate migration-history identity verification. Perform a separate full postflight; do not treat this documentation review as execution evidence.

The independent documentation Reviewer for the original contract-design task checked the supplied Owner decision against the verified evidence, one-case-only scope, financial unknowns, no state restore/reconstruction, no authority widening, atomicity/fail-closed design, no M0-01 closure at that stage, and W11 `NO-GO`.

## 10. Prior authorization status

The 28 October authorization was consumed by one failed attempt that rolled back on the existing audit-action constraint. Mozfer issued a separate corrective-migration and single-retry authorization on 29 October. Section 12 records that correction and successful retry; the earlier attempt remains immutable historical evidence.

## 11. Owner-authorized execution attempt — 28 October 2026

Pre-apply baseline was `main` / `HEAD` / `origin/main` / live remote `main` at `03730fe06a570f4597028d7b9d079d6a7456cbda`. Fresh preflight at 2026-10-28 11:49:29.954990+00 matched the fixed one-case contract, including the active approved SAR 800.00 ABS, one item and digest `0f702aaea049a071bdcc9b13de930dd8`, soft-deleted `Completed` Service, approved/current quotation, and zero links across all 90 guard paths.

Migration source `20261028113055_w11_m0_01_completed_g8_abs_retirement.sql` was applied to DEV `dpddrqjzqohexixgdqiq` using the Supabase migration-aware apply tool. The immediately verified history identity is `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement`; the tool recorded its application-time version and the exact source basename. Live catalog checks confirmed `postgres` ownership, pinned `search_path=pg_catalog, public`, service-role-only RPC execution, revoked helper execution, and both existing ABS guards enabled. No table-grant statement was included in the migration.

Exactly one call to `public.retire_w11_m0_01_completed_g8_abs(text)` was attempted with the active DEV admin actor. PostgreSQL rejected its audit insert with SQLSTATE `23514`: `audit_logs_action_check` does not accept action `owner_authorized_remediation`. The transaction rolled back. The read-only postflight found the ABS still active (`active_target_count=1`, `retired_abs_count=0`), no remediation audit (`exact_audit_count=0`, `remediation_event_count=0`), no invoice, and zero downstream links across all 90 paths; `all_checks_pass=false` because the expected retirement did not occur.

The before/after preservation snapshots are identical for the Service, lifecycle, Customer, quotation, preserved ABS fields, item snapshot, prior audit evidence, all 14 prior repairs, both M0-02 cases, and all 14 M0-03 raw audit references. M0-03 still has zero source invoice rows. No business-data change persisted. G8 provenance remains `VERIFIED`; the historical Completed mechanism and financial impact remain `UNKNOWN`; SAR 800.00 remains commercial authority only. M0-01 closure evidence was **NOT SATISFIED** after this first attempt; this historical result is superseded by section 12.

## 12. Corrective migration and single retry — 29 October 2026

A separate Owner authorization titled `OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE` authorized one additive DEV migration and exactly one new RPC attempt. The original applied migration and failed transaction remain unchanged in history. The approved correction keeps the existing audit action constraint and uses `status_change` with the distinct remediation event and required provenance/unknown/commercial-authority details in `audit_logs.details`.

Immediately before apply, the fresh SELECT-only preflight at `2026-10-29 05:06:23.238412+00` passed: exactly the fixed Service/quotation/ABS target; expected Completed soft-deleted Service and lifecycle; current approved SAR 800.00 quotation; active version-1 SAR 800.00 ABS with the expected one-item digest; one original approval audit; no prior remediation event; and zero nonzero links across all 90 downstream paths. The targeted independent read-only reviewer returned `CLEAN`.

The migration-aware Supabase apply tool applied `20261029045141_w11_m0_01_completed_g8_audit_action_compatibility.sql` to DEV `dpddrqjzqohexixgdqiq`. Immediate history verification records `20261029050635 / 20261029045141_w11_m0_01_completed_g8_audit_action_compatibility`, chronologically after the immutable first migration `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement`. Live verification confirms the RPC remains postgres-owned `SECURITY DEFINER`, `search_path=pg_catalog, public`, executable only by `service_role` beyond its owner; `audit_logs_action_check` is unchanged; the three applicable triggers remain; and no table grants were changed by the migration.

The post-migration/pre-RPC preservation snapshot exactly matches the immediate pre-apply snapshot. One call at `2026-10-29 05:07:10.156770+00` returned `retired_count=1`, `idempotent_replay=false`. No second attempt was made. Read-only postflight passes all checks: one target row, one retired ABS, zero active target ABS, one exact compatible remediation audit (two total ABS audits), zero invoice rows and invoice-created audit references, zero nonzero downstream paths, and all fourteen prior repairs still intact. Target Service/lifecycle/Customer/quotation and protected ABS/item fields remain unchanged. The post-execution preservation fingerprint matches for all fourteen prior repairs, both M0-02 cases, and all fourteen M0-03 audit references; M0-03 still has zero source invoice rows.

At the 29 October postflight cutoff, focused corrective source tests passed `10/10` and `git diff --check` passed with existing CRLF warnings. G8 provenance was `VERIFIED`; historical Completed mechanism and financial impact were `UNKNOWN`; SAR 800.00 was commercial authority only. The Controller verdict had not yet been recorded at that cutoff; this historical state is superseded by Section 13. M0 exit was not claimed, W11 remained `NO-GO`, and M0-04 had not started.

## 13. Controller final M0-01 closure verdict — 29 October 2026

**Controller verdict:** `M0-01 = CLOSED`
**Task Verdict:** `PASS`

The Controller records closure based on the published, verified governed repairs: the original cohort's 14 Approved-Service ABS authorities and final Completed G8 ABS authority are retired, leaving zero active ABS authority. No original-cohort ABS row is missing, and all governed historical records remain preserved. The Completed G8 Service remains historically `Completed` and soft-deleted, with its approved/current SAR 800.00 quotation unchanged.

No invoice was reconstructed and the repair created no payment, receipt, credit, revenue, receivable, journal, or accounting fact. Exactly one compatible remediation audit exists, all 90 downstream guard paths remain clear, all 14 prior repairs remain intact, and M0-02/M0-03 evidence remains unchanged.

G8 DEV verification provenance is `VERIFIED`; the exact historical mechanism producing `Completed` and historical financial impact remain `UNKNOWN`; SAR 800.00 is commercial authority only. M0-01 closure does not resolve those unknowns or imply zero impact, cancellation, reversal, or write-off. M0 overall remains open; M0-02/M0-03 remain `MONITOR / PRESERVE EVIDENCE`; M0-04 remains unresolved and unstarted; W11 remains `NO-GO`.

**EXACT NEXT ACTION:** Controller identifies the smallest remaining applicable M0/W11 blocker after M0-01 closure. Do not start remediation automatically.
