# W11 M0-01 Remediation Design and DEV Dry Run

**Current evidence date:** 29 October 2026. The 26 October full-inventory cutoff and the 27 October 14-case execution/postflight remain unchanged; sections 11–12 record the two Completed G8 attempts and final postflight.

**Current task verdict:** PASS for the bounded corrective migration and single authorized retry. The immutable first attempt rolled back; the additive correction applied and the one new attempt retired exactly one ABS. The targeted postflight and preservation checks pass.

**Current W11 readiness: NO-GO.** The fourteen Approved-Service ABS authorities and the final Completed G8 ABS authority are retired and verified. M0-01 closure evidence is satisfied pending Controller verdict; M0-01 is not declared closed. Historical completion mechanism and financial impact remain `UNKNOWN`, and SAR 800.00 remains commercial authority only. M0-02/M0-03 dispositions remain unchanged; M0-04 and other applicable gates remain unresolved.

## 1. Baseline and boundary

- Repository: `D:/G7/g7-crm`, branch `main`; HEAD, `origin/main`, and live `origin/main` were `3c46e08208412691e1349b0c944bfcccd9a67ec0`; the worktree was clean before this evidence-only task.
- Exact database target: DEV project `dpddrqjzqohexixgdqiq` only.
- No DML, DDL, RPC mutation, grants, migration, fixture, cleanup, deployment, DEMO/PROD access, or source-code change was performed.
- The read-only query is [w11m0_01_remediation_design_dry_run.sql](../supabase/verification/w11m0_01_remediation_design_dry_run.sql). It selects only the 15 Owner-dispositioned M0-01 Service/quotation pairs, including their direct linked downstream records.

## 2. Frozen candidate set

The query observed the exact 15 target pairs at `2026-10-27 07:43:59.452867+00`, snapshot `14636:14636:`. The MD5 `ab104f63e91916828672033a781b5d26` is over the sorted Service ID / quotation ID target pairs only; it is not a row-content hash. Each pair had exactly one active approved ABS, version 1; each live quotation total and accepted ABS total matched the existing packet amount. The 15 accepted totals sum to SAR 12,900.00, which remains current commercial authority only.

| Service ID | Quotation ID | ABS ID | Service status | Service deleted at (UTC) | Accepted ABS total (SAR) |
|---|---|---|---|---|---:|
| `02bdefe9-6a1e-4dfe-8732-985af7a5df49` | `307106ce-2a58-4901-bcb6-75abe12b03af` | `4346aaec-8780-44a4-a4e3-bfcd7ebc3f02` | Approved | 2026-08-17 10:13:40.350 | 500.00 |
| `1421ecd2-4152-4676-8c41-ec292830e8a2` | `daa17584-0180-4778-9316-826015b486ac` | `3de3cf22-8fc3-4115-abc7-0b40cc2c41be` | Approved | 2026-08-17 10:14:35.048 | 1,000.00 |
| `1ac06a50-043a-4ff2-b441-f709da735a52` | `d286e869-df5f-4510-a5d8-fb3397f6f5e3` | `3c15e26b-8892-46c3-b669-d95074ebe096` | Approved | 2026-08-17 10:13:40.350 | 800.00 |
| `3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5` | `ec4717f4-ed0e-4879-aa6f-a4c3736d3556` | `c11728f0-3d66-41ed-9c3b-3058ca45ea75` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |
| `3f7dfffb-3188-49d0-b4ac-3297a95a60e8` | `591744aa-4684-4463-a782-260af6f90d6a` | `5811cfed-cd16-48a1-a1e5-100ae67ed425` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |
| `52d67797-0fd5-466f-a810-2d3c14542b25` | `bb5756e6-5488-4587-b475-63b8aa9620b3` | `de7ab306-f1a9-4744-914f-e38e88726920` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |
| `804c7bbc-0048-4b6d-902c-c74f96d07cbc` | `dcabf9d8-600b-438c-bd5d-0f2857785cd7` | `6c248530-744b-416b-a16f-2c3021118d87` | Approved | 2026-08-17 10:14:35.048 | 500.00 |
| `895638bd-6568-4e48-aac0-876eea91fa88` | `e2fdd626-cdab-4f34-b7ca-2d52b5412e9d` | `59d76d2f-86c2-4457-8a95-a6ffc5b577b1` | Approved | 2026-08-17 10:14:35.048 | 1,000.00 |
| `a131fafb-347b-476e-95c0-2329ad641805` | `401426ab-77df-4b6d-bd87-c511319f91b6` | `6b7ca133-70c6-4015-9323-4a3bf752434c` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |
| `a267452a-802b-4d57-8b49-8d161aca508d` | `afb16e3d-95d0-4823-918e-f7c8f52dd6f5` | `59839e2a-ec55-4ca5-a770-8e45f433d18a` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |
| `c7ca6503-9746-4604-964a-cbe53c118009` | `87932c67-cdca-4d6c-bb20-691b59f8961f` | `513f1e78-5bfa-4ff2-a8a8-6986498d1987` | **Completed** | 2026-08-17 10:13:40.350 | 800.00 |
| `e084cec0-c0d6-4429-8324-6c2a0f58db7f` | `51607035-b574-44c5-ae84-f7e676d7a4d8` | `b13c8a5a-fef4-4dc2-9d9a-7aff7209e5b1` | Approved | 2026-08-17 10:14:35.048 | 800.00 |
| `e392d1da-bfd1-4b40-ac48-4e5c14afb7c0` | `90db681e-b166-479e-b4ed-6087266d1dfe` | `9a77baf7-5df4-48fe-92ad-2cdab810d9af` | Approved | 2026-08-17 10:13:40.350 | 500.00 |
| `eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0` | `fd51e91e-af3a-4c0e-897f-0a5afbac766d` | `ab5d8c9b-37c2-4b2b-b806-9a0a3819b055` | Approved | 2026-08-17 10:14:35.048 | 1,000.00 |
| `f01335fe-0807-46f2-ba02-0a84ca5a67c7` | `63317742-a4cc-4e6a-86ec-f44075f9a0e8` | `e92882a7-2d03-415b-8f85-e2533474eb69` | Approved | 2026-08-17 10:13:40.350 | 1,000.00 |

