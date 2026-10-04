# W11A — Cutover Readiness & G7 Proof Contract

**Status:** W11A documentation slice complete; W11 cutover and real-use proof are **NO-GO**.
**Evidence date:** 4 October 2026.
**Verified repository baseline:** `8e70e21b69837f2b67134533e941432b90a4cedc`.
**Read-only database target:** DEV project `dpddrqjzqohexixgdqiq`.

## 1. Scope and decision

Mozfer authorized W11A readiness planning, Layer 1 proof planning, bounded documentation updates, repository and DEV read-only reconciliation, and normal reviewed fast-forward publication of this documentation task. That authority does not authorize database changes, migration creation or application, data seeding/backfill, deployment, production activation, accounting activation, tax or ZATCA activation, or implementation of residual Layer 1 capabilities.

The current DEV project is `ACTIVE_HEALTHY`. A fresh DEV type generation exactly matches the checked-in `public` contract: 140 tables, 11 views, and 212 functions. The five W7-P0A migration identities listed in the current status record are present in the DEV migration list. This reconciliation read project/schema/migration metadata only; it did not read business rows or protected logs.

W11A establishes an evidence contract. It does not execute M0–M6, a rehearsal, a cutover, or a G7 real-use journey. The current cutover result is **NO-GO** because all eight residual gates remain open and W7-P0B Owner acceptance is pending. This status does not reopen completed slices or claim that all Layer 1 behavior is absent.

The [Layer 1 Technical Master Plan](g7-layer1-technical-master-plan.md) remains the source for M0–M6 and the original R01–R08 gate definitions. Its Section 15.1 delivery wording is dated 7 September 2026. The [current project status](../project-status.md) and present source/DEV contract are used below to reconcile delivery. The dated snapshots are preserved unchanged.

## 2. Current Layer 1 delivery and Owner-acceptance ledger

This ledger separates recorded delivery from Owner acceptance. A published or DEV-verified implementation does not imply manual acceptance, professional sign-off, production authority, or W11 real-use proof.

| Wave / slice | Current repository record | Owner-acceptance record and W11 consequence |
|---|---|---|
| W1 Authority Foundation | W1A/W1C are recorded complete; W1B is recorded not required for that wave. The delivered Action Center is a bounded source-derived surface. | The roadmap records W1 `PASS` after Owner acceptance. This is acceptance of W1's bounded slice, not the open Event task gate R05. |
| W2 Commercial Authority | W2A/W2B/W2C are recorded as accepted/closed. W2C persists fixed-SAR deterministic discount allocation. Later W7-P0A/P0B add approved commercial amendment capability. | Prior W2 slice acceptance remains intact. It does not close percentage discount R01 or the current W7-P0B manual acceptance gate. |
| W3 Event Operations | Service/Event container and lifecycle are delivered; the broader Event Brief, tasks, milestones, issues, and team/resource capabilities remain residual gates. | W3 lifecycle English/Arabic/RTL/mobile acceptance is recorded as PASS. That acceptance does not cover the five undelivered Event work-management gates. |
| W4 Procurement & Commitments | W4 is recorded `CLOSED / COMPLETED`, DEV-verified, with bounded packages, supplier quotations, commitments, and service receipts. | The W4 record cited here establishes engineering closeout; it does not supply a separate W11 real-use acceptance record. Supplier booking is not Event team/resource planning. |
| W5 Expenses & Cash | W5 is recorded closed/complete; W5A foundation and W5B bounded employee expense self-service are delivered. | Owner acceptance is recorded for the bounded W5B slice, including handheld testing. This is not broad W11 acceptance. |
| W6 Accounts Payable | W6A supplier bills, W6B supplier payments, and W6C supplier advances are recorded closed, published, DEV-verified, and Owner-accepted. | The recorded W6 acceptance does not close any of R01–R08 or authorize accounting activation. |
| W7 Accounts Receivable | W7 remains `ACTIVE / NOT COMPLETE`. W7A is closed. W7-P0A is published and DEV-verified; W7-P0B is implemented, reviewed, DEV-verified, and published. W7B has not started. | W7-P0B Owner manual acceptance and Controller closeout remain pending. W7B stays gated. R02/R03 have current code evidence but remain open pending this acceptance. |
| W8 Event Costing | W7–W9 are recorded published in the W10 foundation status record. Current supplier allocation estimates and Event Costing read paths do not by themselves complete every target costing or event work-management objective. | No separate W8 Owner manual-acceptance state is asserted by this W11A reconciliation. No W11 proof is implied. |
| W9 Dashboards & Reports | W9 is recorded closed, complete, published, and Owner-accepted in G7-OD-28. Reports and Action Center remain derived from their authorized source workflows. | Existing W9 acceptance stands. R05 remains open because a derived Action Center is not a first-class Event task system. |
| W10 Accounting Foundation | W10H and W10I are recorded published and Owner-accepted; W10I is explicitly accepted by Mozfer. W10B is also recorded Owner-accepted. Other W10 slices retain their recorded bounded states. | G7-OD-28 keeps professional review mandatory before live/production accounting, statutory/external claims, tax/VAT/ZATCA, regulatory use, and irreversible cutover. W10 acceptance is not professional sign-off. |
| W11 | W11A is this read-only readiness/proof contract. No W11 execution slice had started at the baseline. | The current Owner authority is limited to W11A planning/docs and reviewed publication. No cutover, production, or real-use acceptance is claimed. |

