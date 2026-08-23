# G7 BLUE CRM - Client Delivery Plan

## 1. Purpose and DEV/DEMO Non-Claims

This plan defines the controlled path from the current G7 BLUE CRM DEV/DEMO state to a professional client-ready V1. It preserves the locked workflow:

`Customer -> Service -> Quotation -> Invoice -> Payment`

Service is the operational core. The current system and records remain DEV/DEMO only. Development servers, mock data, local checks, documentation, and user-provided smoke results must not be presented as production evidence.

Browser, runtime, and manual smoke are user-only. This plan contains gates and checklists; it does not claim that those gates have been executed.

No production-readiness, security-compliance, financial-correctness, VAT, Tax Invoice, ZATCA, or FATOORA claim is made by this document.

## 2. Current Readiness

### Strong foundations

- The Service-centered commercial flow is established and remains the product direction.
- Customer, Service, quotation, invoice, and payment surfaces exist in DEV/DEMO.
- Quotation totals use server/database-side authority and quotations are Service-scoped.
- Approved Billing Scope foundation, review/approval actions, invoice integration, Service Detail read-only card, and nested read-only detail route are implemented in DEV/DEMO.
- RBAC, server-side permission checks, sanitized errors, and invite-first direction are established in the repository.
- Supplier Booking is available as a narrow internal Service Detail workflow.

### Usable in DEV/DEMO

- Service-linked quotation creation and quotation approval foundations.
- Deposit/final invoice creation under the approved quotation and active Approved Billing Scope rules.
- Payment recording against invoices.
- Read-only invoice, payment, Service, customer, and Approved Billing Scope detail surfaces.
- Existing user-only smoke records for completed slices.

### Prevents client delivery

- Responsive core source and Mozfer manual smoke acceptance are complete; no responsive-smoke blocker remains.
- Invoice/payment correction, void, credit, and reversal controls remain incomplete.
- Approved Billing Scope **management design and lifecycle policy are locked** (`docs/approved-billing-scope-management-design.md`); Draft/Create, Edit/Discard, Review/Approve, invoice integration, and **ABS Void** are delivered. **ABS Supersede** remains a distinct deferred future candidate. Repository migration/RPC definitions and historical synthetic DEV/DEMO evidence exist, but current database state, migration application state, grants, and RPC definitions require fresh verification before future Supersede implementation.
- Supplier Booking remains narrow and is not a professional end-to-end supplier operations module.
- Reports Center is P1 and is not a V1 acceptance gate; the existing lightweight customer export remains a limited convenience.
- Production RLS/grant, backup, monitoring, deployment, invitation/webhook, and UAT evidence is incomplete.
- Feature 005 authenticated bilingual CRM UI is formally closed; residual exclusions (PDF body, Clerk widgets, bilingual documents, invoice export stub) remain outside that close.

## 3. Client-Ready V1 Definition

- Functional completeness: the Service-centered flow works end-to-end, with controlled invoice and payment correction paths and no orphaned financial records.
- Arabic/English UX: saved runtime locale, complete LTR/RTL switching for the agreed CRM surfaces, reviewed Arabic terminology, and bidi-safe dates, SAR values, and document numbers.
- Mobile usability: core list, form, detail, billing, approval, and payment paths have no page-level horizontal overflow at agreed narrow widths.
- Financial safety: server/database totals, immutable issued-document snapshots, controlled void/reversal direction, overpayment prevention, permissions, and audit evidence.
- Security: server-side authentication and RBAC, reviewed production RLS/grants, invitation-only access, verified webhook handling, safe errors, and sensitive-operation controls.
- Reporting: a confirmed baseline Reports Center requirement must be met with role-safe Service, quotation, invoice/AR, and payment/collections reporting. If Mozfer does not require this for acceptance, it remains P1.
- Deployment: approved environment configuration, backup and recovery plan, monitoring/error ownership, build evidence, deployment runbook, and a production-readiness gate.
- Client handoff: role-based UAT, known-limitations register, training/checklist, support ownership, and launch decision.

