# G7 BLUE CRM — Deferred Decisions

## CURRENT DEFERRAL BOUNDARY — 26 August 2026

- P9 primary-detail performance is complete/published/verified for Customer, Supplier, Service, and Quotation; the retained Quotation primary-detail optimization is published in `3a00d23`. Invoice was measured and discarded. Reports and Customers complete the bounded module-entry follow-on; a later Quotations module-entry candidate was discarded. The remaining six-journey authenticated normal-network DOM-click rerank also completed, and no repeatable material target was established from the available browser and network-proxy evidence. These completed results do not activate a new data-layer phase.
- **G2 closure evidence:** G2 Money and Payment Precision is **CLOSED / ENGINEERING COMPLETE**. Exact positive two-decimal SAR precision, pre-mutation rejection of malformed/sub-cent/non-positive/non-finite amounts, the seven-argument RPC contract, replay/idempotency and duplicate protection, overpayment protection, deposit-transition and audit behavior, DEV/DEMO migration reconciliation, read-only RPC permission/metadata verification, and the absence of a concrete G2 engineering defect were accepted.
- **G2 verification warning:** The full `pnpm test:all` run did not complete within the verification window and surfaced unrelated `ModuleSearchInput` / `services-operational` failures; no G2/payment failure was reported. This warning is non-blocking and does not reopen G2.
- **G5 closure evidence:** G5 Admin Security and Desired-State Mutations is **CLOSED / ENGINEERING COMPLETE**. Accepted evidence confirms admin mutations require `users:manage`; current role permissions restrict that capability to Admin; desired-state mutation semantics are retry-safe and idempotent; advisory transaction locking and row locking preserve atomicity; last-active-admin demotion and deactivation are rejected; self-role change and self-deactivation protections are enforced; structured `app_user` audit events are preserved; migration `20260811140000_g5_admin_user_atomic_mutations` is reconciled on DEV/DEMO; active RPCs are `SECURITY DEFINER`; execute permission is limited to `service_role` / postgres and denied to PUBLIC, anon, and authenticated; focused admin/auth verification passed; and no concrete G5 engineering defect remains. This does not certify production deployment or widen production authority.
- **G6 closure evidence:** G6 Payload and Log Minimization is **CLOSED / ENGINEERING COMPLETE**. The reviewed repair establishes allowlisted invoice, customer, customer-picker, and admin-user list DTO boundaries with narrowed projections; invoice snapshot/internal metadata does not cross the client boundary; customer detail-only VAT, address, billing, and finance fields are excluded; admin-user `updated_at` and Clerk identifiers are excluded; repaired provider/database diagnostics use stable sanitized codes; fail-closed authorization and generic user-facing errors remain preserved; focused G6 validation passed 63/63 tests, TypeScript, scoped ESLint, the production build, and `git diff --check`; independent review concluded `0 BLOCKING / 0 MATERIAL`, and targeted rereview after the sole minor test gap was repaired concluded `0 BLOCKING / 0 MATERIAL / 0 MINOR`; no concrete G6 engineering defect remains within the scoped sensitive surfaces. Unchanged detail/non-list loaders with existing diagnostics were outside this bounded repair. This does not certify production deployment or widen execution or production authority.
- **Goal audit:** G2 is `CLOSED / ENGINEERING COMPLETE` for Money and Payment Precision; G4 is `CLOSED / ENGINEERING COMPLETE` for the current-core bounded performance and scale remediation program; G5 is `CLOSED / ENGINEERING COMPLETE` for Admin Security and Desired-State Mutations; G6 is `CLOSED / ENGINEERING COMPLETE` for Payload and Log Minimization; G7 remains open pending its own verification and operational evidence. G10 engineering remediation is closed/published/verified in current `main`; its former UI-consistency and Final Invoice entries are historical, not active deferrals.
- **G4 closure boundary:** The six-journey rerank used repeated authenticated DOM-click timing under normal unthrottled network conditions, and no repeatable material target was established from the available browser and network-proxy evidence. This does not certify production performance, full server/database attribution, or SaaS acceptance. Server-Timing/database attribution remains evidence required only if future evidence justifies reopening G4.
- Historical Chrome 3G-throttled browser measurements are not a normal-network baseline or proof of a 3G optimization. Preserve their structural/server evidence without restarting the completed campaign solely for that caveat.
- Event ERP, Tender, VAT/ZATCA, production, Generic Product, and broad accounting remain deferred. No database, production, or ERP authority expansion is implied.
- **NEXT ENGINEERING TASK — G7 engineering closeout verification for Failure, Health, and Webhook Hardening.**

