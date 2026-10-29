# W11 M0-01 — 14 Approved-Service ABS Retirement Contract

**Historical contract status at design approval:** `READY FOR OWNER EXECUTION AUTHORIZATION` — design only; this pre-execution status is superseded by the governed repair and Controller PASS recorded in the current-status note below. It did not authorize implementation, migration application, RPC invocation, or database mutation by itself.

**Current status (29 October 2026):** `M0-01 = CLOSED — Controller PASS`, based on the published 14-case repair, final Completed G8 corrective repair, and verified postflights recorded in the [current M0 reconciliation packet](w11-m0-current-inventory-reconciliation.md). This design-only contract grants no current execution authority.

**W11 readiness:** `NO-GO`. M0 overall remains open; M0-04 and other applicable gates remain unresolved. Historical cause and financial impact remain `UNKNOWN`.

**Design baseline:** repository `D:/G7/g7-crm`, branch `main`, `HEAD` / `origin/main` / live `origin/main` `63a75181854bc72c7af9cf9a672783450e2c2708`; clean before this documentation-only task. DEV project `dpddrqjzqohexixgdqiq` is the only future execution target.

## 1. Boundary and Owner authority

Mozfer's 27 October 2026 decision accepts the current deletion state for the 14 soft-deleted Services whose current status is `Approved`, and directs retirement of their active Approved Billing Scope (ABS) authority through separately authorized governed remediation. It does not establish historical deletion cause or financial impact. The decision authorizes this repair-contract design only.

The operation is limited to the 14 Service/quotation/ABS triples in section 2. It does not restore Services or Customers, change quotations, create invoices, alter payments/credits/accounting, change ABS item/snapshot content, clean up audit history, or waive M0-01. The Completed SAR 800.00 case and all M0-02/M0-03 records are outside the operation.

The latest documented read-only DEV observation is the 27 October 2026 07:43:59.452867 UTC dry run in the [M0 inventory packet](w11-m0-current-inventory-reconciliation.md) and [SELECT-only query](../supabase/verification/w11m0_01_remediation_design_dry_run.sql). It observed zero checked downstream links for the 15-case cohort. This design task did not run a new DEV query; the observation is not a substitute for a fresh execution preflight and transactional recheck.

## 2. Exact target allowlist

The future operation must contain these 14 triples as immutable server-side constants. Every Service, quotation, and ABS identity appears once. The expected Service deletion timestamps and quotation/ABS grand totals below come from the documented 27 October read-only observation. Totals are commercial snapshot checks only; they are not invoice values, receivables, revenue, cash, losses, or accounting amounts.

