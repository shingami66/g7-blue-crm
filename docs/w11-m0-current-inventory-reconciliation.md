# W11 M0 — Current DEV Inventory and Residual Reconciliation

**Current evidence date:** 29 October 2026 (full inventory cutoff remains 26 October; later M0-01 Owner decisions, the 14-case DEV execution/postflight, the first failed G8 attempt, the corrective migration/single-retry postflight, and final Controller closure verdict are timestamped supplements; M0-02/M0-03 and M0-04 reviews remain separately dated).

**TASK VERDICT: PASS. Controller verdict: `M0-01 = CLOSED`.** The verdict is based on the completed and published governed repairs and postflight evidence. The original failed transaction remains immutable history. The additive correction applied without widening `audit_logs_action_check`; the single retry retired exactly one ABS and the fresh read-only postflight passes. Preservation fingerprints confirm the 14 prior repairs, M0-02, M0-03, and protected target data remain unchanged. The original 15-case cohort has zero active ABS authority; the full closure basis is recorded in Section 21.

**W11 READINESS: NO-GO.** Broader M0 and W11 gates remain unresolved; no phase exit or cutover authority is inferred.

## 1. Baseline, cutoff and reproducibility

- Repository: `D:/G7/g7-crm`, branch `main`; preflight HEAD, origin/main and live remote all `58059356e532b8eab35d1684ae8ee31fa32bf054`; worktree, index and untracked state clean.
- Exact DEV: `dpddrqjzqohexixgdqiq`, ACTIVE_HEALTHY, PostgreSQL 17.6. No other project inspected.
- 176 local migration files / 176 DEV identities, zero missing/extra/duplicate versions; terminal `20261019063410 / w10d_ar_bridge_reconciliation_evidence_read`. The final snapshot also freezes migration identity digest (MD5 of ordered version/name pairs): `d706b646f5ce4cfb188d5fa6ef4d98ca`; this is an identity checksum, not an applied-SQL checksum.
- Source migration-tree Git object `ccc05e958e9c2e86e4fb45becff4a29d0bb82aac`; generated-type source object `425e7fcd3876670ed68c640a9841888791e2d1bd`.
- Final observation / logical recorded-at cutoff: **`2026-10-26 12:16:16.224097+00`**; business as-of **`2026-10-26`**; statement snapshot `14633:14633:`.
- [SELECT-only verification v1](../supabase/verification/w11m0_current_inventory_reconciliation.sql), Git blob `13053764f0242998e9719ada9262d39e1740d6fe`, is the exact successful final statement: outer inventory, exception, monetary, lineage and catalog/ACL sections share one statement snapshot. Stable accounting getters use the calling snapshot. The legacy VOLATILE Event Costing getter can obtain fresh internal snapshots: its result is a current/as-of-date observation within this execution, not a separately certified immutable snapshot or recorded-at replay. Earlier exploratory observations do not replace final evidence.
- Mutable tables are current observations, not historical replays. Accounting getters receive the same statement timestamp/date. Current-date operational views and Event Costing use their actual as-of contracts; Event Costing has no recorded-at history parameter. No fabricated August/12 October historical precision.
- Monetary arithmetic stays in PostgreSQL numeric/bigint and returns text. JavaScript formats strings/counts, never financial arithmetic.
- During the original 26 October inventory pass, only SELECT statements were submitted via Supabase execute_sql; inspected getter/inventory paths contain no write operation. This is not a claim that the connector enforces a read-only transaction; no transaction-mode change was issued. The separately authorized 27 October M0-01 execution is recorded below.

## 2. Inventory and the disproved bootstrap premise

The snapshot covers **142 public tables and 11 public views**; 79 base tables are empty. Every required domain actually present is covered in the appendix. Services are the Event authority; legacy Projects/project tasks are empty. Supplier rate cards, allocations and bookings exist but are empty. Dormant Event Tasks/Milestones history remains, with one completed task and one planned milestone; neither is reactivated.

**The inherited “bootstrap remains unexecuted” premise is disproved.** The accounting-profile create audit records `operation=bootstrap` at **2026-10-17 05:50:59.784991+00**. Profile version 1 was INACTIVE; version 2 became DEV_PROVISIONAL at **2026-10-17 06:33:53.533423+00**. There are 33 accounts, 12 OPEN periods, 8 rules, 36 posting mappings, one statement mapping set/version and 24 statement entries. All predate this task. **Do not bootstrap again.** Configuration presence is not professional approval or completed accounting readiness.

Journals/lines/versions, inception packages/reviews/acceptances, bank bindings/statements/reconciliations, AR/AP/expense bridge events/links/lines, and revenue arrangements/recognition events are empty. No opening position or operational accounting history is inferred.

There are **2 active users: 1 admin, 1 viewer**; no third reviewer exists. Latest capability-event effects show explicit admin accounting:view/manage_profile/manage_authority and revoked viewer chart/period capabilities. CRM role alone is not accounting authority. No identity name/email/Clerk identifier/authentication material is retained.

## 3. Exact financial reconciliation

Amounts are SAR unless marked halalah. Historical versions and balance snapshots are not added to current authority.

| Authority / scope | Exact current result | Interpretation |
|---|---|---|
| Current approved, non-deleted/non-superseded quotations | 21; 152562.50 | Commercial authority. Ten current drafts total 831499.68, separate. |
| Current approved ABS | 19; 150562.50 | Four on active Services: 137662.50; fifteen on deleted Services: 12900.00. Difference from approved quotations is exactly the missing-ABS pair: 2000.00. |
| All historical ABS rows | 21; 255561.10 | Includes superseded versions; not current authority. Header totals reconcile to 22 line snapshots. |
| Issued invoices (sent/partially_paid/paid, non-deleted) | 3; 65501.40 | Paid 5000.00; sent 60501.40. Three drafts 8998.60 excluded. |
| Effective confirmed customer cash | 5000.00 | One legacy invoice-bound payment; unbound receipts 0. Zero-row unbound-receipt view does not mean no customer cash. |
| Effective customer allocation | 5000.00 | Equals invoice paid caches; no allocation/receipt reversal. |
| Customer credits/refunds | Credits 1001.00; refund 0.50; applications 0 | Eligible residual credit 1.00; available residual 0.50 after refund. Not all credit is refundable cash. |
| Issued receivables | Net receivable 64500.40; outstanding 59501.40 | Per-invoice zero floors matter: the 1.00 credit on the fully paid invoice becomes customer credit. Do not force aggregate subtraction through that floor; governed per-invoice outstanding is authoritative. |
| Commitments / receipts | Authorized 11000.00; accepted 10000.00; open 1000.00; pending 0 | Commitment is not bill or payment. |
| Supplier bill/payment | Approved bill 10000.00; gross payment 10000.00, fully reversed; effective paid 0.00; outstanding 10000.00 | Recorded payment row is not effective settlement after reversal. |
| Supplier advance | Authorized 200.00; paid/allocated/refunded 0.00; paid-unallocated 0.00 | Authorization is not cash. |
| Expenses | Approved 1264.02; submitted 500.01 | Approved petty-cash settled 444.00; accountability-view remaining unsettled 820.02. Submitted is not approved cost. |
| Employee cash advance | Issued/remaining 2000.00; spent/returned 0.00 | Issuance alone is not expense. |
| Petty cash | Replenishment 3000.00; disbursement 444.00; balance 2556.00 | Sequence 0→3000→2556 reconciles; do not sum balance snapshots. |
| Event Costing, 13 active Services | Commitment 11000.00; accepted 10000.00; open 1000.00; actual 10000.01; paid 0.01; outstanding 10000.00 | Event-only contract excludes overhead/non-event expenses. Company-direct paid cost follows its existing contract. All 13 PARTIAL for missing budget/ETC/commercial authority and/or pending Event expenses. Zero cost-close versions. Not accounting profit. |
| Posted ledger | 0 journals; DEBIT “0” / CREDIT “0” halalah | Empty balance does not establish completed inception/accounting. |

`Invoice != Cash != Revenue`. `Commitment != Receipt != Accrual != Bill != Payment`.

### Governed accounting reads

Existing explicit accounting:view on the active admin was used for getters only; no grant was made. Runtime READY means the read is available, not that accounting or W11 is ready.