All 15 Service rows have `deleted_at` set, and none has a cancellation reason. Fourteen Services currently have status `Approved`; one has status `Completed`. All 15 quotations are currently approved, not deleted, not superseded, and linked to the expected Service. All 15 linked Customer rows currently have `is_deleted = true` and `deleted_at IS NULL`; this is current state and does not establish why they were flagged.

## 3. Evidence pattern and limits

- The 15 Service deletion timestamps form two groups: 10 at `2026-08-17 10:13:40.350Z`, and 5 at `2026-08-17 10:14:35.048Z`. The shared timestamps are not proof of the actor, mechanism, intent, or cause.
- Each case has three matching audit rows: `quotation_approved`, `service_status_changed`, and `approved_billing_scope_approved` (15 of each), recorded at that case's ABS approval timestamp. The exact Service/quotation/ABS entity IDs have no additional audit row in the query result documenting the soft deletion. This does not establish how or why deletion occurred.
- Current direct matches by Service ID, quotation ID, and every matched ABS ID return zero invoices, including soft-deleted invoice rows, and zero invoice-linked payments or receipt allocations. Customer credit adjustments/applications/refunds/reversals are zero.
- Current Service-linked approved commitments, commitment balances, receipts, supplier allocations, supplier bookings, and expenses are zero. Checked AR/AP/expense bridge versions, source events, journal lines/links, revenue arrangements/recognition, journal versions/events, and accounting foundation events are zero.
- These are bounded current-state observations. They cannot detect hard-deleted source rows or unkeyed external/customer evidence, and they do not establish zero historical financial impact. No amount is inferred as a receivable, cash, revenue, loss, balance, or write-off.

## 4. Candidate comparison before the Owner decision

This comparison records the earlier pre-decision design state. Section 7 records the later Owner decisions, and section 8 selects the bounded contract mechanism for the 14 Approved cases.

| Candidate | Assessment |
|---|---|
| Use existing `void_approved_billing_scope` | Not executable for these rows: source migration `20260714090000_approved_billing_scope_financial_lifecycle.sql` rejects a missing or soft-deleted Service and a `Completed` Service before it can void the scope (lines 1678–1688). It also requires zero Service invoice and payment history. The dry run satisfies only the observed zero-link condition, not its Service lifecycle guard. |
| Restore each Service, then use existing void | No supported Service restore action was found in the current Service action module. A restore would also change Service visibility and interact with soft-deleted Customer state. No evidence authorizes those changes. |
| Supersede/reapprove or rewrite the quotation | Not a cleanup operation. It would create or change commercial authority and is not supported by evidence of a requested new scope. |
| Directly update or delete ABS/Service/quotation rows | Rejected. This bypasses the service-first lifecycle guards and audit contract, changes commercial authority, and violates the task's no-mutation boundary. |
| New one-time guarded ABS retirement operation | Before the Owner decision, this required confirmation that the Service deletions were intended and the active approved scopes should be retired. The Owner later supplied that current-state decision; section 8 defines the separately reviewed contract, without granting execution authority. |
| Preserve current rows unchanged | Safe interim boundary. It preserves the approved commercial authority and history, but does not clear the M0-01 exception or W11 gate. |