## 1. How To Use This Document
- Completed work is summarized in `project-status.md`.
- Execution order is owned by `project-roadmap.md`.
- This document contains only unresolved, partial, or intentionally deferred decisions.
- Historical task IDs are not active instructions.

## 2. Resolved Decisions To Preserve
- **Core Entity:** Service / Booking is the operational entity for new ERP work, not Project.
- **Locked Flow:** Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- **Quotations:** No standalone quotations. They are Service-scoped. One Service can have multiple Quotations. Approval requires `quotations:approve`. Approved quotations must not be fully editable or soft-deleted through ordinary `quotations:write`.
- **Invoices:** Invoices are siblings under Service / Booking and Approved Quotation. No invoice-to-invoice FK in MVP. Deposit Invoice is an advance/prepayment invoice, not a discount. Deposit amount must be > 0 and <= approved quotation total. Active invoice definition: `status NOT IN ('voided','cancelled') AND voided_at IS NULL`.
- **Payments:** Payments are separate from invoices. Multiple payments against one invoice do not create multiple invoices. Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- **Financial Controls:** Client-submitted financial totals must never be trusted; they are calculated server-side. Prevent overpayment unless explicitly approved.
- **Snapshot Rules:** Every invoice created must persist full historical snapshot fields at issue time. Historical documents must not change meaning when language/settings change.
- **Quotation approval / internal ABS:** Eligible quotation approval is the automatic activation boundary for the internal Approved Billing Scope; the immutable commercial snapshot, billable ceiling, invoice linkage, and audit history remain internal controls rather than a second user workflow. Non-zero discounts remain unsupported by the current approval contract.
- **Service lifecycle:** Explicit guarded actions govern `Deposit Paid -> In Progress`, `In Progress -> Completed`, and reasoned cancellation from `Inquiry`, `Quoted`, or `Approved`; ordinary Service edit does not provide arbitrary status selection.
- **Service evidence and billing:** Billing Summary, collapsed evidence-based Activity History, Deposit settlement audit, and Completed Final billing are delivered; Cancelled Services cannot create Deposit or Final invoices.
- **Create Replay Safety (G8):** Family-specific create replay safety is complete and published across all five families: Customer (`be96bea`), Service (`ea61563`), Quotation (`61fd505`), Invoice (`04c89df`), and Payment (existing published architecture verified with no new code delta required). Each family implements immutable request/mutation key binding and dedicated reconciliation / conflict detection before mutable creation.