| Getter | Source count | Posted | Missing effects | Other result |
|---|---:|---:|---:|---|
| AR evidence | 8 | 0 | 8 | Not truncated at 500; duplicate conflicts 0. |
| AP | 4 | 0 | 4 | Not truncated; AP/accrual/advance ledger and subledger controls “0” halalah, differences “0”. |
| Expense | 11 | 0 | 11 | Not truncated; cash/employee advance/reimbursement controls “0”, differences “0”. |
| Revenue Recognition | 0 arrangements / 0 recognition events | Revenue posted “0” halalah | Not applicable field | Held evidence 0; authoritative consideration/recognized-to-date “0”; not truncated. |

Unclassified source inventory without inception coverage or posting effects is **not automatically an invariant defect**. These counts are not permission to post operational facts or call them revenue. This task exercised current governed summaries without fixtures, not the deferred synthetic acceptance scenario. The earlier optional synthetic AR warning remains historical.

## 4. Integrity, lineage and audit

- 438 FK relationships scanned: zero orphans, including composite/nullable MATCH SIMPLE references.
- 1,432 NOT NULL columns across 142 tables: zero required-null row violations.
- 492 indexes: all valid/ready. Nine existing NOT VALID CHECK constraints evaluated against current rows: zero false checks; no validation DDL.
- The 12 October lifecycle repair holds: 13/13 active Services have projections; all 32 legacy statuses match; versions non-negative.
- The nineteen explicit checks below all return zero. Empty domains pass vacuously, not by synthetic behavioral proof.

| Check | Violations |
|---|---:|
| `active_services_missing_lifecycle` | 0 |
| `lifecycle_legacy_status_mismatch` | 0 |
| `negative_lifecycle_version` | 0 |
| `current_approved_quotation_duplicates` | 0 |
| `current_abs_duplicates` | 0 |
| `quotation_header_arithmetic` | 0 |
| `abs_header_line_total` | 0 |
| `abs_source_quotation_snapshot_total` | 0 |
| `quotation_service_customer_mismatch` | 0 |
| `invoice_service_customer_mismatch` | 0 |
| `invoice_abs_service_mismatch` | 0 |
| `invoice_header_arithmetic` | 0 |
| `invoice_paid_cache_vs_effective_allocation` | 0 |
| `receipt_commitment_party_mismatch` | 0 |
| `bill_receipt_party_mismatch` | 0 |
| `customer_allocation_party_mismatch` | 0 |
| `advance_balance_equation` | 0 |
| `active_deposit_duplicates` | 0 |
| `service_deleted_time_missing` | 0 |

Audit coverage means at least one same-entity event, not every required action, create event or complete approval timeline. A missing audit is not automatically a violation where no current emission contract requires it. The missing quotation audits and orphan invoice references remain explicit exceptions.

| Source | Rows | With any entity audit |
|---|---:|---:|
| `customers` | 21 | 0 |
| `services` | 32 | 17 |
| `quotations` | 33 | 31 |
| `approved_billing_scopes` | 21 | 21 |
| `invoices` | 6 | 6 |
| `approved_commitments` | 2 | 2 |
| `service_receipts` | 1 | 1 |
| `expenses` | 7 | 7 |
| `employee_cash_advances` | 1 | 1 |
| `supplier_bills` | 1 | 1 |
| `supplier_payments` | 1 | 1 |
| `supplier_advances` | 1 | 1 |
| `customer_internal_credit_adjustments` | 2 | 2 |
| `customer_refunds` | 1 | 1 |

There are 254 audit rows. Cohort A has fifteen Service status-change and fifteen quotation audit records, no deletion proof. All six current invoices have entity audits. FK and party checks cover procurement→receipt→bill/payment and document links. No raw audit payload was retained; only bootstrap operation/state was extracted to resolve the stale premise.

## 5. Historical cohort refresh

The [12 October record](w11-m0-lifecycle-integrity-repair.md) is unchanged. **All four cohorts remain; counts are unchanged.** This does not prove every historical field unchanged. Prior monetary totals/full snapshots are unavailable, so no financial delta is invented. Cohort A quotation update timestamps remain in the August 17 window, before October 12. Historical deletion mechanism/deployed path remains UNKNOWN.

### A — Deleted Services with current approved quotations

17 Services, **14900.00 commercial exposure**; fifteen active ABS **12900.00**, two missing ABS **2000.00**. Current linked invoices, invoice-linked payments and credit adjustments: zero. Accounting bridges/journals empty, therefore no current accounting linkage. Not proven receivables, revenue or loss.

#### 27 October 2026 M0-01 Owner disposition

Mozfer's initial 27 October **REMEDIATION CANDIDATE** disposition for the 15 active ABS records was refined by the cohort-specific Owner decisions below. The decision authorized contract design for the 14 `Approved` Service/ABS pairs; that contract is now complete and ready for separate Owner execution authorization. The `Completed` SAR 800.00 pair remains on evidence hold. M0-01 remains **BLOCKS APPLICABLE W11 PHASE**. Historical cause and financial impact remain **UNKNOWN**; the SAR 12,900.00 ABS total remains commercial authority only, not an invoice, receivable, cash, revenue, accounting balance, loss, or write-off. This resolves the Owner current-state disposition sub-gate, not the underlying exception, M0 exit, or W11 readiness. No mutation is authorized.

| Service ID | Quotation ID | Amount | Active ABS | Service/quotation audits |
|---|---|---:|---:|---|
| `02bdefe9-6a1e-4dfe-8732-985af7a5df49` | `307106ce-2a58-4901-bcb6-75abe12b03af` | 500.00 | 1 | 1/1 |
| `3082b962-009c-4e4f-b5c4-ec2adcb27027` | `30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f` | 1000.00 | 0 | 0/0 |
| `a131fafb-347b-476e-95c0-2329ad641805` | `401426ab-77df-4b6d-bd87-c511319f91b6` | 1000.00 | 1 | 1/1 |
| `e084cec0-c0d6-4429-8324-6c2a0f58db7f` | `51607035-b574-44c5-ae84-f7e676d7a4d8` | 800.00 | 1 | 1/1 |
| `3f7dfffb-3188-49d0-b4ac-3297a95a60e8` | `591744aa-4684-4463-a782-260af6f90d6a` | 1000.00 | 1 | 1/1 |
| `f01335fe-0807-46f2-ba02-0a84ca5a67c7` | `63317742-a4cc-4e6a-86ec-f44075f9a0e8` | 1000.00 | 1 | 1/1 |
| `dc395544-9d24-4869-b6c7-ac020dea959f` | `82dc2e82-19fa-478a-b9a3-6ea6da4a6168` | 1000.00 | 0 | 0/0 |
| `c7ca6503-9746-4604-964a-cbe53c118009` | `87932c67-cdca-4d6c-bb20-691b59f8961f` | 800.00 | 1 | 1/1 |
| `e392d1da-bfd1-4b40-ac48-4e5c14afb7c0` | `90db681e-b166-479e-b4ed-6087266d1dfe` | 500.00 | 1 | 1/1 |
| `a267452a-802b-4d57-8b49-8d161aca508d` | `afb16e3d-95d0-4823-918e-f7c8f52dd6f5` | 1000.00 | 1 | 1/1 |
| `52d67797-0fd5-466f-a810-2d3c14542b25` | `bb5756e6-5488-4587-b475-63b8aa9620b3` | 1000.00 | 1 | 1/1 |
| `1ac06a50-043a-4ff2-b441-f709da735a52` | `d286e869-df5f-4510-a5d8-fb3397f6f5e3` | 800.00 | 1 | 1/1 |
| `1421ecd2-4152-4676-8c41-ec292830e8a2` | `daa17584-0180-4778-9316-826015b486ac` | 1000.00 | 1 | 1/1 |
| `804c7bbc-0048-4b6d-902c-c74f96d07cbc` | `dcabf9d8-600b-438c-bd5d-0f2857785cd7` | 500.00 | 1 | 1/1 |
| `895638bd-6568-4e48-aac0-876eea91fa88` | `e2fdd626-cdab-4f34-b7ca-2d52b5412e9d` | 1000.00 | 1 | 1/1 |
| `3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5` | `ec4717f4-ed0e-4879-aa6f-a4c3736d3556` | 1000.00 | 1 | 1/1 |
| `eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0` | `fd51e91e-af3a-4c0e-897f-0a5afbac766d` | 1000.00 | 1 | 1/1 |

#### 27 October 2026 M0-01 remediation-design dry run — HOLD