## 5. Design conclusion before the Owner decision (superseded as to current disposition)

At the time of the dry run, the evidence did not establish one disposition for all 15 cases. The completed Service `c7ca6503-9746-4604-964a-cbe53c118009` has an active approved SAR 800.00 ABS and no invoice; an unbilled obligation could exist, and the empty current invoice query could not decide it. For the other 14 approved Services, no cancellation reason or deletion audit established whether the active scopes should be retired. The Owner decisions in section 7 now resolve the desired current state separately for these two cohorts. They do not establish historical deletion intent or cause.

**Owner/Controller:** Mozfer recorded the current-state decisions in section 7 on 27 October 2026. No deadline was supplied for technical remediation; review M0-01 before M0 exit or any applicable W11 phase gate. Historical cause and financial impact remain `UNKNOWN` unless exact authoritative historical/source evidence changes those classifications.

Preserve all Service, Customer, quotation, ABS, item snapshot, and audit rows. The 14-case retirement direction authorizes only the next bounded repair-contract design; it does not authorize implementation or execution. The Completed Service remains on hold. M0-01 continues to block the applicable W11 phase.

The later bounded contract covers only the 14 `Approved` Service/quotation/ABS triples in the frozen table and excludes the Completed SAR 800.00 triple. See section 8 for the selected mechanism and exact future authorization; implementation and execution still require separate authorization.

## 6. Validation and independent review

- The artifact is a single `WITH ... SELECT` statement, executed against DEV project `dpddrqjzqohexixgdqiq`; the successful observation above returned exactly 15 cases and target-pair digest `ab104f63e91916828672033a781b5d26`.
- Proportional validation: confirm the query contains no DML/DDL/RPC calls, `git diff --check`, link/path and status-mirror checks, and one fresh independent native read-only Reviewer.
- Reviewer scope: exact 15-row set/digest, no invented cause or financial amount, completed-Service business judgment, no misuse of current void guards, no waiver/GO, exact future authority boundaries, and no unauthorized repair.
- Prior dry-run disposition, before section 7: **HOLD — OWNER BUSINESS DECISION REQUIRED.** Section 7 resolves the current-state decision; technical remediation remains pending. No W11 execution or database/environment mutation is part of this result.

**Prior exact next action (superseded by section 7):** Record the Owner's disposition for the 14 `Approved` Service/ABS pairs and the separate decision for the `Completed` Service. The current next action is to design a bounded repair contract for the 14 `Approved` cases only.

## 7. Owner business decisions — 27 October 2026

**Decision-record repository baseline:** `main` at `329e1365a15023335a65908d16afcb406e80251c`, matching `origin/main` and the live remote before this documentation update.

### Cohort A — 14 soft-deleted Services currently `Approved`

Mozfer accepts the Service deletion as the intended current business state for the 14 M0-01 Service/ABS pairs marked `Approved` in section 2. This does not establish why the records were historically deleted. Do not restore these Services or their deleted Customers. Their active approved ABS authority should be retired through a separately authorized governed remediation. Preserve quotation, ABS, snapshot, item, Service, Customer, and audit history; do not directly delete or rewrite historical records.

This decision does not establish historical deletion intent or cause. Historical cause and financial impact remain `UNKNOWN`. The cohort's ABS totals are commercial authority only, not invoice value, receivable, cash, revenue, loss, balance, or write-off. The decision authorized bounded repair-contract design only; that contract is now complete and ready for separate Owner execution authorization. No implementation or mutation authority is granted.

### Cohort B — one soft-deleted `Completed` Service with active SAR 800.00 ABS