## 2.1 Performance Return-Later Queue
- **Program classification (revised):** The entries below are evidence-gated return-later items within the current-core SaaS quality program, not active implementation instructions. P0-P9 primary-detail work is complete/published/verified; P8 shared/cold-shell work is closed; the bounded module-entry rerank has closed G4 with no target. Section 0 of the status and roadmap records the completed G4 closure boundary.
- **Service Detail remaining optimization:** P2 is published and final runtime-recertified; the Service primary/secondary medians were 760 ms / 929 ms. Remaining Service Detail optimization stays in this return-later queue. Reopen only if it becomes the highest current measured priority again or a shared optimization found elsewhere materially affects its remaining server path; do not pre-select Billing Summary as the next repair without fresh attribution.
- **P3 closeout:** `G7-SAAS-PERFORMANCE-P3-DATA-ACCESS-ROUND-TRIP-REDUCTION-01` is **COMPLETE / PUBLISHED / VERIFIED** in `0aed85835501c24d7834401d8cc9f296cc9de5cf` (`perf(customer): reduce Customer360 invoice round trips`). The invoice subflow reduced from `3 → 2` remote calls and the measured Customer route topology from `8 → 7` reads. Actual-click runtime recertification accepted **ROUND-TRIP REDUCTION ESTABLISHED WITH LIMITED USER-VISIBLE BENEFIT**; no material latency improvement, material regression, payload-size conclusion, or memory conclusion is claimed.
- **P4 closeout:** `G7-SAAS-PERFORMANCE-P4-RELATED-RECORD-UX-BOUNDING-01` is **COMPLETE / PUBLISHED / VERIFIED** in `eca8b431140826851fc2251ba4bcdd9b6a15c908`. Customer Detail now previews the latest 10 contextual invoices with View All to the existing customer-filtered Invoice workspace route. Financial facts remain exhaustive, remote reads are unchanged, the UX verdict is **RELATED-RECORD UX SUCCESSFULLY BOUNDED — PERFORMANCE EFFECT NOT MATERIAL**, and financial truth is **FULL FINANCIAL TRUTH PRESERVED INDEPENDENTLY OF PREVIEW BOUND**. Final review and browser verification passed.
- **P5-P9 closeout:** P5 is **COMPLETE / PUBLISHED / VERIFIED**. Service Detail → Related Quotations is published in `3b0ec95cec0b912f84fb4a2f0cdb9578c45a92df` (`perf(service): narrow related quotation projection`), replacing a full quotation row plus customer/service relations with a six-field route-specific projection while preserving one request. Customer360 secondary Services is published in `687371959bb75b0bb80394941c28c86ef478a1c8` (`perf(customer): narrow Customer360 service projection`), reducing `9 → 6` selected fields while preserving one request, filters, ordering, cardinality, operational facts, and financial reads. Both verdicts are **READ MODEL SUCCESSFULLY NARROWED — PERFORMANCE EFFECT NOT MATERIAL** and authoritative business/financial truth is preserved. **NO FURTHER MATERIAL P5 PROJECTION OPPORTUNITY JUSTIFIED.** P6 is **COMPLETE / PUBLISHED / VERIFIED**: Customer360 financial materialization is bounded in `896e5fd3b8ffdc2b7989915b6cc662bfd22526d7`; Service Billing is runtime-verified in `b8e33907be544402b4bc8d8c8ec5b612a2980dff` with two bounded aggregate RPC reads, preserved financial truth/failure semantics, authorized DEV/DEMO verification, and **NO ADDITIONAL INDEX JUSTIFIED**. P7 is **COMPLETE / PUBLISHED / VERIFIED** in `9ba1b67942ddeea045dcfd442e2aa690e3431409`; its Related Quotations survey found P50 `0`, P95/P99/MAX `1`, and no terminal history, so no further large-collection slice is justified. P8 is **COMPLETE / PUBLISHED / VERIFIED**: `06b303f3fd082bebf85d38be3faf55dcbf812033` removed the Business-Year primary-shell barrier, and final authorized DEV/DEMO attribution found one request-deduplicated app-user prerequisite, negligible effective-locale binding cost, and **P8 ENGINEERING COMPLETE — NO FURTHER MATERIAL SHARED/COLD-SHELL OPPORTUNITY JUSTIFIED**. P9 primary-detail work is complete; P10 remains a future evidence/acceptance rerank.
- **Invoice Detail attribution:** Current median is 2330 ms. Reopen for bounded actual-interaction latency attribution after the completed P2 detail-page responsiveness work and any newly reranked higher-priority work are completed or reprioritized.
- **Supplier workflow attribution:** Current median is 1890 ms. Reopen for bounded Supplier latency attribution according to the evidence-based ranking after higher-priority journeys.
- **Payments query-plan/index review:** Payments is currently 317 ms median and lower priority, although the serialized exact-count plus ordered-data-read server path remains an established bounded bottleneck. `G7-PAYMENTS-EXACT-COUNT-QUERY-PLAN-AND-INDEX-REVIEW-01` remains valid only after higher-priority journeys are addressed, reranking materially changes priority, or Payments tail/scale evidence becomes operationally important.
- **J4 Quotation coverage:** Comparable normal-detail completion evidence is not yet established. Reopen only when a normal safe interaction path is available or quotation work itself creates a reason to remeasure.
- **J6 Billing coverage:** Measurement remains authorization-limited. Reopen only when the active authorized test context legitimately exposes the journey; do not bypass permissions to measure it.