The [bounded design and exact candidate set](w11-m0-01-remediation-design.md) and [SELECT-only dry-run query](../supabase/verification/w11m0_01_remediation_design_dry_run.sql) add current-state evidence without moving the 26 October inventory cutoff. DEV `dpddrqjzqohexixgdqiq` returned 15 target pairs at `2026-10-27 07:43:59.452867+00`, snapshot `14636:14636:`. The sorted Service/quotation pair-set MD5 is `ab104f63e91916828672033a781b5d26`. Each pair has one active approved ABS version 1; accepted totals match the existing commercial amounts and sum SAR 12,900.00.

- Fourteen Services are currently `Approved`; Service `c7ca6503-9746-4604-964a-cbe53c118009` is `Completed` with an active SAR 800.00 ABS and no invoice. All 15 Services have `deleted_at`; none has a cancellation reason. The 15 linked Customer rows have `is_deleted = true` and `deleted_at IS NULL`. Quotations remain approved, undeleted, and unsuperseded.
- Service deletion timestamps form two groups: 10 at `2026-08-17 10:13:40.350Z`, 5 at `2026-08-17 10:14:35.048Z`. Each pair has exactly three inspected audit rows (`quotation_approved`, `service_status_changed`, `approved_billing_scope_approved`); no deletion audit row was present for the exact Service/quotation/ABS entity IDs. This does not establish deletion cause or intent.
- Current direct matches by Service, quotation, and ABS IDs show no invoice, invoice-linked payment, receipt allocation, customer credit adjustment/application/refund/reversal, Service commitment/receipt/supplier allocation/booking/expense, or checked AR/AP/expense/accounting/revenue-recognition/journal reference. This does not prove zero historical financial impact or detect hard-deleted records.
- Existing `void_approved_billing_scope` refuses soft-deleted Services and also refuses a `Completed` Service; current source has no Service restore action. Superseding or directly editing records would change commercial authority or bypass lifecycle/audit controls.
- **At the 27 October remediation-design dry-run cutoff:** cause and historical financial impact remained UNKNOWN. Mozfer's decisions below resolve the desired current state separately: the 14 `Approved` Services are accepted as deleted in the current business state, and their ABS authority should be retired through separately authorized governed remediation; this does not establish why they were historically deleted. The Completed Service and its possible unbilled obligation remained on evidence hold. At that snapshot, M0-01 still blocked the applicable W11 phase and no mutation was authorized; the later repairs and Controller closure are recorded below.

#### 27 October 2026 M0-01 Owner business-decision supplement

For the 14 M0-01 Service/ABS pairs whose Services are soft-deleted and currently `Approved`, Mozfer accepts deletion as the intended current state. Do not restore Services or Customers. Retire active ABS authority only through separately authorized governed remediation; preserve quotations, ABS records/items/snapshots, Services, Customers, and audit history. The bounded [14-case repair contract](w11-m0-01-14-approved-repair-contract.md) is now `READY FOR OWNER EXECUTION AUTHORIZATION`; this does not authorize implementation or execution.

At the 27 October 2026 decision snapshot, the one `Completed` Service `c7ca6503-9746-4604-964a-cbe53c118009` with active SAR 800.00 ABS authority was to remain unchanged; the possible unbilled obligation was unresolved and the case was on `HOLD — BUSINESS EVIDENCE REQUIRED`. The 28 October supplement below records Mozfer's later business decision and supersedes this hold: the case is accepted as synthetic G8 DEV verification data, with no real unbilled obligation intended for preservation. The active ABS authority may be retired only through separately authorized governed remediation.

At the 27 October Owner-decision snapshot, historical cause and financial impact remained `UNKNOWN`; ABS totals were commercial authority only. M0-01 then remained `BLOCKS APPLICABLE W11 PHASE`, M0 exit was not satisfied, and W11 remained `NO-GO`. This records business-state judgment only and granted no database mutation authority; later repair and closure evidence is recorded below.

#### 27 October 2026 M0-01 repair-contract result

At the contract-design cutoff, the implementation-ready contract covered exactly the 14 Approved Service/quotation/ABS triples and excluded the Completed SAR 800.00 case. It defined the fixed-allowlist service-role-only RPC, narrow trigger boundary, atomic Service-first locks, downstream checks, audit evidence, replay, and fail-closed behavior. That design task did not query DEV or authorize implementation; the later Owner-authorized execution and postflight are recorded immediately below. Historical cause and impact remain UNKNOWN; W11 remains NO-GO.

#### 27 October 2026 Owner-authorized 14-case DEV execution and postflight

The pre-apply baseline was `main` / `origin/main` / live remote `main` at `00de96012b78f0d1de4a0207352a13d9ac3a2e1b`, with a clean worktree before task changes. Fresh DEV preflight confirmed exactly 14 fixed targets, one canonical approval audit per ABS, all exclusions, and zero disallowed downstream links. Migration `20261027102347 / w11_m0_01_14_approved_abs_retirement` was applied once to `dpddrqjzqohexixgdqiq` using the pinned repository Supabase CLI workflow; history was checked immediately. Its local source SHA-256 is `3b7738fc9ad96c314142e3e392cc398df31ad8588e6c9c5f87deac98d8b7d1c8`. The fixed-allowlist RPC was invoked once and returned `retired_count=14`, `idempotent_replay=false`, with batch `W11-M0-01-14-APPROVED-ABS-RETIREMENT` at `2026-10-27T11:16:00.308696+00`.

Postflight at `2026-10-27 11:18:18.279688+00` (snapshot `14646:14646:`) confirmed target count 14, ABS row count 14, retired count 14, active target count 0, exact matching audit count 14, batch event count 14, non-target batch event count 0, item count 14 with matching digests, and zero nonzero relations across all 90 downstream checks. Service, Customer, quotation, lifecycle, prior approval audit, ABS item/snapshot, invoice/payment/credit/accounting facts remained unchanged. The Completed SAR 800.00 case remains active and unchanged; both M0-02 cases remain excluded and unchanged. No other business/configuration DML, fixture, bootstrap, or grant was performed.

The earlier M0-03 source query remains valid for its observation time. Its 14 raw invoice audit references, missing invoice rows, and zero source/path matches were not modified; no invoice or amount was reconstructed. The derived current approved ABS and source-quotation counts associated with those same target IDs changed from 14 to 0 after retirement. This is an expected current-authority effect, not a change to M0-03 audit/source evidence. M0-03 provenance and historical financial impact remain `UNKNOWN`.

#### 28 October 2026 M0-01 Completed G8 Owner decision and one-case contract

Mozfer accepts Service `c7ca6503-9746-4604-964a-cbe53c118009` (`G8 Final Service lmu0p1`) as synthetic G8 DEV verification data and confirms there is no real customer unbilled obligation intended for preservation. Retire its active ABS authority only through a separately authorized governed remediation. Preserve the soft-deleted Service and historical `Completed` status, Customer, approved/current quotation, ABS row, items/snapshots, and audit history. Do not restore records or create/reconstruct an invoice, payment, receipt, revenue, receivable, or accounting entry.

- **G8 DEV verification provenance:** `VERIFIED`. **Exact historical mechanism producing Completed:** `UNKNOWN`. **Historical financial impact:** `UNKNOWN`. SAR 800.00 remains commercial authority only.
- Fresh SELECT-only evidence at 2026-10-28 05:46:04.291820+00, snapshot `14649:14649:`, matched exactly the Service/quotation/ABS triple `c7ca6503-9746-4604-964a-cbe53c118009 / 87932c67-cdca-4d6c-bb20-691b59f8961f / 513f1e78-5bfa-4ff2-a8a8-6986498d1987`. It confirmed the soft-deleted `Completed` Service; Customer `CUST-G8-lmu0p1` remains flagged deleted with null deletion timestamp; the quotation is approved/current/undeleted at SAR 800.00; and the version-1 active approved ABS is SAR 800.00 with one accepted item and matching digest `0f702aaea049a071bdcc9b13de930dd8`.
- Three target audit rows record quotation approval, ABS approval, and Service `Quoted → Approved`; none establishes a later `In Progress → Completed` transition. Direct invoice matches and matching `invoice.created` audit references are zero. All 90 expanded downstream guard paths are zero, including invoice/payment, customer credit/receipt, operational, bridge, journal, revenue-recognition, supplier, and expense paths. This is current-state evidence and does not establish zero historical financial impact.
- The exact one-case design is in [the Completed G8 contract](w11-m0-01-completed-g8-repair-contract.md), using reproducible [SELECT-only preflight SQL](../supabase/verification/w11m0_01_completed_g8_preflight.sql). It is `READY FOR OWNER EXECUTION AUTHORIZATION`; this task neither implements nor executes it.