V1 does not include VAT-registration behavior, Tax Invoice behavior, ZATCA/FATOORA integration, supplier payments/invoices, automated costing, margin/P&L, or full bilingual document/PDF generation.

## 4. Current Phase and Controlled Task

- Current phase: **Current-core SaaS Performance & Scale Hardening**. Phase 2 commercial delivery is materially advanced: Feature 005, Feature 008, the latest Quotation/Invoice UX batch, and ABS management UI including Void are delivered. Current delivery focus is responsiveness, navigation latency, data-access efficiency, and scale readiness before broader non-essential feature growth.
- Completed decision lock: `V1-DELIVERY-DECISIONS-LOCK-1` locked D01-D09 as product policy.
- ABS management design complete: `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` → `docs/approved-billing-scope-management-design.md`.
- **P0 completed:** Customer360 invoice-loading optimization is published at `7507207c362c641b3c62aa7b1132fb6494fe1c0a`; its >preview-boundary financial-activity regression proof, fresh exact-HEAD validation, independent review, and Owner cleanup of the temporary validation snapshot are complete. Complete financial facts remain authoritative.
- **P1 complete / published / verified:** `G7-SHARED-RECORD-NAVIGATION-CRITICAL-PATH-REMOVAL-01` is published in `333907264c00ce830e51cb274ee84ad88e08cdaf` across Customer, Service, Invoice, and Quotation. Primary content was successfully decoupled from record navigation while authorization, ordering, first/previous/next/last semantics, disabled states, return-to behavior, loading, and unavailable/error states remained preserved; independent review was **ACCEPT — NO FINDINGS**.
- **P2 complete / published / verified:** `G7-SAAS-PERFORMANCE-P2-DETAIL-PAGE-RESPONSIVENESS-ARCHITECTURE-01` is published in `b46b9490bf7f739743c47d008c860f892cb49ca3` (`perf(detail): decouple secondary work from primary detail content`). Customer, Service, Invoice, and Quotation detail pages separate authoritative primary content from independent secondary work while preserving authorization, not-found semantics, safe actions, and financial/business truth. Accepted conclusion: **PRIMARY DETAIL CONTENT SUCCESSFULLY SEPARATED FROM MATERIAL SECONDARY WORK**. Final delegated review was **ACCEPT — NO FINDINGS** with **REVIEW PASSED — NO BLOCKING FINDINGS**. Final primary/secondary runtime medians were Customer `2007/3139 ms`, Service `760/929 ms`, Invoice `1536/2173 ms`, and Quotation `2021/3628 ms`. No quantified pre-P2 improvement is claimed.
- **Current active work — P3:** **DATA-ACCESS ROUND-TRIP REDUCTION**, exact task `G7-SAAS-PERFORMANCE-P3-DATA-ACCESS-ROUND-TRIP-REDUCTION-01`. Existing evidence identifies material remote Data API request multiplication and unnecessary round trips in specific paths; this does not establish PostgreSQL slowness or authorize indexes, SQL/RPC redesign, caching, infrastructure/region changes, or framework/data-platform replacement. P4-P10 remain **NOT STARTED / FUTURE PROGRAM PHASES**.
- **Customer related-invoice direction:** latest 10 contextual invoices in Customer Detail, with View All to dedicated Customer-filtered invoice history. This latest-10 direction is planned/documented and not yet implemented; financial summaries/activity must never be calculated from only the visible preview.
- **Expansion gate:** broad new Product/Event ERP and non-essential major feature growth is **DEFERRED, NOT CANCELLED** pending explicit Owner reopening after current-core SaaS performance/scale hardening reaches an acceptable baseline.

## 5. Completed Milestones

