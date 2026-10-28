# W11 M0-01 — Completed G8 DEV Authority Retirement Contract

**Evidence and decision date:** 28 October 2026
**Contract status:** `READY FOR OWNER EXECUTION AUTHORIZATION`
**Task verdict:** PASS — the Owner disposition and exact one-case contract are recorded; no repair was executed.
**W11 readiness:** `NO-GO`. M0-01 continues to block the applicable W11 phase.

## 1. Baseline and authority boundary

- Repository: `D:/G7/g7-crm`, branch `main`; before editing, HEAD, `origin/main`, and live `origin/main` were `ce3a035c4bd58edd4a78c064b074c4d18384b524`; worktree and index were clean.
- Read-only target: Supabase DEV project `dpddrqjzqohexixgdqiq`.
- This contract records an Owner business disposition and designs a possible later, separately authorized DEV repair. It grants no implementation, migration, RPC, or data-mutation authority.
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

Only a later Controller verdict may close M0-01, after it verifies that all former 15 active ABS exceptions on soft-deleted Services have governed disposition, the 14 prior cases and this one are retired and verified, no active ABS authority remains in the original cohort, no new downstream anomaly appeared, and cause/financial-impact classifications remain accurately bounded. This design itself does not close M0-01.

## 9. Future focused validation and reviewer scope

Before any separately authorized execution, validate migration source tests for the exact target, fixed-one-row manifest, required field guards, item digest, all 90 paths, trigger boundary, service-role-only ACL, no direct table grants, transaction rollback, exact audit, replay, and negative mismatch cases. Apply once only through the repository-supported migration workflow after a fresh DEV preflight and immediate migration-history identity verification. Perform a separate full postflight; do not treat this documentation review as execution evidence.

The independent documentation Reviewer for this task checks the supplied Owner decision against the verified evidence, one-case-only scope, financial unknowns, no state restore/reconstruction, no authority widening, atomicity/fail-closed design, no M0-01 closure, and W11 `NO-GO`.

## 10. Current exact next action

Mozfer to separately authorize or decline implementation and reviewed DEV execution of the one-case Completed G8 repair contract. If authorized, first require a fresh baseline/preflight and exact migration review before application. Until then, preserve the current DEV rows unchanged; M0-01 remains an applicable-phase blocker, M0 exit remains unsatisfied, and W11 remains `NO-GO`.