At the 27 October 2026 Owner-decision snapshot, Service `c7ca6503-9746-4604-964a-cbe53c118009`, quotation `87932c67-cdca-4d6c-bb20-691b59f8961f`, and ABS `513f1e78-5bfa-4ff2-a8a8-6986498d1987` were to remain unchanged; the possible unbilled obligation was unresolved and the status then was `HOLD — BUSINESS EVIDENCE REQUIRED`. Section 10 records the 28 October business decision that supersedes this hold: Mozfer accepts the case as synthetic G8 DEV verification data, with no real unbilled obligation intended for preservation. Preserve the Service, quotation, ABS, Customer, snapshots, items, and audit evidence. Historical cause and impact remain `UNKNOWN`; SAR 800.00 is commercial authority only.

### Owner decision result

M0-01 remains `BLOCKS APPLICABLE W11 PHASE`; M0 exit is not satisfied and W11 remains `NO-GO`. The bounded contract is now documented in section 8. No implementation, migration application, RPC invocation, or database mutation is authorized by this design task.

## 8. Bounded 14-case repair contract — 27 October 2026

The implementation-ready contract is [W11 M0-01 — 14 Approved-Service ABS Retirement Contract](w11-m0-01-14-approved-repair-contract.md). It fixes the exact 14 Service/quotation/ABS triples, explicitly excludes the Completed SAR 800.00 case, selects a one-time service-role-only RPC with a narrow trigger exception, and defines transactional preconditions, row-lock order, downstream-link checks, audit evidence, replay, failure, and forward-repair behavior.

At the contract-design cutoff, the last documented DEV read-only observation was the 27 October 2026 07:43:59.452867 UTC dry run. That design task did not query DEV; its contract required a fresh preflight and in-transaction recheck before separately authorized execution. The Owner-authorized execution is recorded in section 9. The Completed case, both M0-02 cases, and M0-03 remained outside the write set. Cause and historical financial impact remain `UNKNOWN`; W11 remains `NO-GO`.

**EXACT NEXT ACTION at contract approval:** Mozfer to separately authorize one bounded implementation and reviewed DEV execution task for the contract. This pre-execution action is superseded by the result below.

## 9. Owner-authorized 14-case DEV execution — 27 October 2026

The Owner-authorized implementation, review, DEV application, and one governed execution completed against DEV `dpddrqjzqohexixgdqiq`. The repository baseline was `main` / `origin/main` / live remote `main` at `00de96012b78f0d1de4a0207352a13d9ac3a2e1b`; pre-apply worktree was clean. The exact migration `20261027102347 / w11_m0_01_14_approved_abs_retirement` was applied once through the pinned Supabase CLI workflow, migration history was checked immediately, and its local source SHA-256 is `3b7738fc9ad96c314142e3e392cc398df31ad8588e6c9c5f87deac98d8b7d1c8`. The fixed-allowlist RPC returned exactly 14 retirements with `idempotent_replay=false`.

Postflight confirmed all 14 ABS rows remain, all 14 are retired, none of the target authorities remains active, exactly 14 matching batch audit events exist, all 14 item digests match, and all 90 guarded downstream paths remain zero. The Completed SAR 800.00 case and both M0-02 cases remained excluded and unchanged. Services, Customers, quotations, prior approval audit evidence, invoice/payment/accounting facts, and other business/configuration data were not changed.

M0-03's 14 retained invoice audit references and missing source rows were not changed and no amount was inferred. The derived current approved-scope/source-quotation context moved from 14 to 0 because it referenced the same 14 ABS authorities retired by this task. Historical M0-03 provenance and financial impact remain `UNKNOWN`.

This closes only the 14-case current-authority repair. At the 27 October closeout the Completed SAR 800.00 case was on evidence hold; section 10 records the later Owner decision; M0-01 remains an applicable W11 blocker, cause and historical financial impact remain `UNKNOWN`, and W11 remains `NO-GO`.

**Prior exact next action (superseded by section 10):** Mozfer to provide or decide the business evidence for the excluded Completed SAR 800.00 case. The separate current next action is to authorize or decline a future implementation/execution task for the one-case contract; keep DEV rows unchanged until then.

## 10. Completed G8 DEV case — Owner decision and one-case contract — 28 October 2026

Mozfer accepts Service `c7ca6503-9746-4604-964a-cbe53c118009` (`G8 Final Service lmu0p1`) as synthetic G8 DEV verification data and confirms there is no real customer unbilled obligation intended for preservation. The active SAR 800.00 ABS authority should be retired only through a separately authorized governed remediation. Preserve the soft-deleted Service and its historical `Completed` state, Customer, approved/current quotation, ABS row, item snapshots, and audit history. Do not restore records or create/reconstruct invoice, payment, receipt, revenue, receivable, or accounting facts.