| Service ID | Quotation ID | ABS ID | Expected Service deleted_at (UTC) | Expected quotation / accepted ABS grand total (SAR, commercial only) |
|---|---|---|---|---:|
| `02bdefe9-6a1e-4dfe-8732-985af7a5df49` | `307106ce-2a58-4901-bcb6-75abe12b03af` | `4346aaec-8780-44a4-a4e3-bfcd7ebc3f02` | `2026-08-17 10:13:40.350` | 500.00 |
| `1421ecd2-4152-4676-8c41-ec292830e8a2` | `daa17584-0180-4778-9316-826015b486ac` | `3de3cf22-8fc3-4115-abc7-0b40cc2c41be` | `2026-08-17 10:14:35.048` | 1,000.00 |
| `1ac06a50-043a-4ff2-b441-f709da735a52` | `d286e869-df5f-4510-a5d8-fb3397f6f5e3` | `3c15e26b-8892-46c3-b669-d95074ebe096` | `2026-08-17 10:13:40.350` | 800.00 |
| `3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5` | `ec4717f4-ed0e-4879-aa6f-a4c3736d3556` | `c11728f0-3d66-41ed-9c3b-3058ca45ea75` | `2026-08-17 10:13:40.350` | 1,000.00 |
| `3f7dfffb-3188-49d0-b4ac-3297a95a60e8` | `591744aa-4684-4463-a782-260af6f90d6a` | `5811cfed-cd16-48a1-a1e5-100ae67ed425` | `2026-08-17 10:13:40.350` | 1,000.00 |
| `52d67797-0fd5-466f-a810-2d3c14542b25` | `bb5756e6-5488-4587-b475-63b8aa9620b3` | `de7ab306-f1a9-4744-914f-e38e88726920` | `2026-08-17 10:13:40.350` | 1,000.00 |
| `804c7bbc-0048-4b6d-902c-c74f96d07cbc` | `dcabf9d8-600b-438c-bd5d-0f2857785cd7` | `6c248530-744b-416b-a16f-2c3021118d87` | `2026-08-17 10:14:35.048` | 500.00 |
| `895638bd-6568-4e48-aac0-876eea91fa88` | `e2fdd626-cdab-4f34-b7ca-2d52b5412e9d` | `59d76d2f-86c2-4457-8a95-a6ffc5b577b1` | `2026-08-17 10:14:35.048` | 1,000.00 |
| `a131fafb-347b-476e-95c0-2329ad641805` | `401426ab-77df-4b6d-bd87-c511319f91b6` | `6b7ca133-70c6-4015-9323-4a3bf752434c` | `2026-08-17 10:13:40.350` | 1,000.00 |
| `a267452a-802b-4d57-8b49-8d161aca508d` | `afb16e3d-95d0-4823-918e-f7c8f52dd6f5` | `59839e2a-ec55-4ca5-a770-8e45f433d18a` | `2026-08-17 10:13:40.350` | 1,000.00 |
| `e084cec0-c0d6-4429-8324-6c2a0f58db7f` | `51607035-b574-44c5-ae84-f7e676d7a4d8` | `b13c8a5a-fef4-4dc2-9d9a-7aff7209e5b1` | `2026-08-17 10:14:35.048` | 800.00 |
| `e392d1da-bfd1-4b40-ac48-4e5c14afb7c0` | `90db681e-b166-479e-b4ed-6087266d1dfe` | `9a77baf7-5df4-48fe-92ad-2cdab810d9af` | `2026-08-17 10:13:40.350` | 500.00 |
| `eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0` | `fd51e91e-af3a-4c0e-897f-0a5afbac766d` | `ab5d8c9b-37c2-4b2b-b806-9a0a3819b055` | `2026-08-17 10:14:35.048` | 1,000.00 |
| `f01335fe-0807-46f2-ba02-0a84ca5a67c7` | `63317742-a4cc-4e6a-86ec-f44075f9a0e8` | `e92882a7-2d03-415b-8f85-e2533474eb69` | `2026-08-17 10:13:40.350` | 1,000.00 |

The fixed set must be internally unique, join one-to-one across all three IDs, and produce exactly 14 eligible rows. No arbitrary Service, quotation, or ABS ID may be accepted as an RPC argument.

### Explicit exclusions

The soft-deleted `Completed` case was **not in the 27 October 14-case allowlist** and received no designed mutation behavior in this contract: Service `c7ca6503-9746-4604-964a-cbe53c118009`, quotation `87932c67-cdca-4d6c-bb20-691b59f8961f`, ABS `513f1e78-5bfa-4ff2-a8a8-6986498d1987`. At that contract cutoff it was classified `HOLD — BUSINESS EVIDENCE REQUIRED` and left unchanged. Mozfer's 28 October Owner decision supersedes that business-evidence hold; see the [current Completed G8 decision and one-case repair contract](w11-m0-01-completed-g8-repair-contract.md). The two M0-02 pairs without ABS, all M0-03 invoice audit references, and every other row are also excluded from this 14-case contract.

## 3. Source-supported repair mechanism

The smallest governed mechanism is one additive migration introducing a dedicated, narrowly scoped `SECURITY DEFINER` function, for example `public.retire_w11_m0_01_approved_abs(p_owner_actor_id text, p_owner_authorization_ref text)`, owned by `postgres`, with a fixed internal 14-triple allowlist and no target-ID, amount, or free-form reason arguments. It is a one-time remediation RPC, not an application feature. It must not be wired to a Server Action, UI, Admin permission, or ordinary ABS management API.

Only `service_role` receives `EXECUTE`; revoke from `PUBLIC`, `anon`, and `authenticated`. Keep current direct table grants unchanged. The RPC validates the actor reference and requires a nonblank Owner authorization reference for its audit record. Before future execution, the separately authorized execution packet must confirm that the actor Clerk ID is Mozfer's intended active identity; do not infer Owner authority from an application role alone.