## 2.2 Performance / Scale Evidence Gates
- **Index changes:** Do not promise or create indexes until a concrete query/index question and appropriate authorized query-plan evidence exist. Current data-access evidence does not establish missing indexes or PostgreSQL engine slowness.
- **Region / infrastructure changes:** Do not change placement or infrastructure because remote latency is merely plausible. Require safe placement/RTT evidence.
- **Broad caching:** Do not cache mutable financial or authority-sensitive data without an explicit freshness/invalidation contract.
- **Transactional same-snapshot architecture:** Concurrent preview and complete-financial-facts reads may theoretically observe different moments during a write, but no current user-visible/business inconsistency or same-snapshot product contract is established. Do not promote this to immediate architecture work without that evidence.
- **Framework / data-platform replacement:** Replacing Next.js, Supabase, or the data platform is not justified by current evidence.
- **Current conclusion boundary:** The active program conclusion is **PARTLY — MATERIAL IN SPECIFIC PATHS**. Data API request multiplication, sequencing, transfer, broad projections, complete-history reads, and blocking secondary work are material; PostgreSQL engine slowness itself is not established.

## 3. Financial And Billing Deferrals
- **Invoice voiding and controlled adjustment:** Unpaid invoices may be voided by Admin with a reason and audit record. Paid or partially paid invoices require a controlled adjustment/reversal and replacement path (D03/D04). Remaining implementation (schema, permissions, replacement mechanics, accounting treatment) is deferred.
- **Payment reversal/correction:** Payment correction workflows and reversal records remain deferred.
- **Refunds:** Refund implementation is deferred.
- **Wrong-Invoice reallocation:** Workflows to reallocate a payment to a different invoice remain deferred.
- **Financial retention and no hard deletion:** Financial records must use void/cancel/reversal workflows rather than hard deletion.
- **Rounding/currency hardening:** Currency and rounding standardization across the application remains deferred.
- **Payment evidence/attachments:** Attaching evidence to payments remains deferred.
- **Global Quotation entry selector:** Implemented in Feature 007 (`007-quotations-eligible-service-selector`). The bounded selector delegates only to the existing Service-scoped creation authority and does not create a standalone Quotation.
- **Global Invoice chooser:** Implemented as a navigation-only chooser into Service Billing. Further selector-scale or eligibility redesign remains deferred unless evidence or a separately approved design requires it.
- **Selector scale and eligibility redesign:** Server-side search/cursor pagination and any event-date eligibility redesign remain deferred unless Service-volume evidence or a separately approved design requires them.
- **Multi-stage invoices beyond Deposit/Final:** Additional staged/progress invoice behavior remains deferred until final settlement design or ZATCA-grade settlement requires it.

## 4. Approved Billing Scope Deferrals
- **ABS Void:** The application action and secondary technical-surface UI are delivered. They require `approvedBillingScopes:void`, a structured reason code and non-empty note, an eligible active scope, zero applicable invoice exposure, and zero payment history; they never mutate invoices or payments. Production rollout remains deferred.
- **Successor/supersede UI:** The UI for superseding an Approved Billing Scope remains deferred.
- **Optional richer ABS history:** A richer dedicated Approved Billing Scope history experience remains deferred; the delivered Service Activity History exposes evidence-based Service lifecycle and deposit-settlement events.
- **Remaining production enforcement:** Production rollout of the ABS financial lifecycle remains deferred.

## 5. Supplier And Costing Deferrals
- **Supplier Rate Card V1 and broader procurement:** Supplier Rate Card V1 authority is COMPLETE, PUBLISHED, and DEV-DEMO VERIFIED under G9; Owner visual/manual acceptance is PASSED (do not reopen G9). The bounded V1 scope covers create, edit, activate/deactivate, valid-from/valid-to, and overlap behavior. Delete/restore, automatic supplier pricing, broader procurement, supplier accounting, Actual Cost, and Margin remain deferred.
- **Broader Supplier Booking routes and workflows:** Standalone/broader Supplier Booking routes, UI, customer-facing documents, portal, edit/delete/restore, and expanded statuses remain deferred. Narrow internal Service-scoped V1 is implemented.
- **Supplier invoices/payments:** Approved strategic expansion domain whose detailed design, sequencing, and implementation remain deferred pending product rebaseline, field evidence, accounting review, and explicit feature activation. Supplier invoices, payables, outbound payments, accounting workflows, and supplier payment approval workflow are not implemented or immediately active.
- **Company Expenses:** Approved strategic expansion domain whose detailed design, sequencing, and implementation remain deferred pending product rebaseline, field evidence, accounting review, and explicit feature activation. Company overhead remains separate from Service/Event direct costs.
- **Direct Event costing:** Approved strategic expansion domain whose detailed design, sequencing, and implementation remain deferred pending product rebaseline, field evidence, accounting review, and explicit feature activation. Direct Service/Event expenses, committed/actual/paid/outstanding costs, and expected/actual Event Margin are not implemented or immediately active.
- **Actual-cost posting:** Posting of actual supplier costs remains deferred.
- **Profit/margin reporting:** Approved strategic expansion domain whose detailed design, sequencing, and implementation remain deferred pending product rebaseline, field evidence, accounting review, and explicit feature activation. Supplier costing, margin, and P&L reports are not implemented or immediately active.
- **Customer-facing supplier cost exposure prohibition:** Any customer-facing exposure of supplier costs (documents, PDFs, portal) is strictly prohibited. Accountant, Sales, Operations, and Viewer do not have supplier cost access by default.