Evidence references: [current status](../project-status.md), [current roadmap](../project-roadmap.md), [G7-OD-28 decision register](event-erp-decision-register.md), and the W11 plan in this document's linked Technical Master Plan. These records preserve earlier acceptances; W11A does not replay them or infer unrecorded acceptance.

## 3. L1-R01 through L1-R08 current reconciliation

Each row has exactly one gate classification. `OPEN` means the capability or its required acceptance evidence is not complete for W11. The evidence column distinguishes current implementation from the remaining gate.

| Gate | Classification | Current implementation evidence | Remaining closure evidence |
|---|---|---|---|
| **L1-R01 — Percentage discount** | **OPEN** | [`quotations/schemas.ts`](../../src/lib/quotations/schemas.ts) models `discount` as a nonnegative number. [`discount-allocation-contract.test.ts`](../../src/lib/quotations/discount-allocation-contract.test.ts) verifies fixed-SAR proportional largest-remainder allocation at halala precision and persisted projection. | A separately authorized percentage-discount contract and implementation, deterministic allocation and rounding tests, approval/ABS equality, financial reconciliation, independent review, and Owner workflow/language acceptance. Fixed-SAR behavior remains unchanged. |
| **L1-R02 — Change Orders / post-approval commercial correction** | **OPEN** | [`quotations/actions.ts`](../../src/lib/quotations/actions.ts) implements `createApprovedCommercialAmendment` and `approveApprovedCommercialAmendment`; the [commercial amendment contract tests](../../src/lib/quotations/commercial-amendment-contract.test.ts) cover the current RPC boundary. Current status records W7-P0B implemented/reviewed/DEV-verified/published. This supersedes the dated September “not delivered” wording for the code portion. | Mozfer's bounded authenticated W7-P0B Owner acceptance and Controller closeout remain pending. Preserve source Approved quotation, customer reapproval, invoice/payment history, exact replay/conflict behavior, and correction lineage in that acceptance. |
| **L1-R03 — ABS supersession / reapproval** | **OPEN** | The same W7-P0A/P0B path atomically approves a successor quotation and supersedes quotation/ABS authority. The commercial amendment contract test checks supersession columns, approval RPC, service-role grant, and current recovery migrations. Current DEV migration metadata contains the five W7-P0A migration identities in [project status](../project-status.md). | Close only with W7-P0B Owner acceptance/Controller closeout plus source-to-successor quotation, ABS, invoice exposure, and payment-lineage reconciliation. No historical approved snapshot may be silently rewritten. |
| **L1-R04 — Event Brief** | **OPEN** | Current product uses Service as the Event container and has Service/event fields and lifecycle. Current repository source/migration search and the fresh DEV public contract expose no first-class Event Brief implementation/entity. | A bounded Event Brief contract, source authority and permissions, migration only if required, representative source-linked workflow tests, EN/AR/RTL/responsive acceptance, and Owner acceptance. |
| **L1-R05 — Event tasks** | **OPEN** | W1C provides a derived Action Center. [`dashboard/queries.test.ts`](../../src/lib/dashboard/queries.test.ts) verifies bounded quotation-approval work derived from the quotation workflow; the master plan bounds W1C to existing source-linked slices. Current source/DEV contract evidence shows no first-class Event task system. | A separately authorized Event task contract with explicit Service/Event linkage, ownership, status and audit rules; prove source authority and permission behavior, and avoid duplicate/generic workflow authority. Add migration only if required; test and accept the real G7 task journey. |
| **L1-R06 — Event milestones** | **OPEN** | Service lifecycle/readiness transitions and a status timeline are implemented. The current Service lifecycle source and DEV contract do not expose a separate Event milestone ledger. | A separately authorized milestone contract with named templates, owners, dates, completion evidence, audit and correction rules; prove its relationship to Service lifecycle without conflating readiness, execution, completion, or financial close. |
| **L1-R07 — Event issues** | **OPEN** | Service receipts capture `defectsIncidents`, missing/extra scope, acceptance, and governed correction in [`commitment-receipt-schemas.ts`](../../src/lib/procurement/commitment-receipt-schemas.ts) and [`commitment-receipt-types.ts`](../../src/lib/procurement/commitment-receipt-types.ts). That evidence is receipt-specific; current source/DEV contract evidence shows no broader Event issue case-management capability. | A separately authorized issue contract for Event-wide issue identity, severity, owner, state, evidence, escalation and audit; prove it does not duplicate receipt correction authority, and validate the end-to-end operational issue journey. |
| **L1-R08 — Team / Resources** | **OPEN** | Supplier Allocation and Supplier Booking workflows exist for supplier planning. The current repository/DEV contract evidence shows no Event team roster, staff assignment, resource capacity, or availability-management workflow. | A separately authorized team/resource contract with role, assignment, availability/capacity, change/audit and permission rules; keep supplier booking distinct and prove representative Event staffing/resource workflows. |

