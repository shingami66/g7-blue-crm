# W11 M0-01 Remediation Design and DEV Dry Run

**Evidence date:** 27 October 2026.

**Task verdict: HOLD — OWNER BUSINESS DECISION REQUIRED.** The exact 15-row DEV set is verified, but the evidence does not establish whether the underlying Service deletions were intentional or whether the still-approved billing authority should be retained. No repair is selected or authorized.

**W11 readiness: NO-GO.** M0-01 remains an applicable-phase blocker. The Owner-approved disposition remains `REMEDIATION CANDIDATE`; cause and historical financial impact remain `UNKNOWN`.

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

## 4. Candidate comparison

| Candidate | Assessment |
|---|---|
| Use existing `void_approved_billing_scope` | Not executable for these rows: source migration `20260714090000_approved_billing_scope_financial_lifecycle.sql` rejects a missing or soft-deleted Service and a `Completed` Service before it can void the scope (lines 1678–1688). It also requires zero Service invoice and payment history. The dry run satisfies only the observed zero-link condition, not its Service lifecycle guard. |
| Restore each Service, then use existing void | No supported Service restore action was found in the current Service action module. A restore would also change Service visibility and interact with soft-deleted Customer state. No evidence authorizes those changes. |
| Supersede/reapprove or rewrite the quotation | Not a cleanup operation. It would create or change commercial authority and is not supported by evidence of a requested new scope. |
| Directly update or delete ABS/Service/quotation rows | Rejected. This bypasses the service-first lifecycle guards and audit contract, changes commercial authority, and violates the task's no-mutation boundary. |
| New one-time guarded ABS retirement operation | Technically conceivable only if the Owner first confirms that the Service deletions are intended and the active approved scopes should be retired. It would require a new, separately reviewed contract because current lifecycle guards deliberately refuse these Services. This is not selected or approved here. |
| Preserve current rows unchanged | Safe interim boundary. It preserves the approved commercial authority and history, but does not clear the M0-01 exception or W11 gate. |

## 5. Design conclusion and required Owner decision

The records share a technical shape, but they are not proven to share one business disposition. The completed Service `c7ca6503-9746-4604-964a-cbe53c118009` still has an active approved SAR 800.00 ABS and no invoice. That could be valid unbilled authority; the empty current invoice query cannot decide it. For the other 14 approved Services, no cancellation reason or deletion audit establishes that their active approved billing scopes should be retired. All linked Customers are also currently soft-deleted. Consequently, choosing either to restore operational records or to void approved scopes would make a business-state decision not supplied by the evidence.

**Owner/Controller:** Mozfer is accountable for deciding, before any repair contract is authorized, whether the Service deletions were intended and whether the linked ABS commercial authority should remain active or be retired. Decide the 14 `Approved` Services as a cohort only if their intent is confirmed common; separately decide the `Completed` Service and its possible unbilled billing obligation. No calendar date was supplied; the review boundary is before M0 exit or any applicable W11 phase gate. Cause and historical financial impact remain `UNKNOWN` unless exact authoritative historical/source evidence changes that classification.

Until that decision is recorded, preserve all 15 Service, Customer, quotation, ABS, item snapshot, and audit rows unchanged. The Owner-approved M0-01 disposition remains `REMEDIATION CANDIDATE`; this design task does not change it to an approved repair. Do not clear or waive the applicable W11 blocker.

If a later Owner decision selects retirement, a separately authorized implementation task must first define an atomic allowlisted operation and revalidate the exact 15 Service/quotation/ABS identities, expected versions/statuses, Service/Customer state, zero invoice/payment/credit/operational/accounting links, concurrency and lock order, authorization, audit reason, and before/after evidence. It must preserve ABS items/snapshots and leave Service, Customer, quotation, invoice, and prior audit history untouched. A committed void is not rolled back by deleting or reopening history; any correction would require a separately governed forward action. If any row differs or any link appears, the future batch must stop atomically. This is a future contract checklist, not an implementation authorization.

## 6. Validation and independent review

- The artifact is a single `WITH ... SELECT` statement, executed against DEV project `dpddrqjzqohexixgdqiq`; the successful observation above returned exactly 15 cases and target-pair digest `ab104f63e91916828672033a781b5d26`.
- Proportional validation: confirm the query contains no DML/DDL/RPC calls, `git diff --check`, link/path and status-mirror checks, and one fresh independent native read-only Reviewer.
- Reviewer scope: exact 15-row set/digest, no invented cause or financial amount, completed-Service business judgment, no misuse of current void guards, no waiver/GO, exact future authority boundaries, and no unauthorized repair.
- Final disposition: **HOLD — OWNER BUSINESS DECISION REQUIRED.** No D8, W11 execution, or database/environment mutation is part of this result.

**Exact next action:** Mozfer records the intended disposition for the 14 `Approved` Service/ABS pairs and a separate decision for the one `Completed` Service with active SAR 800.00 ABS authority. Then authorize a new bounded repair-contract task; keep the current rows unchanged until then.