The current `check_approved_billing_scopes_before_write` trigger is itself `SECURITY DEFINER`; inside it, `current_user` cannot distinguish direct `service_role` DML from an update made by a nested `SECURITY DEFINER` RPC. It rejects any update when the Service is soft-deleted, and rejects ordinary voiding of `Completed` Services. Therefore the migration must retain that trigger's security mode and add (a) a narrowly conditional branch for this exact operation and (b) a small `SECURITY INVOKER` guard trigger on ABS header updates. The remediation function sets a transaction-local context and performs the update as its fixed `postgres` owner. The invoker guard must reject a context-bearing update unless its runtime `current_user` is `postgres`; this prevents a caller using `service_role` from forging the custom GUC and directly updating the ABS. The existing definer trigger may bypass only the soft-delete check when that context is present, the old/new ABS transition is precisely `approved` → `voided`, and the Service/quotation/ABS tuple is one of the 14 constants with the expected `Approved` soft-deleted Service state. All other checks remain active, including ordinary `Completed` rejection and invoice/payment exposure checks. The remediation function must restore the previous transaction-local context before returning. A GUC alone is not authority: the fixed allowlist, invoker-role guard, constrained transition, revoked client function grants, and service-role-only RPC are all required.

Keep `void_approved_billing_scope` unchanged. Do not restore Services to make it pass, disable triggers, set `session_replication_role`, weaken ordinary lifecycle guards, create a general-purpose bypass, or issue manual direct-table edits.

### Relevant source contracts reviewed

- [ABS schema and status/void metadata](../supabase/migrations/20260708090000_approved_billing_scope_foundation.sql): approved/voided state, version, accepted totals, actor/reason/time fields, and immutable item relations.
- [ABS financial lifecycle](../supabase/migrations/20260714090000_approved_billing_scope_financial_lifecycle.sql): `void_approved_billing_scope`, `check_approved_billing_scopes_before_write`, `check_invoices_before_write`, current execution ACLs, and audit event shape. The ordinary void RPC locks Service first and refuses soft-deleted/Completed Services and any Service invoice or payment history.
- [Quotation approval and ABS activation](../supabase/migrations/20260803090000_quotation_approval_internal_abs_activation.sql): Service → quotation → ABS lock order for the supported approval path.
- [Service actions](../src/lib/services/actions.ts): ordinary Service soft deletion checks for non-deleted linked quotations before setting `deleted_at`; this current path does not explain the historical M0-01 deletion.
- [Invoice creation lock contract](atomic-invoice-creation-contract.md): same-Service invoice creation serializes on the Service row and specifies Service-first locking.
- [Exact-set M0-01 read-only query](../supabase/verification/w11m0_01_remediation_design_dry_run.sql): current relation/link inventory and prior dry-run matching rules. It is evidence, not repair SQL.
- [Audit log shape](../supabase/schema.sql): `audit_logs.action` supports `status_change`; `entity_type`, `entity_id`, text `user_id`, JSON `details`, and timestamp are available. The migration must use this existing shape.

### Rejected alternatives

- **Ordinary `void_approved_billing_scope`:** it rejects soft-deleted Services, so it cannot process this cohort while preserving its intended lifecycle guard.
- **Restore the Services, then void:** restoration would change the accepted deletion state and invent an operational step unsupported by this design.
- **Weaken the shared trigger or disable it:** that would broaden behavior for unrelated ABS writes and remove a current lifecycle control.
- **Direct table updates, trigger disabling, or `session_replication_role`:** these bypass the governed RPC and its audit/authority boundary.
- **GUC-only trigger bypass:** a caller can set a custom GUC, so context must be paired with an invoker guard that verifies the update runs under the fixed remediation-function owner.
- **Supersede or reapprove the scopes:** these transitions would create new commercial authority history rather than retire the exact active scopes.
- **Fourteen separate calls or a general-purpose RPC:** per-row calls permit partial completion, while arbitrary target parameters expand the operation beyond the approved set.

## 4. Preconditions — all checked inside the locked transaction

The function must raise an exception before any committed write if any precondition fails:

1. The immutable allowlist contains 14 unique triples; exactly 14 Service rows, 14 quotations, and 14 ABS rows join on those exact identities. Every target Service has exactly one active ABS, the matching allowlisted row.
2. Each Service has `status = 'Approved'`, `deleted_at` exactly as listed in section 2, and no cancellation reason. Its Customer relationship and soft-delete fields match the freshly reviewed execution preflight; the Customer remains deleted. Its lifecycle-state row and version match that preflight exactly.
3. Each quotation has the exact allowlisted ID and Service relationship, `status = 'approved'`, `is_deleted = false`, `deleted_at IS NULL`, is not superseded, and has the expected commercial grand total shown in section 2.
4. Each ABS has the exact ID, Service, and `source_quotation_id`, `scope_version = 1`, `status = 'approved'`, `voided_at IS NULL`, `superseded_at IS NULL`, and the expected accepted grand total. The execution preflight records the exact `accepted_subtotal` and `accepted_vat_amount`; the function must compare those pinned values too rather than infer them from the grand total. Approved metadata and line-safety state remain valid.
5. Customer association/state, quotation state, Service lifecycle state, ABS header, and ABS item set are locked and unchanged by the operation. The migration does not rewrite ABS items or snapshots.
6. Every disallowed downstream link in section 5 is zero. Search matches by Service, quotation, ABS, invoice, receipt, and source-record identities as applicable, including soft-deleted, voided, cancelled, or otherwise inactive rows; do not filter them away.
7. The one exact batch is either wholly in the approved pre-state with no prior batch event, or wholly in the verified post-state with exactly one matching remediation audit event per ABS. Mixed state, prior unexplained void/audit activity, any changed identity/version/status/total, or any downstream link is an abort.

The pre-apply packet must capture a fresh read-only snapshot immediately before authorization, including the Service lifecycle version/state, all three target relations, exact ABS monetary header values and item identities/content fingerprint, target-pair manifest/count, and downstream table counts. The migration must pin that reviewed preflight evidence where values are needed and recompute it under locks. The old 15-case MD5 is not a 14-case target hash and must not be reused as one.

## 5. Downstream safety boundary

Use the prior dry-run relation graph as the minimum complete current-repository check. Abort if any row matches through these paths:

| Area | Relations and matching rule |
|---|---|
| Billing and cash | `invoices` by Service, quotation, or any ABS ID, including soft-deleted invoices; `invoice_items` and `invoice_draft_update_mutations` through matched invoices; `payments`, `customer_receipt_allocations`, and `customer_receipt_reversals` through matched invoices/payments; derived `customer_invoice_receivable_balances`, `customer_invoice_settlement_balances`, and `customer_receipt_balances`. |
| Credits and refunds | `customer_internal_credit_adjustments` by Service, matched invoice, or either `source_approved_billing_scope_id` or `successor_approved_billing_scope_id`; derived `customer_credit_adjustment_balances` through the same identities; `customer_credit_applications` by target invoice or matched source adjustment; application reversals; `customer_refunds` by Service or matched source adjustment; refund reversals; and adjustment reversals. |
| Commitments and receipts | `approved_commitments` by Service or matched supplier quotation; `approved_commitment_balances`, amendments, and documents; `service_receipts` and their corrections/documents; `service_supplier_allocations` by Service/quotation; and `supplier_bookings`. |
| Service operations and procurement | `service_tasks`, `event_milestones`, `business_document_links`, `projects` and their tasks by quotation, `service_procurement_requirements`, `service_procurement_packages`, package requirements, candidates and candidate documents; `supplier_quotations`, quotation lines/requirements/documents; and Service-linked employee cash advances, event-cost budgets, forecasts, close versions, and close reopenings. |
| Expense and supplier payables | `expenses` and their evidence documents, evidence exceptions, reimbursement settlements, petty-cash transactions, cash-advance settlements, and derived accountability summaries; `supplier_advances` and derived balances/commitment balances, allocation/authorization/release records, advance payments/refunds and their documents/reversals; `supplier_bills`, derived bill-payment balances, bill documents, `supplier_payments`, and payment documents/reversals. |
| AR bridge and journals | `accounting_ar_bridge_event_versions`, `accounting_ar_bridge_events` by matched polymorphic source IDs, `accounting_ar_bridge_journal_lines`, and `accounting_ar_bridge_journal_links`; also match journal IDs through `accounting_journals`, versions/events, source effects, and inception journal links. |
| AP and expense bridges | AP event versions/events and journal lines/links by Service, receipt, supplier bill, supplier advance, and matching source-record IDs; expense event versions/events and journal lines/links by Service, expense, employee advance, and matching source-record IDs; follow their linked journals through the journal relations above. |
| Revenue and foundation | `accounting_revenue_arrangements` by Service or ABS; `accounting_revenue_recognition_events`, journal lines, and journal links; `accounting_journal_line_versions`; and `accounting_foundation_events` by Service, quotation, or ABS. |