R02/R03 are deliberately classified `OPEN`: the current implementation is present, while the status record explicitly leaves W7-P0B manual acceptance and Controller closeout pending. R01 and R04–R08 remain open on capability evidence. No R gate is classified `PROVEN CLOSED` or `UNKNOWN` in this reconciliation.

Each gate requires its own authorized contract, one Writer, focused regression evidence, independent review, and required Owner workflow/language acceptance. Schema work also requires independent migration review, exact environment authority, apply, and reconciliation. This packet authorizes none of those implementation or database steps.

## 4. W11 cutover sequence — M0–M6

The following is an execution contract for a future separately authorized domain cutover. It is not a migration or an instruction to start one.

| Phase | Required work product and exit evidence |
|---|---|
| **M0 — Inventory and invariants** | Freeze the source snapshot/cutoff, query versions, scope, row and status counts, required-null checks, orphan and duplicate checks, active-record uniqueness, exact monetary totals, audit coverage, and source-to-snapshot links. Record known exceptions with an owner and decision deadline. Exclude credentials and private log payloads. |
| **M1 — Additive schema, where applicable** | Add only the target structures required by a reviewed contract. Use additive, nullable or safely defaulted changes; preserve legacy identifiers, statuses, snapshots and writers. The reviewed migration must state forward behavior, privilege/RLS effects, locking risk, replay/idempotency, verification SQL, generated-type refresh, disable path, and rollback/restore procedure. No schema change is needed merely to perform read-only reconciliation. |
| **M2 — Deterministic backfill and exceptions** | Map only facts derivable from preserved source records. Use stable source IDs and documented deterministic ordering. Ambiguous status, authority, approval, obligation, receipt, allocation, revenue, cost, or accounting facts go to a named exception inventory for Owner or professional decision. Never infer a business fact from a convenient status label. |
| **M3 — Shadow reconciliation** | Read the target projection without moving source write authority. Compare row/status counts, IDs/relationships, uniqueness, totals by currency/status/period, source-to-derived calculations, and sampled record timelines. Differences are exact at stored precision. No unexplained balancing entry or silent rounding is accepted. |
| **M4 — Compatibility period** | Read target projections only behind an explicit feature/config gate while writes remain on the approved source path. Record read parity, errors, freshness and exceptions. Avoid indefinite dual-write; every compatibility seam needs an owner, source boundary, and removal criterion. |
| **M5 — Controlled domain-by-domain cutover** | Cut over one named domain at a time, after DEV/DEMO rehearsal, independent migration review where relevant, tested backup/restore, reconciliation, Owner workflow acceptance, applicable professional sign-off, communications/support readiness, and separate explicit authority for that exact environment. Freeze only the affected mutation surface for the proven minimum interval. |
| **M6 — Post-cutover proof and stabilization** | Repeat M0/M3 counts, totals and lineage checks; inspect every exception; verify grants/permissions; run representative English and Arabic/RTL/mobile workflows and reports/exports; retain rollback capability for the predeclared stabilization window. Remove legacy paths only in a later reviewed change after usage evidence. |