This Owner decision supersedes the prior Completed-case business-evidence hold, but does not close M0-01 or authorize mutation. The next review boundary is before M0 exit or an applicable W11 gate. Preserve current DEV rows unchanged until a separate execution authorization and fresh execution preflight.

### B — Approved quotations without ABS

Two, nested within A: `30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f` and `82dc2e82-19fa-478a-b9a3-6ea6da4a6168`; **1000.00 each / 2000.00 total**. Zero quotation audits/current invoices/payments/credits. Both created/updated August 17. Current migration presence does not prove pre-ABS provenance. Cause UNKNOWN; no history inferred.
#### 27 October 2026 M0-02 provenance supplement

The repository review baseline was `690c88278ad62f5adda72ce482bb848736c10c36`. The corrected exact-target, SELECT-only DEV query observed project `dpddrqjzqohexixgdqiq` at `2026-10-27 06:07:57.339640+00`, snapshot `14636:14636:`; see [the reproducible query](../supabase/verification/w11m0_02_abs_provenance_review.sql). It supplements the 26 October inventory and does not move its cutoff.

- Service `3082b962-009c-4e4f-b5c4-ec2adcb27027` was created at `10:09:59.196870Z`; Service `dc395544-9d24-4869-b6c7-ac020dea959f` at `10:10:32.245666Z`. Both are currently Approved and soft-deleted at `2026-08-17 10:13:40.350000Z`.
- Their linked quotations `30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f` and `82dc2e82-19fa-478a-b9a3-6ea6da4a6168` are currently approved, not deleted or superseded, each with SAR 1,000.00 commercial total. Each was created and last updated within milliseconds of its Service creation. The `quotations` table has no `approved_at` column, so these timestamps do not establish when approval occurred.
- No approved billing scope row matched either target Service or quotation in any status; no service/quotation pair mismatch was present. No audit rows were found for the exact Service or quotation IDs. The two linked Customer rows are soft-deleted, and the Service/quotation customer associations match; the query returns no Customer identifiers or names. Invoice matching explicitly checks the Service ID, direct `approved_quotation_id`, and matching ABS ID; the combined current invoice count and linked payment, credit-adjustment, credit-application, AR bridge event, and AR bridge journal-link counts are zero. All checked direct accounting source/effect, journal, inception, revenue-recognition and AR/AP/expense bridge references for the exact IDs are zero. These are current-state observations, not historical replay.
- Repository history ties no fixture or script to the exact IDs. Commit `4016cf71ed24d1230a7a1f4303dd249edf9a35c9` (4 August 2026) changed supported quotation approval to call `approve_quotation_and_activate_internal_abs`; DEV has `20260803090000 / quotation_approval_internal_abs_activation` and `20260803100000 / quotation_approval_service_status_transition_fix`. A prior direct quotation-approval path existed before that change, but neither the exact approval time nor the application build deployed on 17 August is established. The prior path therefore does not explain these records.
- Reviewed lifecycle code allows deletion of draft scopes only; voiding and supersession retain scope history. No supported application hard-delete path for approved scopes was found. This does not establish what occurred for these exact records.
- **Cause classification: UNKNOWN. Financial impact: UNKNOWN.** SAR 2,000.00 is the two quotation totals, a commercial amount only; no invoice amount, receivable, revenue, loss, or historical financial effect is established. No current downstream financial/accounting link was found.
- **Owner-approved disposition: MONITOR / PRESERVE EVIDENCE (27 October 2026).** Preserve current records and evidence unchanged. Do not create/reconstruct ABS or invoices, or rewrite quotation, Service, Customer, or audit history. Provenance/cause and historical financial impact remain UNKNOWN. SAR 2,000.00 is approved quotation commercial value only, not invoice value, receivable, revenue, balance, loss, write-off, or accounting exposure without authoritative evidence. Current evidence shows no proven downstream invoice, payment, credit, AR, or accounting effect; this does not establish zero historical impact. Reopen only if materially new exact historical evidence establishes provenance, financial impact, or a current integrity/security consequence. This resolves the M0-02 disposition sub-gate only; it does not clear M0-01, M0-04, broader M0 exit, or any later W11 gate.


### C — Invoice audit references without source invoices

14, each one create event and no later invoice event. At the 26 October packet cutoff, all 21 inspected explicit invoice/source-reference paths returned zero matches: invoices/items, payments, allocations, draft mutations, credits and accounting bridge/inception/journal/source-effect paths. **Historical financial impact UNKNOWN, not zero.** Missing sources cannot establish an amount; raw audit details were not mined for reconstruction. The 27 October targeted supplement below adds six current source-reference paths for this cohort.


**27 October 2026 targeted DEV provenance supplement:** The exact-target, SELECT-only query observed `dpddrqjzqohexixgdqiq` at `2026-10-27 05:01:38.708774+00`, snapshot `14636:14636:`. This supplements M0-03 only; the full inventory cutoff above remains 26 October.

- The 14 references each have one retained `create` audit event, all `invoice.created` with `new_state=draft`; 12 are `deposit`, 2 are `final`. Event timestamps span `2026-08-17 10:11:38.356528+00` through `10:14:29.315293+00`.
- All 27 queried current invoice, payment, receipt, credit, AR/AP/expense bridge, accounting, journal, inception, and revenue-recognition source-reference paths returned zero matches. No downstream invoice/payment/accounting effect was found.
- Allowlisted audit metadata links the references to 14 currently approved, unsuperseded billing scopes and source quotations, 14 soft-deleted Services, and 3 soft-deleted Customers. There are no scope/Service mismatches; each invoice audit event is at or before its linked Service deletion timestamp. This CRM context does not establish an invoice or amount.
- The inspected top-level audit fields contain no amount, subtotal, grand-total, VAT, balance-due, or amount-paid field. Related quotation/approved-scope amounts are not invoice amounts. Historical financial impact remains UNKNOWN.
- Exact-reference searches across repository history and fixtures found no provenance tie. Current and historical application-source review found no supported invoice hard-delete path. DEV currently grants `service_role` DELETE on invoices; this is capability evidence only and does not prove use. Cause remains UNKNOWN.
- The bounded query is preserved at [w11m0_invoice_provenance_review.sql](../supabase/verification/w11m0_invoice_provenance_review.sql); it returns only the published invoice reference IDs, event action/timestamps, path counts, and aggregate linked context, not raw audit JSON or identity values.

| Missing invoice reference | Event timestamp UTC | Events | Action |
|---|---|---:|---|
| `040cdd06-76c7-4110-8307-73eea19c8e34` | 2026-08-17 10:13:08.079035+00 | 1 | create |
| `0b9ac36f-ece0-4dff-a057-e4631d0d166f` | 2026-08-17 10:12:57.242498+00 | 1 | create |
| `0eaf57a1-218d-481b-8240-9ad5bba64bc8` | 2026-08-17 10:11:45.919926+00 | 1 | create |
| `1f1402cb-ec67-4db0-b8ad-332e9e09036c` | 2026-08-17 10:14:29.315293+00 | 1 | create |
| `2a7b06c0-2167-4456-af74-1e2e0b1c22ca` | 2026-08-17 10:14:23.332008+00 | 1 | create |
| `3175e652-bab7-4d90-8096-b4cb3c1daf37` | 2026-08-17 10:14:20.371315+00 | 1 | create |
| `3eaf8f70-da39-4bda-a4f4-9601692c7ffa` | 2026-08-17 10:11:43.953587+00 | 1 | create |
| `75154bb3-1c14-43fd-b9a5-a86cad2fb831` | 2026-08-17 10:13:03.061185+00 | 1 | create |
| `7ce5a763-3180-43ad-b0f1-0a8fa2431b02` | 2026-08-17 10:11:51.41603+00 | 1 | create |
| `99bb7f1b-5201-4992-bd7d-75c00ccb3097` | 2026-08-17 10:13:05.57438+00 | 1 | create |
| `b3480d1a-e929-4461-8190-61fd3928d879` | 2026-08-17 10:11:38.356528+00 | 1 | create |
| `d0a7179c-4319-4f9d-b821-eeb76778725f` | 2026-08-17 10:14:13.918662+00 | 1 | create |
| `eba1b438-80fb-4cea-bd2d-822568e25357` | 2026-08-17 10:14:25.91433+00 | 1 | create |
| `f78093d2-db60-481e-893e-fa4de40c23b5` | 2026-08-17 10:13:10.993681+00 | 1 | create |