## 6. Security, Production, And Operations Deferrals
- **Remaining production RLS/security:** Production RLS validation and operational hardening (backup/monitoring/deployment readiness) are required before any hosted demo with real data.
- **Deployment:** Production deployment remains deferred.
- **Backups:** Database backups configuration remains deferred.
- **Monitoring:** Application and database monitoring remains deferred.
- **Logging:** Broader audit-log UI and detailed action logging beyond the delivered Service Activity History remain deferred.
- **Incident ownership:** Incident ownership and operational support remain deferred.
- **Clerk live invitation/webhook smoke:** Real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and approved.
- **Session timeout:** Idle session timeout and inactivity auto-logout remain deferred.
- **Graphify index:** The index remains stale; force remediation or refresh remains deferred and requires a separate approved task.
- **Sensitive Server Action Rate Limiting:** Current MVP process-local rate limiting is implemented. Distributed/multi-instance enforcement remains deferred.

## 7. Documents, VAT, And Compliance Deferrals
- **Official CR/VAT confirmation where still unresolved:** VAT Number and CR confirmation remain deferred/pending.
- **Tax Invoice:** Tax Invoice issuance is blocked while `vat_mode = not_registered`.
- **ZATCA/FATOORA:** Full ZATCA/FATOORA Phase 2 compliance remains deferred until official VAT registration and a separate approved design.
- **QR/XML/clearance:** QR codes, XML generation, clearance, and statutory reporting remain deferred.
- **Server-generated PDF:** Server-side PDF generation remains deferred (browser print is currently sufficient).
- **Browser print headers/footers:** Customizing browser print headers/footers remains deferred.
- **Document rendering locale:** The authoritative Quotation or Invoice is singular and may later render in Arabic or English. A future stored default rendering locale must not prevent either rendering. Financial data and snapshots are not duplicated, stored business text is not silently machine-translated, and side-by-side bilingual layout remains a separate decision. Locale schema/runtime and font work remain deferred.
- **Formal historical snapshot discriminator:** A persisted discriminator for full quotation versus active Service scope versus synthetic historical shapes remains deferred. The current strict classifier fails ambiguous shapes closed to Invoice-summary-only presentation.
- **Logo upload where still deferred:** Company Logo upload remains deferred.