## 5. Reconciliation evidence contract

Every reconciliation packet must identify the exact environment, snapshot/cutoff, source and target schema/migration versions, query/checksum, currency and period basis, counts/totals, exceptions, reviewer, and Owner decision. Use the same scope and cutoff on both sides.

| Domain | Required measurable comparison |
|---|---|
| Customer / Service / Event | Counts by lifecycle/status; required-link null counts; orphan customer/service links; duplicate business identifiers; event date and source identity mapping; audit actor/action/time/request lineage. Do not infer execution readiness from payment state alone. |
| Quotations / commercial authority | Counts by status and revision family; current Approved authority per Service; line/item counts; discount and totals; source/successor and ABS links; duplicate active authority checks; invoice exposure ceiling; approval/reapproval and replay keys. Preserve issued/approved snapshots and source IDs. |
| Billing / settlement | Issued, active, voided/cancelled, paid, outstanding and allocated/unapplied counts and totals by currency/status/period; invoice-item to invoice totals; payment and receipt to allocation totals; customer/service lineage; duplicate or orphan references. Preserve deposit, progress, final, receipt, allocation, credit and refund as distinct states. |
| Procurement / AP | Package/requirement, supplier quotation, supplier allocation/booking, approved commitment/amendment, service receipt/acceptance/correction, supplier bill/payable/payment counts and totals; commitment-to-receipt-to-bill lineage; duplicate source and replay identities; per-Service outstanding obligation totals. |
| Expenses / advances / petty cash | Counts by claim/fund/settlement state; submitted, approved, returned, allocated, disbursed and settled amount totals; source-to-settlement links; evidence completeness; submitter/reviewer separation; orphan and duplicate request IDs. |
| Event costing / reports | Recompute each displayed aggregate from the authoritative budget, commitment, receipt, expense and allocation sources in scope; preserve estimate/actual/ETC/EAC/final distinctions; reconcile filters/as-of cutoffs and permission-redacted values. Managerial margin is not accounting profit. |
| Accounting proof lab, if in the authorized scope | Counts and status totals for profiles, periods, journals, lines, source effects and reconciliation evidence; exact debit/credit equality per journal and period; subledger-to-control totals; account/service/source lineage; as-of cutoffs; reversals and replay conflicts. Label all non-production outputs provisional. |

For every domain:

- Required null, orphan, duplicate, conflicting-active-authority, and missing-audit counts must be zero. Optional nulls must have an explicit contract reason and count.
- Compare counts by status and source identity before and after mapping; list every status translation and rejected row.
- Sum amounts at the stored source precision and group by currency, status, and period. Use integer halala for fields stored that way and exact two-decimal SAR where that is the source contract; never convert through floating-point approximations for acceptance.
- Prove derived totals from source rows and preserve identifiers and effective dates. Every exception must identify the source record, target record if present, amount/status delta, cause, accountable resolver, and disposition evidence.
- Require zero unexplained variance. Explicitly accepted exceptions remain listed with Owner, rationale, amount/count, expiry or follow-up date, and the surface they block; they are not balancing plugs.
- Reconcile audit continuity using the existing actor/action/timestamp/request and source references. Do not invent a hash-chain or claim immutable properties the current audit contract does not provide.

## 6. Backup, restore, rollback, and recovery proof

Before any future apply or cutover, the exact environment authority packet must name the recoverable backup/snapshot, creation time and consistency point, protected-storage location, retention window, restore owner, and the tested restore destination. Do not place credentials or private connection strings in the packet.