#### Owner disposition — 27 October 2026

Mozfer (Owner/Controller) approved **MONITOR / PRESERVE EVIDENCE** for M0-03. Preserve the existing audit and evidence unchanged: do not reconstruct invoices, delete or rewrite audit evidence, clean up records, or invent amounts. Provenance/cause and historical financial impact remain **UNKNOWN**; no downstream financial/accounting effect is proven, and no fixture/test claim is accepted without exact-ID evidence. Reopen only if materially new evidence establishes provenance, impact, or a current integrity/security consequence. This resolves the M0-03 Owner-decision sub-gate only; it does not waive another exception, establish M0 exit, or change W11 **NO-GO**.

**Post-remediation current-context supplement — 27 October 2026:** The raw M0-03 invoice audit references and their missing source rows remain unchanged. The earlier query's 14 linked currently approved ABS scopes/source quotations now resolve to zero current approved scopes/quotations because those same 14 ABS authorities were retired under the M0-01 Owner authorization. No M0-03 reference or financial record was mutated. Historical provenance and financial impact remain `UNKNOWN`; the disposition remains MONITOR / PRESERVE EVIDENCE.

### D — Deleted Customers missing deleted_at

Nine remain, linked to 19 Services and 17 quotations, zero invoices/payments/credits. Relationships overlap A; do not add overlap as independent financial loss.

| Customer ID | Services | Quotations | Invoices/payments/credits |
|---|---:|---:|---|
| `7f02982d-2468-46ca-ae2b-185f556f3fee` | 0 | 0 | 0/0/0 |
| `784c2e16-f8cf-467a-ad33-95569e3cf9cc` | 0 | 0 | 0/0/0 |
| `d7909f6a-6ed1-48d7-8740-af5e7a44310a` | 1 | 0 | 0/0/0 |
| `d1b9619f-6e8f-4902-ad26-844069d31d3c` | 1 | 0 | 0/0/0 |
| `f682f4d0-1300-4392-a392-a838807c6314` | 1 | 1 | 0/0/0 |
| `0476d4a9-d77b-4988-805a-1a319403748e` | 1 | 1 | 0/0/0 |
| `21db71fc-ac14-44c1-b5f6-03fcfcf64fc9` | 5 | 5 | 0/0/0 |
| `2168cc59-0205-4218-a141-15a9ac666877` | 5 | 5 | 0/0/0 |
| `9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e` | 5 | 5 | 0/0/0 |

## 6. Privileged-path verification

- All 142 base tables enable RLS; zero public RLS policies, consistent with repository removal of DEV-only policies and server-mediated access. All eleven bank tables retain FORCE RLS. RLS does not provide ordinary-role protection against service_role/owner access.
- 508 public functions / 200 non-internal triggers inventoried. Every SECURITY DEFINER function has pinned search_path. All 222 non-trigger/non-event-trigger SECURITY DEFINER application/helper functions deny PUBLIC/anon/authenticated EXECUTE; 187 permit service_role, 35 are owner-only helpers.
- Platform `rls_auto_enable()` returns event_trigger; its PUBLIC EXECUTE metadata is not an ordinary browser RPC path. It was not invoked.
- Four exercised accounting getters retain postgres ownership, pinned paths and service_role-only execution. No bank identity values selected.
- Legacy broad anon/authenticated table/view ACLs remain, including TRUNCATE metadata. RLS/no policies denies ordinary table row access; TRUNCATE is not governed by row policies and is not a PostgREST row operation. Security-invoker views retain underlying checks; non-invoker approved_commitment_balances/expense_accountability_summaries have no browser-role grants here. These are advisories, not blanket privilege closure or proof of browser exploitability.
- Invoices retain service_role DELETE/TRUNCATE. No dedicated BEFORE DELETE veto trigger exists. An AFTER INSERT/DELETE/UPDATE trigger refreshes lifecycle payment state, not a DELETE prohibition. FK restrictions apply where dependent rows exist.
- Current src/lib/invoices search found no supported hard-delete action; Service deletion still refuses linked non-deleted quotations. Current code/ACLs do not prove historical deployment or use. No destructive routine was called.

This completes bounded catalog inspection, not full W11 permission/production-security acceptance or privileged credential/path execution testing.

## 7. Migration/schema continuity

At the 26 October inventory cutoff, 176/176 migration version parity held with no missing/extra/duplicate version or new pending migration. Ten older history names contain an extra original timestamp prefix; stripping that embedded prefix yields the same descriptive suffix as source. Preserve these explicitly recorded naming aliases; they alone do not establish different SQL. The separate 27 October remediation apply adds one exact source/history identity, `20261027102347 / w11_m0_01_14_approved_abs_retirement`, on DEV only.

| Version | Local name | DEV history name |
|---|---|---|
| 20260811140000 | `g5_admin_user_atomic_mutations` | `20260811140000_g5_admin_user_atomic_mutations` |
| 20260902062807 | `w4_first_class_supplier_quotations` | `20260902090000_w4_first_class_supplier_quotations` |
| 20260902112824 | `l1_d07_commitment_receipt` | `20260902110000_l1_d07_commitment_receipt` |
| 20260919120834 | `w7p0a_approved_commercial_amendment_authority_bridge` | `20260919113218_w7p0a_approved_commercial_amendment_authority_bridge` |
| 20260919122807 | `w7p0a_approved_commercial_amendment_creation_ambiguity_repair` | `20260919131500_w7p0a_approved_commercial_amendment_creation_ambiguity_repair` |
| 20260919124225 | `w7p0a_approved_commercial_amendment_creation_ambiguity_recovery` | `20260919152000_w7p0a_approved_commercial_amendment_creation_ambiguity_recovery` |
| 20260922093200 | `w7d_accounts_receivable_reporting` | `20260922160000_w7d_accounts_receivable_reporting` |
| 20260922093913 | `w7d_accounts_receivable_reporting_runtime_repair` | `20260922170000_w7d_accounts_receivable_reporting_runtime_repair` |
| 20260922120938 | `w8a_event_costing_foundation` | `20260922180000_w8a_event_costing_foundation` |
| 20260922121651 | `w8a_event_costing_rpc_ambiguity_repair` | `20260922200000_w8a_event_costing_rpc_ambiguity_repair` |

This proves version/name-shape continuity and relevant current objects, **not byte equivalence of all historical applied SQL or applied-at timing**.

Generated types contain 141 table names and all eleven views. The only absent DEV table is dormant event_milestones, consistent with preserved R06 foundation and unpublished runtime in the Decision Register. No type refresh/repair. 508 functions include internal triggers/helpers versus 219 typed RPC names; equality is not asserted. Full column/type byte parity is not claimed by this name-level check.

The M0-01 migration added the fixed remediation RPC and four private helper/guard functions, replaced the existing ABS lifecycle trigger function only to admit the exact guarded transition, added one narrow invoker-context trigger, and applied the intended function ownership/grants/comments. Live checks confirmed postgres ownership, pinned `search_path=pg_catalog, public`, service-role-only EXECUTE for the governed RPC, helper execution revoked from all application roles, no direct table grants added, and the existing lifecycle trigger remained enabled. No unrelated schema drift was found.

## 8. Residual exception ledger

Historical operator/cause and any separate historical record owner remain UNKNOWN. **M0-01 decision owner:** Mozfer (Owner/Controller); `M0-01 = CLOSED` by Controller PASS on 29 October 2026, supported by the published repair and postflight evidence. **M0-02 decision owner:** Mozfer (Owner/Controller); MONITOR / PRESERVE EVIDENCE approved 27 October 2026, with no calendar deadline. **M0-03 decision owner:** Mozfer (Owner/Controller); MONITOR / PRESERVE EVIDENCE approved 27 October 2026, with no calendar deadline. M0-02/M0-03 reopen only on materially new evidence of provenance, financial impact, or a current integrity/security consequence. Other exception owners/dispositions remain as shown below; these decisions do not authorize reconstruction, cleanup, or other execution.