## 8. UX, Reporting, And Product Expansion Deferrals
- **Temporary expansion gate:** New broad Product, Event ERP, and non-essential major feature-surface expansion is **DEFERRED, NOT CANCELLED** while the active SaaS Performance & Scale Program hardens the current core. The Expansion Master remains strategic reference only and is unchanged. Expansion requires explicit Owner reopening after an acceptable current-core SaaS baseline.
- **Reports and broader reporting:** The Reports surface/read model exists; G3 Reporting Truth / Period Semantics engineering remediation is CLOSED (focused validation 24/24 passed) and Owner product/visual acceptance is PASSED (do not reopen G3). Kept deferred and not-open-as-engineering-defect: selected-period Collected Cash semantics, historical Outstanding-as-of-period-end cutoff, Revenue Recognition, payment terms/credit control, supplier cost/margin, and broader accounting reporting. Broader Reports product enhancements and a separate authoritative management/accounting Reports Center remain deferred product scope.
- **Customer 360 and richer customer reporting:** The Customer 360 surface/read model exists; G3 engineering remediation is CLOSED (focused validation 13/13 passed) and Owner product/visual acceptance is PASSED. The latest-10 contextual invoice preview direction remains planned/documented and not yet implemented; richer customer reporting and a separate full customer profile report remain deferred product scope.
- **Module-specific reports:** Module-specific reports remain deferred.
- **Attachments:** General attachments (storage, permissions, file limits) for quotations, invoices, and customer records remain deferred.
- **Notifications/WhatsApp/email:** Email, WhatsApp, and internal notifications remain deferred.
- **Customer activity timeline:** A unified customer activity timeline remains deferred.
- **Leads/inquiries:** Management of leads and inquiries remain deferred.
- **Event taxonomy:** Formalizing event taxonomy (e.g., specific event types) remains deferred.
- **Search/filter expansion:** Module-local search and major list/filter foundations exist; W5 search/accessibility defects are current G10 remediation. Global search remains intentionally absent/deferred, while unrelated future polish remains deferred.
- **Business Year expansion beyond bounded list semantics:** The approved bounded Business Year foundation exists for temporal list routes; G3 period semantics engineering remediation is CLOSED. Broader calendar/fiscal expansion remains deferred.
- **Service Hub:** Richer hub behavior (notes, attachments, and expansion beyond the delivered Activity History and explicit lifecycle actions) remains deferred.
- **Advanced Dashboard expansion:** The current Dashboard workspace/hierarchy is delivered and owner-accepted, and remains intentionally outside Business Year scope; current bounded-read work remains remediation. Broader role-specific management, finance, and operations dashboards remain deferred.

## 9. Data And Technical Debt
- **Legacy Project cleanup:** Reviewing project types/mock data, project permissions, `projects`/`project_tasks` legacy schema, customer `projects_count`, and supplier PRJ mock references remains deferred.
- **Numbering gaps as DEV/DEMO history:** Invoice numbering gaps are treated as development/smoke history. Do not reset or renumber.
- **Remaining schema/type mismatches:** Any remaining schema/type mismatches remain deferred.
- **Migration rollback process:** Formalizing a migration rollback procedure remains deferred.
- **Data normalization:** Further data normalization remains deferred.
- **Remaining mock/demo cleanup:** Auditing remaining mock/static app surfaces before further live-data polish remains deferred.

## 10. Historical And Superseded Notes
- **ERP-3B / Feature 001:** `001-erp-3b-invoice` is closed and historical. Its unchecked tasks are preserved as planning evidence and are not an active backlog. Current source and ordered migrations are authoritative.
- **ERP-1:** Historical / Superseded Planning Note. Refers to the initial CRM/Service flow. The basic corresponding implementation is already complete. See `project-status.md`.
- **ERP-2:** Historical / Superseded Planning Note. Refers to quotation approval flow. The basic corresponding implementation is already complete. See `project-status.md`.
- **ERP-3 / ERP-3A / Full Invoice Schema:** Historical / Superseded Planning Note. Refers to basic invoice integration. Basic customer invoice/payment creation is implemented in DEV/DEMO. Financial correction workflows remain deferred.
- **ERP-4:** Historical / Superseded Planning Note. Payment integration is implemented in DEV/DEMO. Financial reversal and refund workflows remain deferred.
- **Phase 7A–7D / Phase 8:** Historical / Superseded Planning Note. Old roadmap phases; basic implementation is complete. See `project-status.md`.
- **Raw Error Exposure / Viewer Bank Detail Masking:** Historical / Superseded Planning Note. Current documented verification is passed.
- **Supplier Booking (Full):** Historical / Superseded Planning Note. Narrow internal Service-scoped V1 exists. Standalone broader features remain deferred. See Section 5.
- **Dashboard Real Data:** Historical / Superseded Planning Note. Implemented live summary/list milestones are complete. Advanced reporting remains deferred. See Section 8.
- **List Pagination Parity / Invoice List Sort:** Historical / Superseded Planning Note. Current documented verification is passed.
- **Repository reconciliation:** Historical / resolved after G0. The canonical `main` checkout and retired historical worktree are recorded in `project-status.md` and `project-roadmap.md`; checkout reconciliation is no longer an active deferral.