The rehearsal must restore into an isolated authorized non-production target and prove that the restored application/schema/migration state is usable; compare row/status counts, exact totals, identifiers, audit coverage and representative workflows to the backup manifest. Record restore start/end times and measured recovery point/time. Owner and Operations must approve the RPO/RTO thresholds before execution; this W11A document invents no numeric threshold.

The rollback packet must specify the feature/config disable action, the last authoritative writer, migration reversibility or forward-repair decision, affected write freeze, data captured during the compatibility window, restoration steps, reconciliation queries, responsible operator and stop conditions. A destructive reverse migration is not presumed safe. If tested restore or a non-destructive rollback path is unavailable, the domain is NO-GO.

Trigger rollback/stop on any unexplained count or amount difference, lost/duplicate source lineage, audit discontinuity, unexpected permission widening, failed restore proof, unauthorized write path, or critical workflow failure. Preserve evidence and exceptions; do not repair the discrepancy with invented rows or balancing entries.

## 7. DEV / DEMO rehearsal contract

No rehearsal, seed, business-row query, or fixture was run in W11A. DEV metadata verified the authorized project is active and the generated public contract matches the checked-in types. DEMO identity/existence was not inspected under this DEV-only read scope; verify and name a DEMO project separately before any DEMO plan is executed.

For a future separately authorized rehearsal:

1. Freeze a DEV snapshot and reviewed artifact manifest; use synthetic identities and clearly synthetic records only.
2. Run the same deterministic inventory and backfill plan twice from equivalent clean restores; target IDs, status mappings, totals, and exception classification must match exactly.
3. Test each success, rejection, replay, concurrency, permission-denied, partial-failure, retry, and rollback path identified by the reviewed contract.
4. Compare pre/post row counts, monetary totals, audit continuity and migration state. Roll back or restore the rehearsal; independently query synthetic identifiers and require zero residue while verifying pre-existing DEV aggregates remain unchanged.
5. Repeat in DEMO only after its exact identity, synthetic-data safety, backup/restore plan, and fresh environment authority are recorded. DEV evidence never substitutes for DEMO or production evidence.

No customer or supplier business data should be copied to a test environment unless separately approved and minimized. No production snapshot is permitted by this W11A authority.

## 8. G7 real-use proof journeys

These journeys define evidence for a later authorized acceptance run. W11A performed no browser, mobile, print, PDF, export, or authenticated real-use testing. Mozfer owns manual workflow, visual, language, RTL and device acceptance; automated checks prepare evidence but do not substitute for it.

| Journey | Roles / authorization and financial trace | Presentation evidence to collect |
|---|---|---|
| Customer → Service → Event lifecycle | Customer/Service identity and event facts; role-allowed create/read/update; denied direct route/actions; quotation and lifecycle source links; cancellation/readiness preconditions and audit trail. | EN and AR with natural RTL; desktop and handheld; empty/loading/error/unauthorized states; Service activity context. |
| Quotation → approval → commercial amendment | Sales drafts linked to the correct Service/customer; Manager/Admin approval; Authority Line/component/add-on and fixed discount totals; W7-P0B successor, customer reapproval, superseded source and ABS; immutable historical invoice/payment evidence. | EN/AR/RTL; desktop/mobile quotation workspace; customer quotation PDF/print; approval and amendment states; exact value display and no supplier-cost disclosure. |
| Invoice → receipt/payment → allocation and receivables | Approved commercial authority to invoice; deposit/progress/final amount basis; issued snapshot; payment/receipt allocation and unapplied balance; AR ageing/as-of result; role and separation-of-duties denials. | EN/AR/RTL; desktop/mobile invoice/payment workflows; invoice PDF/print; report/export parity; source drill from each total to invoice/payment/allocation. |
| Procurement → commitment → receipt → supplier AP | Package and supplier quotation selection; selected supplier distinct from commitment; approver/amendment; delivery/receipt acceptance and correction; bill, payable and supplier payment trace; no self-review. | EN/AR/RTL; Service and procurement workspaces; mobile receipt/evidence capture where supported; printed/exported artifacts only where the product exposes them. |
| Expense / advance / petty-cash accountability | Employee submission, evidence, finance approval, SoD denial, funding-path exclusivity, return/settlement, and source-to-balance trace. | EN/AR/RTL; desktop and handheld submission; camera/evidence path where supported; review and safe error states. |
| Event cost and operational reporting | Event/Service source to estimate, approved budget, commitment, receipt/actual, ETC/EAC and report filters; role-redacted cost/margin; managerial figures clearly separate from accounting truth. | EN/AR/RTL; desktop and mobile report use; print/export parity where available; each number drills to current authorized source evidence. |
| Accounting proof lab and statements | Authorized provisional DEV accounting examples only; journal/source/reversal links, exact precision, GL/TB/report cutoff, close evidence and permission denials. | EN/AR/RTL; desktop/mobile where supported; export/PDF parity where provided. Label provisional and prohibit statutory/external claims. |
| Access and Action Center | Role-specific allowed/denied tasks, server-side authorization, unavailable versus empty states, source record ownership, no hidden privileged action or cross-customer data. | EN/AR/RTL; desktop and mobile; keyboard/focus and accessible names; secure links and localized error states. |