The target `service_lifecycle_states`, quotation rows/items, ABS headers/items/snapshots, and historical `audit_logs` are preservation evidence, not disallowed downstream links. Their pinned state/content is separately checked and they are never mutated; audit history is not used to infer cause or amount.

The 27 October 2026 implementation-time DEV catalog review confirmed the additional direct Service/quotation/ABS references and FK descendants listed above, including successor-ABS credit pointers, project/procurement/document/cost records, invoice/receipt/expense children, supplier advances/bills/payments, and all three polymorphic accounting bridge source paths. The migration guard and read-only downstream preflight enumerate these paths explicitly. Historical `audit_logs` rows remain preserved.

## 6. Atomicity, locking, and mutation order

Run all 14 as one transaction; per-row success is not permitted. Use PostgreSQL's ordinary `READ COMMITTED` behavior with multiple statements: acquire all locks first, then perform fresh precondition queries so a concurrent writer that committed while locks were being acquired is visible. A mismatch raises an uncaught exception, rolling back every ABS update and audit insert.

Use deterministic UUID order and the established Service-first sequence:

1. Lock all 14 `services` rows `FOR UPDATE`, ordered by Service ID.
2. Lock the matching `service_lifecycle_states` rows and Customers in deterministic key order; validate the Customer association/deletion state without changing it.
3. Lock the matching quotations in quotation-ID order.
4. Lock all matching ABS header rows in ABS-ID order, then their item rows in item-ID order.
5. Recheck the entire target set, exact versions/currentness, active scope count, and every downstream relation while locks remain held.
6. Set the private transaction-local remediation context; update only the 14 ABS headers; verify `UPDATE ... RETURNING` count is exactly 14; insert 14 per-ABS audit records; verify the audit insert count; clear the context; then assert all postconditions before commit.

This order matches invoice creation's Service-row serialization and the existing quotation approval's Service → quotation → ABS order. The parent-row locks also block new FK-linked Service/quotation/ABS children while the transaction runs. Do not add an advisory lock unless implementation review proves a relevant writer does not share these row/FK locks; an unused advisory namespace would not protect against races. `SERIALIZABLE` is not needed for the proven row/FK lock protocol. If source review finds a relevant writer that bypasses the Service lock and relevant parent foreign keys, stop and repair the concurrency design before execution.

## 7. Mutation and audit contract

For each exact ABS only, use existing lifecycle fields and the shared transaction timestamp:

- `status`: `approved` → `voided`;
- `voided_at`: `transaction_timestamp()`;
- `voided_by`: the verified Owner actor Clerk ID supplied for this execution;
- `void_reason`: a fixed reason note identifying `OWNER-AUTHORIZED M0-01 REMEDIATION` and stating that no historical cause or financial impact is inferred; record the supported reason code `other` in the audit details because the ABS schema stores the reason note in `void_reason` and has no separate reason-code column;
- `updated_by`: the same actor ID; the existing timestamp trigger updates `updated_at`.

No other ABS header field changes. In particular, retain version, approved actor/time, accepted and source totals, pricing context, supersession fields, and every ABS item/snapshot exactly as stored. Do not update a Service, Customer, quotation, invoice, payment, credit, receipt, commitment, expense, bridge, journal, or other business/configuration row.

Insert one audit row per ABS in the same transaction using the supported `action = 'status_change'`, `entity_type = 'approved_billing_scope'`, `entity_id = ABS ID`, `user_id = verified Owner actor Clerk ID`, and `timestamp = transaction_timestamp()`. The JSON `details` records a unique event type such as `approved_billing_scope_m0_01_owner_authorized_remediation_retired`, fixed batch identity `W11-M0-01-14-APPROVED-ABS-RETIREMENT`, Owner authorization reference, actor context, Service/quotation/ABS IDs, scope version, `reason_code = 'other'`, the fixed reason note, transaction timestamp, prior status/void/supersession state, resulting status/void timestamp, and lifecycle outcome. It must distinguish this event from ordinary `approved_billing_scope_voided`. Do not include names, emails, or other unnecessary personal data.