- **G8 DEV verification provenance:** `VERIFIED`; exact historical mechanism that produced `Completed`: `UNKNOWN`; historical financial impact: `UNKNOWN`. SAR 800.00 remains commercial authority only.
- The exact target is the Service / Quotation / ABS triple `c7ca6503-9746-4604-964a-cbe53c118009 / 87932c67-cdca-4d6c-bb20-691b59f8961f / 513f1e78-5bfa-4ff2-a8a8-6986498d1987`. The fresh DEV SELECT-only preflight at 2026-10-28 05:46:04.291820+00, snapshot `14649:14649:`, matched one case, confirmed the version-1 active approved SAR 800.00 ABS and item digest `0f702aaea049a071bdcc9b13de930dd8`, and returned zero across all 90 expanded downstream paths. Three target audit events show quotation approval, ABS approval, and Service `Quoted → Approved`; none establishes the later Completed transition. No direct invoice row or matching `invoice.created` audit reference was found.
- The reproducible one-case SELECT-only query is [w11m0_01_completed_g8_preflight.sql](../supabase/verification/w11m0_01_completed_g8_preflight.sql). It does not move the full 26 October inventory cutoff.
- At the 28 October contract cutoff, the [Completed G8 repair contract](w11-m0-01-completed-g8-repair-contract.md) selected a separate additive migration, fixed one-case target/downstream helpers and service-role-only RPC, and exact narrow trigger-context extensions. The existing 14-case manifest/RPC and normal void rules remained unchanged. No arbitrary target arguments, UI action, direct grant, migration, or DEV mutation was authorized at that cutoff; the separate 29 October authorization and execution are recorded in section 12.

At the 28 October contract cutoff, M0-01 remained `BLOCKS APPLICABLE W11 PHASE`; that execution hold was superseded by the separate 29 October authorization and successful retry in section 12. M0-01 closure still awaits a Controller verdict; M0 exit is not declared and W11 remains `NO-GO`.

## 11. Completed G8 execution attempt — 28 October 2026

The execution record and exact postflight are in the [one-case contract](w11-m0-01-completed-g8-repair-contract.md) and [read-only postflight](../supabase/verification/w11m0_01_completed_g8_postflight.sql). The additive DEV migration was recorded as `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement`. One RPC call failed with SQLSTATE `23514` because `audit_logs_action_check` rejected `owner_authorized_remediation`; the transaction rolled back. The ABS remains active, no remediation event exists, and the before/after preservation snapshots match for the target, prior 14 cases, M0-02, and M0-03. This is a HOLD, not a completed remediation. The first attempt's authorization was consumed; a separate corrective migration and single retry are recorded in section 12.

## 12. Corrective migration and single retry — 29 October 2026

The separate Owner authorization allowed the additive correction and exactly one new DEV RPC attempt. The first `20261028113055_w11_m0_01_completed_g8_abs_retirement` migration remains immutable at DEV history identity `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement`. The corrective migration is `20261029045141_w11_m0_01_completed_g8_audit_action_compatibility`, recorded as `20261029050635 / 20261029045141_w11_m0_01_completed_g8_audit_action_compatibility`.

The immediate pre-apply SELECT-only preflight passed at `2026-10-29 05:06:23.238412+00`; the targeted independent Reviewer returned `CLEAN`. The migration kept the action constraint unchanged and used `status_change` with distinct structured details. Live checks confirmed postgres ownership, SECURITY DEFINER, pinned search path, service_role-only execution, the unchanged audit constraint, and the three existing target triggers. The pre-RPC preservation snapshot matched the pre-apply fingerprint.

Exactly one new call at `2026-10-29 05:07:10.156770+00` returned `retired_count=1` and `idempotent_replay=false`. Postflight passes all checks: one ABS authority retired, one exact remediation audit, zero invoice rows/references, zero nonzero links across all 90 paths, and all 14 prior repairs retained. Target protected state, M0-02, and M0-03 snapshots match; M0-03 still has zero source invoice rows.

G8 provenance remains `VERIFIED`; historical Completed mechanism and financial impact remain `UNKNOWN`; SAR 800.00 remains commercial authority only. **M0-01 CLOSURE EVIDENCE SATISFIED — CONTROLLER VERDICT REQUIRED.** M0-01 remains open until that verdict. M0 exit is not claimed; W11 remains `NO-GO`. Do not start M0-04 automatically.