For each journey record build/version, environment, role, locale/direction, viewport/device/browser, source and resulting record IDs, authorization result, exact financial/source lineage, screenshots or print/export samples where allowed, defects, owner decision, and evidence owner. Redact personal/sensitive fields in retained evidence. Do not report an untested surface as passed.

## 9. Training, support, and stabilization evidence

Before a future M5 domain cutover, name affected roles, trainers, support owner/on-call route, escalation severity definitions, operating hours, customer/crew communication owner, support duration, approved rollback decision-maker, and source-of-truth instructions. Provide role-specific English and Arabic materials, including the operational exception path and permission boundary; record attendance and a task-based comprehension check without storing credentials or unnecessary personal details.

The Owner-approved stabilization window and check cadence must be fixed before M5. At each checkpoint record source/target row and status counts, exact monetary deltas, unresolved exception count/value by severity and owner, failed/replayed/denied operation counts, audit-link coverage, support ticket severity, workflow completion and rollback readiness. Exit requires zero unexplained variance, zero unresolved cutover-blocking exceptions, no open critical/high-impact workflow or security defect, current backup/restore path, and explicit Owner sign-off. Thresholds and duration not stated in current policy remain decisions to obtain; W11A does not set them by assumption.

## 10. Professional and environment authority gates

| Gate | Required before | Current state / authority consequence |
|---|---|---|
| **PR-ACC** | Live/production accounting, chart/posting/close activation, statutory or external accounting claims, irreversible accounting cutover. | G7-OD-28 permits provisional proof-lab accounting in DEV under separate task authority. Qualified professional validation remains mandatory for the listed live/statutory/irreversible uses and is not complete. |
| **PR-REV** | Revenue recognition or accounting-revenue reports. | Accountant must map G7 contracts/performance obligations and recognition policy; no invoice/cash inference. Not complete. |
| **PR-TAX** | VAT calculation, Tax Invoice, tax notes or filing. | Registration/status/number and Saudi tax professional validation are required. VAT remains inactive; not complete. |
| **PR-ZATCA** | FATOORA generation/integration or compliance claim. | Applicable wave/status, official requirements, security design, test environment, professional review and explicit activation required. Inactive; not complete. |
| **PR-CASH** | Bank import/reconciliation, payment file or destination automation. | Finance and security review, dual control, destination checks, reconciliation and secret handling required. No bank integration authority here. |
| **PR-SEC** | New sensitive-field policy, privileged RPC, external integration or bulk export. | Threat/data-flow review, least privilege, logging/privacy treatment and fail-closed tests required. Each future change is separately scoped. |
| **PR-A11Y** | Accessibility-conformance claim. | WCAG 2.2 AA audit plus Mozfer EN/AR/RTL/mobile manual evidence required. Planning a journey is not conformance. |
| **PR-PROD** | Any production migration, deployment or activation. | Separate exact Owner production authority, tested backup/restore, monitoring, rollback, support and reconciliation sign-off required. No production authority is granted by W11A. |