- Core Customer -> Service -> Quotation -> Invoice -> Payment direction established.
- Service operational foundation, Service-linked quotations, quotation approval foundation, and invoice/payment foundations recorded in canonical docs.
- Approved Billing Scope foundation and invoice integration completed for DEV/DEMO, including read-only card and nested read-only detail route.
- Canonical documentation audit, P0 cleanup, P1 cleanup, and P2 history cleanup completed and pushed.
- P2 Detail-Page Responsiveness Architecture is complete, published, delegated-review accepted, and runtime-recertified across Customer, Service, Invoice, and Quotation.
- Supplier Booking narrow Service Detail create/cancel smoke recorded as completed history with its loading-state warning preserved.
- Runtime authenticated Arabic/English CRM UI (Feature 005 + P3 + P5) is formally closed; PDF/Clerk-widget/bilingual-document residual exclusions remain.

## 6. P0 Launch Blockers

- Current-core SaaS performance/scale hardening: detail-page responsiveness architecture, remaining secondary-read cost, limited progressive detail rendering, remote Data API request multiplication, broad/complete-history reads, large related collections, and cold-shell scans are active work, not deferred defects. The documented conclusion is **PARTLY — MATERIAL IN SPECIFIC PATHS**; PostgreSQL engine slowness is not claimed.
- Any newly identified responsive regression; the responsive-smoke blocker is closed.
- Formal activation, current-state verification, planning, and implementation of the deferred ABS Supersede application action and UI.
- Invoice and payment correction implementation under the locked lifecycle policy.
- Financial snapshot freeze, service-link enforcement, auditability, and permission/RLS review.
- Production-readiness evidence: RLS/grants, secrets/deployment controls, backup/recovery, monitoring, rate limits, and build gate.
- Admin invitation/webhook acceptance smoke and role-boundary verification before real client data.
- Reports Center remains P1 and is not a V1 acceptance gate.

## 7. P1 Professionalization

- Service Detail workspace structure and information hierarchy.
- Quotations list and creation UX refinement.
- Reports Center design and baseline reports as P1 professionalization.
- Professional Supplier Booking redesign remains outside V1 acceptance scope.
- Invoice/payment timeline and richer operational context.
- Cross-module table, action, empty, loading, error, and access-denied consistency.

## 8. P2 Polish

- Broader table density and action-placement standardization.
- Secondary detail-page hierarchy and related-record polish.
- Additional pagination/filter ergonomics.
- PDF/print refinements beyond the required client-facing print verification.

## 9. Deferred After V1

- Supplier payments, supplier invoices, automated costing, rate cards, margin, and P&L.
- Supplier portal, customer-facing supplier costs, and broader Supplier Booking behavior.
- VAT registration, Tax Invoice, ZATCA/FATOORA, QR/XML, clearance, and reporting behavior.
- Full bilingual document/PDF generation and document-locale runtime/schema work.
- Hijri calendar, global search, legacy Project cleanup, and other parking-lot items.

## 10. Delivery Phases and Dependency Gates

### Phase 0 - V1 Boundary and Decision Lock

- Goal: preserve the approved V1 boundary and locked decision policy without implementation.
- Included scope: the approved focused V1 package, financial policy, UAT ownership, and operational ownership.
- Explicit exclusions: financial design, schema work, SQL, implementation, and production claims.
- Entry conditions: clean DEV/DEMO repository and approved roadmap design.
- Exit criteria: decisions are recorded, dependencies are ordered, and no deferred feature is silently promoted.
- User-only smoke checkpoint: Mozfer reviews and accepts the V1 boundary and gate wording.

### Phase 1 - Experience Foundation