| Key | Domain/count | Exposure | Invariant/evidence | Cause state | Downstream/W11 significance | Proposed disposition |
|---|---|---|---|---|---|---|
| M0-01 | 17 deleted Services/current approved quotations at 26 Oct inventory cutoff | 14900.00 commercial; 12900.00 ABS at cutoff; after the 29 Oct retry, zero active authority remains in the original 15-case cohort | Exact 15-case dry run, 14-case DEV postflight, and final Completed G8 postflight; all 15 authorities retired through the governed repairs; A | UNKNOWN | G8 DEV provenance VERIFIED; exact Completed mechanism and historical impact UNKNOWN; zero downstream links; no original-cohort ABS row missing | CLOSED — Controller PASS; M0 overall remains open and W11 remains NO-GO |
| M0-02 | 2 approved quotations missing ABS/audit, subset of M0-01 | 2000.00 commercial | Exact-ID DEV/source review; approval time and deployed path unproven; B | UNKNOWN | Historical financial impact UNKNOWN; no current invoice/payment/credit/AR/accounting effect proven | MONITOR / PRESERVE EVIDENCE (Owner-approved 27 October; no reconstruction) |
| M0-03 | 14 create-audit invoice references without source | UNKNOWN historical amount | 27 current source-reference paths return zero; current/historical source review found no fixture tie or supported app hard-delete path; service_role DELETE is capability only; C | UNKNOWN | No proven downstream financial/accounting effect; linked CRM context remains; cause and financial impact unproven | MONITOR / PRESERVE EVIDENCE |
| M0-04 | 9 deleted Customers without timestamp | Financial impact UNKNOWN; 19 Services/17 quotes overlap A | Exact-nine provenance review; D and Section 22 | UNKNOWN — missing-timestamp cause; provenance partly evidenced | Metadata inconsistency only; zero current invoice/payment/credit links proven | MONITOR / PRESERVE EVIDENCE (recommended; Owner/Controller decision pending) |
| M0-05 | Invoice privileged DELETE/TRUNCATE | No amount attributable to use | ACL/trigger/source inspection | PARTIALLY EXPLAINED | Current capability verified; historical use unknown; no supported app hard-delete path found | MONITOR |
| M0-06 | Legacy broad ACLs / 9 NOT VALID checks | Not a monetary exception | Catalog; zero row-check failures; table RLS | PARTIALLY EXPLAINED | Advisory retained; no browser exploit or check-row violation established | MONITOR |
| M0-07 | Stale “bootstrap unexecuted” documentation | No monetary impact | Bootstrap audit/current config | VERIFIED CAUSE | Prior mirror omitted existing October 17 state; corrected here without data repair | NO ACTION — EXPECTED STATE |

No new material business-data exception was proven beyond the refreshed cohorts. M0-07 is newly verified documentation drift. Unclassified bridge effects, empty journals, uncompleted reviewer topology and PARTIAL costing remain readiness facts, not automatically defects or reconstruction authority.

## 9. W11 implications and exactly one next action

The 26 October full inventory, targeted M0-02/M0-03 provenance reviews, M0-01 dry run, 27 October exact 14-case remediation/postflight, and 28 October Completed G8 Owner decision are complete. Fourteen Approved-Service ABS authorities were retired on 27 October; the final Completed G8 authority was retired in the one authorized retry on 29 October. The Controller records `M0-01 = CLOSED` with Task Verdict `PASS`, based on the evidence in Section 21. G8 DEV verification provenance is VERIFIED; its exact Completed mechanism and historical financial impact remain UNKNOWN. M0-02 and M0-03 dispositions/evidence are unchanged apart from the documented derived-scope effect of the 14 retirements. Other residual exceptions and acceptance remain incomplete. R01–R04 remain bounded Owner-accepted, R05–R08 deferred. No further accounting slice is justified. Do not repeat bootstrap; DEV_PROVISIONAL configuration exists without accepted inception or professional approval. VAT not registered/rate 0.00, ZATCA/FATOORA inactive; professional validation remains required before applicable live/production/statutory/external/regulatory/irreversible use.

W11 stays **NO-GO**. M0-01 is CLOSED by Controller PASS; the closure is limited to the original current-authority inconsistency. The 14 Approved cases' former SAR 12,100.00 Approved-scope authority is not invoice/accounting value. M0-02/M0-03 remain preserved with UNKNOWN provenance/cause and historical impact; M0-04 and other applicable gates remain unresolved. Recovery/restore, shadow reconciliation, remaining Owner acceptance, later-phase support/monitoring, and professional/environment gates remain separately pending. DEMO/PROD are uninspected; M0 overall remains open.

**EXACT NEXT ACTION:** Mozfer (Owner/Controller) reviews and decides the M0-04 `MONITOR / PRESERVE EVIDENCE` recommendation before M0 exit or an applicable W11 phase exit. No timestamp backfill or other M0-04 remediation is authorized. M0-02/M0-03 remain MONITOR / PRESERVE EVIDENCE; M0-01 remains CLOSED — CONTROLLER PASS.

At the 29 October postflight cutoff, before the later Controller verdict recorded in Section 21, the M0-01 Owner-disposition sub-gate was complete for both the 14 Approved cohort and the one Completed G8 case; all 15 original-cohort ABS authorities were retired, but the verdict had not yet been recorded. This historical snapshot is superseded by Section 21. There is no authority to restore its Service/Customer, reconstruct an invoice, clean up, write off, waive, or rewrite historical records. M0-02 remains unchanged: reclassification would require exact historical approval/deployment or source-financial evidence, and its disposition approves no reconstruction or history rewrite.

## 22. M0-04 deleted Customer provenance review — 29 October 2026

The exact-nine DEV SELECT-only review is documented in [W11 M0-04 Deleted Customer Provenance Review](w11-m0-04-deleted-customer-provenance-review.md) and reproduced by [its fixed-target query](../supabase/verification/w11m0_04_deleted_customers_provenance_review.sql). At cutoff `2026-10-29 06:45:34.31624+00`, snapshot `14658:14658:`, all nine exact Customers had `is_deleted=true` and `deleted_at IS NULL`; 19 linked Services and 17 approved/current quotations were observed, with zero current invoice/payment/credit rows. Relationships overlap M0-01, M0-02, and M0-03 and are not additive exposure.

Three Customers have exact documented synthetic G8 DEV provenance; six are `LIKELY SYNTHETIC / TEST` from generated `CUST-G8-*` cohort evidence without exact historical fixture linkage. Provenance is partly evidenced, but the cause classification for `deleted_at` being null is `UNKNOWN`. All nine deletion times are `BOUNDED BUT NOT EXACT` by `created_at` to trigger-maintained `updated_at`; no Customer deletion audit exists. Financial impact is `UNKNOWN`, with no amount attributed. The mismatch is a metadata inconsistency only; no current operational, financial, or accounting effect is proven. A service_role DELETE grant proves capability, not historical use, and no supported application Customer hard-delete path was found.

Recommended disposition is `MONITOR / PRESERVE EVIDENCE`, pending Mozfer (Owner/Controller) decision before M0 exit or an applicable W11 phase exit. No backfill, reconstruction, restore, cleanup, or waiver is authorized. M0-04 remains open; M0-01 remains closed; M0 overall remains open and W11 remains **NO-GO**.

## 10. Validation and evidence limitations

- Exact final SELECT succeeded: 438 FK checks, required-null scans, nineteen explicit domain checks and nine legacy CHECK evaluations; zero tested row violations.
- Static SELECT-only/getter safety, mirror/parity, retained evidence consistency and whitespace validation precede publication. One fresh independent native OCR Reviewer checks final Writer state; a confirmed repair requires a fresh targeted rereview. Actual results appear in task closeout.
- During the original 26 October read-only inventory pass, zero DB/environment mutation occurred: no DML/DDL, transaction-mode change, grant, bootstrap, fixture, migration/history repair, cleanup, reconstruction, financial correction, rehearsal/shadow write, deployment, tax activation or DEMO/PROD access. The later separately authorized 27 October M0-01 migration/RPC operation is not part of that inventory-pass statement.
- No credentials/authentication material, private logs, browser/shell history, raw audit payload, bank identity values, document storage paths or unnecessary personal data accessed/persisted. Authorized UUID cohorts and aggregate audit metadata only.
- First preflight SELECT hit a transport-closed error; simple read retry succeeded. No write was retried. No broad app suite/build needed for this evidence-only slice.
- No single current snapshot proves August actors/deployment, absent historical amounts or complete action-level auditing. No current catalog check substitutes for professional, Owner real-use or production acceptance.