Preserve [G7-OD-28](event-erp-decision-register.md): DEV proof-lab accounting may exist provisionally; professional validation is mandatory before live/production accounting, statutory/external claims, tax/VAT/ZATCA, regulatory use, or irreversible cutover. No professional sign-off is supplied by an agent or this document.

## 11. W11 action authority matrix

| Action class | Current status |
|---|---|
| **Executable now under W11A authority** | Repository and DEV metadata read-only reconciliation; readiness/proof planning; this bounded documentation update and its reviewed publication. |
| **Requires fresh Owner environment authority** | Any business-row query beyond the authorized evidence boundary; synthetic seed/fixture; DEV/DEMO migration, schema, grant, RLS, RPC or data mutation; rehearsal execution; real-data backfill; deployment, production access, cutover or activation. Name the exact project and operation. |
| **Requires professional validation** | PR-ACC, PR-REV, PR-TAX, PR-ZATCA, PR-CASH, PR-SEC, PR-A11Y or PR-PROD uses described above. G7-OD-28 narrows only the precondition for provisional DEV proof-lab accounting. |
| **Blocked by an open Layer 1 delivery gate** | Claiming full Layer 1/W11 proof or cutting over a domain that depends on any open R01–R08 gate. R02/R03 also await W7-P0B Owner acceptance/Controller closeout. |

## 12. Explicit W11 go/no-go criteria

**GO for a named future phase only when all applicable conditions hold:**

1. The target domain and exact environment are named under fresh Owner authority; prior baseline and predecessor exit evidence are verified.
2. Every R gate required by that domain is `PROVEN CLOSED` with implementation, review, reconciliation and required Owner acceptance evidence. W11 cannot claim complete Layer 1 proof while R01–R08 remain open.
3. M0 inventory is frozen; all required null/orphan/duplicate/authority checks pass; source and target totals reconcile at exact stored precision; every exception is resolved or explicitly accepted with owner, reason, scope and expiry.
4. The additive migration, if any, is independently reviewed; deterministic backfill and failure/replay paths are proven; backup restore and rollback are rehearsed.
5. Shadow reconciliation has zero unexplained count, status, source-lineage or monetary variance; no balancing plug or fabricated business fact is used.
6. Applicable professional gates are closed; role/permission tests and support/training readiness are proven; Owner accepts required English/Arabic/RTL/mobile and document/export journeys.
7. A stop/rollback authority, stabilization window, measurement cadence, monitoring owner and customer/operations communication are recorded.

**NO-GO immediately** on any unexplained variance, unowned exception, missing lineage/audit evidence, untested restore/rollback, unresolved high-impact/security defect, required Owner/professional gate pending, scope/environment ambiguity, or unauthorized write path. A “known” difference is not accepted until its amount/count, cause, owner, rationale, expiry and downstream effect are evidenced and approved; no residual is waived silently.

**Current result:** W11A readiness contract is complete; W11 cutover, rehearsal execution, backfill, production use, and Layer 1 real-use completion are **NO-GO**. R01–R08 are all OPEN, and W7-P0B Owner acceptance remains pending.

## 13. Blockers, unknowns, and exact next authorized boundary

- R01 percentage discounts and R04–R08 Event work-management capabilities need separate bounded delivery contracts and implementation authority.
- R02/R03 code is present through W7-P0A/P0B, but W7-P0B Owner manual acceptance and Controller closeout remain pending. W7B remains gated.
- DEMO identity/existence, access, backup, and rehearsal readiness are **UNKNOWN** because this task's read-only scope named DEV only; no DEMO or PROD project was inspected.
- PR-ACC/REV/TAX/ZATCA/CASH/SEC/A11Y/PROD remain governed gates as applicable; W11A does not treat them as complete.
- No business-row baseline counts or production/DEMO restore proof were collected; those are future M0/rehearsal artifacts under fresh authority.

**EXACT NEXT AUTHORIZED BOUNDARY:** W11A closes with this published documentation packet. The immediate existing W7 boundary is Mozfer's authenticated W7-P0B English/Arabic/RTL/mobile Owner acceptance followed by Controller closeout; that does not authorize W7B or cutover. After that, the Owner must separately select and authorize one remaining Layer 1 delivery gate. No W11 execution slice, database mutation, rehearsal, or cutover starts under this packet.