- Goal: make the core CRM understandable in Arabic/English and usable on agreed mobile widths.
- Included scope: runtime locale preference, RTL shell/module completion, responsive core fixes, and Service Detail workspace design/implementation as separately approved slices.
- Explicit exclusions: financial lifecycle changes, VAT/ZATCA, supplier costing, and full bilingual documents/PDFs.
- Entry conditions: locale terminology, rollout order, and responsive acceptance widths are approved.
- Exit criteria: agreed core routes have saved locale behavior, correct direction, stable identifiers/SAR formatting, and no confirmed page-level overflow.
- User-only smoke checkpoint: English and Arabic walkthrough on narrow Customer, Service, Quotation, Invoice, and Payment routes.

### Phase 2 - Commercial Workflow Completion

- Goal: complete the user-facing commercial authority and quotation workflow.
- Included scope: quotation UX, Approved Billing Scope management, review/approval, controlled void, and supersede/versioning under the locked policy.
- Explicit exclusions: Tax Invoice/ZATCA, supplier financial modules, and unsupported audit/history capabilities.
- Entry conditions: Phase 1 UX baseline and Approved Billing Scope policy/design approval.
- Exit criteria: authorized roles can manage the active billing authority without changing historical agreements or bypassing Service.
- User-only smoke checkpoint: draft, edit, line review, approval, active-scope navigation, version/supersede, and denied-role scenarios.

### Phase 3 - Financial Controls

- Goal: make invoice and payment correction safe and auditable.
- Included scope: approved financial policy, schema/RLS review, bounded invoice/payment actions, snapshot freeze, overpayment controls, and audit evidence.
- Explicit exclusions: VAT registration, ZATCA/FATOORA, supplier payments, and a single giant implementation task.
- Entry conditions: approved policy and financial lifecycle audit.
- Exit criteria: reviewed bounded tasks pass validation, permissions, database gates, and documented DEV/DEMO smoke.
- User-only smoke checkpoint: issue, partial payment, overpayment rejection, invoice correction, payment reversal, void/credit direction, and role denial.

Financial implementation is an umbrella milestone only. It must be decomposed after design and audit into migration design/review, migration implementation, DEV/DEMO apply, server actions, permission/RLS review, invoice UI, payment UI, automated validation, user-only smoke, audit, docs sync, commit, and push. Each task receives model routing based on actual risk; Sol Extra High is not the default.

### Phase 4 - Operations and Reporting

- Goal: provide agreed operational visibility while preserving the narrow internal Supplier Booking workflow.
- Included scope: P1 Reports Center design and role-safe exports; professional Supplier Booking redesign is outside V1 acceptance scope.
- Explicit exclusions: supplier payments, supplier invoices, automated costing, margin/P&L, supplier portal, and customer-facing supplier costs.
- Entry conditions: financial sources of truth and permissions are stable.
- Exit criteria: reports use trusted server/database sources and the approved supplier workflow has no ambiguous commitment semantics.
- User-only smoke checkpoint: role-safe report/export checks and, if included, supplier creation/cancel/exception scenarios.

### Phase 5 - Production Hardening

- Goal: establish evidence for safe deployment and real-data use.
- Included scope: production RLS/grants, auth/invitation/webhook checks, secrets/deployment controls, backups/recovery, monitoring, rate limits, dependency review, and build evidence.
- Explicit exclusions: new product features, VAT/ZATCA, and unapproved database changes.
- Entry conditions: functional P0 work is complete and all required schema/RLS changes have separate authorization.
- Exit criteria: the security and production gate returns Ready with evidence, or lists explicit blockers without a readiness claim.
- User-only smoke checkpoint: invitation/webhook, role boundary, recovery, deployment, and sensitive-data exposure checklist.

### Phase 6 - UAT and Client Handoff

- Goal: validate the agreed V1 with client roles and transfer operational ownership.
- Included scope: role-based UAT, defect disposition, training, launch checklist, support ownership, and known-limitations handoff.
- Explicit exclusions: scope expansion, new feature decisions, and unapproved production fixes during UAT.
- Entry conditions: production hardening gate passes and UAT data/scenarios are approved.
- Exit criteria: UAT acceptance is recorded, launch blockers are closed, and support/recovery ownership is explicit.
- User-only smoke checkpoint: client/user execution of the approved UAT matrix and handoff checklist.