## Appendix — Exhaustive row/status inventory

“Non-deleted” appears only where deletion fields exist; it does not mean approved/effective/current-version. Historic versions, caches and projections are not summed into current authority.

| Relation | Kind | Rows | Non-deleted | Status distribution (all rows) |
|---|---|---:|---:|---|
| `accounting_account_versions` | table | 33 | — | — |
| `accounting_accounts` | table | 33 | — | — |
| `accounting_ap_bridge_event_versions` | table | 0 | — | — |
| `accounting_ap_bridge_events` | table | 0 | — | — |
| `accounting_ap_bridge_journal_lines` | table | 0 | — | — |
| `accounting_ap_bridge_journal_links` | table | 0 | — | — |
| `accounting_ar_bridge_event_versions` | table | 0 | — | — |
| `accounting_ar_bridge_events` | table | 0 | — | — |
| `accounting_ar_bridge_journal_lines` | table | 0 | — | — |
| `accounting_ar_bridge_journal_links` | table | 0 | — | — |
| `accounting_bank_binding_reviews` | table | 0 | — | — |
| `accounting_bank_binding_versions` | table | 0 | — | — |
| `accounting_bank_bindings` | table | 0 | — | — |
| `accounting_bank_reconciliation_allocations` | table | 0 | — | — |
| `accounting_bank_reconciliation_group_versions` | table | 0 | — | — |
| `accounting_bank_reconciliation_groups` | table | 0 | — | — |
| `accounting_bank_reconciliation_reviews` | table | 0 | — | — |
| `accounting_bank_statement_batch_versions` | table | 0 | — | — |
| `accounting_bank_statement_batches` | table | 0 | — | — |
| `accounting_bank_statement_line_versions` | table | 0 | — | — |
| `accounting_bank_statement_lines` | table | 0 | — | — |
| `accounting_capability_catalog` | table | 17 | — | — |
| `accounting_capability_events` | table | 9 | — | ALLOW: 6; REVOKE: 3 |
| `accounting_expense_bridge_event_versions` | table | 0 | — | — |
| `accounting_expense_bridge_events` | table | 0 | — | — |
| `accounting_expense_bridge_journal_lines` | table | 0 | — | — |
| `accounting_expense_bridge_journal_links` | table | 0 | — | — |
| `accounting_foundation_events` | table | 64 | — | accounting_period_created: 12; accounting_account_created: 33; accounting_profile_updated: 2; accounting_capability_changed: 9; accounting_posting_rule_created: 8 |
| `accounting_inception_acceptances` | table | 0 | — | — |
| `accounting_inception_coverage` | table | 0 | — | — |
| `accounting_inception_coverage_versions` | table | 0 | — | — |
| `accounting_inception_journal_links` | table | 0 | — | — |
| `accounting_inception_mapping_authorizations` | table | 0 | — | — |
| `accounting_inception_package_versions` | table | 0 | — | — |
| `accounting_inception_packages` | table | 0 | — | — |
| `accounting_inception_reviews` | table | 0 | — | — |
| `accounting_journal_events` | table | 8 | — | SAVE_RULE: 8 |
| `accounting_journal_line_versions` | table | 0 | — | — |
| `accounting_journal_versions` | table | 0 | — | — |
| `accounting_journals` | table | 0 | — | — |
| `accounting_period_close_packages` | table | 0 | — | — |
| `accounting_period_close_reviews` | table | 0 | — | — |
| `accounting_period_versions` | table | 12 | — | OPEN: 12 |
| `accounting_periods` | table | 12 | — | — |
| `accounting_posting_rule_mappings` | table | 36 | — | — |
| `accounting_posting_rule_versions` | table | 8 | — | — |
| `accounting_posting_rules` | table | 8 | — | — |
| `accounting_profile_versions` | table | 2 | — | INACTIVE: 1; DEV_PROVISIONAL: 1 |
| `accounting_profiles` | table | 1 | — | — |
| `accounting_revenue_arrangement_reviews` | table | 0 | — | — |
| `accounting_revenue_arrangement_versions` | table | 0 | — | — |
| `accounting_revenue_arrangements` | table | 0 | — | — |
| `accounting_revenue_performance_evidence` | table | 0 | — | — |
| `accounting_revenue_performance_evidence_reviews` | table | 0 | — | — |
| `accounting_revenue_performance_evidence_versions` | table | 0 | — | — |
| `accounting_revenue_performance_unit_versions` | table | 0 | — | — |
| `accounting_revenue_performance_units` | table | 0 | — | — |
| `accounting_revenue_recognition_events` | table | 0 | — | — |
| `accounting_revenue_recognition_journal_lines` | table | 0 | — | — |
| `accounting_revenue_recognition_journal_links` | table | 0 | — | — |
| `accounting_source_effects` | table | 0 | — | — |
| `accounting_statement_mapping_entries` | table | 24 | — | — |
| `accounting_statement_mapping_sets` | table | 1 | — | — |
| `accounting_statement_mapping_versions` | table | 1 | — | — |
| `app_user_permission_overrides` | table | 0 | — | — |
| `app_users` | table | 2 | — | — |
| `approved_billing_scope_items` | table | 22 | — | accepted: 22 |
| `approved_billing_scopes` | table | 21 | — | approved: 21 |
| `approved_commitment_amendments` | table | 0 | — | — |
| `approved_commitment_balances` | view | 2 | — | open: 2 |
| `approved_commitment_documents` | table | 0 | — | — |
| `approved_commitments` | table | 2 | — | open: 2 |
| `audit_logs` | table | 254 | — | — |
| `business_document_links` | table | 4 | — | — |
| `business_documents` | table | 8 | — | — |
| `cash_advance_expense_settlements` | table | 0 | — | — |
| `cash_advance_returns` | table | 0 | — | — |
| `company_settings` | table | 1 | — | — |
| `customer_credit_adjustment_balances` | view | 2 | — | — |
| `customer_credit_application_reversals` | table | 0 | — | — |
| `customer_credit_applications` | table | 0 | — | — |
| `customer_credit_balances` | view | 2 | — | — |
| `customer_internal_credit_adjustment_reversals` | table | 0 | — | — |
| `customer_internal_credit_adjustments` | table | 2 | — | — |
| `customer_invoice_receivable_balances` | view | 6 | — | paid: 1; sent: 2; draft: 3 |
| `customer_invoice_settlement_balances` | view | 6 | — | paid: 1; sent: 2; draft: 3 |
| `customer_receipt_allocation_reversals` | table | 0 | — | — |
| `customer_receipt_allocations` | table | 1 | — | — |
| `customer_receipt_balances` | view | 0 | — | — |
| `customer_receipt_reversals` | table | 0 | — | — |
| `customer_refund_reversals` | table | 0 | — | — |
| `customer_refunds` | table | 1 | — | — |
| `customer_report_metrics` | view | 12 | — | — |
| `customers` | table | 21 | 12 | active: 21 |
| `employee_cash_advances` | table | 1 | — | issued: 1 |
| `event_cost_budgets` | table | 2 | — | — |
| `event_cost_close_reopenings` | table | 0 | — | — |
| `event_cost_close_versions` | table | 0 | — | — |
| `event_cost_etc_forecasts` | table | 2 | — | — |
| `event_milestones` | table | 1 | — | planned: 1 |
| `expense_accountability_summaries` | view | 7 | — | approved: 5; submitted: 2 |
| `expense_documents` | table | 4 | — | — |
| `expense_evidence_exceptions` | table | 2 | — | — |
| `expense_reimbursement_settlements` | table | 0 | — | — |
| `expenses` | table | 7 | — | approved: 5; submitted: 2 |
| `invoice_draft_update_mutations` | table | 4 | — | — |
| `invoice_items` | table | 0 | — | — |
| `invoices` | table | 6 | 6 | paid: 1; sent: 2; draft: 3 |
| `number_sequences` | table | 11 | — | — |
| `payments` | table | 1 | 1 | confirmed: 1 |
| `petty_cash_funds` | table | 1 | — | active: 1 |
| `petty_cash_transactions` | table | 2 | — | — |
| `project_tasks` | table | 0 | — | — |
| `projects` | table | 0 | 0 | — |
| `quotation_items` | table | 85 | — | — |
| `quotations` | table | 33 | 33 | draft: 10; approved: 23 |
| `service_lifecycle_states` | table | 32 | — | — |
| `service_procurement_candidate_documents` | table | 1 | — | — |
| `service_procurement_candidates` | table | 3 | — | — |
| `service_procurement_package_requirements` | table | 13 | — | — |
| `service_procurement_packages` | table | 4 | — | selected: 4 |
| `service_procurement_requirements` | table | 1 | — | — |
| `service_receipt_corrections` | table | 0 | — | — |
| `service_receipt_documents` | table | 0 | — | — |
| `service_receipts` | table | 1 | — | ACCEPTED: 1 |
| `service_supplier_allocations` | table | 0 | 0 | — |
| `service_tasks` | table | 1 | — | completed: 1 |
| `services` | table | 32 | 13 | Quoted: 9; Inquiry: 2; Approved: 19; Completed: 1; Deposit Paid: 1 |
| `supplier_advance_allocation_reversals` | table | 0 | — | — |
| `supplier_advance_allocations` | table | 0 | — | — |
| `supplier_advance_authorization_documents` | table | 1 | — | — |
| `supplier_advance_authorization_releases` | table | 0 | — | — |
| `supplier_advance_balances` | view | 1 | — | authorized: 1 |
| `supplier_advance_commitment_balances` | view | 2 | — | — |
| `supplier_advance_payment_documents` | table | 0 | — | — |
| `supplier_advance_payment_reversals` | table | 0 | — | — |
| `supplier_advance_payments` | table | 0 | — | — |
| `supplier_advance_refund_documents` | table | 0 | — | — |
| `supplier_advance_refunds` | table | 0 | — | — |
| `supplier_advances` | table | 1 | — | — |
| `supplier_bill_documents` | table | 1 | — | — |
| `supplier_bill_payment_balances` | view | 1 | — | — |
| `supplier_bills` | table | 1 | — | approved: 1 |
| `supplier_bookings` | table | 0 | 0 | — |
| `supplier_payment_documents` | table | 1 | — | — |
| `supplier_payment_reversals` | table | 1 | — | — |
| `supplier_payments` | table | 1 | — | — |
| `supplier_quotation_documents` | table | 1 | — | — |
| `supplier_quotation_lines` | table | 0 | — | — |
| `supplier_quotation_requirements` | table | 3 | — | — |
| `supplier_quotations` | table | 3 | — | — |
| `supplier_rate_cards` | table | 0 | 0 | — |
| `suppliers` | table | 10 | 10 | active: 10 |