## 8. Postconditions and failure behavior

Before commit, prove all of the following:

1. Exactly the 14 allowlisted ABS rows changed to `status = 'voided'` with non-null `voided_at`, `voided_by`, and `void_reason`; no target remains active.
2. Exactly 14 new matching remediation audit events exist, one for each ABS, with the same batch ID and transaction timestamp.
3. No non-target ABS changed; the Completed case, both M0-02 cases, and all other rows remain outside the write set.
4. All 14 Services remain soft-deleted with their existing `Approved` status and lifecycle state; Customers remain unchanged/deleted; quotations remain approved/current and unchanged.
5. ABS versions, approved metadata, totals, source snapshots, line-safety details, and item IDs/content remain unchanged except the exact void metadata listed above.
6. There are still no downstream invoice/payment/credit/operational/accounting links for the target cohort and no business or accounting facts were created or changed.
7. Historical cause and financial impact remain `UNKNOWN`; ABS values remain commercial authority evidence only.

Any missing/extra/duplicate target, precondition mismatch, downstream link, audit insertion failure, unexpected affected-row count, or failed postcondition raises and rolls back the whole transaction. Do not catch the exception and return an ordinary error row after partial updates. Report the specific failed invariant without silently skipping a case.

## 9. Replay, rollback, and forward repair

- **First call:** all 14 must be in the exact approved pre-state with no batch events; one complete transaction updates and audits all 14.
- **Exact replay after success:** if all 14 rows and exactly 14 matching audit events prove the complete expected post-state, return verified idempotent success with no writes.
- **Partial prior update, mixed approved/voided state, missing/duplicate event, or unrelated void:** fail closed and require a new read-only evidence review; do not finish the remainder automatically.
- **Changed Service/quotation/ABS state or a new downstream link:** abort all work; no row is skipped.
- **Before commit:** normal transaction rollback restores the complete pre-state, including no audit rows.
- **After commit:** the void and audit rows are historical facts. Do not delete audit/history or reopen the ABS. Any correction requires new evidence, a separate Owner-approved forward-repair design, and its own reviewed authorization; this contract does not define that future correction.

## 10. Authorization and future execution packet

This design task grants no implementation or execution authority. Mozfer must separately authorize a bounded task that names:

1. this contract and exactly the 14 IDs in section 2;
2. authoring/reviewing one additive migration that installs only the narrow trigger exception and service-role-only repair RPC, with no general UI/RBAC/table-grant change;
3. applying exactly that migration to DEV `dpddrqjzqohexixgdqiq` through the repository-supported `SUPABASE_APPLY_ONLY` workflow;
4. invoking only the no-arbitrary-target-ID RPC on that exact DEV project, using a verified Owner actor ID and the authorization reference;
5. post-apply read-only verification and evidence publication.

The future execution packet must include the fresh preflight snapshot, current migration and trigger source review, exact migration identity/hash, independent CLEAN review, expected function/grants, before/after target manifests, downstream zero counts, rollback boundary, and postcondition query. A schema migration or RPC review alone does not authorize applying it. No DEMO/PROD application is included.

## 11. Focused validation and independent review

Before any future execution:

- Static tests must assert 14 unique triples, exactly one match for each ID, no Completed/M0-02/M0-03 ID, no arbitrary target parameter, no direct grant widening, and only the listed ABS update/audit insert data writes.
- Review the trigger delta to prove ordinary `void_approved_billing_scope`, normal Service/quotation flows, and all non-target lifecycle transitions retain their existing behavior. Prohibit trigger disabling, replication-role changes, and broad DML; prove a direct `service_role` update with a forged remediation GUC is rejected by the invoker guard.
- Validate the complete downstream relation graph against the then-current schema and migration history; run focused RPC/migration contract tests, including failure rollback, exact replay, mixed state, changed total/version, and downstream-link refusal without creating business fixtures.
- Review the complete migration and tests with exactly one fresh independent read-only Reviewer using OCR delegation where supported; manually inspect the complete Markdown/SQL diff where OCR excludes a file. Repair findings in the same Writer lane and perform one fresh targeted rereview if needed.
- After the separately authorized DEV run, verify all postconditions and zero non-target/business/configuration changes before declaring the repair complete. W11 remains NO-GO until M0-01 and all applicable gates are independently reconciled.