## 11. Controlled Task Queue

| Task | Type | Dependencies | Model and effort | Expected result |
|---|---|---|---|---|
| `G7-CLIENT-DELIVERY-ROADMAP-DOCS-1` | docs | Approved design | GPT-5.6 Luna Medium | Canonical plan and synchronized status/roadmap. |
| `V1-DELIVERY-DECISIONS-LOCK-1` | design | Docs closure | GPT-5.6 Terra Medium | Decisions recorded only; no financial design or implementation. |
| `I18N-RUNTIME-LOCALE-DESIGN-1` | design | Decision lock | GPT-5.6 Terra Medium | Locale persistence, RTL, rollout, and document boundary design. |
| `RESPONSIVE-CORE-P0-AUDIT-1` | audit | Feature 005 closed | GPT-5.6 Luna Medium | Completed — evidence-backed mobile blocker list. |
| `RESPONSIVE-CORE-P0-IMPLEMENT-1` | implementation | Responsive audit | GPT-5.6 Luna Medium | Source complete (`RESPONSIVE_CORE_P0_IMPLEMENTED`); automated **107/107** and Mozfer manual smoke accepted. |
| `RESPONSIVE-CORE-P0-MOZFER-SMOKE-1` | manual smoke | Responsive implement | User-only (Mozfer) | Complete — Mozfer manual smoke accepted. |
| `SERVICE-DETAIL-WORKSPACE-DESIGN-1` | design | Decision lock | GPT-5.6 Terra Medium | Service workspace structure using existing patterns. |
| `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` | design | Responsive implement source complete (smoke may still be pending) | GPT-5.6 Sol High | **Complete** — design locked in `docs/approved-billing-scope-management-design.md`. |
| `ABS-MGMT-UI-READ-ENRICH-1` | implementation | ABS management design complete | GPT-5.6 Luna Medium | Complete — Service card read enrichment. |
| `ABS-MGMT-UI-DRAFT-CREATE-1` | implementation | Read enrich | GPT-5.6 Luna Medium | Create-draft CTA (existing server action). |
| `ABS-MGMT-UI-DRAFT-EDIT-1` | implementation | Draft create | GPT-5.6 Terra Medium | Draft item edit + discard UI. |
| `ABS-MGMT-UI-REVIEW-APPROVE-1` | implementation | Draft edit | GPT-5.6 Terra Medium | Line-safety review + approve UI. |
| `ABS-MGMT-VOID-ACTION-1` | implementation | Historical delivered slice | GPT-5.6 Sol High | Complete — Void action + UI delivered. |
| `ABS-MGMT-SUPERSEDE-ACTION-1` | implementation | Formal feature activation, fresh RPC/migration/DEV/DEMO verification, and bounded plan | GPT-5.6 Sol High | Deferred future candidate — Supersede action + UI; not the current engineering task. |
| `INVOICE-PAYMENT-CORRECTION-LIFECYCLE-DESIGN-1` | design | Decision lock | GPT-5.6 Sol High | Approved correction/reversal policy and acceptance matrix. |
| `FINANCIAL-LIFECYCLE-SCHEMA-RLS-AUDIT-1` | audit | Financial design | GPT-5.6 Sol High; Sol Extra High only if Sol High cannot resolve a material issue | Evidence-backed schema, RLS, grant, snapshot, and migration gaps. |
| `I18N-RUNTIME-IMPLEMENT-1` | implementation | I18N design | GPT-5.6 Terra High | Approved runtime locale and RTL behavior implemented and validated. |
| `RESPONSIVE-CORE-P0-IMPLEMENT-1` | implementation | Responsive audit | GPT-5.6 Luna Medium; Terra Medium only for cross-shell or multi-module fixes | Confirmed overflow blockers fixed. |
| `REPORTS-CENTER-V1-DESIGN-1` | design | Financial source stability | GPT-5.6 Terra Medium | Role-safe baseline reporting design, conditional on V1 acceptance. |
| `PRODUCTION-READINESS-GATE-1` | audit | Functional P0 completion | GPT-5.6 Sol High; Extra High only for unresolved P0 security or migration problems | Ready/Not Ready verdict with evidence. |
| `ADMIN-INVITATION-WEBHOOK-UAT-1` | manual smoke | Configured secret and explicit user approval | User-only; checklist preparation GPT-5.4 Mini Light | User-verified invitation, webhook, role, and lockout behavior. |
| `V1-UAT-HANDOFF-1` | manual smoke | Production gate | User/client executed; checklist formatting GPT-5.6 Luna Light | Approved UAT and handoff record. |