## 19. Completed G8 Owner-authorized attempt — 28 October 2026

Pre-apply baseline was `main` / `HEAD` / `origin/main` / live remote `main` at `03730fe06a570f4597028d7b9d079d6a7456cbda`. Fresh DEV preflight at 2026-10-28 11:49:29.954990+00 matched the fixed Service/quotation/ABS identities, active approved SAR 800.00 authority, one expected item digest, soft-deleted `Completed` Service, approved/current quotation, and zero links across all 90 downstream paths. Migration history records `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement` on DEV `dpddrqjzqohexixgdqiq`.

The single authorized call to the fixed RPC failed during its audit insert with SQLSTATE `23514`; the existing `audit_logs_action_check` rejects action `owner_authorized_remediation`. PostgreSQL rolled back the transaction. Read-only postflight shows one active target ABS, zero retired target ABS, zero exact remediation audit events, zero invoice rows, and zero nonzero downstream paths. `all_checks_pass=false` because the target retirement did not occur.

The pre/post preservation snapshots match for target Service/lifecycle/Customer/quotation, preserved ABS fields and item snapshot, pre-existing audit evidence, all 14 prior repairs, both M0-02 cases, and all 14 M0-03 audit references. M0-03 still has zero source invoice rows. No business-data mutation persisted. G8 verification provenance remains `VERIFIED`; historical Completed mechanism and financial impact remain `UNKNOWN`; SAR 800.00 is commercial authority only. M0-01 closure evidence is **NOT SATISFIED**; M0 exit remains unsatisfied and W11 remains **NO-GO**.

**Historical exact next action after the first attempt (28 October; superseded by section 20):** Require a new Owner/Controller authorization before any corrective migration or subsequent RPC attempt.

## 20. Completed G8 corrective migration and single retry — 29 October 2026

The first attempt recorded in section 19 failed atomically on `audit_logs_action_check` and remains immutable historical evidence. Under the new Owner authorization, one corrective migration was applied to DEV `dpddrqjzqohexixgdqiq` through the migration-aware Supabase workflow. Immediate history records `20261029050635 / 20261029045141_w11_m0_01_completed_g8_audit_action_compatibility`, after the original `20261028114736 / 20261028113055_w11_m0_01_completed_g8_abs_retirement`. The migration changed only the fixed RPC and its existing EXECUTE metadata; it retained `status_change`, did not widen the audit constraint, and did not execute business-data DML.

A fresh pre-apply SELECT-only preflight at `2026-10-29 05:06:23.238412+00` passed for the exact Service, quotation, ABS, expected Customer/lifecycle, current approved SAR 800.00 quotation, active version-1 ABS and item digest, one original approval audit, no unexpected remediation event, and zero nonzero paths across all 90 downstream guards. The targeted independent read-only review was `CLEAN`. After apply, live checks confirmed the RPC signature, postgres owner, SECURITY DEFINER, pinned search_path, service_role-only execution, unchanged audit constraint, and three existing ABS triggers.

Exactly one new RPC attempt was made at `2026-10-29 05:07:10.156770+00` and returned `retired_count=1, idempotent_replay=false`. No second attempt occurred. Fresh postflight passes: exactly one target retired, zero active target ABS, one exact `status_change` remediation audit, two total ABS audit rows, zero invoice rows or invoice-created references, and zero nonzero downstream paths. All fourteen prior repairs remain intact. Before/after preservation fingerprints match for target protected fields and item snapshot, the fourteen prior repairs, both M0-02 cases, and all fourteen M0-03 references; M0-03 still has zero source invoice rows.

At the 29 October postflight cutoff, before the later Controller verdict recorded in Section 21, G8 synthetic provenance was `VERIFIED`; historical Completed mechanism and financial impact were `UNKNOWN`; SAR 800.00 was commercial authority only. M0-01 closure was not yet recorded in that snapshot. M0-02/M0-03 remained `MONITOR / PRESERVE EVIDENCE`, M0-04 and other applicable gates remained unresolved, and W11 stayed **NO-GO**.

## 21. Controller final M0-01 closure verdict — 29 October 2026

**Controller verdict:** `M0-01 = CLOSED`
**Task Verdict:** `PASS`

The Controller records closure from the completed and published evidence: the original active ABS cohort contained 15 authorities; 14 Approved-Service authorities were retired through the prior governed remediation and verified, and the final Completed G8 authority was retired through the separately authorized governed corrective path and verified. Current residual active ABS authority in the original cohort is zero; no original-cohort ABS row is missing, and all governed historical records remain preserved.

The final Completed G8 Service remains historically `Completed` and soft-deleted; its quotation remains approved/current at SAR 800.00. No invoice was reconstructed, and the repair created no payment, receipt, credit, revenue, receivable, journal, or accounting fact. The final remediation produced exactly one compatible remediation audit. All 90 downstream guard paths remained clear, all 14 prior repairs remain intact, and M0-02/M0-03 evidence is unchanged.

Preserve exactly these classifications: G8 DEV verification provenance `VERIFIED`; exact historical mechanism producing `Completed` `UNKNOWN`; historical financial impact `UNKNOWN`; SAR 800.00 is commercial authority only. No zero-impact, cancellation, reversal, write-off, or known-mechanism inference is made.

M0-01 closure covers only the original current-authority inconsistency. M0 overall remains open. M0-02/M0-03 remain `MONITOR / PRESERVE EVIDENCE`; M0-04 remains unresolved and unstarted; other applicable M0/W11 gates remain open. W11 remains **NO-GO**.

**EXACT NEXT ACTION:** Controller identifies the smallest remaining applicable M0/W11 blocker after M0-01 closure. Do not start remediation automatically.