## 12. Decision

The existing ordinary void RPC cannot serve this cohort because its Service lifecycle guard deliberately rejects soft-deleted Services. A narrow fixed-allowlist service-role-only remediation RPC with a transaction-local, exact-state trigger exception is the smallest supported path that can preserve the ordinary lifecycle guard and audit history while remaining atomic and non-general-purpose.

**Historical contract outcome at design approval:** `READY FOR OWNER EXECUTION AUTHORIZATION`, contingent on a separate implementation/migration review, a fresh read-only execution preflight, and explicit DEV-only migration/RPC authorization. **No implementation, migration, RPC invocation, or database/environment mutation was authorized by this design at that time.** M0-01 then remained `BLOCKS APPLICABLE W11 PHASE`; the later repairs and Controller PASS are recorded in the current-status note above. W11 remains `NO-GO`.

**Exact next action at contract approval:** Mozfer to issue a separate bounded authorization for implementation and reviewed DEV execution of this contract, or keep the cohort unchanged. This pre-execution action is superseded by the execution record below.

## 13. DEV execution result — 27 October 2026

Mozfer's bounded Owner authorization was executed against DEV project `dpddrqjzqohexixgdqiq` only. The pre-apply repository baseline was branch `main` at `00de96012b78f0d1de4a0207352a13d9ac3a2e1b`, matching `origin/main` and live remote `main`; the worktree was clean before task changes. Fresh preflight revalidated the exact 14 fixed Service/quotation/ABS triples, canonical approval evidence, exclusions, and zero disallowed downstream links.

The repository-supported command applied the migration exactly once:

```text
pnpm dlx supabase@2.120.0 db push --project-ref dpddrqjzqohexixgdqiq --yes
```

Migration history was checked immediately and records the exact canonical identity `20261027102347 / w11_m0_01_14_approved_abs_retirement`; its local source SHA-256 is `3b7738fc9ad96c314142e3e392cc398df31ad8588e6c9c5f87deac98d8b7d1c8`. The governed RPC was then invoked exactly once and returned batch `W11-M0-01-14-APPROVED-ABS-RETIREMENT`, `retired_count=14`, `idempotent_replay=false`, recorded at `2026-10-27T11:16:00.308696+00`.

Read-only postflight at `2026-10-27 11:18:18.279688+00` (snapshot `14646:14646:`) found 14/14 target ABS rows retained, 14 retired, zero active target authorities, 14 exact remediation audit events, 14 matching item snapshots, zero non-target batch events, and zero links across the 90 guarded downstream paths. Services, Customers, quotations, ABS items/snapshots, prior approval audit evidence, invoice/payment/credit/accounting facts, the Completed SAR 800.00 case, and both M0-02 cases remained unchanged. No other migration, fixture, bootstrap, grant, or environment was touched.

The historical M0-03 invoice audit/source evidence remains unchanged: no invoice source rows or amounts were created, changed, or inferred. Its derived current-context counts changed from 14 to 0 for currently approved ABS scopes/source quotations because those 14 same target scopes were retired as authorized. The raw invoice audit references and historical source evidence were not modified; provenance and historical financial impact remain `UNKNOWN`.

Historical status as of 28 October 2026: the 14-case current-authority inconsistency was repaired, while M0-01 overall remained `BLOCKS APPLICABLE W11 PHASE` because the excluded soft-deleted Completed G8 Service still had active SAR 800.00 ABS. At that time the case was a `REMEDIATION CANDIDATE — BUSINESS DECISION RESOLVED`, with a one-case contract ready for separate Owner execution authorization. The later authorized repair and Controller closure are recorded in the current-status note above. Historical cause and financial impact remain `UNKNOWN`; the ABS total is commercial authority only. W11 remains `NO-GO`.

**Historical exact next action at the 28 October snapshot (superseded by the later Owner authorization, repair, and Controller verdict):** Mozfer to separately authorize or decline implementation and reviewed DEV execution of the one-case Completed G8 repair contract; if authorized, require a fresh baseline/preflight. The current exact next action is recorded in the current M0 reconciliation packet. W11 remains `NO-GO`.