## 12. Critical Path

The current client-delivery path is:

`Customer360 P0 closure (complete) -> P1 shared record-navigation closeout (complete) -> P2 detail-page responsiveness architecture (complete/published) -> P3 data-access round-trip reduction (active) -> scale rerank/acceptance -> bounded financial implementation -> production hardening -> UAT -> handoff`

**Current delivery priority:** P0 Customer360 invoice-loading closeout, P1 shared record-navigation closeout, and P2 detail-page responsiveness architecture are complete and published. P3 data-access round-trip reduction is active as `G7-SAAS-PERFORMANCE-P3-DATA-ACCESS-ROUND-TRIP-REDUCTION-01`; continue one bounded task at a time with measurement and validation. Feature 008, the latest Quotation/Invoice UX batch, and ABS management UI including Void remain delivered. ABS Supersede remains inactive pending formal feature activation, fresh current-state verification, and bounded planning. Do not promote Reports Center, Clerk invitation/webhook smoke, or production hardening as complete; those remain sequenced work and readiness gates.

**Responsive core (implemented and accepted scope):** quotation/service form stacking, logical filter icons, related-quotations header wrap, invoice search width; table-local scroll preserved; Supplier mobile detail deferred to full redesign.

Reports Center is P1 and does not join the V1 acceptance critical path. Professional Supplier Booking redesign is outside V1 acceptance scope. Supplier payments, supplier invoices, automated costing, margin, P&L, and broader Product/Event ERP expansion remain deferred—not cancelled—until explicit Owner reopening after current-core SaaS performance/scale hardening.

## 13. Locked V1 Decisions

- **D01 Supplier Booking:** Keep the current narrow internal Service Detail workflow in V1. Professional Supplier Booking redesign remains outside V1 acceptance scope.
- **D02 Reports:** Reports Center is P1 and is not a V1 acceptance gate.
- **D03 Invoices:** Issued invoices are immutable. Unpaid invoices may be voided by Admin with a reason and audit record. Paid or partially paid invoices require a controlled adjustment/reversal and replacement path.
- **D04 Payments:** Recorded payments are append-only. Monetary errors, duplicates, refunds, and wrong invoice allocation require controlled reversal/correction records. Financial deletion is forbidden.
- **D05 Approved Billing Scope:** Approved Billing Scopes are immutable. Uninvoiced scopes may be voided or superseded. Invoiced scopes remain frozen, while a new successor version may govern future invoices only. Existing invoices retain their original scope reference.
- **D06 Arabic and terminology:** Runtime Arabic/English is V1 scope. Western digits and bidi-safe financial identifiers are mandatory. Mozfer owns final commercial-language approval, with Saudi business-language review required before UAT. Bilingual documents remain deferred.
- **D07 UAT:** UAT is role-based and user-executed. Mozfer is the final business acceptance owner. Blocker and High defects prevent launch.
- **D08 Operations:** Named operational ownership is required, with at least 30-day backup retention, RPO within 24 hours, RTO within one business day, a named monitoring/incident owner, and 10 business days of launch support.
- **D09 V1 package:** The focused V1 package is approved: runtime Arabic/English core UX, mobile core paths, financial correction controls, Approved Billing Scope management, and operational invitation/UAT gates; Reports Center acceptance, professional Supplier Booking, bilingual documents, and VAT/ZATCA/FATOORA remain outside V1.
- **Financial correction terminology:** Use **Internal Credit Adjustment** for current non-VAT correction records. Do not claim Tax Credit Note, VAT, ZATCA, or FATOORA support. Accountant initiates correction requests; Admin authorizes monetary reversals, refunds, and invoice voids. Manager may prepare Approved Billing Scope successor versions; Admin authorizes void or supersede.

## 14. Assumptions That Must Not Be Made

- DEV/DEMO data or smoke is production evidence.
- Runtime locale switching is complete because dictionaries and direction helpers exist.
- Approved Billing Scope read-only surfaces mean management, void, or supersede is complete.
- A narrow Supplier Booking path is a complete supplier operations module.
- Current database/RLS posture, backups, monitoring, or deployment is production-ready.
- VAT registration, Tax Invoice eligibility, ZATCA, or FATOORA exists without explicit settings and evidence.
- A financial implementation umbrella can be executed without decomposition and separate SQL/RLS gates.

## 15. User-Only Smoke and UAT Gates

- User-only smoke is required after each runtime or workflow slice that changes visible behavior.
- Smoke must cover allowed roles, denied roles, loading, empty, error, access-denied, financial boundary, responsive, and Arabic/English behavior where applicable.
- User-only manual smoke must be performed by Mozfer or an explicitly authorized user; Codex may prepare checklists and format results only.
- UAT must use an approved scenario matrix covering Customer, Service, Quotation, Invoice, Payment, approved-scope authority, role boundaries, reports if included, and recovery/handoff expectations.

## 16. Production-Readiness Checklist

- [ ] No DEV_ONLY RLS remains on real-data paths.
- [ ] Public-table read/write exposure and RPC grants are reviewed.
- [ ] All sensitive writes enforce server-side authentication and permissions.
- [ ] Viewer, Sales, Accountant, Manager, and Admin boundaries are user-verified.
- [ ] Clerk invitation and webhook signature/idempotency behavior is user-verified.
- [ ] No service-role key or secret is exposed in client code, logs, docs, artifacts, or deployment output.
- [ ] Financial correction, snapshot, audit, and overpayment controls are evidenced.
- [ ] Backups, restore path, retention, and recovery ownership are documented and exercised as approved.
- [ ] Monitoring, safe logging, rate limits, security headers, and dependency review are evidenced.
- [ ] Required lint, typecheck, and build gates pass for runtime slices.
- [ ] Deployment runbook, rollback/corrective migration policy, and support ownership are approved.
- [ ] No production-readiness claim is made until this checklist has evidence.

## 17. Parking Lot

- `RESPONSIVE-LIST-PAGE-HORIZONTAL-OVERFLOW-1` remains an open P1 backlog item until promoted into the current P0 responsive slice.
- Full runtime Arabic/English rollout beyond the approved core sequence.
- Full bilingual document/PDF generation and document-locale runtime/schema work.
- Service profitability, supplier costing, supplier payments, supplier invoices, and supplier portal.
- Global Search, Hijri calendar, customer profile polish, broader table standardization, and legacy Project cleanup.
- Server-side PDF generation and stored document delivery.

## 18. Change Log

- `G7-CLIENT-DELIVERY-ROADMAP-DESIGN-1`: completed with PASS WITH WARN; roadmap accepted after model-routing and task-sizing corrections.
- `G7-CLIENT-DELIVERY-ROADMAP-DOCS-1`: completed documentation slice; no code, SQL, migration, browser smoke, or production work occurred.
- `V1-DELIVERY-DECISIONS-LOCK-1`: completed with D01-D09 locked as product policy; no implementation occurred.
