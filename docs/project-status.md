# G7 BLUE CRM - Project Status

## 1. Project Overview
- **Project Name:** G7 BLUE CRM
- **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, Clerk Auth, PostgreSQL RPC
- **Purpose:** A robust CRM tailored for G7 BLUE, managing customer relationships, event work, financial documents, payments, and operational tracking.
- **Product Direction:** G7 BLUE CRM is an Events CRM + Billing system, not a generic billing-only CRM.
- **Core Flow:** Customer Profile -> Service -> Quotation -> Invoice -> Payment
- **Core Entity:** Service / Booking is the operational entity for new ERP work, not Project.
- **Current VAT Field:** The implemented Company Settings VAT field is `company_settings.vat_mode`.

## 1.1 Confirmed Company Identity & Document Rules
- **Legal English Name:** G SEVEN BLUE Company
- **Brand Name:** G7 BLUE
- **VAT Status:** Not VAT registered.
- **TIN / Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ù…ÙŠØ²:** 3146944674 (Do not use TIN as VAT Number)
- **Entity Unified No:** 7053901414 (Do not treat as CR unless confirmed)
- **VAT Number:** null / not applicable / not available
- **Official Email:** [info@g7blue.com](mailto:info@g7blue.com)
- **Official Mobile:** +966 55 570 0349
- **Website:** g7blue.com
- **City:** Riyadh, Saudi Arabia
- **National Address:** Short Address: RBDA7036, Building No: 7036, Street: Sayida / ØµÙŠØ¯Ø§, District: Al Duraihemiyah Dist. / Ø­ÙŠ Ø§Ù„Ø¯Ø±ÙŠÙ‡Ù…ÙŠØ©, Secondary No: 2487, Postal Code: 12796, City: Riyadh / Ø§Ù„Ø±ÙŠØ§Ø¶
- **Bank Details:** Alinma Bank / Ù…ØµØ±Ù Ø§Ù„Ø¥Ù†Ù…Ø§Ø¡ | Account No: 68207417001000 | IBAN: SA5005000068207417001000
- **Official Logo Asset:** `public/brand/G7_BLUE_Events_Icon_White_BG.png` (Public path: `/brand/G7_BLUE_Events_Icon_White_BG.png`)

### Document Generation Rules
- **Quotation Documents:** Must show logo, legal name, brand name, TIN, and bank/payment info. Must NOT show VAT Number, Tax Invoice wording, VAT 15%, or ZATCA/FATOORA claims while `vat_mode = not_registered`.
- **Deposit/Proforma/Receipts:** Allowed while not registered. Must NOT claim to be Tax Invoice, display VAT Number, or calculate VAT 15%. Must use VAT rate 0.
- **Tax Invoice:** Blocked while `vat_mode = not_registered`. Remains deferred until official VAT registration and VAT Number are confirmed. ZATCA/Phase 2 deferred.
- **Snapshot Rule:** Generated customer-facing documents must snapshot company details, financial values, VAT mode, VAT rate, document labels, logo path, and bank/payment details at issue time. Historical documents must not change if Company Settings change later.
- **CR Status:** CR number is optional/unconfirmed.
- **Official Email:** Must be stored as a plain email string without markdown.

## 1.2 Event ERP Expansion Rebaseline

- The Event ERP expansion is an approved strategic direction, not an active implementation feature.
- Current V1 delivery work continues; the expansion is a separate product-rebaseline and field-discovery stream.
- No accounting, procurement, multi-tenant, multi-company, VAT, ZATCA, or AI implementation was activated by this documentation task.
- Feature 009 remains inactive.
- Service remains the operational context and mutation authority; current quotation, Approved Billing Scope, invoice, payment, auditability, no-hard-delete, responsive, Feature 007, and Feature 008 rules remain preserved.
- ABS Void is delivered as a bounded internal-control capability; Supersede remains excluded and deferred as a separate revision workflow. Feature 009 remains inactive and no new feature was activated by this rebaseline.
- **Sole strategic expansion reference:** `docs/product/G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md`. Earlier expansion documents remain historical evidence only.
- **Tender / Bid Management:** future deferred expansion. Discovery may begin now, but detailed Tender, Technical Proposal, Financial Proposal/BOQ, submission, and AI-assistance authority remains exclusively in the Expansion Master.

## 1.3 Historical Review and Remediation Checkpoint (11 August 2026)

- **Historical phase at this checkpoint:** `G3 CLOSEOUT / G4 NEXT GATE — BOUNDED READ PATHS AND SCALE`. The current repository position is recorded in the G7-RB1 rebaseline below.
- **Review campaign:** OCR discovery Waves 0-9, cross-wave consolidation, and the Final Remediation Master Plan are complete. Detailed evidence remains in the external read-only `baseline-90adf8f` campaign package and is not repository-controlled.
- **Current confirmed findings:** 49 total — 0 Critical, 5 High, 39 Medium, and 5 Low. Three future SaaS/migration concerns and zero architectural blockers remain separate from the current-finding total.
- **Remediation program at this checkpoint:** 12 Goals, G1 through G12. G1 is closed and pushed (`e34ea417...`). G2 payment-precision implementation and its canonical migration are present, and the migration is applied on DEV/DEMO; this rebaseline does not independently re-assert Owner acceptance or full G2 closeout. G3 reporting truth and period semantics work was progressed through checkpoints `6bdc87b` and `cbc39f0`, later published in the accumulated `main` history without inferring full Goal closure or Owner acceptance.
- **Repository baseline at this checkpoint:** `D:/G7/g7-crm` on branch `main`, with the then-recorded remote baseline `origin/main` at `7b0bb0b5adeb047e6905f5091071a445b1f91faa`. The current verified HEAD, divergence, and dirty-work boundary are recorded below; no push authority is claimed.
- **G3 implemented contracts:** Authoritative `issued_at` invoice periodization (no `created_at` fallback); live Billed/Invoiced reporting excludes draft, cancelled, and voided invoices; customer overview resolves older transacting customers without filtering by customer `created_at`; Riyadh timezone (+03:00) period boundaries with exclusive next-day timestamp boundaries; permission-unavailable metrics render as null/unavailable (`"—"`) without fake zeros; bounded 500-row reads replaced by deterministic exhaustive pagination advancing by actual received row counts until empty page; corrected top-N ranking counts; and Customer 360 financial summary parity (`totalInvoiced`, `totalCollected`, `outstandingBalance` live-only, permission-null, and un-truncated multi-page pagination).
- **Verification and Code Review:** Full workspace test suite passes **978/978 across 85 files** (focused Reports Center 24/24, focused Customer 360 9/9), TypeScript `tsc --noEmit` clean (exit 0), ESLint exit 0 with only the two inherited PDF `<img>` warnings, `git diff --check` clean with 0 whitespace issues, and Open Code Review is **CLEAN** after remediation.
- **Owner Acceptance status:** Owner visual/manual acceptance remains pending where existing governance requires it; no claim of owner acceptance or production readiness is made.
- **Deferred G3 Scope / Accounting Policy:** Remaining recommendation and accounting slices are deferred without inventing decisions: selected-period Collected Cash, historical Outstanding-as-of-period-end cutoff, Revenue Recognition, payment terms/credit control, supplier cost/margin, and other deferred accounting policy.
- **Historical next controlled gate:** `G4: Bounded read paths and scale` (mapped to `M-02`, `M-04`, `W3-PERF-005`, `W3-QUERY-001`, `W3-SCALE-003/004`). The current next controlled action is recorded in the G7-RB1 rebaseline below.
- **Closed Post-G1 foundations:** Cleanup & Rebaseline, DEV/DEMO Data Hygiene, UX/Loading Stabilization, and Customer Document Architecture Correction are closed and pushed.
- **POST-G1 Task 2B evidence (8 August 2026 — historical, superseded current baseline):** After the completed mock/test reset, the authorized DEV/DEMO project received a deliberate database-seeded baseline of 10 synthetic active customers, 10 synthetic active suppliers, and 10 synthetic `Inquiry` services. The former zero-quotation/zero-invoice state is historical; current aggregate DEV/DEMO state is recorded in the G7-RB1 rebaseline below.

## 1.3A Current Published Checkpoint (16 August 2026)

- **Verified repository:** `D:/G7/g7-crm`, branch `main`, local HEAD and `origin/main` are both `3143f3eddbeb8dfd8d347e7e79c88e04b712bfdb`; divergence is `0 ahead / 0 behind`. The index is clean before this run.
- **Published G3 closure checkpoint:** `3143f3eddbeb8dfd8d347e7e79c88e04b712bfdb` (`fix(g3): align customer 360 recent financial activity`). G3 Reporting Truth / Period Semantics engineering remediation is **CLOSED**. Reports focused validation passed 24/24; Customer 360 focused validation passed 13/13; TypeScript, ESLint (0 errors, 2 inherited PDF `<img>` warnings), and `git diff --check` passed; independent review was **CLEAN** with 0 BLOCKING, 0 MATERIAL, 0 MINOR.
- **Acceptance & Scope Boundary:** These engineering and publication results do not constitute Mozfer Owner visual/manual/product acceptance; that acceptance remains explicitly **PENDING SEPARATELY**. Kept deferred and not-open-as-engineering-defect: selected-period Collected Cash semantics, historical Outstanding-as-of-period-end, Revenue Recognition, payment terms/credit control, supplier cost/margin, and broader accounting reporting. Broader Reports and richer Customer 360 product enhancements remain deferred product scope.
- **Remediation program status:** G9 Supplier / Rate Card is **COMPLETE / PUBLISHED / DEV-DEMO VERIFIED**; do not reopen it.
- **Current Goal boundary & Next gate:** The serial relationship `G3 -> G9 -> G8 -> G11 -> G12` is preserved. Because G3 and G9 are complete, `G8: Family-specific create replay` is the next serial gate only; G8 is **NOT active** and requires separate Owner authorization. G11 remains downstream of G8. No database apply, deployment, production readiness, or Owner acceptance is inferred from Git publication.

## 1.3B Historical G7-RB1 Rebaseline (13 August 2026)

- **Verified repository:** `D:/G7/g7-crm`, branch `main`, local HEAD `6564fa2a75d46269466c82c0a5f94246e0997031`, tracking `origin/main` at `7b0bb0b5adeb047e6905f5091071a445b1f91faa`, divergence `10 ahead / 0 behind`. The index is clean; the worktree is dirty.
- **Local-only work:** The current local sequence includes G3 reporting (`6bdc87b`, `cbc39f0`), G4 read-path work (`15af20b`, `e13e5d2`), G5 admin mutation work (`185905c`), G6 payload/log minimization (`6b355b2`), G7 failure-boundary work (`6564fa2`), governance/agent changes (`11d4ef6`, `bfd4a21`), and the G3 documentation checkpoint (`c507244`). These commits are local-only and unpushed; commit subjects do not independently prove validation, Owner acceptance, or production readiness.
- **Dirty-work boundary:** Four protected inherited source paths remain modified and are excluded from this documentation task. Other local modifications and untracked test work remain preserved. Protected build-watch artifacts remain unenumerated and uninspected.
- **Verified DEV/DEMO aggregate state:** `customers=10`, `services=10`, `quotations=1`, `approved_billing_scopes=1`, `invoices=2`, `payments=0`, `suppliers=10`, `audit_logs=5`. Non-sensitive lifecycle classification: one approved quotation, one approved billing scope, one approved Service, nine Inquiry Services, one draft Deposit Invoice, and one draft Final Invoice. Applied migration history includes `20260810090430_g2_payment_precision_reject`.
- **Current schema facts:** `quotations.event` exists; `quotations.event_name` does not exist; `services.event_name` exists; `invoices.discount_amount` does not exist. No database mutation was performed by this task.
- **G7-RUNTIME-001:** Dashboard failure `column quotations.event_name does not exist`. Classification: `APPLICATION_QUERY_SCHEMA_CONTRACT_MISMATCH`; control-layer failure class: `VALIDATION_FAILURE`. The defect is recorded only; no repair decision is made.
- **G7-RUNTIME-002:** Invoice failure `column invoices.discount_amount does not exist`. Classification: `APPLICATION_QUERY_SCHEMA_CONTRACT_MISMATCH`; control-layer failure class: `VALIDATION_FAILURE`. Whether the field should be removed, remapped, or introduced remains unresolved and is not decided here.
- **Delivery truth:** G2 implementation and migration application are evidenced, but this rebaseline does not infer Owner acceptance or full closeout. G3-G7 are current local-only/unpushed engineering work and are not labeled pushed, merged, fully validated, Owner-accepted, or production-ready.
- **Blockers and decisions:** Runtime contract mismatches, dirty/protected local work, unpushed commits, pending Owner/manual acceptance, and missing current live repair authorization remain active warnings. The Expansion Master remains strategic/domain context only and does not become current Git or task authority.
- **Exact next controlled action:** Compile one separate bounded repair Task Contract for the first Owner-selected runtime contract defect; do not select or implement the repair automatically.

## 1.4 Delivered Product / Workspace Baseline Before Remediation

- **DELIVERED + OWNER-ACCEPTED — Goal 2A loading/motion foundation:** Motion and destination-shaped workspace loading were delivered in `5429e7642bd3d763809e0de453cc131f2c90921c`; fast operations remain silent and the lightning/bolt loading motif is not part of the current contract.
- **DELIVERED + OWNER-ACCEPTED — Goal 2B/2C workspace/list baseline:** Business Year context, bounded list foundations, explicit-submit customer search, Supplier Directory presentation, Dashboard workspace hierarchy, and the related acceptance contract are represented by the verified sequence `f20b240dcc6e1197167aec802c57b59201df0333`, `820b01f79a19d871b86c120e3c2f78b474596f4b`, `c2b699d8dac8ccbc64e5f511aff4931401cd099b`, `195b4c62d0e1f599513e338095fe71ff7a15777f`, `c9f12cf13299cb79e2a76b4127e58a16851b3548`, and `8e54b80d4ec7376e4d6cd77d044ee5654e3bd5b3`.
- **DELIVERED / ACCEPTANCE PENDING — Business Year and list contracts:** Business Year is bounded to temporal list routes with server-readable preference/cookie and year parameters; Dashboard, Customers, Suppliers, Users, and Settings remain outside its scope. Services use overlap semantics, Quotations use quotation date, Payments use payment date, and invoice-date periodization follows authoritative issued date under G3. Broader calendar/fiscal expansion remains deferred.
- **DELIVERED + OWNER-ACCEPTED — Module-local search and list direction:** Search starts from `Select / اختر`, uses explicit submit where approved, fails closed for invalid URL modes, and preserves meaningful punctuation after bidi/edge-whitespace sanitization. Global search is intentionally not a missing current feature.
- **DELIVERED + OWNER-ACCEPTED — Customer and Supplier Directory foundations:** Explicit-submit customer search and Supplier Directory presentation are delivered; Supplier location is shown as separate bidi-safe City, Coverage Area, and Country values, and Rating remains hidden.
- **COMPLETE / PUBLISHED / DEV-DEMO VERIFIED / OWNER ACCEPTANCE PENDING — Supplier Rate Card V1:** Supplier Rate Card V1 authority is COMPLETE, PUBLISHED, and DEV-DEMO VERIFIED under G9 (do not reopen it); Owner visual/manual acceptance remains pending separately.
- **DELIVERED + OWNER-ACCEPTED — Dashboard:** The current command workspace/hierarchy is delivered and intentionally not Business-Year scoped. Broader role-specific management, finance, and operations dashboards remain future expansion; bounded-read/scale remediation was addressed under G4; G3 reporting truth is closed.
- **DELIVERED / ACCEPTANCE PENDING — Reports and Customer 360:** Both surfaces/read models exist. G3 Reporting Truth / Period Semantics engineering remediation is CLOSED (Reports focused validation 24/24, Customer 360 focused validation 13/13). Owner product/visual acceptance remains pending separately; broader Reports and richer Customer 360 enhancements remain deferred product scope. Neither surface is a missing future feature.
- **FUTURE / DEFERRED:** Accounting/journal/periods, expenses/cash control, procurement/RFQ/PO, supplier AP, actual cost/margin, Event Operations expansion, broader dashboards, multi-company/SaaS activation, ZATCA, and future localization/currency/country/compliance remain separately deferred.

## 2. Working Rules
- **Workflow:** Plan -> Implement -> Build -> Manual Test -> Audit -> Commit -> Push -> PR -> Merge
- **Security:** No `.env.local` exposure; never committed to Git.
- **Git:** No `git add .` (only stage intentionally modified files).
- **Database:** No migrations without strict review; PostgreSQL RPC is the absolute source of truth for financial totals.
- **Data Access:** Supabase Admin client runs server-side only; all write Server Actions enforce `requirePermission`; no raw Supabase errors exposed to UI.
- **Docs:** After merged phases, manual database/Supabase apply or verification, smoke tests that change completion status, or Team Lead decisions, update `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` when applicable. Before committing docs, run the documentation staleness audit in `docs/project-roadmap.md`.
- **Tracking hierarchy:** `project-status.md` records delivered state and active phase; `project-roadmap.md` records execution order, Goals, gates, and future direction; `deferred-decisions.md` records unresolved, partial, or intentionally deferred decisions only; the Expansion Master remains the sole Event ERP/SaaS strategy reference; the external OCR archive remains frozen detailed evidence.

## 2.1 Current Product Position
- **Latest delivered V1 financial and Service lifecycle milestone:** The six-commit sequence `4016cf7`, `db7bee8`, `dca4a77`, `907b54a`, `d978557`, and `cf4d4ae` is complete and pushed. It covers quotation approval with automatic internal ABS activation, ABS Void, explicit Service lifecycle actions, compact Service-page workflow, Billing Summary, evidence-based Activity History, Deposit settlement audit, and Completed Final billing.
- **Current delivered lifecycle behavior:** Migrations `20260803090000_quotation_approval_internal_abs_activation.sql` through `20260803130000_deposit_service_audit_and_completed_billing_fix.sql` provide the forward-only quotation, ABS, Service lifecycle, cancellation, deposit-audit, and Completed billing contracts. DEV/DEMO application and verification are owner-confirmed for this milestone; production apply/readiness is not claimed.
- **Delivered validation evidence:** The milestone reported 290/290 focused tests, lint with two existing PDF `<img>` warnings and no lint errors, TypeScript, and build passing. Manual smoke confirmed the bounded Service/Deposit/Final lifecycle and duplicate/remaining-ceiling guards; this documentation task does not repeat browser or database verification.
- **Next-work boundary:** No implementation feature is currently active or selected. Owner selection is required before another V1 slice; Supersede, richer financial correction, Change Orders, and accounting expansion remain separately deferred.
- **Feature 007 Quotations eligible-Service selector:** Fully implemented, reviewed, remediated, browser-accepted, committed, and pushed. The global Quotations entry opens the eligible-Service selector and deep-links only to `/quotations/new?serviceId=<selected-service-id>`. Independent review found one focus-return accessibility issue, it was remediated, and focused revalidation passed.
- **Feature 007 authority boundary:** The selector remains Service-scoped and read/navigation-only. It does not create a Quotation, accept an independent customer, submit financial values, duplicate `createQuotation` or `create_quotation_with_items`, or introduce a second mutation authority. The active packet is now the completed Feature 007 documentation/implementation record at `specs/007-quotations-eligible-service-selector`.
- **Feature 008 invoices eligible-Service chooser & Service Billing Workspace:** Fully implemented, validated, independently reviewed, owner-accepted, committed, and pushed. Feature 008 was delivered through commit `e9414227b9825cc301906c5052e2700f1f110e96` as the final Feature 008 delivery commit. After the controlled Feature 008 push under token `G7-FEATURE-008-CONTROLLED-PUSH-1-PASS`, local `main` and `origin/main` were verified synchronized at this delivery synchronization point, divergence at that verification point was verified at `0 0`, and the working tree was clean. The global Invoices page exposes one `Create Invoice` CTA, presents a Deposit vs Final chooser, opens a type-specific eligible-Service selector, and deep-links to the dedicated Service Billing Workspace (`/services/[id]/billing?intent=deposit|final`). Legacy deep links (`/services/[id]?invoiceAction=...`) issue a backward-compatible HTTP 307 redirect.
- **Feature 008 status & evidence:** All runtime and delivery documentation commits were successfully pushed. Automated validation passed (focused tests 26/26, invoice dictionary 13/13, lint 0 errors, tsc 0 errors, unit tests 9/9, build success). Independent runtime and documentation reviews passed (`G7-FEATURE-008-POST-SYNC-FINAL-REVIEW-1-PASS`). Mozfer manual visual smoke passed (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`). Feature 008 has no remaining product or runtime delivery gates. This document update is an administrative closeout evidence recording, does not change Feature 008 runtime scope, and does not reopen delivery gates. A later administrative documentation commit may advance `main` beyond `e9414227b9825cc301906c5052e2700f1f110e96`, but does not alter the Feature 008 delivered-through commit.
- **Latest Quotation/Invoice UX batch:** The delivered batch at `2151232f3db759d90eceb4af3fc534ed186fe8b1` refined the Quotation eligible-Service chooser, added the Quotation list Print/PDF action, refined the Invoice eligible-Service chooser, and localized the Service Billing Workspace status badge. It preserved existing workflow, eligibility, permission, navigation, financial, and PDF-route boundaries.
- **Feature 006 Invoice PDF customer cleanup — closed/historical:** Implementation, independent review, owner acceptance, commit, push, and Mozfer-owned repeat Print Preview acceptance are complete. The focused contract passed 12/12; Invoice actions remained 38/38; related Invoice suites remained 64/64; lint, typecheck, and build passed with only the documented existing warnings. Accepted short examples `INV-2026-0021` Deposit and `INV-2026-0022` Final each fit one A4 page with truthful item pricing and type-specific summaries. Internal details, notes, terms, preparation/system disclosures, internal identity, and raw quotation UUIDs are absent. Ambiguous historical shapes fail closed, and historical issued snapshots remain immutable. No database, schema, migration, RPC, action, VAT, lifecycle, ABS, Payment, snapshot-builder, or live Quotation lookup change was made.
- **Feature 006 closed state:** `bbc14c950623f079c8fb784d36fd5da76a48e69f` is the pushed Feature 006 closeout head. Long-fixture Print Preview remains outside the supplied acceptance evidence.
- **Historical feature closeout:** `001-erp-3b-invoice` is closed in place. Its unchecked tasks are preserved as historical planning evidence and are not an active backlog.
- **Product sequence:** Feature 007 is complete and historical. Feature 008 implementation, Service Billing Workspace adoption, automated validation, Mozfer manual visual smoke, controlled commits, and remote push are complete. Immediately after the controlled Feature 008 push, local main and origin/main were verified synchronized at the Feature 008 delivered-through commit e9414227b9825cc301906c5052e2700f1f110e96. Neither entry point may create a standalone document or add a second mutation authority.
- **Completed customer-output baseline:** Quotation PDF cleanup is completed and pushed at `09bbe3b08aae64c1ec8c6e2e36e0d740e8ff02ae`.
- **Later separately designed programs:** Company Expenses, direct Event costing, Procurement/RFQ/PO, Vendor Bills/Supplier AP, Supplier Credits/Payments, and Event Margin.
- **Document-language architecture:** one authoritative Quotation or Invoice renders selectable Arabic or English representations through transient presentation state. Stored business text is never silently machine-translated; permanent AR/EN commercial-field placement remains gated by the final commercial hierarchy.
- **Graphify:** the index remains stale. Force remediation/refresh is deferred and Graphify is not implementation proof.
- **Readiness boundary:** no production-readiness, VAT-readiness, ZATCA-readiness, backup-readiness, or accounting-finality claim is made.
- **Workspace Location and Governance Rules:**
  - Sole canonical active checkout: `D:/G7/g7-crm`; future implementation tasks operate here unless Mozfer explicitly authorizes a different checkout.
  - Canonical branch: `main`; current documentation-rebaseline authority: `93d3f132b3ff756f4c49904da8622e40babdaa18`. The former `90adf8f` value remains historical discovery evidence only.
  - Retired historical checkout (do not access, inspect, modify, compare, clean, or reuse): `C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5`.
  - No new worktrees or branches are authorized by this decision; silent path switching and manual copying or merging remain prohibited.
  - Existing recovery/candidate assets remain protected and untouched; the four build-watch logs remain protected untracked files.
- **Supplier Operations V1:** internal Service Detail Allocations and Supplier Bookings are implemented for Admin/Manager under server permission gates. The slice validates `NUMERIC(10,3)` quantity and `NUMERIC(14,2)` unit cost, distinguishes load failure from genuine empty state, applies Supplier lifecycle checks to Booking creation and Allocation restore, locks Allocation mutations while an active Booking exists, and uses conditional affected-row checks for Allocation and Booking mutations. Rate-card allocation creation enforces active date validity and rate-card allocations cannot be deleted or restored.
- **Validation/runtime evidence:** 59 focused tests plus lint, Next type generation, TypeScript, and production build passed for the closeout. Codex browser automation could not render the G7 login DOM despite a healthy local Next.js server; this is an automation-tool blocker, not an observed application failure. Mozfer approved milestone closeout without further browser smoke. DEV/DEMO and production-readiness claims remain separate.
- **Atomic Invoice create (DEV/DEMO code path closed):** migration `supabase/migrations/20260717180000_atomic_invoice_create.sql` pushed as `5ad23f25`, **manually applied + verified in DEV/DEMO** (Mozfer evidence), and **application integrated** in `a83c1d28` — Deposit and Final creation route only through `public.create_invoice_atomic` via service-role `createAdminClient` (no multi-query create write; no silent fallback).
- **One active Deposit per Service (DEV/DEMO applied):** `supabase/migrations/20260722120000_enforce_one_active_deposit_per_service.sql` was manually applied and verified on 2026-07-23 in project `dpddrqjzqohexixgdqiq`. The Service-wide active Deposit unique index, hardened Atomic Invoice RPC, Final guard, role execution boundary, and zero-duplicate aggregate were verified; production was not accessed. Repository migration history was not repaired or marked, and this does not claim recorded history for version `20260722120000`.
- **Financial lifecycle / atomic create milestone count:** **20** meaningful commits from baseline `a32be762` to HEAD `a83c1d28` (includes Wave A financial lifecycle stack, atomic contract/migration/DEV apply docs, and Task 20 app integration).
- **Financial lifecycle application source wave:** **pushed** to `origin/main` through `45cdfb73` (ten source/test commits). Atomic Invoice RPC + app integration are pushed through `a83c1d28` and installed in DEV/DEMO only.
- **Active implementation state:** No implementation task is active. Feature 008 and the latest Quotation/Invoice UX batch are delivered; Feature 009 remains inactive.
- **Design complete:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` → `docs/approved-billing-scope-management-design.md`.
- **ABS read-enrichment complete (source + accepted):** `ABS-MGMT-UI-READ-ENRICH-1` — Service Detail read-only ABS summary card enriched and pushed on main.
- **ABS draft-edit/discard complete (source + accepted):** `ABS-MGMT-UI-DRAFT-EDIT-1` — draft item edit/discard UI implemented, automated validation passed, PASS by Mozfer manual browser evidence recorded, and pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`.
- **ABS review/approve complete and pushed:** `ABS-MGMT-UI-REVIEW-APPROVE-1` — automated validation passed and PASS by Mozfer manual browser evidence recorded; committed and pushed in `d8b654f2c89622837b75531aa44d79a66e024ad8`.
- **ABS UI delivery state and remaining gaps:**
  1. `ABS-MGMT-UI-READ-ENRICH-1` **complete** (source implemented; accepted)
  2. `ABS-MGMT-UI-DRAFT-CREATE-1` **complete** (source implemented; PASS by Mozfer manual browser evidence; pushed on main in `47d9a4f14f019e837224e6db6cababdab12a7610` and `7054cf34654266ca033c58c62f9dca6d94092967`)
  3. `ABS-MGMT-UI-DRAFT-EDIT-1` **complete and pushed** on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`
  4. `ABS-MGMT-UI-REVIEW-APPROVE-1` **complete and pushed** in `d8b654f2c89622837b75531aa44d79a66e024ad8`
  5. `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-1` **complete**
  6. migration/RPC preflight, SQL review, DEV/DEMO apply, read-only post-apply verification, actions, and tests **complete**
  7. successful lifecycle mutation smoke + independent review **complete** (DEV/DEMO synthetic)
  8. application financial lifecycle stack (money, exposure, lifecycle, RBAC, authority modes, ABS history alignment, Deposit/Final actions, Service billing UI, Quotation display-only authority) **implemented, tested, DEV/DEMO browser-accepted (PASS WITH WARN), and pushed** through `45cdfb73`
  9. atomic Invoice create RPC migration **pushed** (`5ad23f25`) and **installed + verified in DEV/DEMO** (metadata, grants, dry-checks; no real Invoice created)
  10. application Invoice create integration **complete and pushed** (`a83c1d28`) — Deposit/Final route through `create_invoice_atomic`; focused invoice action tests **46/46** PASS; DEV/DEMO Admin runtime smoke **PASS** (Deposit `INV-2026-0032`, Final `INV-2026-0033`)
- **Delivered ABS state:** Quotation approval now creates/activates the internal authority snapshot; the normal Service page presents Billing Summary rather than a manual ABS workflow. The nested technical scope surface retains evidence and the delivered Void action. Supersede application/UI remains absent and deferred. Scope status remains `draft | approved | voided`; **`superseded` is not a DB status** (use `superseded_at` / relationship).
- **Financial lifecycle policy:** **`ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED`** remains the governing decision. Delivered Void stops future billing, requires zero applicable Invoice exposure and zero payment history, retains historical authority evidence, and does not mutate invoices/payments; successor activation and broader financial correction remain separate future work.
- **Browser/manual smoke rule:** Practical browser/manual smoke remains user-controlled by default. It may be delegated to an agent only through explicit bounded user authorization. The completed financial lifecycle browser acceptance was executed in DEV/DEMO under such explicit authorization (verdict `ABS_MGMT_FINANCIAL_LIFECYCLE_GROK_BROWSER_ACCEPTANCE_CLOSED_WITH_WARN`).
- **Durable flags:**
  - Responsive P0 manual smoke: **closed** — see Responsive core P0 below (**PASS by Mozfer manual browser evidence**). No responsive-smoke blocker remains.
- **Historical / superseded V1 critical-path sequence:**
  > Retained as an earlier planning record. This sequence is not current execution authority. Its then-deferred Void UI item is superseded by the later delivered milestone; successor UI and other follow-up items remain separate future work.
  - Original recorded sequence: prior UI slices complete/pushed -> financial lifecycle design docs -> design commit -> migration/RPC preflight -> SQL/migration review -> separate DEV/DEMO apply and read-only verification -> actions/tests -> successful lifecycle mutation smoke (**complete**, DEV/DEMO synthetic) -> application financial lifecycle stack (**pushed** through `45cdfb73`) -> atomic Invoice create contract + migration push + DEV/DEMO apply verification (**complete** through `5ad23f25`) -> application integration of create through RPC (**complete** at `a83c1d28`) -> Task 20 DEV/DEMO Admin runtime smoke (**PASS**) -> history/read polish -> Void UI -> successor UI -> optional role browser smoke.
- **Preserved locks:** Customer Profile -> Service -> Quotation -> Invoice -> Payment; Service as operational core; no standalone top-nav ABS module; current active-scope ceiling behavior remains factual; future fallback is allowed only before approved ABS authority has ever existed; existing invoices/payments are never rewritten; DEV/DEMO wording; no VAT/ZATCA/FATOORA or production-readiness claim.

### Responsive core P0 (source implemented; Mozfer manual smoke PASS)
- [x] Audit `RESPONSIVE-CORE-P0-AUDIT-1` completed (`RESPONSIVE_CORE_P0_AUDIT_COMPLETE`).
- [x] Implementation `RESPONSIVE-CORE-P0-IMPLEMENT-1` source complete (`RESPONSIVE_CORE_P0_IMPLEMENTED`).
- [x] Automated validation: responsive-core + affected module + visual-acceptance **107/107 PASS**; focused ESLint PASS; `tsc --noEmit` PASS.
- [x] **Body-overflow remediation** `RESPONSIVE-CORE-P0-SMOKE-FIX-1` source implemented (dashboard shell `min-w-0` containment; DataTable / Related Quotations local-scroll width constraints; Service Detail status Blocked Actions wrap; Supplier Allocations header stack/wrap; billing calculation row wrap). No global `overflow-x-hidden` concealment.
- [x] **Manual browser re-smoke:** `RESPONSIVE-CORE-P0-MOZFER-RE-SMOKE-1` — **PASS by Mozfer manual browser evidence.** Agent did **not** perform browser smoke.
- [x] Durable responsive-smoke blocker is closed; no unresolved active flag remains.
- **Implemented scope (source contracts):**
  - quotation line-item mobile stacking (`grid-cols-1 md:grid-cols-12`)
  - quotation date/financial-field stacking (`grid-cols-1 md:grid-cols-2`)
  - service create/edit date stacking
  - logical RTL/LTR filter/search icon positioning (`start`/`end`, `ps`/`pe`)
  - related-quotation header wrapping
  - invoice search-width correction
  - accepted table-local scrolling preserved
  - dashboard flex main column width containment and Service Detail body-overflow fix
- **Exclusions:**
  - Supplier mobile detail / panel fallback deferred to full Supplier redesign (`R-P0-02` / `DEFERRED_SUPPLIER_REDESIGN`)
  - no PDF body changes
  - no Clerk widget changes
  - no SQL/schema/RBAC/workflow changes
  - no production-readiness claim


## 3. Completed Milestones

### Hardened Payment Recording and Table Pagination Layout (through `ded8daa`)
- [x] Migration file: `supabase/migrations/20260718190000_payment_recording_hardening.sql`.
- [x] Migration commit pushed on `main`: `d392405` (`feat(payments): add atomic settlement migration`); reviewed and pushed.
- [x] Canonical contract: `docs/atomic-payment-recording-contract.md`.
- [x] **Mozfer manual DEV/DEMO apply:** migration executed successfully on the DEV/DEMO dataset only (not production).
- [x] **Post-apply metadata verified:** function `public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)` exists; returns `TABLE(error_code text, payment_id uuid, payment_number text, amount_paid numeric, balance_due numeric, invoice_status text)`; language `plpgsql`; `SECURITY DEFINER` true; fixed `search_path` = `pg_catalog, public`; owner `postgres`.
- [x] **Privilege matrix verified:** `PUBLIC` execute false; `anon` execute false; `authenticated` execute false; `service_role` execute true.
- [x] **Application integration complete:** 12 commits pushed on `main` up to `ded8daa1d42d2e63a9eef5a92ac5df01c2f96e1c` (stabilize payment table pagination layout).
- [x] **Automated validation:** all 78 payment-related tests passed (`node --test`). Lint, typecheck (`tsc --noEmit`), and production build succeeded.
- [x] **DEV/DEMO runtime smoke verified (Admin; local application using DEV/DEMO data only):**
  - Fully paid Invoice `INV-2026-0022` with `4,200.00 SAR`, changing payment count from 22 to 23 and total collected amount from `633,221.04 SAR` to `637,421.04 SAR` (+4,200.00 SAR).
  - Status changed to Paid, balance reached 0. Record Payment action disappeared.
  - Preserved accidental DEV/DEMO record `PAY-2026-0021` (amount `50,780.00 SAR` on Invoice `INV-2026-0021` for `SVC-2026-0021`, request ID `cea6c0cd-315b-4d3f-9b9b-75d802ceb5fc`) remains in database pending separately reviewed correction/recovery plan.
- [x] **Not claimed:** production apply, production readiness, or Graphify refresh.

### Supplier Operations V1 Closeout (through `G7-SUPPLIER-OPS-04`)
- [x] Internal Service Detail Allocations and Supplier Bookings implemented under server permission gates.
- [x] Checked logic for decimal quantity, unit cost, status transitions, restore block, active booking locks, and soft delete.
- [x] Committed, validated, and pushed on main.

### Atomic Invoice create RPC + app integration (through `a83c1d28`)
- [x] Migration file: `supabase/migrations/20260717180000_atomic_invoice_create.sql`.
- [x] Migration commit pushed on `main`: `5ad23f257b542aa2edc5d01cf403d7dcd1bd1925` (`feat(billing): add atomic invoice creation RPC`); reviewed and pushed under `G7-FIN-HARDEN-18`.
- [x] Canonical contract: `docs/atomic-invoice-creation-contract.md` (locked before migration).
- [x] **Mozfer manual DEV/DEMO apply:** migration executed successfully on the DEV/DEMO dataset only (not production).
- [x] **Post-apply metadata verified:** function `public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date)` exists; returns `TABLE(error_code text, invoice_id uuid, invoice_number text)`; language `plpgsql`; `SECURITY DEFINER` true; fixed `search_path` = `pg_catalog, public`; owner `postgres`.
- [x] **Privilege matrix verified:** `PUBLIC` execute false; `anon` execute false; `authenticated` execute false; `service_role` execute true.
- [x] **Safe dry-checks (no real Invoice created):**
  - Dry-check 1 → `error_code = invalid_invoice_input`, `invoice_id` null, `invoice_number` null
  - Dry-check 2 → `error_code = invalid_deposit_amount`, `invoice_id` null, `invoice_number` null
  - Dry-check 3 → `error_code = invalid_invoice_input`, `invoice_id` null, `invoice_number` null
  - Invoices for zero Service UUID count = `0`
- [x] No unexpected SQL errors during verification; dry-check codes were stable (no raw SQLSTATE/constraint/stack leakage through `error_code`).
- [x] DEV apply docs recorded in `a14ecc0b` (`docs(billing): record atomic invoice DEV apply`).
- [x] **Application integration complete** (`G7-FIN-HARDEN-20`) pushed as `a83c1d28c416066a5879acf204006af41341ed48` (`feat(billing): route invoice creation through atomic RPC`):
  - Deposit and Final create both call `create_invoice_atomic` only
  - no direct `invoices` insert and no `generate_document_number` in the create path
  - service-role client only; auth/rate-limit/schema/snapshot preparation preserved
  - RPC transport failures and `error_code` rows map to stable non-leaking action errors
  - success returns RPC `invoice_id` / `invoice_number`
  - focused invoice action + presentation tests **46/46 PASS**
- [x] Milestone count from baseline `a32be762` to HEAD `a83c1d28`: **20** meaningful commits.
- [x] **DEV/DEMO runtime smoke verified (Admin; local application using DEV/DEMO data only):**
  - Deposit creation PASS: amount `10,000.00 SAR`, invoice `INV-2026-0032`, exactly one Draft Deposit created, correct Service and Quotation linkage verified.
  - Final creation PASS: server-derived amount `50,840.00 SAR`, invoice `INV-2026-0033`, exactly one Draft Final created, correct linkage verified.
  - Remaining billing authority reached `0.00 SAR`.
  - Deposit and Final creation controls disappeared after full allocation.
  - Duplicate and fully allocated creation was safely prevented.
  - No SQL, stack trace, constraint, or internal database details appeared in the UI.
  - Repository preflight and postflight matched byte-for-byte; no unexpected tracked or untracked files were created.
  - Production was not touched.
- [x] **Not claimed:** production apply, production readiness, or VAT/ZATCA/FATOORA.
- [x] **Task 20 live Deposit/Final create path closeout:** implemented, DEV-applied, automatically tested, and runtime-smoke verified for DEV/DEMO. `issueInvoiceAction` remains a separate update path; some uncommon RPC errors may still use safe fallback presentation.

### Invoice Financial Lifecycle Application Stack (pushed on main through `45cdfb73`)
- [x] Ten source/test commits pushed to `origin/main` ending at `45cdfb73 feat(quotations): add display-only billing authority` (wave also includes money, exposure, lifecycle, action-error presentation, invoice RBAC alignment, five-mode billing authority, ABS history/exposure alignment, Deposit/Final server actions, and Service billing controls).
- [x] Five billing-authority modes are implemented in application code: `active_abs`, `historical_abs_only`, `legacy_quotation`, `no_authority`, and `unavailable`.
- [x] Historical ABS blocks Quotation fallback; active ABS ceiling overrides the Quotation total; legacy Quotation authority requires proven zero ABS history.
- [x] Service-lifetime Invoice exposure sums applicable Invoice `grand_total` for the Service; Draft and other active non-voided statuses can count; soft-deleted, `voided_at`, `voided`, and `cancelled` Invoices are excluded; payments do not reduce exposure.
- [x] Authoritative money helpers distinguish numeric values from unavailable evidence; zero remains a valid amount and is not treated as unavailable; malformed values fail closed.
- [x] Deposit/Final Service lifecycle matrix and control visibility enforce Inquiry/Quoted/Approved (both allowed when other gates pass), Deposit Paid/In Progress (Final only), and Completed/Cancelled (neither).
- [x] Safe localized action-error presentation maps known codes to dictionary messages and uses a generic fallback for unknown/internal evidence (no raw SQL, stack, role, or constraint leakage).
- [x] Service Detail is the Invoice mutation authority (Deposit/Final controls). Quotation Detail is display-only billing authority with navigation to Service billing only.
- [x] Automated validation for the wave: relevant financial suite **459/459 PASS**; TypeScript PASS; lint PASS with two pre-existing PDF `<img>` warnings only; build PASS; `git diff --check` PASS; Graphify source graph refreshed at `45cdfb73`.
- [x] DEV/DEMO browser acceptance (`ABS_MGMT_FINANCIAL_LIFECYCLE_GROK_BROWSER_ACCEPTANCE_CLOSED_WITH_WARN` / **PASS WITH WARN**): Phase 1 authority/presentation lanes; linked-invoice reconciliation; Deposit exact-remaining on `SVC-2026-0017` → `INV-2026-0030` (SAR 1,000); Direct Final on `SVC-2026-0018` / `QT-2026-0022` → `INV-2026-0031` (SAR 100); both paths reached remaining zero and Fully allocated with no duplicate Invoice.
- [x] Accepted browser limitations: Deposit-above-remaining browser lane remains AUTOMATED-EVIDENCE-ONLY; dedicated Manager and Accountant browser sessions were not run; some lifecycle statuses rely partly on automated evidence; immediate success screenshots timed out but were replaced by success text, after-state, and Invoice detail evidence; **no production-readiness claim**.
- [x] Retained DEV/DEMO smoke evidence (protected from cleanup; not customer data): `SVC-2026-0017`, `INV-2026-0030`, `SVC-2026-0018`, `QT-2026-0022`, `INV-2026-0031`, `SVC-2026-9001` through `SVC-2026-9005` where applicable, and `ABS_LIFECYCLE_SMOKE_300d4edd-5c8e-45bc-bc85-b4f033750a14`.
- [x] Residual accepted non-blocking technical debt is recorded under deferred decisions. Residuals **1–4** for the live Deposit/Final create path are **closed** by DEV/DEMO-installed + app-integrated + runtime-smoke-verified `create_invoice_atomic` (`a83c1d28`). Remaining caveats: production not claimed; `issueInvoiceAction` remains a separate update path; some RPC error codes still use safe presentation fallback.

### ABS-MGMT-UI-DRAFT-CREATE-1 (source implemented; Mozfer manual smoke PASS)
- [x] Service Detail exposes Create Draft only to Admin/Manager when there is an approved, non-deleted quotation and the Service has zero ABS records across all statuses/history.
- [x] Existing draft, active, voided, superseded-derived, or mixed ABS history blocks Create Draft; returning after creation shows the existing Draft and View details without another Create Draft control.
- [x] `Completed` and `Cancelled` Services cannot create a draft. The UI hides the control, and the server action independently rejects terminal, deleted, or missing Services after resolving lifecycle state through the quotation's Service relationship.
- [x] Browser payload remains `sourceQuotationId` only; Service status, Service ID, snapshots, items, versions, and totals remain server-derived.
- [x] **PASS by Mozfer manual browser evidence:** Admin confirmed Create Draft hidden on a Cancelled Service; an eligible non-terminal Service with approved quotation, zero ABS history, zero invoices, and zero discount exposed Create Draft; creation navigated to the nested draft detail route; the resulting scope was Draft, version 1, Pending review, with the copied quotation item and `SAR 1,000.00` total; returning to Service Detail showed the existing Draft, View details, and no Create Draft; Viewer had no ABS access; Arabic and English rendering passed.
- [x] No manual double-click stress test was claimed. Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence.
- [x] Admin/Manager create and Accountant read-only roles are preserved. Active ABS ceiling authority, approved-quotation fallback, invoice snapshots, and no-silent-supersede behavior are unchanged.
- [x] Commit and push are complete on main in `47d9a4f14f019e837224e6db6cababdab12a7610` and `7054cf34654266ca033c58c62f9dca6d94092967`.
- [x] Agent did not perform browser smoke. No production readiness/apply or VAT/ZATCA/FATOORA/QR/XML support is claimed.
- [x] Draft-edit/discard source implementation is complete and pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`; automated validation passed; PASS by Mozfer manual browser evidence was recorded.
- [x] Review/Approve is complete and pushed in `d8b654f2c89622837b75531aa44d79a66e024ad8`; automated validation passed; PASS by Mozfer manual browser evidence was recorded in English only.
- [x] Review/Approve automated coverage: runtime action tests `35/35` PASS; focused ABS/UI tests `46/46` PASS; permission gates, draft-only guards, blocked readiness, localized errors, pending protection, refresh wiring, and identifier-only payloads are covered. Arabic parity/wiring is automated-test-covered; no Arabic manual evidence is claimed.
- [x] Historical next task at this milestone: `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-COMMIT-1`; the lifecycle implementation and DEV/DEMO verification are recorded in the milestone below.

### ABS-MGMT-UI-DRAFT-EDIT-1 (source implemented; Mozfer manual smoke PASS)
- [x] The Service Detail card now exposes a clear bordered View details action instead of visually hidden text.
- [x] The nested ABS draft-detail route opened correctly.
- [x] The draft item editor displayed immutable source values and editable accepted values.
- [x] An adjusted unit-price reduction saved successfully.
- [x] Refreshed item and header totals reflected the server-authoritative result.
- [x] Line safety remained Pending review after the material edit.
- [x] Cancelling an unsaved edit preserved the last saved value.
- [x] Selecting Excluded zeroed accepted quantity, unit price, item total, and scope total after save.
- [x] Cancelling the discard confirmation left the draft unchanged.
- [x] Confirming discard deleted the draft and its items.
- [x] After discard, the Service Detail page showed Create Draft again.
- [x] Arabic and English rendering passed.
- [x] The first discard navigation attempt exposed a UX weakness: the modal remained visible during slow destination rendering.
- [x] The source fix now closes the modal, clears local error state, performs one router.push, and removes the redundant router.refresh.
- [x] The fixed redirect was manually re-tested and returned automatically to Service Detail without a manual refresh.
- [x] Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence.

### ABS-MGMT-UI-READ-ENRICH-1 (source implemented; docs sync)
- [x] Service Detail Approved Billing Scope summary card enriched as **read-only** management UI (`ABS-MGMT-UI-READ-ENRICH-1`).
- [x] Displayed (when data/permissions allow): effective display state (active / draft / voided / superseded-derived — **not** a DB `superseded` status), scope version, source quotation reference, billing ceiling, invoiced amount, remaining billable, line safety, draft-revision and history/other-scope indicators, read-only nested detail navigation.
- [x] Invoice money fields shown only when `invoices:read` permits; otherwise restricted/unavailable (not fake zeros).
- [x] Accountant masking of internal notes/reasons preserved (card does not surface masked internal reason fields).
- [x] Uses existing server billing-state / ABS list contracts; no client recomputation of invoice authority; no write CTAs (create/edit/discard/review/approve/void/supersede).
- [x] Commit and push are complete on main for the read-enrichment slice and the draft-create slice.
- [x] Docs sync: `ABS-MGMT-UI-READ-ENRICH-DOCS-SYNC-1`. Draft-create, Draft Edit/Discard, and Review/Approve later completed and were pushed; this historical entry predates the current lifecycle implementation and DEV/DEMO verification.

### Approved Billing Scope Management Design (docs lock)
- [x] Design task `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` completed for product/implementation slicing (`APPROVED_BILLING_SCOPE_MANAGEMENT_DESIGN_COMPLETE`).
- [x] Canonical design document: `docs/approved-billing-scope-management-design.md` (capability matrix READY/PARTIAL/MISSING/DEFERRED; Service-scoped entry; card state matrix; status model; permissions; stable errors; financial invariants; bilingual/responsive requirements; slice order).
- [x] Source-truth corrections locked: `superseded` is not a DB status; schemas and runtime actions remain distinct; draft/discard/review/approve are preserved on technical scope surfaces, while normal quotation approval now activates internal ABS and the delivered Void action remains secondary/technical.
- [x] Financial lifecycle decision **`ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED`** is now locked. Migration/RPC implementation, application contract, delivered Void surface, and successful mutation smoke are complete in DEV/DEMO (synthetic); successor/supersede UI remains unshipped and separately deferred.
- [x] Read-enrich slice later completed (see `ABS-MGMT-UI-READ-ENRICH-1` milestone above).
- [x] Docs-only sync: `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-DOCS-SYNC-1` (no implementation, SQL, stage, commit, or push in that task).

### ABS Financial Lifecycle Design (docs lock)
- [x] `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-1` establishes `ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED` and resolves the former pending decision flag.
- [x] Void is locked to the active approved scope, Admin/Manager, required reason code/note, eligible non-terminal or zero-exposure Cancelled Service, zero applicable Service invoices, and zero payment history. It changes no invoice/payment and blocks all future billing without quotation fallback.
- [x] Successor workflow clones the active scope into one draft, reuses existing edit/review/discard behavior, and atomically retires old/activates new only when the successor ceiling is at least Service-lifetime applicable invoice exposure.
- [x] Applicable exposure includes deposit/final and draft/sent/partial/paid/overdue invoice `grand_total` across every historical/current/null scope link; validly cancelled/voided/deleted invoices are excluded by the current repository predicate. Payments do not reduce invoiced exposure.
- [x] Existing invoices and payments remain immutable snapshots; historical links are never rewritten. Future invoices link the new active successor.
- [x] Safe implementation requires new reviewed service-role-only transactional RPCs and invoice/ABS trigger revisions with Service-row-first locking, atomic audit, fallback fail-closed behavior, and stable sanitized errors.
- [x] The follow-on implementation is recorded below in `ABS Financial Lifecycle Migration and DEV/DEMO Verification`.

### ABS Financial Lifecycle Migration and DEV/DEMO Verification
- [x] Coordinated packet review, exact payload transport, PL/pgSQL compile correction, DEV/DEMO apply, and read-only post-apply verification completed with the reviewed PASS verdicts.
- [x] Local migration: `supabase/migrations/20260714090000_approved_billing_scope_financial_lifecycle.sql`; local hash `414bb40863c10a5294f254e11d198d2f874467b3`.
- [x] DEV/DEMO target: G7 BLUE CRM, project ref `dpddrqjzqohexixgdqiq`; connector-generated installed history version `20260714113857`, name `approved_billing_scope_financial_lifecycle`.
- [x] Verified schema/runtime surface includes the supersession lineage, same-Service foreign keys, required indexes, enabled Invoice/ABS triggers, all 14 reviewed functions, `SECURITY DEFINER`, fixed search path, service-role grants, denied public mutation execution, revoked direct client mutation privileges, and enabled RLS.
- [x] Read-only verification confirmed Service-first locking for financial RPCs and writes, unchanged baseline counts, harmless missing-resource branches, empty-resource helper results, no persistent mutation/audit rows, and no DDL row-count change.
- [x] Local validation passed: Invoice tests 7/7, ABS tests 53/53, TypeScript, lint, build, and diff-check; lint/build retained only known workspace/PDF warnings.
- [x] Successful mutation smoke was **not** part of the original read-only verification packet; it is recorded in the milestone below.
- [x] DEV/DEMO only; production apply and production readiness are not claimed. The current source still has no shipped Void/successor UI.

### ABS Financial Lifecycle Successful Mutation Smoke (DEV/DEMO synthetic)
- [x] Execution task `ABS-MGMT-FINANCIAL-LIFECYCLE-SUCCESSFUL-MUTATION-SMOKE-EXECUTE-4` completed with verdict `ABS_MGMT_FINANCIAL_LIFECYCLE_SUCCESSFUL_MUTATION_SMOKE_EXECUTED`.
- [x] Independent review task `ABS-MGMT-FINANCIAL-LIFECYCLE-SUCCESSFUL-MUTATION-SMOKE-REVIEW-3` completed with verdict `ABS_MGMT_FINANCIAL_LIFECYCLE_SUCCESSFUL_MUTATION_SMOKE_REVIEWED`.
- [x] Run ID: `300d4edd-5c8e-45bc-bc85-b4f033750a14`. Synthetic marker: `ABS_LIFECYCLE_SMOKE_300d4edd-5c8e-45bc-bc85-b4f033750a14`.
- [x] **All retained evidence is synthetic DEV/DEMO test data** — not customer, live, production, or operational data.
- [x] Isolated synthetic lifecycle lanes A–E all passed.
- [x] Draft item edit and exact replay passed.
- [x] Line-safety review and ordinary approval passed.
- [x] Draft discard and not-found replay passed.
- [x] Eligible Void at zero Invoice exposure and zero payment history passed; historical financial authority remains detectable after Void.
- [x] Invoice creation against the voided authority was blocked with `billing_scope_inactive`.
- [x] Successor creation and its idempotent replay passed.
- [x] Atomic approve-and-supersede passed.
- [x] Equality between active ceiling and current Service exposure is allowed.
- [x] Invoice financial authority and Service-lifetime exposure checks passed.
- [x] Invoice number allocations: exactly **+2**. Payment recording allocated exactly **one** payment number. Payment replay rejected without duplicate payment, audit, or allocation.
- [x] Audit delta: exactly **+13**. No orphan or duplicate synthetic records found.
- [x] No sequence rewind or cleanup after lifecycle mutation started.
- [x] Browser/manual smoke remained outside agent authority and is not claimed.
- [x] Installed catalog gates (DEV/DEMO review-time): functions **14/14**; unexpected overloads **0**; triggers **3/3**; constraints **29/29**; indexes **14/14**; RLS **11/11**; privilege matrix **176/176**; missing, duplicate, and failed catalog counts **0**.
- [x] Locked decisions preserved: Service-lifetime exposure; Void only at zero Invoice exposure and zero payment history; historical authority retained after Void; atomic successor/supersession; equality with current exposure allowed; service-role-only financial mutations; Admin/Manager lifecycle authority; Accountant lifecycle read-only; browser has no direct financial mutation authority; no VAT/ZATCA/FATOORA/QR/XML/notification expansion.
- [x] This milestone does **not** make Approved Billing Scope or broader invoicing production-ready. Production apply remains unauthorized. ABS Void is delivered on the secondary technical surface; Supersede UI remains unshipped and deferred.

### Feature 005 Runtime Arabic/English UX (formally closed)
- [x] Authenticated Arabic/English UX implemented for shell + modules: Dashboard, Customers, Services (core + operational subflows), Quotations (non-PDF), Invoices (non-PDF), Payments, Suppliers, **Settings**, and **Admin Users**.
- [x] Settings and Admin Users are intentional **P3 extensions** beyond the original Feature 005 core route slice (spec C01 had excluded full Settings/Admin from core acceptance; P3 localized those surfaces under separate G7-AR-UX-P3 tasks).
- [x] Shell / shared states: Sidebar, Topbar locale selector, loading, error, not-found, shared access-denied/empty/unavailable patterns, RTL/LTR shell direction.
- [x] Formatting contracts: Western digits (`numberingSystem: latn`), structured `UiDateText` / `UiDateTimeText` / `UiDateRangeText`, shared formatters, `formatSarAmount`, bidi isolation helpers.
- [x] Locale authority: active users use session-effective locale (`g7_session_locale` override bound to Clerk session → `app_users.locale`); public/inactive path uses `getPublicRequestLocale()` (session cookie if bound → English default, no DB).
- [x] `/unauthorized` localized EN/AR; root `<html lang>` / `dir` aligned with public request locale for inactive/missing `app_users` (`G7-AR-UX-P4-ROOT-PUBLIC-LOCALE-ALIGNED`).
- [x] Customers Excel export **workbook chrome** localized (labels/meta/filters/date digits); company/brand names and stored customer values preserved; `customers:export` gate preserved. Filename pattern unchanged.
- [x] Independent review `G7_AR_UX_P4_I18N_INDEPENDENT_REVIEW_PASS`: **no P0** findings.
- [x] **P5 bilingual visual remediation: PASS** (date/time/range order, table bidi alignment, RTL back icon, Settings ISO date + copy leakage, locale-switch global bolt lifecycle, Supplier panel title wrap).
- [x] **T032 Mozfer authenticated browser smoke: PASS** (`G7_AR_UX_P5_MOZFER_FOCUSED_RE_SMOKE_3_PASS` and English LTR regression PASS — user-provided evidence).
- [x] Arabic authenticated CRM UX: PASS.
- [x] English LTR regression: PASS.
- [x] Locale-switch global lightning bolt: PASS (existing `GlobalPendingProvider` / centered bolt; no second loader).
- [x] Date, time, date-range, and bidi acceptance: PASS.
- [x] Customers, Services, Quotations, Invoices, and Payments visual acceptance: PASS.
- [x] Settings EN/AR customer-facing copy leakage closed (subtitle, TIN label, no visible `CS-A`): PASS.
- [x] Automated validation evidence (DEV agent runs; not production claims):
  - Aggregate i18n + export tests: **243/243** pass (final P5 suite including `visual-acceptance` and Settings).
  - Focused ESLint on changed i18n surfaces: PASS.
  - `pnpm exec tsc --noEmit`: PASS.
  - Full `git diff --check`: PASS.
- [x] Controlled acceptance commit: `aaf6563 fix(i18n): complete bilingual visual acceptance` (`G7-AR-UX-P5-FINAL-ACCEPTANCE-COMMIT`).
- [x] Controlled push: `G7-AR-UX-P5-FINAL-ACCEPTANCE-PUSH` — `main` / `origin/main` aligned at `aaf6563` (ahead/behind 0/0).
- [x] Formal closeout recorded: `G7-AR-UX-FEATURE-005-CLOSEOUT-DOCS-SYNC` (this docs sync).
- [x] `app_users.locale` migration file: `supabase/migrations/20260711090000_add_app_users_locale.sql`. Mozfer-supplied DEV/DEMO apply + T009 post-apply verification evidence exists under `specs/005-i18n-runtime-locale/evidence/`. **Not** claimed as production-applied; re-apply is blocked by fail-loud guard when column exists. Controlled DB tasks remain separate from app commit.
- [x] Explicit exclusions remaining (not claimed complete; outside Feature 005 formal close):
  - PDF / generated-document localization (quotation & invoice PDF bodies and Print buttons).
  - Clerk-hosted sign-in / sign-up widget localization.
  - Invoices list **Export** button remains a **non-functional product stub** (localized label only; **no** invoice Excel export implementation).
  - Supplier **full page redesign** remains a separate planned product task and is **not** a Feature 005 acceptance blocker (visual compatibility fixes in P5 are accepted).
  - Browser-tab metadata consistency and other P2 items remain non-blocking.
  - No production-readiness, ZATCA/FATOORA, or bilingual-document claim.
  - Stored customer/business data is not translated by locale switching.
- [x] Locked workflow preserved: Customer Profile → Service → Quotation → Invoice → Payment; Service remains the operational core; VAT/ZATCA exclusions preserved.

### Approved Billing Scope Ceiling Block UI Smoke
- [x] Manual smoke verification (`APPROVED-BILLING-SCOPE-CEILING-BLOCK-SMOKE-1`) completed.
- [x] Result: PASS WITH WARN.
  - **PASS Reason**: The UI successfully blocked creation of an above-ceiling deposit invoice (attempted `SAR 300001.00` on a `SAR 30000.00` ceiling). The database query confirmed no invoices were created from the blocked attempt.
  - **WARN Reason**: Browser/client validation blocked submission before a direct server-action over-ceiling request was exercised.
- [x] Details:
  - Candidate quotation: `QT-2026-0019` (id: `2402098e-cfaf-4586-be0e-3be6588842a0`).
  - Candidate service: `SVC-2026-0015` (id: `a825858c-1ed4-42ab-9097-57ea31dddb12`).
  - Active approved scope ID: `a1626584-1681-4f98-a845-21fa10649f51` (ceiling: `SAR 30000.00`, status: `approved`, approved metadata populated, `voided_at` and `superseded_at` are null).
  - UI attempted amount: `300001`
  - UI blocked message: `"Value must be less than or equal to 30000."`
- [x] Temporary dev harness at `src/app/(dashboard)/approved-billing-scopes/dev` was created, used, and fully cleaned up. Cleanup PASS.
- [x] Server-side direct adversarial smoke (`APPROVED-BILLING-SCOPE-SERVER-CEILING-BLOCK-SMOKE-1`) remains an optional follow-up.

### Service Detail Billing Calculation Refresh Fix
- [x] Bug fix implemented and pushed in commit `270ac66 fix(invoices): refresh billing state from active scope totals`:
  - `getServiceBillingState` now queries `approved_billing_scopes` to resolve the active approved billing scope for the service, using its `accepted_grand_total` as the billing ceiling.
  - `remainingUninvoicedAmount` now correctly subtracts the grand total of all active invoices (both deposit and final), rather than only deposit invoices.
  - Added safe clamping `Math.max(0, remaining)` to prevent negative remaining displays.
- [x] Manual verification: PASS.
  - Checked on target Service `SVC-2026-0014` (service_id: `2f5091b6-7dbf-405f-b5b4-8f35511e2011`) with Approved Scope `dec043d6-d6d1-4883-b55c-be16bab67504` (total: `SAR 20000.00`).
  - The UI now correctly calculates and displays **Prior Invoiced: SAR 20000.00** and **Remaining: SAR 0.00** after both `INV-2026-0023` (deposit, `10000.00`) and `INV-2026-0024` (final, `10000.00`) are created.
- [x] No source code changes or commits performed in this docs sync task.

### Approved Billing Scope Review & Approval Smoke Test
- [x] Manual smoke verification (`APPROVED-BILLING-SCOPE-APPROVE-ACTIONS-SMOKE-RUN-1`) completed.
- [x] Result: PASS WITH WARN.
- [x] Verified sequence using temporary dev harness (removed after testing; no harness files committed):
  - Candidate quotation: `QT-2026-0018` (id: `548cbcf9-a88c-490e-a278-c4148dbbd590`).
  - Candidate service: `SVC-2026-0014` (id: `2f5091b6-7dbf-405f-b5b4-8f35511e2011`).
  - Created Draft Scope: `dec043d6-d6d1-4883-b55c-be16bab67504` (accepted total: `SAR 20000.00`, 1 draft item).
  - Draft verification: status = `draft`, `line_safety_status` = `pending_review`.
  - Line Safety Review: successfully marked safe (`line_safety_status = safe`, reviewed metadata populated).
  - Scope Approval: successfully approved (`status = approved`, approved metadata populated, active approved scope constraint active).
  - Invoice Integration: created `INV-2026-0023` (deposit) and `INV-2026-0024` (final) under the service; both correctly linked to `approved_billing_scope_id`.
  - Aggregates: 2 invoices, total invoiced `SAR 20000.00`, all linked to scope.
- [x] WARNs recorded during smoke:
  - Above-ceiling block check was bypassed because the deposit invoice was created before attempting above-ceiling input.
  - Billing Calculation UI appeared stale after final invoice creation: the screen did not immediately reflect the updated invoiced/remaining totals, while SQL aggregates showed correct values. Needs later review.
- [x] Remaining follow-ups:
  - `APPROVED-BILLING-SCOPE-CEILING-BLOCK-SMOKE-1`
  - `APPROVED-BILLING-SCOPE-BILLING-CALC-REFRESH-REVIEW-1`
- [x] No source code changes or commits performed in this docs sync task.

### Approved Billing Scope Review & Approval Actions
- [x] App-layer review and approval server actions implemented and pushed in commit `b9621bb`:
  - `reviewApprovedBillingScopeLineSafety`
  - `approveApprovedBillingScope`
- [x] Static typecheck (`tsc`) and lints (`lint`) verified.
- [x] git diff whitespace check (`git diff --check`) passed.
- [x] Safety & validation rules:
  - Permission-gated server actions (`APPROVED_BILLING_SCOPE_PERMISSIONS.review` and `.approve`).
  - Draft-only review and approval restriction.
  - Verified item decision rules (accepted must match source, excluded/customer_supplied must be 0 and have reason, adjusted must be reduction-only and have reason and match subtotal+vat).
  - Validation requires `line_safety_status` to be `safe` before approval.
  - Blocked voided/superseded scopes from being reviewed or approved.
  - Active approved scope uniqueness conflict handled at DB/application layer.
  - Concurrency/stale draft checking via conditional updates and zero-row-update detection.
  - Sanitized error returns, no raw DB errors leaked.
- [x] Remaining work/Not Done in this slice:
  - No UI screens or routes.
  - No DB schema changes or migrations.
  - No manual browser smoke test performed on live actions (no active approved scope was present to smoke).
  - Active-scope invoice integration smoke verification completed and recorded below.

### Approved Billing Scope Full-Scope Item Decision Smoke Test
- [x] Manual smoke verification (`APPROVED-BILLING-SCOPE-FULL-SCOPE-ITEM-DECISION-SMOKE-1`) completed in DEV/DEMO.
- [x] Result: PASS.
- [x] Verified quotation and scope:
  - Quotation: `QT-2026-0020` (`quotation_id`: `1bc988dc-fa19-41ca-878f-88beca960a08`).
  - Service ID: `e19ddc5a-bbdb-44a6-a61e-c34aef7fa60d`.
  - Scope ID: `eb1f4c46-74f7-4c67-a043-c07935bb1289`.
  - Source quotation total: `SAR 30000`.
  - Approved scope total: `SAR 17000`.
- [x] Verified item decisions:
  - `شاشات`: `accepted` = `SAR 10000`.
  - `صوت`: `adjusted` from `SAR 10000` to `SAR 7000`.
  - `عمال`: `excluded` = `SAR 0`.
  - `ضيافة`: `customer_supplied` = `SAR 0`.
- [x] Approval verification passed:
  - `status = approved`
  - `line_safety_status = safe`
  - `approved_at` populated
  - `voided_at = null`
  - `superseded_at = null`
- [x] Invoice verification passed:
  - Invoice: `INV-2026-0027`
  - type: `final`
  - grand_total: `SAR 17000`
  - `approved_billing_scope_id` matches the scope
  - snapshot contains exactly `شاشات = SAR 10000` and `صوت = SAR 7000`
  - snapshot excludes `عمال` and `ضيافة`
- [x] Temporary item-decision dev harness was removed after smoke.
- [x] Full-scope snapshot WARN from commit `c66975d` is now closed.
- [x] No full user-facing Approved Billing Scope **management** UI existed at full-scope smoke close (read-only card/detail only). **Later progress:** normal quotation approval/internal ABS activation, the delivered Void action, and the Service lifecycle milestone are implemented, accepted, committed, and pushed; Supersede UI remains unshipped and deferred.

### Approved Billing Scope Foundation
- [x] Migration draft `supabase/migrations/20260708090000_approved_billing_scope_foundation.sql` was committed and pushed as `8d2aefa feat(billing): draft approved billing scope foundation`.
- [x] Migration was manually applied to the DEV/DEMO database only.
- [x] DEV/DEMO post-apply metadata validation passed.
- [x] Functional smoke test passed.
- [x] Smoke test ran inside a transaction and ended with `ROLLBACK`.
- [x] Cleanup verification passed with `smoke_scope_count = 0`.
- [x] `approved_billing_scopes`, `approved_billing_scope_items`, and `quotation_items_id_quotation_id_key` now exist in DEV/DEMO.
- [x] Trigger functions/triggers exist in DEV/DEMO.
- [x] RLS is enabled on both new tables.
- [x] The invoice composite FK remains preserved.
- [x] `invoices.approved_billing_scope_id` has not been added yet.
- [x] Invoice integration remains deferred.
- [x] Runtime/RPC/UI implementation remains deferred.
- [x] Production apply is not performed and not authorized.
- [x] Runtime/product/security decision lock completed in `docs/approved-billing-scope-runtime-decisions.md` after `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-REVIEW-1` returned `PASS WITH REQUIRED CHANGES`.
- [x] Locked V1 rules cover server-action-only writes, Admin/Manager workflow, Accountant read-only access, no Viewer/Sales access, explicit supersede, approved-only void, and app audit before approval/void/supersede ship.

### Approved Billing Scope Draft Discard
- [x] Migration draft `supabase/migrations/20260708110000_approved_billing_scope_draft_discard_function.sql` was committed and pushed as `39c6330 feat(billing): add atomic draft scope discard`.
- [x] Migration was manually applied to the DEV/DEMO database only.
- [x] DEV/DEMO post-apply metadata verification passed:
  - Function `public.discard_approved_billing_scope_draft(p_scope_id uuid)` exists with correct argument and table return signature.
  - Security model is SECURITY INVOKER.
  - Execute privilege is revoked from `PUBLIC`, `anon`, and `authenticated` roles, and granted exclusively to `service_role`.
- [x] Safe dry-check passed: calling the function with a non-existent UUID safely returns `'scope_not_found'` with zero deletes/side-effects.
- [x] Manual app smoke test passed via temporary DEV harness `/approved-billing-scopes/dev/draft-discard-smoke`:
  - Created a draft approved billing scope (`0ace1c81-68c0-4cdd-8d9b-db563cd49949`) linked to source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` and service `e9e70297-bc64-4f5b-9560-beeb6cdbd4d9`.
  - Verified creation of scope header (`status = draft`, `line_safety_status = pending_review`) and 2 child items with matching totals.
  - Successfully invoked `discardApprovedBillingScopeDraft` server action.
  - Verified atomic database deletion of both the scope header and its items.
- [x] Temporary DEV harness removed, restoring clean working tree.
- [x] **Historical note at draft-discard close:** remaining work then included review/approve/void/supersede actions, UI, invoice integration, and production apply. **Current truth:** quotation approval/internal ABS activation, review/approve, invoice integration, and ABS Void exist and are pushed; lifecycle migration/RPC is installed in DEV/DEMO and successful mutation smoke is complete (synthetic); Supersede UI remains unshipped. Production DB apply remains unauthorized.

### Approved Billing Scope Draft Item Edit
- [x] Migration draft `supabase/migrations/20260708120000_approved_billing_scope_item_edit_function.sql` was committed and pushed as `3af430a feat(billing): add atomic draft item edit`.
- [x] Migration was manually applied to the DEV/DEMO database only.
- [x] Two corrective migrations were manually applied and verified in target demo DB to address PL/pgSQL name collisions:
  - `supabase/migrations/20260708123000_approved_billing_scope_item_edit_function_column_qualify_fix.sql` (qualifies aggregate `items.accepted_subtotal`, `items.accepted_vat_amount`, `items.accepted_grand_total` references).
  - `supabase/migrations/20260708124000_approved_billing_scope_item_edit_function_line_safety_qualify_fix.sql` (qualifies RHS `scopes.line_safety_status` and `scope_items.display_order` references).
- [x] Production query relation disambiguation implemented in `src/lib/approved-billing-scopes/queries.ts` to resolve PostgREST embedding ambiguity for `approved_billing_scope_items`.
- [x] Verification passed: metadata check, function body check, grants check, and harmless dry-check.
- [x] Manual browser app smoke test passed via temporary DEV harness `/approved-billing-scopes/dev/item-edit-smoke`:
  - Loaded existing draft scope (`39949bf2-4b0e-4311-9cef-d84a57da7845`) and child items.
  - Successfully edited item `353699f1-e7b2-4f73-9c1c-11283b05272c` using `editApprovedBillingScopeItem` server action (set qty to 4, unit price to 400).
  - Verified atomic totals recalculation and line safety status update in the database.
  - All 8 correctness checks passed.
  - Cleaned up database draft scope atomically using discard action.
- [x] Temporary DEV harness removed, restoring clean working tree.
- [x] Commit pushed as `7f26ca3 fix(billing): stabilize approved scope item edit`.

### Approved Billing Scope Live Schema Enforceability Check
- [x] Live schema enforceability audit completed on DEV/DEMO database.
- [x] Result: WARN (non-runtime audit packet expectation mismatch only; all target database tables, constraints, FKs, indexes, triggers, RLS, and RPC grants successfully passed).
- [x] Data state checked: clean (`approved_billing_scopes` count = 0, `approved_billing_scope_items` count = 0).
- [x] Write path for draft creation clarified: `createApprovedBillingScopeDraft` is an app-layer server action using `createAdminClient` / `service_role` direct table inserts, NOT a database RPC.
- [x] Concurrency safety and insert authorization are verified to rely on unique constraints, table triggers, and app-layer `requirePermission(approvedBillingScopes:create)`.
- [x] Temporary live-schema audit packet expected a database RPC function `create_approved_billing_scope_draft` incorrectly; this is an audit documentation mismatch only, with no migration or runtime blockers.
- [x] Production apply remains separate and requires explicit authorization.

### Approved Billing Scope Migration Draft Placeholder
- [x] Backlog check for `APPROVED-BILLING-SCOPE-MIGRATION-DRAFT-1` completed.
- [x] Result: reclassified as completed/no-op. No concrete database migration is required after the live schema audit.
- [x] **Historical note:** draft creation is app-layer; discard and item-edit RPCs are narrow service-role exceptions. **Current truth:** quotation approval/internal ABS activation, line-safety review/approval, invoice integration, and ABS Void are pushed; lifecycle migration/RPC is installed and successful mutation smoke is complete in DEV/DEMO (synthetic); Supersede UI remains unshipped; design remains `ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED`.

### Approved Billing Scope RBAC/RLS Review
- [x] Read-only security review for Approved Billing Scope (`APPROVED-BILLING-SCOPE-RBAC-RLS-REVIEW-1`) completed.
- [x] Result: PASS (no critical RBAC/RLS security gaps found). All server-side write paths (`createApprovedBillingScopeDraft`, `discardApprovedBillingScopeDraft`, `editApprovedBillingScopeItem`) are verified to be correctly guarded with `await requirePermission(...)` before utilizing the `service_role` client. RLS is enabled with no bypass policies for public roles, and all direct privileges are revoked from `anon` and `authenticated` roles.

### Approved Billing Scope Invoice Integration Design
- [x] Invoice integration design (`APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-DESIGN-1`) completed.
- [x] Result: PASS (design parameters clear). Invoices will reference `approved_billing_scope_id` via a composite FK constraint `(approved_billing_scope_id, service_id) -> approved_billing_scopes(id, service_id)`. The scope `accepted_grand_total` becomes the absolute invoice ceiling, enforced via a DB `BEFORE INSERT OR UPDATE` trigger and app-layer validations.

### Approved Billing Scope Management UI Foundation
- [x] Explicit typed read-result contracts were added for Approved Billing Scope reads, including success, not_found, duplicate-draft, and sanitized unexpected-error states where applicable.
- [x] Linked invoice lookup by approved billing scope is preserved in the read layer, with authorization failures rethrown and legacy caller behavior still available through the empty-list wrapper.
- [x] A permission-gated, read-only Approved Billing Scope card now appears on Service Detail only for `approvedBillingScopes:read` users.
- [x] Visibility is limited to Admin, Manager, and Accountant; Sales, Operations, and Viewer do not see the card or receive scope data through the gated page path.
- [x] The Service Detail card shows separate empty, populated, and temporarily unavailable states.
- [x] The populated state shows active/latest status, version, line-safety state, accepted SAR total, and a compact scope-history count, without raw UUIDs, internal notes, raw error details, or financial recalculation.
- [x] Validation for this slice passed: next typegen PASS, TypeScript PASS, lint PASS with two known pre-existing PDF image warnings, build PASS, diff-check PASS.
- [x] User-only manual browser smoke for the Service Detail card passed in DEV/DEMO.
- [x] Confirmed smoke checks: Admin and Manager can see the card; Accountant can see the read-only card; Sales, Operations, and Viewer do not see the card; empty, populated, and refreshed states render correctly; status, version, line-safety state, accepted SAR total, and additional-scope count render as designed; no blocking issue was reported.
- [x] No agent browser smoke was performed for this slice.

### Approved Billing Scope Read-Only Detail Route
- [x] Nested Service-context route `/services/[serviceId]/approved-billing-scopes/[scopeId]` was implemented as a server-rendered page.
- [x] Access is gated by `approvedBillingScopes:read`, with scope/service ownership verification and established not-found handling for missing scope or route mismatch.
- [x] Unexpected read failure uses a sanitized unavailable state.
- [x] UI copy is localized for English and Arabic.
- [x] The populated Service Detail card links to the detail route; empty and unavailable card states remain unlinked.
- [x] The detail page renders a read-only scope header and item table using mapped server values only.
- [x] Linked invoices are shown only when `invoices:read` is granted, with distinct empty, populated, and unavailable states and links to the existing invoice detail route.
- [x] No page-side financial recalculation is performed.
- [x] Validation passed: next typegen PASS, TypeScript PASS, lint PASS with two known pre-existing PDF image warnings, build PASS, diff-check PASS, and final review PASS.
- [x] Graphify was refreshed to commit `35c06923`.
- [x] Commit `35c0692 feat(billing): add approved scope detail route` was pushed and `origin/main` is aligned.
- [x] Security and data boundaries: Admin, Manager, and Accountant can access under existing permissions; Sales, Operations, and Viewer remain blocked; protected scope and invoice queries do not run before their respective permission checks; no UUIDs, internal notes, raw reason codes, audit metadata, raw database errors, or unsupported financial calculations are exposed.
- [x] Scope boundaries remain excluded here: draft creation, item editing, line-safety review controls, approval controls, discard, void, supersede, permission-map changes, Server Action changes, SQL, schema, migrations, billing-ceiling changes, and invoice-calculation changes.
- [x] Manual/browser smoke completed as a user-only check; no agent browser smoke was performed.
- [x] Result: PASS WITH WARN.
- [x] Verified PASS evidence:
 - The nested route `/services/[serviceId]/approved-billing-scopes/[scopeId]` opened successfully.
 - The page showed service context, scope status, scope version, line-safety status, accepted grand total, scope item decisions, and linked invoices when present.
 - All supported item decisions were covered: `accepted`, `adjusted`, `excluded`, `customer_supplied`.
 - A linked invoice rendered correctly and its detail link worked.
 - The empty linked-invoices state was verified.
 - A missing or invalid scope ID returned Not Found.
 - A real scope under the wrong Service ID returned Not Found and did not expose cross-service data.
 - Role boundaries matched the expected matrix: Admin allowed, Manager allowed, Accountant allowed read-only, Sales blocked, Operations blocked, Viewer blocked.
 - Refresh/navigation produced no blocking runtime failure.
 - The browser console showed no confirmed application-blocking error.
- [x] WARNs recorded:
 - Full runtime Arabic/English language switching is not implemented yet and was not claimed as tested.
 - The route was not separately evidenced with a complete dedicated mobile screenshot set.
 - The system remains DEV/DEMO only; no production deployment, production data, or real-customer readiness is proven.
 - During mobile-width review at approximately 385 × 642, the global Customers and Services list pages showed page-level horizontal overflow; that issue is outside this route slice and remains open.
- [x] Smoke scope boundaries remain unchanged: the route stays read-only, unsupported management actions remain absent, and no code, SQL, migration, schema, permission, or financial-calculation change occurred during this smoke.

### Quotation Revision Fallback Design
- [x] Fallback design review (`QUOTATION-REVISION-FALLBACK-PRODUCT-DECISION-DOCS-1`) completed.
- [x] Option A chosen: Keep quotation status enum unchanged (no `superseded` status).
- [x] The active Approved Billing Scope determines current billing authority.
- [x] Existing approved quotations remain historical agreement records.
- [x] Any revised quotation flow must utilize the billing scope supersede/versioning mechanism.
- [x] Integration migration is blocked until this decision is recorded.

### Approved Billing Scope Invoice Integration Migration
- [x] Migration file `supabase/migrations/20260709080000_approved_billing_scope_invoice_integration.sql` was committed and pushed as `53fddd6 feat(billing): add invoice approved scope guard`.
- [x] Migration was manually applied and verified in the DEV/DEMO database only; production remains unapplied.
- [x] Preflight validation passed:
  - Required columns (`id`, `service_id`, `status`, `grand_total`, `voided_at`, `is_deleted`, `approved_quotation_id`) existed on `invoices`.
  - Column `approved_billing_scope_id` was absent before migration.
  - 17 existing invoices in the database.
  - Data hygiene verified: 0 null `service_id`, 0 null `grand_total`, 0 null `is_deleted`, and 0 active invoices with null `grand_total`.
  - Approved billing scopes count was 0.
  - Composite unique constraint `UNIQUE(id, service_id)` existed on `approved_billing_scopes`.
  - `services.id` existed for row locking.
  - RLS was enabled on both `invoices` and `approved_billing_scopes`, with `pg_policies` containing no public bypass rows.
  - Only `service_role` grants existed on `approved_billing_scopes` and `approved_billing_scope_items`.
- [x] Post-apply verification passed in DEV/DEMO:
  - Column `approved_billing_scope_id` exists on `invoices` as a nullable UUID.
  - Composite foreign key constraint `invoices_approved_billing_scope_id_service_id_fkey` is active and correctly references `approved_billing_scopes(id, service_id)` on delete restrict.
  - Index `idx_invoices_approved_billing_scope_id` is created for query performance.
  - Invoice trigger function `check_invoices_before_write` and its trigger are registered and active.
  - Invoices trigger P0 guards are verified in the database:
    - Null check `NEW.grand_total IS NULL` exists to fail-closed.
    - Null-safe id exclusion `id IS DISTINCT FROM NEW.id` exists.
    - Null-safe soft-delete predicate `COALESCE(is_deleted, false) = false` exists.
  - Billing scopes trigger function `check_approved_billing_scopes_before_write` is redefined and verified with P0 guards:
    - Supersede target lookup restricts by same service ID (`service_id = OLD.service_id`).
    - Supersede target lookup restricts to active approved status (`status = 'approved'`).
    - Supersede target lookup requires `voided_at IS NULL` and `superseded_at IS NULL`.
    - Null-safe soft-delete predicate `COALESCE(is_deleted, false) = false` exists for invoice checks.

### Approved Billing Scope Invoice Integration App Action
- [x] App-layer invoice integration was committed and pushed as `21eb307 feat(invoices): link invoices to approved scopes`.
- [x] Refactored `createInvoiceAction` in `src/lib/invoices/actions.ts` to integrate Approved Billing Scopes:
  - Resolves active approved billing scope using `getActiveApprovedBillingScopeForService(serviceId)`.
  - Sets `approved_billing_scope_id` to `activeScope.id` on insertion, defaulting to `null` if no active scope is present.
  - Substitutes the billing ceiling `acceptedGrandTotal` as the authoritative limit in place of the quotation's `grandTotal` when an active scope is present.
  - Maintains transitional fallback to the approved quotation's `grandTotal` when no active scope is found.
  - Maps Postgres database trigger exceptions to clean, user-friendly UI error codes (`invoice_amount_exceeds_ceiling`, `billing_scope_inactive`, `billing_scope_service_mismatch`, `invoice_grand_total_invalid`), preventing DB message leaks.
- [x] Updated typescript types `Invoice` and `InvoiceRow` to support nullable `approved_billing_scope_id`.
- [x] Updated mapping logic in `src/lib/invoices/mappers.ts` to map `approved_billing_scope_id`.
- [x] All static typechecks, lints, and whitespace checks verified.
- [x] Production unapplied/out of scope.

### Approved Billing Scope Invoice Integration Smoke Test
- [x] Manual smoke verification (`APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-SMOKE-PLAN-1`) completed.
- [x] Result: PASS WITH WARN (transitional fallback and final invoice calculation successfully verified; active approved billing scope and ceiling block validation paths not tested because no active approved scope existed).
- [x] Verified legacy fallback path and final invoice calculation:
  - Target Service: `SVC-2026-0003` (service_id: `5e12d485-5be7-49c9-b153-ef429f9a6866`).
  - Target Quotation: `QT-2026-0003` (approved_quotation_id: `7ca1f962-fa55-469a-80f2-db54e4a2f550`, total: `5200.00`).
  - Created Deposit Invoice: `INV-2026-0021` (draft, type: `deposit`, amount: `1000.00`, `approved_billing_scope_id` is `null`).
  - Created Final Invoice: `INV-2026-0022` (draft, type: `final`, amount: `4200.00`, `approved_billing_scope_id` is `null`).
  - Database verification check completed:
    - invoice_count = 2
    - total_invoiced = 5200.00
    - deposit_total = 1000.00
    - final_total = 4200.00
    - has_scope_link = false
  - No `Issue Invoice` actions performed.
  - Production remains unapplied and completely out of scope.

### Supplier Bookings UI manual smoke test
- [x] Manual smoke verification (`SUPPLIER-BOOKINGS-UI-1A-SMOKE-VERIFY`) completed by Mozfer on DEV/DEMO/local app.
- [x] Result: PASS WITH WARN.
- [x] Verified create and cancel supplier booking actions:
  - Target Service: `SVC-2026-0003` (service_id: `5e12d485-5be7-49c9-b153-ef429f9a6866`).
  - Target Supplier: `Smoke Test Supplier` (supplier_id: `f4449a06-9094-4f49-adf1-b30bfb79c926`).
  - Source Allocation: `3cf466a7-ab65-413c-b690-13a8b482ec2f` (status: `selected`, quantity: 10, estimated_unit_cost: `150.00`, estimated_total_cost: `1500.00`, active booking before smoke: `null`).
  - Created Supplier Booking: `SBK-2026-0007` (id: `06af9a0d-4548-4d75-b2e0-56d0d976b366`, status: `draft`, is_deleted: `false`, and matching expected allocation, supplier, and service IDs).
  - Cancelled Supplier Booking: `SBK-2026-0007` (status changed to `cancelled`, reason: `ساي`, cancelled_at: `2026-07-09 09:30:00.657+00`, is_deleted: `false`).
- [x] UI Observations:
  - Booking appeared in the Supplier Bookings panel list immediately after creation.
  - Selected allocation correctly linked to `SBK-2026-0007` while it was in `draft` status.
  - After cancellation, the booking row updated to `Cancelled` and showed the cancellation details and reason inline.
  - The "Create Supplier Booking" button reappeared for the source allocation after cancellation (expected behavior as cancelled bookings are no longer active).
- [x] UX WARN: Loading/pending indicator was not clearly visible during creation/cancellation, likely due to fast server response time. Recorded as a minor UX WARN (non-blocking).
- [x] Production remains unapplied and completely out of scope.

### Invoice Service ID Not Null Audit
- [x] Schema and data audit (`INVOICE-SERVICE-ID-NOT-NULL-AUDIT-1`) completed.
- [x] Result: PASS WITH WARN.
- [x] Audit findings:
  - Product Rules: `invoices.service_id` is required by ERP workflow rules; no invoice may exist without a parent Service.
  - Source Code: Current `createInvoiceAction` always supplies `service_id` in the database insert payload.
  - TypeScript Types: `Invoice` and `InvoiceRow` interfaces already define `service_id` as non-nullable (`string`).
  - Database Schema: The baseline migration `20260623200000_erp3a_invoice_schema.sql` leaves `invoices.service_id` as structurally nullable.
  - Live DEV/DEMO preflight validation:
    - Column metadata checks: `invoices.service_id` has `is_nullable = YES`.
    - Active rows check: `null_service_invoices` count is `0`.
- [x] Conclusion: Existing DEV/DEMO database rows and source components are fully ready in principle for a future reviewed `NOT NULL` constraint migration.
- [x] WARN: No database migration was drafted, reviewed, or applied during this task. Production remains completely out of scope.
- [x] Future task required before implementation: `INVOICE-SERVICE-ID-NOT-NULL-MIGRATION-DRAFT-1`.

### Public Health Route Security Audit
- [x] Public and API routes security audit (`PUBLIC-HEALTH-ROUTE-HARDEN-1`) completed.
- [x] Result: PASS WITH WARN.
- [x] Audit findings:
  - Intentionally Public Routes: `/api/health/db` (health ping) and `/api/webhooks/clerk` (Clerk webhook sync).
  - Database Touch: `/api/health/db` queries database sequences to verify active connection pool; `/api/webhooks/clerk` queries and updates `app_users`.
  - Response Sanitization: Public JSON responses are correctly sanitized and do not leak internal database errors or exception stack traces.
  - Route Protection: Webhooks are protected by Clerk/Svix signature verification. Internal CRM routes are guarded through `src/proxy.ts`.
  - Next.js 16 conventions: Verified that `src/proxy.ts` is the active Next.js 16 middleware convention (do not recommend renaming to `middleware.ts` as that is deprecated).
  - Remaining recommendations:
    1. Secure `/api/health/db` with a secret check header or restrict to internal VPC/load-balancer IP ranges.
    2. Add rate limiting/throttling to `/api/health/db`.
    3. Verify `CLERK_WEBHOOK_SIGNING_SECRET` before production.
- [x] Conclusion: Internal dashboard routes are protected correctly.
- [x] WARN: No code changes were made; production remains out of scope.
- [x] Future task required: `PUBLIC-HEALTH-ROUTE-HARDEN-IMPLEMENT-1`.







### [x] Foundation UI / Routes
- [x] dashboard routes exist
- [x] UI started with mock data
- [x] modules being converted gradually to live Supabase data

### [x] Global Pending UX
- [x] Approved global centered pending bolt UX is implemented and pushed in `aad0ca5 feat(ui): add global centered pending bolt`.
- [x] Shared `Button` loading state now drives the global centered bolt pattern in the authenticated dashboard.
- [x] Dashboard route loading uses the same bolt indicator.
- [x] No backdrop, visible loading text, or spinner is used.
- [x] `GLOBAL-LOADING-CRUD-FORMS-1` completed and pushed in `bf3a4ba feat(ui): add global pending bolt to CRUD forms`.
- [x] Covered CRUD submit actions: customer profile save, service create/edit, and supplier create/edit.
- [x] Manual smoke passed for the five covered CRUD actions, and validation passed with `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, and `git diff --check`.
- [ ] Navigation pending coverage remains future follow-up work for non-quotation areas and is not included in this completed CRUD slice.

### [x] I18N-RTL-FOUNDATION-AUDIT-1
- [x] Readonly i18n / RTL foundation audit completed with no runtime code changes.
- [x] Audit artifact captured in `specs/004-i18n-rtl-foundation/audit.md`.
- [x] Latest audited HEAD was `691555b`.
- [x] The audit confirmed the app shell is still LTR-first, the status glossary and formatting model still need P0 decisions, and the next step remains decision locking before implementation.

### [x] I18N-P0-DECISIONS-LOCK-1
- [x] Docs/spec-only P0 decision lock completed with no runtime code changes.
- [x] Team Lead verdict recorded as APPROVED WITH CHANGES, and the approved changes were incorporated into the decision lock.
- [x] Historical P0 wording selected single-language documents with explicit `document_locale`; the current owner direction supersedes that authority. POST-G1 Task 4 now uses one canonical Quotation or Invoice with transient Arabic/English representation selection. Permanent Western digits with explicit `numberingSystem: 'latn'` and the split status glossary remain preserved.
- [x] Next step is Foundation-1 prompt drafting plus senior review, not runtime implementation.

### [x] I18N-RTL-FOUNDATION-1
- [x] Minimal runtime foundation is implemented for locale types, safe parsing, direction helpers, bidi isolation, and `numberingSystem: 'latn'` formatting helpers under `src/lib/i18n/`.
- [x] Root app HTML now uses foundation helpers for safe `lang` / `dir` scaffolding in `src/app/layout.tsx`, still defaulting to `en` / `ltr` until reviewed preference wiring is approved.
- [x] English-only typed dictionary skeletons were added for common, navigation, statuses, document types, and RBAC-sensitive namespaces; final Arabic wording remains unapproved.
- [x] SQL draft planning for `app_users.locale` and `company_settings.default_locale` is recorded in `specs/004-i18n-rtl-foundation/sql-draft.md` and remains not applied / not a migration.
- [x] Shared UI logical-direction refactor remains deferred to the later `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1`, `I18N-RTL-SHELL-1A`, and `I18N-RTL-SHELL-1B` planning sequence.
- [x] Historical foundation scope deferred document/PDF implementation; POST-G1 Task 4 now provides transient AR/EN document representations. Permanent bilingual customer-content placement and Customer `preferred_language` remain deferred.
- [x] No fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared-status behavior was introduced.

### [x] I18N-RTL-SHARED-OVERLAYS-INVENTORY-1
- [x] Readonly inventory completed and recorded in the planning docs.
- [x] No shared overlay primitive layer was found under `src/components/ui` or `src/components/layout`.
- [x] No shared `Dialog`, `Popover`, `AlertDialog`, `Sheet`, `Drawer`, `Tooltip`, `Toast`, or similar primitive was found.
- [x] No third-party overlay wrapper or overlay-specific UI dependency was found.
- [x] Current overlays are hand-rolled module-local modal blocks.
- [x] Shell-1A is not blocked by shared overlay primitives.
- [x] Module-local overlays remain important but were deferred to `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1`, which is not a prerequisite blocker before Shell-1A.

### [x] I18N-RTL-SHELL-1A
- [x] Implementation commit `3f627b1` is pushed.
- [x] Manual smoke passed with `G7_DEV_RTL=1`.
- [x] Verified pages: dashboard/root route, customers, services, invoices, quotations, suppliers, payments, admin/users, settings.
- [x] Sidebar moved right in dev RTL.
- [x] Content offset stayed usable.
- [x] Topbar/search remained usable.
- [x] G7 logo and object icons were not mirrored.
- [x] No DB/cookie/runtime persistence was introduced.
- [x] Shell-1B findings observed: DataTable and pagination-related inherited RTL behavior need dedicated Shell-1B handling, including page number order and prev/next behavior.
- [x] Shell-1B findings are not blockers for Shell-1A and must not be fixed in this docs sync.

### [x] I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1
- [x] Readonly review completed.
- [x] Overall result: DEFER.
- [x] Reviewed six module-local overlays: `src/app/(dashboard)/invoices/RecordPaymentModal.tsx`, `src/app/(dashboard)/suppliers/SupplierBlacklistActions.tsx`, `src/app/(dashboard)/admin/users/AdminUsersClient.tsx`, `src/app/(dashboard)/customers/CustomersClient.tsx`, `src/app/(dashboard)/customers/[id]/CustomerProfileActions.tsx`, `src/app/(dashboard)/services/[id]/SupplierBookingActions.tsx`.
- [x] RTL risk was low across reviewed overlays.
- [x] Main risk is accessibility hardening: dialog semantics, `aria-modal` consistency, focus trap, escape-key handling, and focus return.
- [x] Security/business review found no supplier-cost leakage or customer-facing internal cost exposure.
- [x] Admin/supplier destructive actions remain sensitive but copy/confirmation looked explicit enough for deferral.
- [x] This review does not block Shell-1A or Shell-1B.
- [x] Future implementation task recorded as `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`.

### I18N-RTL-MODULE-ROLLOUT-PLANNING-1
- [x] Planning/docs review completed.
- [x] Shell-1A commit `3f627b1` and Shell-1B commit `7f4c19f` are complete and pushed.
- [x] Overlay review remains deferred to `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`.
- [x] The next runtime phase must not begin as a broad "translate everything" implementation.
- [x] Arabic copy is still not finally approved.
- [x] Module rollout must stay split into small controlled tasks.
- [x] Recommended next task: `I18N-RTL-MODULE-TEXT-INVENTORY-1`.
- [x] Arabic copy review is required before module runtime translation work begins.
- [x] Recommended rollout order after inventory/copy review: Customers, Services, Quotations list/detail non-PDF surfaces, Invoices list non-PDF surfaces, Payments, Suppliers, then Settings/Admin later.
- [x] Historical rollout scope deferred document/PDF language; POST-G1 Task 4 now provides transient AR/EN document representations. Permanent bilingual customer-content placement and Customer `preferred_language` remain deferred.
- [x] VAT/ZATCA/FATOORA/QR/XML/clearance claims remain forbidden.
- [x] Supplier/internal cost labels remain RBAC-sensitive.
- [x] Service remains the locked operational core; Booking terminology still needs careful copy review.

### I18N-RTL-CUSTOMERS-RUNTIME-1
- [x] Implementation completed for the Customers runtime slice.
- [x] Senior review result: PASS.
- [x] Manual smoke result: PASS based on Mozfer visual/browser smoke.
- [x] Customers list LTR passed.
- [x] Add Customer modal LTR passed.
- [x] Customer profile LTR passed.
- [x] Edit Profile modal LTR passed.
- [x] Dev RTL shell visual smoke passed with minor non-blocking notes.
- [x] No runtime Arabic locale selector was introduced.
- [x] Arabic runtime labels remain not directly reachable because `getLocale()` still resolves to `en`.
- [x] Customers dictionary was added as a module-local runtime i18n dictionary.
- [x] Customers runtime pages now use `getLocale()` + Customers dictionary.
- [x] Revenue label was corrected to `Quoted Value` in English and `قيمة العروض` in Arabic.
- [x] Customer statuses are dictionary-backed: Lead, Active, Inactive.
- [x] Mixed-direction protections were added for customer numbers, phone, email, CR/VAT, dates, service numbers, and SAR values.
- [x] No PDF/document routes touched.
- [x] No schema/migrations touched.
- [x] No middleware/cookies touched.
- [x] No document_locale.
- [x] No Customer preferred_language.
- [x] No shared UI refactor.
- [x] No supplier/internal-cost leakage.

### I18N-RTL-SERVICES-RUNTIME-1A
- [x] Implementation completed for the Services runtime slice.
- [x] Senior review result: PASS.
- [x] Mozfer manual smoke result: PASS.
- [x] Services list passed.
- [x] New Service form passed.
- [x] Service detail passed.
- [x] Edit Service form passed.
- [x] RTL dev shell passed.
- [x] No runtime Arabic locale selector was introduced.
- [x] Arabic labels remain not directly reachable because `getLocale()` still resolves to `en`.
- [x] Added module-local Services dictionary.
- [x] Services runtime pages use `getLocale()` + Services dictionary.
- [x] Service status family is dictionary-backed: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- [x] `status-transitions` copy moved to dictionary-backed copy without changing transition behavior.
- [x] Mixed-direction protections were added for service numbers, quotation numbers, SAR values, dates/date ranges, and customer references.
- [x] No billing/invoice action files touched.
- [x] No supplier allocation/booking files touched.
- [x] No allocation subflows touched.
- [x] No PDF/document routes touched.
- [x] No schema/migrations/middleware/cookies/RBAC/shared UI touched.
- [x] AGENTS.md untouched.
- [x] Minor follow-up: `EditServiceForm` subtitle may need future RTL polish because service number and localized subtitle should not force the whole sentence LTR; not a blocker after smoke.

### I18N-RTL-SERVICES-RUNTIME-1B
- [x] Services billing/invoice action UI only.
- [x] Senior review initially HOLD due disabled reason mapping mismatch.
- [x] FIX-1 completed and aligned BillingPanel disabled reason mappings with real ServiceBillingState reason codes.
- [x] Focused re-review result: PASS.
- [x] Mozfer manual/browser smoke result: PASS.
- [x] Billing panel LTR passed.
- [x] Deposit/final invoice action UI passed or rendered unavailable states correctly.
- [x] Disabled reason messages passed.
- [x] RTL dev shell billing panel passed with minor non-blocking English-locale punctuation note.
- [x] No invoice routes touched.
- [x] No PDF/document routes touched.
- [x] No supplier allocation/booking files touched.
- [x] No schema/migrations/middleware/cookies/RBAC/financial logic changed.
- [x] AGENTS.md untouched.

### SERVICE-DETAIL-BILLING-COPY-FIX-1
- [x] P1 financial-trust copy correctness fix for Service Detail Billing/Invoicing completed in the dictionary only.
- [x] Billing copy now distinguishes a missing invoice record from an unavailable invoice action.
- [x] Missing deposit/final invoice states now say the invoice has not been created yet.
- [x] Disabled/unavailable action states now say the invoice action is not available.
- [x] No invoice/payment query, action, amount, calculation, PDF/document, schema, RBAC, auth, layout, supplier, or workflow changes were introduced.
- [x] Focused review passed.
- [x] Mozfer manual smoke passed.

### I18N-RTL-SERVICES-RUNTIME-1C
- [x] Services supplier allocation/booking display panels only.
- [x] Focused senior review result: PASS.
- [x] Mozfer manual/browser smoke result: PASS.
- [x] Supplier Allocations panel passed.
- [x] Supplier Bookings panel passed.
- [x] Cost/internal labels remained internal and permission-gated.
- [x] SBK numbers, supplier names, SAR values, dates, quantities, units, and notes remained readable.
- [x] RTL dev shell passed with minor non-blocking English-locale punctuation note.
- [x] No supplier action files touched.
- [x] No allocation subflows touched.
- [x] No RBAC/permission/cost visibility logic changed.
- [x] No invoice/payment/quotation/PDF/document routes touched.
- [x] No schema/migrations/middleware/cookies/shared UI touched.
- [x] AGENTS.md untouched.

### I18N-RTL-SERVICES-RUNTIME-1D
- [x] Services supplier action buttons/modals only.
- [x] Focused senior review result: PASS.
- [x] Mozfer manual/browser smoke result: PASS.
- [x] Supplier allocation action copy passed.
- [x] Supplier booking action copy passed.
- [x] Destructive/cancel wording remained explicit.
- [x] Server action message mapping stayed safe, with fallback to original message for unmapped future errors.
- [x] RTL shell smoke passed visually for the service detail supplier action area.
- [x] No allocation subflow pages touched.
- [x] No lib supplier allocation/booking action logic touched.
- [x] No RBAC/permission/DB/action behavior drift.
- [x] No cost leakage observed.
- [x] Deferred navigation issue observed: New Allocation navigation to `allocations/new` and browser back navigation from the allocation subflow do not show the global pending bolt; this is outside Services 1D scope and belongs to `allocations/**` navigation or global pending-bolt route coverage.

### I18N-RTL-SERVICES-RUNTIME-1E
- [x] Services allocation subflow runtime i18n only.
- [x] Focused senior review result: PASS.
- [x] Mozfer manual/browser smoke result: PASS.
- [x] New/Create Allocation page and form were localized.
- [x] Edit Allocation form was localized.
- [x] Cancel Allocation form was localized.
- [x] Delete Allocation form was localized.
- [x] Restore Allocation form was localized.
- [x] Restore flow was verified through Supplier Allocations -> Show Deleted -> Restore.
- [x] Destructive cancel/delete wording remained explicit.
- [x] Restore wording remained clear and non-destructive.
- [x] Supplier names, service number/title, quantities, units, SAR values, IDs, and dates remained readable.
- [x] Pending-bolt route navigation from the prior task remained preserved.
- [x] Show Deleted remains a local panel/filter toggle and does not show the global pending bolt by design.
- [x] No navigation helper files changed.
- [x] No lib supplier allocation action logic changed.
- [x] No RBAC/permission/DB/server action behavior changed.
- [x] No customer-facing PDF/document surfaces changed.

### SERVICES-ALLOCATIONS-NAV-PENDING-BOLT-1
- [x] Allocation subflow navigation pending-bolt wiring only.
- [x] Focused navigation review result: PASS.
- [x] Mozfer manual/browser smoke result: PASS.
- [x] New Allocation link now shows the global centered pending bolt.
- [x] Back to Service links now show the pending bolt.
- [x] App-controlled cancel/back navigation now uses pending navigation.
- [x] Post-success navigation after create/edit/cancel/delete/restore now triggers the centered bolt.
- [x] Native browser back remains untouched by design.
- [x] No action logic drift.
- [x] No permission/RBAC drift.
- [x] No DB/server action drift.
- [x] No i18n/copy drift.
- [x] No cost/financial drift.
- [x] This task resolves the previously deferred New Allocation/back navigation pending-bolt issue.

### I18N-RTL-MODULE-TEXT-INVENTORY-1
- [x] Readonly module text inventory completed.
- [x] Overall result: PASS.
- [x] No files were changed by the inventory task.
- [x] Covered Customers, Services, Quotations non-PDF, Invoices non-PDF, Payments, Suppliers, Settings, Admin/Users, and shared list UI terms.
- [x] Main conclusion: next risk is terminology/glossary consistency, not missing surface discovery.
- [x] Recommended next task: `ARABIC-COPY-REVIEW-1`.
- [x] Arabic copy review is required before any runtime module translation.
- [x] Do not start broad \"translate everything\" implementation.
- [x] Recommended first runtime module after Arabic copy review remains Customers, then Services, then Quotations non-PDF.
- [x] Services has the densest workflow/supplier-cost vocabulary and must stay carefully reviewed.
- [x] Quotations/Invoices/PDF/document language remain separate; PDF/document language remains deferred.
- [x] This historical Services slice did not touch document output; POST-G1 Task 4 now owns transient AR/EN document representations, while permanent bilingual customer-content placement and Customer `preferred_language` remain deferred.
- [x] VAT/ZATCA/FATOORA/QR/XML/clearance claims remain forbidden.
- [x] Supplier/internal cost labels remain RBAC-sensitive.
- [x] Service is the locked operational core; Booking is secondary terminology and still needs care.

### ARABIC-COPY-REVIEW-1
- [x] Readonly Arabic copy/glossary review completed.
- [x] Overall result: PASS.
- [x] Customer / Client -> العميل.
- [x] Customer Profile -> ملف العميل.
- [x] Service -> الخدمة.
- [x] Booking -> الحجز only in narrow booking-specific context.
- [x] Event Booking -> حجز الفعالية only when event context needs clarification.
- [x] Quotation / Quote -> عرض السعر.
- [x] Invoice -> الفاتورة.
- [x] Deposit Invoice -> فاتورة دفعة مقدمة.
- [x] Final Invoice -> الفاتورة النهائية.
- [x] Payment -> السداد.
- [x] Payment Tracking -> متابعة السداد.
- [x] Record Payment -> تسجيل السداد.
- [x] Supplier -> المورد.
- [x] Supplier Allocation -> تخصيص مورد.
- [x] Supplier Booking -> حجز مورد.
- [x] Rate Card -> بطاقة أسعار.
- [x] Preferred Supplier -> مورد مفضل.
- [x] Blacklist -> قائمة الحظر.
- [x] Blacklisted -> محظور.
- [x] Unblacklist -> إزالة من قائمة الحظر.
- [x] Revenue risk label -> قيمة العروض, not الإيراد unless true recognized revenue exists.
- [x] Access Denied -> تم رفض الوصول.
- [x] Read only -> للعرض فقط.
- [x] Something went wrong -> حدث خطأ ما.
- [x] Issue Date -> تاريخ الإصدار.
- [x] Valid Until -> صالح حتى.
- [x] Due Date -> تاريخ الاستحقاق.
- [x] Amount Due -> المبلغ المستحق.
- [x] Balance Due -> الرصيد المستحق.
- [x] Outstanding -> المستحق غير المحصل.
- [x] Collected -> المحصل.
- [x] VAT -> ضريبة القيمة المضافة, optionally VAT in parentheses on first mention.
- [x] TIN -> الرقم الضريبي المميز, optionally TIN in parentheses.
- [x] CR -> رقم السجل التجاري.
- [x] IBAN -> رقم الآيبان, optionally IBAN in parentheses.
- [x] SAR -> ر.س or SAR depending component constraints.
- [x] Service is the locked operational core and Booking remains secondary terminology.
- [x] Supplier/internal cost labels remain RBAC-sensitive and must not appear in customer-facing copy.
- [x] Arabic-Indic digits remain forbidden in document/PDF contexts; Western digits remain required.

### [x] Supabase + Clerk Foundation
- [x] Supabase schema exists
- [x] Supabase client/admin setup exists
- [x] `/api/health/db` works
- [x] Clerk Auth works
- [x] protected routes redirect correctly
- [x] `.env.local` ignored and not committed

### [x] Core Security / RBAC
- [x] `app_users` table
- [x] roles: admin, manager, sales, operations, accountant, viewer
- [x] helpers: `requireUser`, `getCurrentAppUser`, `requireRole`, `requirePermission`
- [x] `UnauthorizedError` / `ForbiddenError`
- [x] `src/lib/auth/errors.ts` is canonical for `UnauthorizedError` and `ForbiddenError`
- [x] `permissions.ts` imports and throws the shared auth errors
- [x] `created_by` / `updated_by` fields added
- [x] `audit_logs.user_id` converted to text
- [x] Clerk user ID stored as text
- [x] `DEV_ONLY` RLS policies existed for development
- [x] SEC-RLS-BASELINE-1 migration prepared to remove broad DEV_ONLY table policies
- [x] Manual Supabase SQL Editor apply and database verification for SEC-RLS-BASELINE-1
- [x] Live database verification returned zero DEV_ONLY policies and zero broad authenticated `USING true` / `WITH CHECK true` policies
- [x] RLS enabled check passed for affected tables
- [x] Quotation RPC grants verified: `anon_execute = false`, `authenticated_execute = false`, `service_role_execute = true`
- [x] Final production RLS hardening is still required

### [x] SEC-AUTHZ-APP-USER-GATE-1
- [x] Security blocker discovered: a Clerk-authenticated user with no `app_users` row could access `/dashboard` and all internal CRM navigation.
- [x] Root cause: `(dashboard)/layout.tsx` had no `app_users` membership check; Clerk authentication alone was sufficient to enter the internal CRM.
- [x] Fix: dashboard layout now requires an active `app_users` row (matched on `clerk_user_id` as TEXT); users without membership are redirected to `/unauthorized`.
- [x] `/unauthorized` page created with navy/gold design, no sidebar, no internal navigation, no internal data.
- [x] `/services(.*)` added to Clerk protected routes in `src/proxy.ts` (was missing).
- [x] Existing permission system (`requirePermission`, `requireUser`) continues to protect Server Actions.
- [x] Role source remains `app_users.role`. User linkage remains `app_users.clerk_user_id`.
- [x] No users were inserted, updated, or auto-promoted.
- [x] No schema changes, no migrations, no SQL was run.
- [x] Admin user management / invite workflow remains deferred.
- [x] This fix does not solve production RLS hardening; that remains separate/deferred.
- [x] Implementation passed manual verification by Mozfer (active admin access works, unapproved Clerk users are blocked and see `/unauthorized`, direct route access is blocked).
- [x] `QUOTE-APPROVAL-FLOW-1B` remains in stash, pending restoration and smoke after this security fix is committed/merged.

### [x] STAB-P0-04 / Global Pending UX
- [x] Repo-level env validation for the dashboard server paths was centralized.
- [x] Sensitive authenticated Server Actions now use MVP single-instance in-memory rate limiting.
- [x] The production `company_settings` RLS migration is committed in-repo and the remote Supabase apply has been verified.
- [x] Committed/tracked secrets exposure review passed: no real secrets were found in tracked repo files, docs, env examples, or client-facing code paths; public env usage remains limited to safe publishable values and auth route URLs.
- [x] The centered bolt loader is the approved polished MVP loading mark for dashboard pending states.
- [x] `GLOBAL-LOADING-CRUD-FORMS-1` completed and pushed in `bf3a4ba feat(ui): add global pending bolt to CRUD forms`.
- [x] Safe CRUD submit/save actions now use shared `Button loading={...}` for customer profile save, service create/edit, and supplier create/edit.
- [x] Manual smoke passed for the five covered CRUD actions, and validation passed before commit.
- [x] Viewer bank-detail masking verification passed: server-side data shaping removes bank details before client props, and Viewer browser smoke on `/settings` showed only the restriction message.
- [x] Raw error/security exposure verification passed: manual browser smoke on `/services/[id]`, `/invoices` payment modal, and `/settings` showed only safe validation messages and no raw Supabase/Postgres/RPC/internal errors.

### ✅ PAYMENTS-LIST-SORT-PAGINATION-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `844f2ec feat(payments): add ascending pagination to payments list`
- Payments list now orders by `payment_number` ascending, then `date` and `created_at` ascending.
- Payments page now paginates 10 records per page using the shared `PaginationFooter`, while KPI cards still use the full payment dataset.
- Manual smoke passed for page ordering, pagination controls, KPI counts, and the unchanged `RecordPaymentModal`.

### ✅ G7-SUPPLIERS-V1-DIRECTORY-AND-LIST-UX
- Supplier Directory V1 is implemented, automatically validated, and user-owned DEV/DEMO runtime-smoke verified; production was not touched.
- `/suppliers/[id]` is a responsive live detail route. The normal directory query returns a safe summary DTO only; it excludes notes, CR/VAT values, bank values, blacklist audit details, and Clerk audit IDs.
- Create and edit enforce the required directory fields and VAT-registration/VAT-number pairing. Lifecycle and blacklist/unblacklist workflows are preserved.
- Supplier bank reads and writes, soft delete, and restore are server-gated for Admin only. Delete is blocked when an active Supplier Allocation or Supplier Booking exists; that dependency check is application-layer and nontransactional.
- Deleted suppliers are excluded from normal directory/detail reads. Restore returns a non-blacklisted supplier to `inactive`.
- The legacy static Supplier dataset, UUID fallback display, and `recent_project` mapping/UI remnants are removed.
- Server-backed Supplier pagination uses 10 records per page and preserves search/lifecycle filters. Customers, Services, Quotations, and Invoices now use the matching accessible eye-only detail control.
- Supplier invoices, payables, outbound payments, accounting workflows, Accountant Supplier-bank access, and production RLS/readiness remain deferred.

### ✅ QUOTATIONS-FILTERS-FIX-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `3c19a28 fix(quotations): wire list filters`
- Quotations status and month filters are now controlled client-side state wired to the existing controls.
- Pagination now uses the filtered quotations list, and changing filters resets the current page to 1.
- Manual smoke passed for status filtering, month filtering, filtered pagination, clearing filters, and unchanged row actions.

### [x] CUSTOMER-NUMBER-1
- [x] DB migration applied manually, adding `customer_number` sequence.
- [x] App layer generates customer number server-side via `generate_document_number` RPC.
- [x] UI updated to show customer number instead of UUID prefix.
- [x] Schema synchronized in `schema.sql`.

### [x] Customers CRUD
- [x] list/read customers from Supabase
- [x] add customer
- [x] edit customer
- [x] soft delete customer
- [x] RBAC: `customers:read`, `customers:write`
- [x] Access Denied state
- [x] no `[]` returned for Unauthorized/Forbidden
- [x] merged into main

### [x] Customers CSV Export
- [x] export visible customers to CSV
- [x] filename format: `g7-blue-customers-YYYY-MM-DD.csv`
- [x] correct CSV escaping
- [x] disabled when list is empty
- [x] merged into main

### [x] Quotations RPC Foundation
- [x] `vat_rate` added to quotations
- [x] quotation number standardized to QT-YYYY-0001
- [x] `create_quotation_with_items` RPC
- [x] `update_quotation_with_items` RPC
- [x] calculations done server-side/PostgreSQL
- [x] `quotation_items.total` = qty * unit_price before VAT
- [x] `quotation_items.vat` = VAT amount, not rate
- [x] discount applied before VAT
- [x] proportional discount allocation
- [x] VAT residual adjustment so `SUM(item.vat)` = `quotations.vat_amount`
- [x] RPC execute restricted to `service_role`
- [x] `generate_document_number` locked to `service_role`
- [x] migration applied manually in Supabase
- [x] build passed
- [x] `/api/health/db` returned ok:true
- [x] PR merged into main

### [x] Quotations Data Layer
- PR #4 merged into main
- Branch: `feature/quotations-data-layer`
- Created `types.ts`, `schemas.ts`, `mappers.ts`, `queries.ts`, `actions.ts`, `index.ts`
- Audit passed: permissions enforced, soft delete blocked for approved quotations, numeric `Number()` mapping added, `is_deleted` filter applied, safe errors implemented.

### [x] Phase 5A - Quotations UI Manual Entry: List + Create Form
- `/quotations` now uses live `getQuotations()` data
- `/quotations/new` creates quotations with manual items only
- Customer dropdown only receives active and non-deleted customers
- Earlier quotation UI used a fixed VAT preview; TAX-0 requires this wording not be treated as current tax registration or official invoice behavior.
- Client totals are preview only and PostgreSQL RPC remains source of truth
- Edit, soft delete, detail, and print were deferred to later quotation phases
- PR merged into main

### [x] Phase 5B - Quotations Edit + Soft Delete
- Draft quotations can now be edited
- Non-draft quotations show locked edit behavior
- List actions respect `quotations:write`
- Read-only users can still view quotations
- Approved quotations cannot be deleted from UI
- Backend `softDeleteQuotation` remains the authority
- `checkPermission` was added as a server-only helper for conditional UI only

### [x] Phase 6 - Quotation Detail + Browser Print
- Quotation detail page now uses live `getQuotationById` data
- Print route now uses live quotation data
- Browser print uses `window.print()` isolated inside a Client Component (`PrintButton`)
- UI wording is "Print / Save as PDF", not "Generate PDF"
- Browser print layout was improved after stabilization/product review
- Server-side PDF generation remains deferred
- No PDF dependencies were added
- Company/business info currently uses static `settingsData` fallback; live `company_settings` remains deferred, and fallback output must not claim VAT registration or official tax invoice behavior
- Unauthorized redirects use `/sign-in` (Phase 6 pre-commit audit found an incorrect `/login` redirect and fixed it to match the existing app pattern)
- Forbidden users see Access Denied inline
- Fake quick approval/status buttons were removed
- Totals are backend/data-layer values, not recalculated in UI
- PR merged into main

### [x] Quotation Stabilization + Product Review
- Quotations core flow is stabilized for the current demo path: create, edit draft, view detail, and browser print.
- Auth error imports were fixed.
- `src/lib/auth/errors.ts` is the canonical source for `UnauthorizedError` and `ForbiddenError`.
- `permissions.ts` imports and throws the shared auth errors instead of defining duplicate classes.
- Quotation RPC ambiguity was fixed.
- `create_quotation_with_items` and `update_quotation_with_items` now qualify `quotation_items` references with aliases.
- PostgreSQL `RETURNS TABLE()` ambiguity lesson captured: output column names can shadow unqualified table references inside PL/pgSQL functions.
- Quotation creation was verified working after manual Supabase apply.
- Quotation browser print layout was improved.

### [x] Phase CS-A - Company Settings Mini
- Live singleton Company Settings was implemented as CS-A only.
- CS-A uses server-only settings queries/actions, Zod validation, `settings:read`, and `settings:write`.
- Bank details are restricted in the app data flow to Admin and Accountant; Viewer can read settings without receiving bank values.
- VAT mode defaults to `not_registered`; default VAT percent is `0` while not registered.
- Logo upload is deferred.
- Quotation snapshot wiring is completed. Live settings are still intentionally not wired into invoice print views. CS-B document snapshot wiring is required before printed invoices depend on Company Settings.
- SQL migration was reviewed for manual apply; SQL must never be applied automatically by agents.
- CS-A was committed on `main` as `8dc380f feat: implement Company Settings CS-A`.

### [x] ERP-1 - Services DB Foundation
> Historical foundation record; the current explicit Service lifecycle state is documented in Sections 1–2.1 above.
- ERP-1 Services migration was manually applied in Supabase SQL Editor and verified.
- `services` now exists as the new operational unit linked to `customers(id)`.
- Service numbering is supported through `generate_document_number('service')` with `SVC-YYYY-0001`.
- Existing prefixes are preserved: `QT`, `INV`, `PAY`, `PRJ`, and `SVC`.
- `schema.sql` now reflects the verified post-ERP-1 DB state.
- At the time of this foundation record, Services app UI/routes/server actions supported list/create/detail/edit; later explicit lifecycle actions are documented above.
- Quotations are now service-scoped through `quotations.service_id`; invoices and payments are not changed yet.
- Invoices and payments are not changed yet.
- Legacy `projects` remain for now.
- `DEV_ONLY_services` is fake/dev-data only and not production-safe.

### [x] PRJ-CLEANUP-1 - Retire User-Facing Projects UI
- Projects were removed from primary user-facing navigation.
- Dashboard Project cards/actions/sections were replaced with Service / Booking-oriented surfaces that point to the existing Services route.
- `/projects` now redirects to `/services`.
- Legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references remain deferred for later cleanup.

### [x] QUOTE-VALIDITY-RULE-1 - Quotation Validity Against Service Schedule
- PR #17 merged into `main` as `96643e6 Merge pull request #17 from shingami66/fix/quotation-validity-service-schedule`.
- Service Schedule is read-only context in the quotation create UI.
- Issue Date is read-only and remains the quotation document issue date.
- Quotation Valid Until means offer expiry date, not service execution date.
- `valid_until >= issue_date` remains enforced.
- If Service Start Date exists, `valid_until <= service.event_start_date`.
- If Service Start Date is before Issue Date, quotation create/update is blocked with a controlled error.
- Validation is enforced in both UI and Server Actions.
- Services list is sorted by service number ascending.
- Native number input spinners are hidden in quotation numeric inputs.
- No schema, migration, RPC, VAT, invoice/payment, or financial total authority changes were made.

### [x] QUOTE-APPROVAL-FLOW-1B - Quotation Approval Workflow
- Quotation approval logic implemented.
- Added `approveQuotation` and `rejectQuotation` actions.
- Enforces one approved quotation per service via database unique constraint (`unique_approved_quotation_per_service`).
- Admin smoke passed.
- Manual migration was applied and verified.
- `supabase/schema.sql` is synced.
- Full parent `QUOTE-APPROVAL-FLOW-1` is marked complete.
- Multi-role browser smoke for Manager/Sales remains pending until official test users / Admin User Management are available.
- Service status transition on approval remains deferred.

### [x] ADMIN-USER-MANAGEMENT-1A
- Completed inspection and design phase for invite-only user management.
- Approved Option D: Clerk Invitations API + invitation metadata + `user.created` webhook.
- Corrected metadata wording: use Clerk invitation metadata / `publicMetadata` unless future SDK verification proves `privateMetadata` support for user invitations.
- The invitation role is bootstrap-only; final CRM authorization remains sourced from `app_users.role`.
- Decided against a separate `user_invitations` table for the 1B MVP.
- Decided against changing `app_users.clerk_user_id` from NOT NULL.
- Confirmed webhook verification is mandatory for future implementation.
- Confirmed webhook failure rule: if invitation metadata is missing, invalid, or contains an unrecognized role, do not create an `app_users` row and do not assign a default fallback role.
- Sent workflow remains deferred.
- Approval audit fields remain deferred.
- Invoice/payment creation remains future ERP scope.
- VAT/ZATCA remains out of scope.

### [x] ADMIN-USER-MANAGEMENT-1B
- Implemented `/admin/users` UI built and connected to Server Actions.
- ADMIN-USER-MANAGEMENT-1B code implementation is complete; real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- Server Actions implemented for inviting users, managing roles, revoking invitations, and toggling active status.
- Clerk SDK Invitations API integration with `publicMetadata` role embedding.
- Clerk `user.created` webhook implemented with signature verification and strict validation.
- Webhook enforces strict validation rules: ignores missing or invalid roles to prevent fallback access.
- Final authorization relies strictly on `app_users.role`. Authentication relies on Clerk.
- Invite Server Action enforces `users:invite`; role update, active/inactive toggle, invitation revoke, and pending invitation reads enforce `users:manage`.
- Self-deactivation and self-role-change are blocked to reduce admin lockout risk.
- Admin user list database errors show a safe error state instead of "No users found".
- Successful user-management actions refresh server data in the UI.
- `CLERK_WEBHOOK_SIGNING_SECRET` is required for real Clerk webhook testing; missing secret fails safe before processing.
- Admin can invite another user with any allowed CRM role, including `admin`, only by explicitly selecting that role. The invite form defaults to `viewer`, never `admin`.
- No real Clerk users/invitations were created during implementation.
- Last-active-admin protection and a proper revoke confirmation modal were deferred to ADMIN-USER-MANAGEMENT-1C-B.
- No schema changes, migrations, SQL, or package changes were made for ADMIN-USER-MANAGEMENT-1B.

### [x] ADMIN-USER-MANAGEMENT-1C-B
- Implemented last-active-admin protection server-side in Admin User Management Server Actions.
- Deactivating the final active admin is blocked with a safe UI-facing error.
- Changing the final active admin to a non-admin role is blocked with a safe UI-facing error.
- Existing self-deactivation and self-role-change protections remain in place.
- Replaced the native revoke invitation `confirm()` with a CRM-styled confirmation modal using existing G7 BLUE design tokens.
- Real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- No real Clerk users/invitations were created during implementation.
- [x] No SQL, migrations, package, environment, or schema changes were made for ADMIN-USER-MANAGEMENT-1C-B.

### [x] DOCUMENT-BRANDING-PRINT-1B
- Applied official G7 BLUE identity and logo to Quotation and Invoice PDF/print views.
- Removed fake VAT, Tax Invoice, and CR values.
- Used Entity Unified No `7053901414` and TIN `3146944674`.
- Retained `not_registered` VAT status.
- Implemented purely in the UI, avoiding premature ERP-3 database snapshots or schema changes.

### [x] DOCUMENT-SNAPSHOT-WIRING-1B
- [x] DOCUMENT-SNAPSHOT-WIRING-1A completed.
- [x] DOCUMENT-SNAPSHOT-WIRING-1B completed.
- Quotation snapshot UI wiring, DB migrations, backfill, RPC updates, and schema sync completed.
- `company_settings` and `customers` are decoupled from printed Quotations.

### [x] COMPANY-SETTINGS-CLEANUP-1B (Applied and verified in Supabase)
- Repo implementation committed and pushed in `0b826a9`.
- Supabase migration/manual DB cleanup applied manually.
- `company_settings.cr_number` is nullable in DB.
- `company_settings.official_email` is plain `info@g7blue.com`.
- `company_settings.cr_number` is `NULL`.
- `company_settings.default_terms` uses professional terms.
- Existing quotation seller snapshots were corrected.
- Verification result:
  - total quotations: 9
  - bad snapshot email: 0
  - bad snapshot CR: 0
  - bad snapshot terms: 0
- No Tax Invoice / VAT 15% / VAT Number / ZATCA behavior is enabled while `vat_mode = not_registered`.

### SETTINGS-EDIT-MODE-1
- Implemented and repo-ready; manual browser smoke pending.
- Company Settings is read-only by default.
- Edit requires explicit `Edit Settings` action.
- Save/Cancel appear only in edit mode.
- Edit button does not render for users without write permission.
- Existing validation, permissions, and bank masking are expected to remain respected.

### [x] SERVICE-DETAIL-RELATED-QUOTE-CTA-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commits:
  - `80e3765 feat(services): add related quotation create cta`
  - `0930954 fix(services): align quotation cta eligibility`
- Added `Create Quotation` CTA inside the Service Detail `Related Quotations` card.
- CTA links to `/quotations/new?serviceId=<service-id>` for eligible services, passing context correctly.
- Eligibility fix ensures already-started Inquiry/Quoted services show a disabled CTA with the reason:
  `Cannot create a quotation because the service has already started.`
- Clean Code Guard Review Mode passed successfully.
- Lint and TypeScript compile successfully.

### ✅ QUOTE-TO-DEPOSIT-CTA-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `103e0fa feat(quotations): add deposit invoice cta`
- Approved Quotation Detail now shows a `Deposit Invoice` card/CTA.
- Reuses existing `CreateDepositInvoiceAction`.
- Uses existing invoice creation backend flow via `createInvoiceAction`.
- Preserves server-side authority for RBAC, quotation approval validation, service linkage validation, duplicate active deposit invoice prevention, and existing invoice/VAT behavior.
- Manual smoke confirmed:
  - Approved quotation displayed Deposit Invoice CTA.
  - Deposit invoice was created successfully.
  - Duplicate creation was prevented after creation.
  - Created invoice appeared in `/invoices`.
- Team Lead approved Option A for existing deposit invoice display:
  - Do not link to unsupported `/invoices/<id>` (removed the broken link that caused 404).
  - Show invoice number as text.
  - Show guidance: `Open it from the Invoices list.`
- Option B approved as separate P1 backlog item: `INVOICE-LIST-DEEP-LINK-SELECTION-1`.
- Option C (creating an `/invoices/[id]` detail route) was rejected pending a full invoice UX/product design session.

### ✅ INVOICE-LIST-REMOVE-STANDALONE-CREATE-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `ada01f0 fix(invoices): remove standalone create entry point`
- Summary:
  - Generic disabled `Create Invoice` button removed from `/invoices`.
  - Safe workflow guidance added: `Invoices are created from approved quotations or service billing actions.`
  - Invoice list and side panel preserved without layout regression.
  - Server-side invoice creation remains context-guarded by `quotationId` and `serviceId`.
- Lint and TypeScript compile successfully with zero errors.

### ✅ GLOBAL-PENDING-NAVIGATION-LOW-RISK-1A
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `6759de2 feat(ui): add global pending bolt to low-risk navigation`
- Summary:
  - Added `PendingLink` and `useGlobalNavigationPending` for delayed global centered pending bolt coverage on low-risk dashboard navigation.
  - Covered safe navigation paths: New Service, New Supplier, service/customer row detail navigation, service detail Back/Edit/customer links, customer detail Back/related service links, and service/supplier create-edit back/cancel.
  - Preserved normal link behavior for modifier clicks and middle-clicks.
- Validation:
  - `pnpm exec next typegen`
  - `pnpm exec tsc --noEmit`
  - `git diff --check`
- Manual smoke passed for the covered low-risk navigation paths.
- Follow-up scope remains open for quotations, invoices/payments, financial actions, service status, supplier allocation/booking workflow, and admin/RBAC row actions.

### ✅ GLOBAL-PENDING-QUOTATION-FORMS-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `645eef0 feat(ui): add global pending bolt to quotation forms`
- Summary:
  - Updated quotation create/update submit to shared `Button loading={isSubmitting}` so the global centered pending bolt appears during quotation save/create.
  - Changed only `src/app/(dashboard)/quotations/new/QuotationForm.tsx`.
  - Preserved quotation validation, totals, payload shape, redirects, and permission behavior.
- Validation:
  - `pnpm exec next typegen`
  - `pnpm exec tsc --noEmit`
  - `git diff --check`
- Manual smoke passed for quotation create submit and quotation edit/update submit.
- Follow-up scope remains open for financial/payment/invoice actions, service status, supplier allocation/booking workflow, and admin/RBAC row actions.

### ✅ GLOBAL-PENDING-INVOICE-CREATE-ACTIONS-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `468cd00 feat(ui): add global pending bolt to invoice create actions`
- Covered invoice create actions:
  - service detail create deposit invoice
  - service detail create final invoice
- Manual smoke passed for invoice create submit flows, and validation passed with `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, and `git diff --check`.
- `RecordPaymentModal` remains intentionally local-pending and untouched.
- `GLOBAL-PENDING-QUOTATION-NAVIGATION-1` is completed and pushed in `29cdfb4 feat(ui): add global pending bolt to quotation navigation`.
- Safe quotation navigation now uses delayed global pending helpers for list row click, View Details, draft Edit, detail Back/Edit, and new/edit top Back.
- Manual smoke passed for the covered quotation navigation paths, and modifier-key / middle-click behavior remained correct.
- Follow-up scope remains open for payment recording, supplier allocation/booking workflow, service status, admin/RBAC row actions, and the remaining invoice/payment workflow slices.

### ✅ SUPPLIER-ACTIONS-PENDING-AUDIT-1
- Status: Readonly audit completed, no code changes.
- Already global/no change:
  - supplier allocation status transitions
  - supplier booking create
  - supplier booking cancel modal keeps local context
  - allocation cancel and restore already use shared `Button` / global bolt behavior
- Local pending gaps found:
  - `SupplierAllocationCreateForm` raw local spinner
  - `SupplierAllocationEditForm` raw local spinner
  - `SupplierAllocationDeleteForm` raw local spinner
- Recommended next supplier slice: `GLOBAL-PENDING-SUPPLIER-ALLOCATION-FORMS-1`, limited to create/edit/delete allocation submit buttons using shared `Button loading={...}` only.
- Open risk areas remain: supplier status machine, booking workflow, RBAC/cost visibility, audit trail behavior, and any customer-output leakage of supplier/internal costing details.

### UX / Localization Direction
- SMACC / warehouse ERP screenshots are useful UX inspiration only, not a direct clone.
- Good reference ideas: list/manage tabs, result count beside List, search/filter area, page size and go-to-page controls, View eye icon, Print/PDF icon, and a clear document header/metadata/line-items/totals split.
- Avoid copying inventory-only concepts unless G7 actually needs them: warehouse code, salesman code, item code, loyalty card, promotion controls, and fake cleared-status claims.
- Arabic/English support should be real layout-direction switching rather than literal text replacement.
- English mode should stay LTR with the sidebar on the left and table/action flows left-to-right.
- Arabic mode should switch to RTL with the sidebar on the right and mirrored breadcrumbs/table/action flow.
- Arabic copy should use business-friendly Saudi/event terms, not awkward literal translation.
- Numbers, currency, dates, VAT labels, and document names must remain clear, and historical documents must not change meaning when language/settings change.
- `I18N-RTL-FOUNDATION-AUDIT-1`, `I18N-P0-DECISIONS-LOCK-1`, and `I18N-RTL-FOUNDATION-1` are now closed.
- `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` is now the required readonly prerequisite before shell RTL implementation.
- `I18N-RTL-SHELL-1A` and `I18N-RTL-SHELL-1B` replace the previous single Shell-1 idea.
- `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` remains explicitly forbidden for Shell-1A and Shell-1B because `Cancelled` is a non-linear terminal state.
- This historical i18n priority list deferred document/PDF language implementation and `document_locale`; POST-G1 Task 4 supersedes that direction with the closed one-canonical-document/transient-representation architecture. Permanent bilingual commercial-content placement remains gated by Zainab field evidence and controller design lock; Customer `preferred_language` remains separately deferred.
- P1 decisions to confirm next: whether Booking remains a secondary Service label, Arabic rollout order by role, reuse of existing Company Settings Arabic/English company name fields, and whether Hijri calendar support stays deferred.

### Historical Immediate Next Priorities
- `P1`: `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` for readonly shared overlay path/ownership inventory.
- `P2`: `I18N-RTL-SHELL-1A` for the shell/navigation logical-direction refactor across the approved shell files only.
- `P3`: `I18N-RTL-SHELL-1B` for the shared list/data-component logical-direction refactor.
- `P4`: `INVOICE-LIST-ACTIONS-POLISH-1` for view/print icon polish, list action review, and pagination/page-size/go-to-page review.
- `P5`: `DOCUMENT-LANGUAGE-SNAPSHOT-1` is historical and superseded by POST-G1 Task 4. The completed Commercial Model Impact Check returned `PARTIAL`; permanent bilingual commercial-content placement remains deferred until Zainab field evidence determines the surviving hierarchy.
- `P6`: `GLOBAL-PENDING-SUPPLIER-ALLOCATION-FORMS-1` for the medium-risk pending UX migration on supplier allocation create/edit/delete forms.

### ✅ HUMAN-REFERENCE-DISPLAY-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `f68afe0 fix(ui): display human-readable references`
- Summary:
  - Service Detail changed visible `Customer ID` raw UUID to `Customer Ref`.
  - Service Detail displays `customerNumber` with safe fallback.
  - Invoice side panel changed visible `Quotation ID` raw UUID to `Quotation Ref`.
  - Invoice side panel displays `relatedQuoteNumber` with safe fallback.
  - Internal UUIDs/routes/actions were preserved.
  - No schema/action/workflow/RBAC changes.
- Lint and TypeScript compile successfully with zero errors.
### ✅ SUPPLIER-BOOKINGS-FOUNDATION-1
- Status: Completed, verified, committed, and pushed.
- Implementation commits:
  - `5866d42 db(suppliers): add supplier bookings foundation migration`
  - `04d1e7c db(suppliers): sync supplier bookings schema`
- The `supplier_bookings` table exists in the database.
- RLS is enabled; direct table access for `anon` and `authenticated` roles is revoked.
- Foreign keys (`source_allocation_id`, `service_id`, `supplier_id`) are strictly immutable.
- Insert triggers (`trg_supplier_bookings_insert_sync_allocation`) enforce business rules, ensuring consistency between `service_supplier_allocations` and the new booking.
- `number_sequences_type_check` includes `supplier_booking`.
- Booking numbers are generated DB-side using `generate_document_number('supplier_booking'::text)` (e.g. `SBK-YYYY-0001`).
- `SUPPLIER-BOOKINGS-NUMBERING-DB-1` is closed in commit `d9b2a6d db(suppliers): add supplier booking number default`; remote DB verification confirmed the `public.supplier_bookings.booking_number` column default.
- Indexes exist, including `idx_supplier_bookings_one_active_per_allocation` to enforce at most one active booking per allocation.
- Terminology constraint: Uses `Supplier Booking` / `supplier_bookings` / `SBK`.
- **Deferred**: Standalone/broader Supplier Booking routes/UI, customer-facing documents/messages/portal, supplier invoices/payments, actual supplier costs, profit/margin reporting, and broader runtime workflows remain future tasks. Narrow internal Service Detail Supplier Booking UI is closed in `SUPPLIER-BOOKINGS-UI-1A`.

### ✅ SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1
- Status: Completed, verified, committed, and pushed.
- Implementation commits:
  - `39fb5fd db(suppliers): align audit columns with clerk ids`
  - `4cbd9cf db(suppliers): sync audit column schema`
- Solved Cursor Audit blocker `SUPPLIER-AUDIT-COLUMNS-TEXT-1`.
- Aligned `service_supplier_allocations` and `supplier_bookings` `created_by`, `updated_by`, `cancelled_by` to `text` instead of `uuid`, matching `app_users.clerk_user_id`.
- Verified ZERO_POLICY_DEPENDENCIES, ZERO_INDEX_DEPENDENCIES, ZERO_TRIGGER_DEPENDENCIES, ZERO_ZOD_UUID_VALIDATORS.
- Remote Supabase database updated successfully.

### ✅ SUPPLIER-ALLOCATION-BOOKING-GUARD-1
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `4400700 fix(suppliers): block allocation changes with active bookings`
- `cancelSupplierAllocation`, `deleteSupplierAllocation`, and `restoreSupplierAllocation` now block mutation when an active `supplier_booking` exists.
- Active booking definition: `supplier_bookings.is_deleted = false AND supplier_bookings.status <> 'cancelled'`.
- The helper performs an existence-only check and selects only `id`.
- No supplier costs/details are exposed.
- Lint and build passed with only pre-existing unrelated Next.js image warnings.

### ✅ SUPPLIER-BOOKINGS-SCHEMAS-1A
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `4147591 feat(suppliers): add supplier bookings domain schemas`
- Domain foundation currently includes only: `types`, `schemas`, `mappers`, `index` exports.
- Supplier Booking queries, narrow actions, and narrow internal Service Detail UI are now complete; standalone/broader UI remains deferred.
- Supplier Booking statuses remain limited to: `draft`, `cancelled`.
- Mapper redacts cost/internal details by default (`canReadCost=false`, `canReadInternalDetails=false`).
- `createSupplierBookingSchema` accepts only `sourceAllocationId` and does not trust client cost/business fields.

### ✅ SUPPLIER-BOOKINGS-PERMISSIONS-1A
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `27f4bf5 feat(suppliers): add supplier booking permissions`
- Manager now has: `supplier_bookings:read`, `supplier_bookings:read_cost`, `supplier_bookings:write`, `supplier_bookings:cancel`.
- Operations, Accountant, Sales, and Viewer have no Supplier Booking permissions in MVP.
- Admin access remains through wildcard `*`.

### ✅ SUPPLIER-BOOKINGS-QUERIES-1A
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `578241a feat(suppliers): add supplier booking read queries`
- Summary:
  - Added server-only read queries: `getSupplierBookingsByServiceId`, `getSupplierBookingsBySupplierId`, and `getSupplierBookingById`.
  - All queries require `supplier_bookings:read` permission.
  - Cost and internal details (including snapshots and internal notes) are gated by `supplier_bookings:read_cost`.
  - All queries enforce `is_deleted = false`.
  - The `includeDeleted` option was intentionally not implemented in this slice.
  - Cancelled Supplier Bookings remain included as historical internal records.
  - Supplier Booking actions and narrow internal Service Detail UI are now complete; standalone/broader UI remains deferred.

### ✅ SUPPLIER-BOOKINGS-NUMBERING-DB-1
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `d9b2a6d db(suppliers): add supplier booking number default`
- `supplier_bookings.booking_number` generation is DB-side via `generate_document_number('supplier_booking'::text)`.
- Remote DB verification confirmed the `public.supplier_bookings.booking_number` column default.
- Supplier Booking create code omits `booking_number` and does not call `generate_document_number` manually.

### ✅ SUPPLIER-BOOKINGS-ACTIONS-1A
- Status: Completed, reviewed, committed, and pushed.
- Implementation commit:
  - `8bd98bf feat(suppliers): add supplier booking actions`
- Added internal-only actions: `createSupplierBookingFromAllocation` and `cancelSupplierBooking`.
- Create accepts only `sourceAllocationId`.
- Create derives service, supplier, business, and cost fields server-side from the selected allocation.
- Create omits `booking_number` and does not call `generate_document_number` manually.
- Duplicate active Supplier Booking returns a controlled error.
- Cancel only sets cancellation, status, and audit fields.
- Cost and internal details remain protected by `supplier_bookings:read_cost` mapper redaction.
- Supplier Booking UI 1A is now complete as a narrow internal Service Detail panel; standalone/broader UI remains deferred.

### ✅ SUPPLIER-BOOKINGS-UI-1A
- Status: Completed, reviewed, committed, and pushed.
- Implementation commit:
  - `79473e9 feat(suppliers): add supplier booking service UI`
- Added narrow internal Service Detail MVP UI only, near Supplier Allocations and before Billing.
- Read/create/cancel UI is permission-gated: read `supplier_bookings:read`, create `supplier_bookings:write`, cancel `supplier_bookings:cancel`.
- Create sends only `sourceAllocationId`.
- Cancel requires a reason and sends only `cancelledReason`.
- Cost/internal fields display only from permission-safe mapped Supplier Booking data.
- Supplier Booking statuses remain limited to `draft` and `cancelled`.
- No standalone route, PDF, customer-facing surface, supplier portal, supplier invoice/payment, actual cost, profit/margin reporting, edit/delete/restore, or status expansion was added.
- `SUPPLIER-BOOKINGS-UI-1A-SMOKE-VERIFY` is completed history with a PASS WITH WARN result; the minor loading/pending indicator UX warning remains a separate follow-up.

## 4. Historical / Superseded Delivery Priority Record

> Historical sync-point record. The verdict, phase, and controlled task below describe an earlier planning state and do not override active Feature 006 or the current Invoice PDF cleanup priority.

### 🚧 Cursor Audit Priority Gates & Blockers
Cursor audit gate:
- Historical sync-point verdict: PROCEED_TO_G7_CANONICAL_DOCS_CLEANUP_P2.
- SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1: CLOSED.
- SUPPLIER-ALLOCATION-BOOKING-GUARD-1: CLOSED.
- SUPPLIER-BOOKINGS-SCHEMAS-1A: CLOSED.
- SUPPLIER-BOOKINGS-PERMISSIONS-1A: CLOSED.
- SUPPLIER-BOOKINGS-QUERIES-1A: CLOSED.
- SUPPLIER-BOOKINGS-NUMBERING-DB-1: CLOSED.
- SUPPLIER-BOOKINGS-ACTIONS-1A: CLOSED.
- SUPPLIER-BOOKINGS-UI-1A-DESIGN-REVIEW: CLOSED.
- SUPPLIER-BOOKINGS-UI-1A: CLOSED.
- Canonical documentation staleness audit, P0 cleanup, P1 cleanup, and P2 history cleanup are completed history.
- `G7-CLIENT-DELIVERY-ROADMAP-DESIGN-1` completed with PASS WITH WARN; the roadmap was accepted with model-routing and task-sizing corrections.
- Historical sync-point phase: **Phase 1 - Experience Foundation**.
- Completed: `V1-DELIVERY-DECISIONS-LOCK-1` locked D01-D09 as product policy; no implementation occurred.
- Historical sync-point controlled task: `I18N-RUNTIME-LOCALE-DESIGN-1` using guarded Spec Kit feature `005` in a separate task.
- Reports Center remains P1 and is not a V1 acceptance gate. Professional Supplier Booking remains outside V1 acceptance scope.
- Financial correction records use `Internal Credit Adjustment` for current non-VAT work; no Tax Credit Note, VAT, ZATCA, or FATOORA claim is permitted.
- No code, SQL, migration, browser smoke, or production work occurred in the client-delivery roadmap design/docs slices.

### 🚧 Historical / Superseded CRM Priority Sequence

> Retained as an earlier planning sequence. It is not the current execution order and does not override active Feature 006.

Status: SEC-AUTHZ-APP-USER-GATE-1 implemented and manually verified; SERVICE-HUB-1B merged; QUOTE-APPROVAL-FLOW-1B implemented, Admin smoke passed, manual migration applied and schema synced. Multi-role browser smoke for Manager/Sales remains pending until official test users / Admin User Management are available. Full parent QUOTE-APPROVAL-FLOW-1 is considered complete for Phase 1B standards. At this historical sync point, the recorded follow-up order was `ERP-3`.


The locked workflow remains:
Customer Profile -> Service -> Quotation -> Invoice -> Payment.

The historical recorded work order was:
1. `RBAC-QUOTATIONS-APPROVE-1`
   - Ready for PR: `quotations:approve` added to Manager in `src/lib/auth/permissions.ts`.
   - Keeps approval separate from ordinary `quotations:write`.
   - Required before quotation approval flow and ERP-3 invoices.
2. `CUST-OFFICIAL-DETAILS-1`
   - CUST-OFFICIAL-DETAILS-1B manually applied and DB-verified: optional/conditional customer official and billing fields are present in the database.
   - Fields include customer type (Individual / Company), legal name, Commercial Registration number, VAT number, National Address fields, billing email, finance contact, payment terms, and PO required flag.
   - `supabase/schema.sql` now matches the verified DB state for these fields.
   - CUST-OFFICIAL-DETAILS-1C wires the fields into the customer data layer, create UI, profile-only edit UI, and customer profile card; all fields remain optional/conditional and Mozfer manual smoke passed.
   - Future invoice buyer snapshots remain ERP-3 scope; customer VAT number storage does not enable Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
3. `SEC-SERVICE-INVARIANTS-1`
   - Ready for review: Service creation now validates active/non-deleted customer server-side.
   - Ready for review: Service soft delete now blocks non-deleted linked quotations.
   - Future invoice/payment service deletion guards remain ERP-3/ERP-4 scope once service-linked invoices/payments exist.
4. `SERVICE-HUB-1`
   - SERVICE-HUB-1B implements the minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
   - Includes a read-only status timeline, service schedule, customer context, and related quotations.
   - Does not add invoice/payment cards, fake financial data, status transition actions, notes/activity, or attachments.
   - Transition triggers remain deferred: `Quoted` to future quotation workflow, `Approved` to future approval flow, and `Deposit Paid` to future cleared payment flow.
   - Service remains the operational source of truth.
5. `QUOTE-APPROVAL-FLOW-1`
   - `QUOTE-APPROVAL-FLOW-1B` is implemented / code-ready / pending review.
   - Migration file exists and was manually applied.
   - Index verification passed.
   - `supabase/schema.sql` is synced in this task.
   - Manual smoke is still pending.
   - `QUOTE-APPROVAL-FLOW-1B` is not fully complete until manual smoke passes.
   - `QUOTE-APPROVAL-FLOW-1` parent task is not fully complete yet if smoke is still pending.
   - Service status transition on approval remains deferred.
   - Sent workflow remains deferred.
   - Approval audit fields remain deferred/future-scope.
   - Invoices/payments remain future ERP scope.
   - VAT/ZATCA remains out of scope.
   - Pagination remains separate follow-up.
   - Multiple draft quotations per Service are allowed for negotiation.
   - More than one approved quotation per Service must be prevented.
   - Required before ERP-3 invoice creation.
6. `ERP-3`
   - Deposit/final invoices must be created from Approved Quotation + Service.
   - No invoice without Service.
   - No invoice without Approved Quotation.
   - Invoice totals must derive from approved quotation snapshots, not arbitrary client input.

SEC-RLS-BASELINE-1 manual Supabase apply and database verification are complete. DEV_ONLY broad authenticated policies were removed from the live database. Real or semi-real data remains blocked by remaining production hardening and pre-demo controls: `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production. It is no longer blocked by SEC-RLS manual apply itself.

Follow-up tracked from CUST-OFFICIAL-DETAILS-1C manual smoke: `LIST-PAGINATION-PARITY-1`. Customers and Services lists pagination implemented. Quotations pagination modernized to a functional state. A shared `PaginationFooter` component was created and is now used by Customers, Services, and Quotations. Pagination controls are now correctly hidden across all lists when item count is 10 or less. Manual browser smoke passed for shared pagination across Quotations, Customers, and Services. Do not move this ahead of critical/security blockers unless approved.

Follow-up tracked from QUOTATION-PDF-CLEANUP-1 manual smoke: `QUOTATION-PDF-PRINT-SETTINGS-1`. Quotation PDF print CSS cleanup was implemented. `@page` margin was adjusted and document padding restored for print layout. Browser-generated headers/footers may still depend on the browser print dialog. Manual browser smoke is required before considering it fully verified.

ADMIN-USERS-SMOKE-1 partial manual browser smoke passed: Admin Users page loads, current Admin is visible, role dropdown verified, invite/revoke pending invitation flow verified, and pending invitations returned to 0. Full invitation acceptance and Clerk webhook app_users sync remain pending/not tested.

## 4. Work in Progress / Recent Accomplishments
### Invoice Readiness Documentation Sync (ERP-3B)

**Completed and Pushed:**
1. T017D Billing UX Cleanup completed and pushed:
   42df67e feat(invoices): clean up billing UX states
2. Draft invoice issued_at fix completed and pushed:
   88507ab fix(invoices): keep draft issued_at empty
3. Final Invoice UI Action completed and pushed:
   ae64366 feat(invoices): add final invoice service action

**Current invoice module status:**
Invoice Foundation is working.
Operational Invoice Module is not complete yet.

**Currently implemented:**
- Deposit invoice backend creation works.
- Final invoice server logic exists.
- Billing Panel shows billing state.
- Invoice list is live and UX-cleaned.
- Draft invoice creation now keeps issued_at = null.
- Final Invoice UI Action is completed and pushed. Final invoice creation is available from the Service Billing Panel.
- Final invoice amount remains server-derived. The UI does not accept a final invoice amount input.
- The action calls createInvoiceAction with invoiceType = "final". Final invoices are still created as Draft.
- Guard rules verified in createInvoiceAction:
  - invoices:write enforced
  - approved quotation required
  - quotation/service mismatch rejected
  - deposit amount > 0
  - deposit amount <= quotation total
  - duplicate active deposit blocked
  - duplicate active final blocked
  - final amount calculated server-side
  - final amount subtracts active prior deposit invoice totals
  - payments ignored in invoice amount calculation

**Historical pre-delivery record:** The following pending list records the earlier invoice milestone state; the current delivered lifecycle state is documented in Sections 1–2.1 above.
- Void/Cancel/Credit Note lifecycle was pending at that time.

**Currently pending in that historical record:**
- Void/Cancel/Credit Note lifecycle is pending.
- Environment / staging / production documentation is pending.
- UAT / smoke test checklist is pending.

**Recently Completed:**
- Issue Workflow is completed and pushed.
- Draft invoices can now be issued.
- Issuing sets DB status to "sent".
- UI displays "sent" as "Issued".
- issuing sets issued_at.
- issueInvoiceAction requires invoices:write.
- Issue update is race-safe using status=draft condition.
- Issue Workflow does not change invoice amounts.
- Issue Workflow does not change snapshots.
- Issue Workflow does not create payment.
- Issue Workflow does not create PDF.
- Issue Workflow does not implement ZATCA/FATOORA/QR/XML.
- Live Invoice PDF from snapshots is completed and pushed.
- Invoice PDF is now DB-backed.
- Invoice PDF uses getInvoiceById.
- Invoice PDF enforces invoices:read permission.
- Invoice PDF uses snapshot_seller, snapshot_buyer, snapshot_quotation, snapshot_bank_details, and snapshot_document_rules as authoritative historical data.
- Invoice PDF no longer uses invoicesData/settingsData/useParams.
- Draft invoices show preview/watermark behavior.
- status "sent" displays as "Issued".
- vat_mode = not_registered displays Commercial Invoice / VAT not applied.
- No invoice mutation happens from PDF.
- No Payment was implemented.
- No Issue Workflow changes were included.
- No Global Invoice Wizard was implemented.
- No invoice Void/Cancel/Credit Note was implemented in that historical invoice slice; ABS Void and Service cancellation are delivered in the later V1 milestone above.
- No ZATCA/FATOORA/QR/XML was implemented.

**Payment MVP Completed:**
- Payment MVP completed.
- Atomic RPC payment recording implemented.
- Migrations applied and verified manually.
- Deposit invoice full-payment smoke passed.
- Final invoice full-payment smoke passed.
- Payment rows and audit logs verified.
- Amount Due UI fixed.
- Invoice PDF View enabled.
- Invoice PDF terms runtime fixed.
- RPC: public.record_invoice_payment(uuid,numeric,date,text,text,text)
- Deposit Invoice: INV-2026-0004
- Deposit Payment: PAY-2026-0001
- Final Invoice: INV-2026-0005
- Deposit and final invoice PDFs opened successfully after the PDF terms normalization fix.
- Latest pushed commit: 8be7d43

**Live Payments List:**
- `PAYMENTS-LIST-LIVE-1` completed and pushed.
- Implemented in commit `f4471a2 feat(payments): show live payment records`.
- `/payments` now uses live read-only payment records through `getPaymentsList` instead of rendering mock `paymentsData` rows as real records.
- The live query enforces `payments:read`.
- Live-only KPI values are shown; mock payment rows were removed from the live page.
- Manual UI smoke passed: payment count changed from `4` to `5` after recording a new payment; confirmed collected changed from `SAR 27,499.95` to `SAR 32,503.04`; `PAY-2026-0005` appeared, linked to `INV-2026-0007`, amount `SAR 5,003.09`, method `Bank Transfer`, status `Confirmed`; invoice list showed `INV-2026-0007` changed from `Issued` to `Paid`.
- Payment recording path, `recordPaymentAction`, `record_invoice_payment` RPC usage, invoice balance/status formulas, SQL, schema, migrations, packages, and tax behavior were unchanged.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Live Invoice KPI Cards:**
- `INVOICE-KPI-LIVE-1` completed and pushed.
- Implemented in commit `d89b520 fix(invoices): derive KPI cards from live invoices`.
- `/invoices` KPI cards now use live invoice list data instead of hardcoded/static mock values.
- Static/mock invoice KPI values were removed: `SAR 2.4M`, `SAR 450K`, `SAR 1.2M`, `12 Invoices`, `Received This Month`, and `+18% vs Last Month`.
- Manual smoke passed: `Total Outstanding` showed `SAR 0.00`, `Open Invoices` showed `0`, and `Total Collected` showed `SAR 32,503.04`.
- Invoice table/list behavior remained live and unchanged.
- No invoice creation, payment recording, invoice balance/status formulas, SQL, schema, migrations, packages, dashboard, suppliers, payments page, or tax behavior changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Live Dashboard Summary:**
- `DASHBOARD-LIVE-SUMMARY-1` completed and pushed.
- Implemented in commit `d25cb17 fix(dashboard): show live summary data`.
- `/dashboard` now uses live/read-only data where permissions allow.
- Old static/mock dashboard KPI and sample values were removed: `1,248`, `342`, `89`, `SAR 2.4M`, `SAR 450K`, `Saudi Aramco`, `NEOM`, `Riyadh Season`, `Jeddah Corniche`, and fake SAR sample quotation amounts.
- Manual smoke passed: `Total Customers` showed `14`, `Total Quotations` showed `12`, `Open Invoices` showed `0`, `Services` showed `8`, `Total Collected` showed `SAR 32,503.04`, and `Pending Balance` showed `SAR 0.00`.
- Recent Quotations now renders live quotation rows or a safe empty/unavailable state.
- `Service Workflow` remains a static workflow definition section and is not fake business KPI/sample data.
- No customer, quotation, invoice, payment, or service write paths changed.
- No invoice balance formulas, payment recording, SQL, schema, migrations, packages, or tax behavior changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Supplier Module Design:**
- `SUPPLIERS-SCHEMA-DESIGN-1` completed and pushed.
- Implemented in commit `e85adec spec(suppliers): add supplier module design artifacts`.
- This was design-only Spec Kit work. No supplier implementation, SQL, migrations, Supabase actions, schema apply, app code, live supplier UI, supplier DB tables, or supplier CRUD were added.
- Design artifacts were recorded under:
  - `specs/002-suppliers-schema-design/spec.md`
  - `specs/002-suppliers-schema-design/plan.md`
  - `specs/002-suppliers-schema-design/research.md`
  - `specs/002-suppliers-schema-design/data-model.md`
  - `specs/002-suppliers-schema-design/tasks.md`
- Key direction is now documented: suppliers support `company` and `individual`; lifecycle statuses are `active`, `on_hold`, `blacklisted`, and `inactive`; `is_preferred` is separate; bank details are role-masked; cost/margin visibility is Admin/Manager-only by default; supplier invoices/payments are separate from customer invoices/payments; supplier bookings and supplier invoices require snapshots.
- Supplier DB foundation completed after the design package. Migration `supabase/migrations/20260627153000_supplier_directory_foundation.sql` was committed and pushed in `ee50e60 feat(suppliers): add directory foundation migration`, manually applied in Supabase, and verified. `supabase/schema.sql` was synced and pushed in `ed61fb7 chore(suppliers): sync schema after directory foundation`.
- Verification evidence: required supplier foundation columns exist; `on_hold` is supported by `chk_suppliers_status`; `chk_suppliers_vat_registration_status` exists; RLS remains enabled on `public.suppliers`; DEV_ONLY supplier policies returned no rows; broad anon/authenticated supplier policies returned no rows; future supplier financial/scope tables returned no rows.
- `SUPPLIERS-LIVE-READ-FOUNDATION-1` completed and pushed in commit `1fbf77e feat(suppliers): add live read-only directory`.
- `/suppliers` now reads live supplier records from the database through a server-side supplier query layer, UI-safe mapper/types, and a read-only client list/detail UI.
- The permission gate uses `suppliers:read`. This read-only slice does not use `suppliers:write`, does not add create/edit/delete/restore behavior, and does not expose bank or IBAN fields in the UI selection, mapper, types, or rendering.
- Verification evidence: lint passed with only existing `<img>` warnings, `pnpm exec tsc --noEmit` passed, no SQL/schema/migration changes were made, and no supplier finance/future modules were introduced.
- `SUPPLIERS-RATE-CARDS-FOUNDATION-1A` completed and pushed in commits `6a2804d` and `87c714c`.
  - The foundation table `supplier_rate_cards` was created with data integrity constraints (`base_cost > 0`, `currency = 'SAR'`).
  - Permissions `supplier_costing:read` and `supplier_costing:write` were added and assigned to Admin and Manager roles. Accountant, Sales, Operations, and Viewer do not have `supplier_costing:read` or `supplier_costing:write` permissions in this MVP slice.
  - The migration was manually applied and verified in Supabase, and `supabase/schema.sql` was synced.
  - Security was hardened: RLS is enabled with 0 policies, and direct anon/authenticated grants are revoked.
  - Important rule enforced: Supplier rate cards contain internal cost data and must never appear in customer-facing quotations, invoices, PDFs, receipts, broad supplier list views, or unauthorized role views.
  - The full supplier rate cards feature is not yet complete. Only the foundation table and permissions are completed.
  - Supplier rate cards runtime workflows (supplier allocations, quotation automation, cost margin reports) remain deferred.
- `SUPPLIERS-RATE-CARDS-READ-1` completed, validated, committed, and pushed in commit `da5bc86 feat(suppliers): add read-only rate cards view`.
  - Internal read-only Supplier Rate Cards view added to the existing Supplier side panel.
  - Visible only to Admin/Manager users with `supplier_costing:read`.
  - Unauthorized roles (Accountant, Sales, Operations, Viewer) do not see the Rate Cards section.
  - Server-side `requirePermission("supplier_costing:read")` is enforced.
  - Uses server-side access only.
  - Reads `supplier_rate_cards` filtered by `supplier_id` and `is_deleted = false`.
  - Displays non-deleted rate cards sorted active first and newest `valid_from` first.
  - Internal notes are displayed only inside the authorized internal Supplier side panel.
  - Validation: `pnpm run lint` passed with only the two known existing PDF `<img>` warnings, `pnpm exec tsc --noEmit` passed, and `pnpm run build` passed.
- Supplier Directory V1 and the internal Service-scoped Supplier Operations V1 workflows are implemented. Supplier invoices, payables, outbound payments, accounting approvals, actual-cost posting, supplier costing/margin/P&L reports, customer-facing supplier-cost exposure, standalone Supplier Booking routes/PDF/messages/portal, rate-card automation, cross-Service capacity/overlap, and production RLS/readiness remain deferred.

**Supplier Create and Service Status Spec Sync:**
- `SUPPLIERS-CREATE-FORM-1` completed and pushed in commit `05affcd feat(suppliers): add create form`.
- Scope was create-only supplier entry: create page/form, server action, schema validation, and list navigation. This does not complete Supplier Edit/Delete/Restore or broader Supplier CRUD.
- `SUPPLIERS-CREATE-UX-FIX-1` completed and pushed in commit `9ed7a59 fix(suppliers): refine create ui`.
- Scope was Team Lead create-flow UI/UX fixes only.
- `SUPPLIERS-EDIT-FORM-1` completed and pushed in commit `9f87566 feat(suppliers): add edit form`.
- Scope allows updating basic, safe, non-sensitive supplier profile fields only.
- Enforces `suppliers:write` on both the edit page and server action.
- Prefills existing safe data. Soft-deleted records are protected.
- Sensitive banking and blacklist audit fields are strictly excluded.
- Lint and TypeScript compile successfully with zero errors.
- Other supplier modules (finance, rate cards, delete/restore, blacklist workflows) remain deferred.
- `SUPPLIERS-EDIT-OPTIONAL-FIELDS-FIX-1` completed and pushed in commit `7df51f4 fix(suppliers): preserve optional edit fields`.
- Scope fixes optional supplier edit field persistence: CR Number, VAT Number, and Internal Notes.
- Manual smoke testing found that these fields were previously initialized to empty strings `""` instead of their database values from the `supplier` prop, resetting them to `null` on save.
- Fixed by hydrating `crNumber`, `vatNumber`, and `notes` states from the supplier prop. Manual smoke tests passed successfully after implementation.
- `SUPPLIERS-STATUS-BLACKLIST-1` completed and pushed in commit `92617ef feat(suppliers): add blacklist workflow`.
  - Scope: Added dedicated supplier blacklist/unblacklist UI (SupplierBlacklistActions component) and backend server actions (`blacklistSupplier` and `unblacklistSupplier`).
  - Validation: Requires a reason to blacklist, and records `blacklisted_reason`, `blacklisted_by`, and `blacklisted_at` in the database. Blacklist details are rendered inside the supplier side panel.
  - Lifecycle: Unblacklisting restores the supplier status to `inactive` (not `active`).
  - Protection: The normal Supplier Edit form and action were updated to prevent status updates from bypassing the dedicated blacklist/unblacklist workflows.
  - Fixes: Resolved a Zod refinement runtime error by extracting a safe base supplier schema. Fixed a flexbox layout regression in the side panel header to prevent action links from being crushed. Static supplier mock data was updated with nullable blacklist fields.
  - Manual smoke tests, eslint checks, TypeScript compiler, and Next.js build all passed successfully.
- `SERVICE-STATUS-STATE-MACHINE-SPEC-1` completed and pushed in commit `760c569 spec(services): define status state machine`.
- Scope was Spec Kit design artifacts under `specs/003-service-status-state-machine/`. No source implementation, guarded transition enforcement, `services:update_status`, UI next-state filtering, or automation was implemented.
- Next recommended area: Sprint 1 workflow blockers, starting with `SERVICE-STATUS-GUARDED-TRANSITIONS-1` or workflow CTA tasks (`SERVICE-DETAIL-RELATED-QUOTE-CTA-1`, `QUOTE-TO-DEPOSIT-CTA-1`, `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`, `HUMAN-REFERENCE-DISPLAY-1`).

- `SUPPLIER-ALLOCATIONS-FOUNDATION-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `bc3db52 feat(suppliers): add allocation foundation`
    - `46881ee chore(supabase): sync supplier allocation schema`
  - Scope: Database and permissions foundation for Supplier Allocations.
    - Migration `supabase/migrations/20260629100000_service_supplier_allocations_foundation.sql` manually applied and verified.
    - Synced `supabase/schema.sql` with table `public.service_supplier_allocations`, including correct columns, data types, defaults, generated column (`estimated_total_cost`), immutability trigger (`check_service_supplier_allocations_immutable_service_id_trg`), update trigger (`update_service_supplier_allocations_updated_at`), 8 new indexes, and RLS enabled.
    - Permissions added in `src/lib/auth/permissions.ts` for Admin and Manager: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`.
    - No `supplier_allocations:approve` exists. Operations, Sales, Viewer, and Accountant have no access.
  - Boundaries & Security:
    - This is a database/permissions foundation only. Runtime CRUD, Server Actions, UI panels, Service Detail integration, and allocations history are NOT implemented.
    - RLS is enabled with 0 policies and 0 broad client grants; access remains server-side only for future tasks.
    - Business logic validation rules (e.g. rate card ID matches supplier ID, approved quotation ID matches service ID, blacklisted supplier blocks, parent service cancellation blocks) are deferred to future server-side validation/runtime hardening.
    - Supplier Bookings, supplier invoices/payments, and costing reports remain deferred.

- `SUPPLIER-ALLOCATIONS-SCHEMAS-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `e5a20ee feat(suppliers): add allocation schemas`
  - Scope: Domain types, Zod schemas, and mappers for Supplier Allocations.
    - Implemented under `src/lib/supplier-allocations/`.
    - Defined `SupplierAllocationStatus` (`draft`, `planned`, `selected`, `cancelled`) and `SupplierAllocationCostSource` (`rate_card`, `manual_estimate`).
    - Implemented DB row type (`SupplierAllocationRow`) and domain type (`SupplierAllocation`), with `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` marked as nullable to support cost redaction.
    - Implemented Zod schemas for validation: `supplierAllocationCreateSchema` (requires `serviceId` and `supplierId`; conditionally requires rate card snapshot/ID for `rate_card` cost source), `supplierAllocationUpdateSchema` (disallows `serviceId` updates and status `cancelled`), `supplierAllocationCancelSchema` (requires `cancelledReason`), and status/cost source schemas.
    - Implemented mappers with `canReadCost` option to redact cost-related fields when permission check fails.
    - Added security boundary comments ensuring cost data remains internal-only and mappers are kept separate from UI/Auth/Supabase imports.
  - Boundaries:
    - Runtime CRUD, Server Actions, DB queries, UI panel, Service Detail integration, allocations history, and SQL/migration changes are NOT implemented.

- `SUPPLIER-ALLOCATIONS-READ-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `1d874cc feat(suppliers): add allocation read queries`
  - Scope: Server-only read query module for Supplier Allocations.
    - Implemented server-only read queries in `src/lib/supplier-allocations/queries.ts` and exported in `src/lib/supplier-allocations/index.ts`.
    - Added query functions:
      - `getSupplierAllocationsByServiceId(serviceId)`
      - `getSupplierAllocationsBySupplierId(supplierId)`
      - `getSupplierAllocationById(id)`
  - Permissions & Cost Redaction:
    - Every read query requires `supplier_allocations:read` via `requirePermission("supplier_allocations:read")` (re-throwing auth/permission errors).
    - Cost exposure is computed server-side using `checkPermission("supplier_allocations:read_cost")` to check permission and pass `canReadCost` into mappers.
    - Mappers redact `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` server-side when `canReadCost` is false.
    - Raw DB rows are never returned to callers; only mapped `SupplierAllocation` domain objects are returned.
    - Customer-facing routes/PDFs must not import allocation read queries for cost-bearing data.
  - DB Filtering & Query Behavior:
    - Queries target the `public.service_supplier_allocations` table using `createAdminClient()` behind application-level permission gates.
    - All reads filter out deleted allocations with `eq("is_deleted", false)`.
    - List queries are ordered by `created_at` descending.
    - Cancelled allocations are intentionally returned as historical planning records (no status filtering).
    - DB errors are logged via `console.error` and handled gracefully by returning `[]` (lists) or `null` (single record).
  - Boundaries:
    - Write actions, Server Actions, UI panels, Service Detail integration, allocations history UI, and SQL/migration changes are NOT implemented.

- `SUPPLIER-ALLOCATIONS-CANCEL-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `b383f85 feat(suppliers): add allocation cancel action`
    - Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Action Facts:
    - `cancelSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
    - Existing export path remains `src/lib/supplier-allocations/index.ts`.
    - Uses `"use server"`.
    - Returns project ActionResult pattern with SupplierAllocation.
    - Requires `supplier_allocations:cancel`.
    - Does not use `supplier_allocations:write` as substitute.
    - Uses `user.clerk_user_id` for `cancelled_by` and `updated_by`.
    - Validates `id` as a non-empty string from function argument.
    - Uses `supplierAllocationCancelSchema.safeParse`.
    - Requires `cancelledReason`.
    - Does not accept client-provided `status`, `cancelled_at`, `cancelled_by`, or `is_deleted`.
    - Loads existing allocation from `service_supplier_allocations` with `id` and `is_deleted = false`.
    - Missing allocation returns a client-safe not found error.
    - Already cancelled allocation returns a client-safe already-cancelled error.
    - Parent Service status now blocks cancellation if the parent Service is Completed or Cancelled (Hardening slice 1).
  - Update Payload Safety:
    - Cancel is business cancellation only.
    - Cancel preserves row for history/audit.
    - Cancel does not hard delete.
    - Cancel does not set `is_deleted`.
    - Update payload is strictly cherry-picked.
    - Updated fields are only: `status`, `cancelled_reason`, `cancelled_at`, `cancelled_by`, `updated_by`.
    - Does not update `service_id`, `supplier_id`, `approved_quotation_id`, cost fields, rate-card fields, `created_by`, `created_at`, deleted fields, or item/scope fields.
  - Security/Return Behavior:
    - Updated row is mapped through `mapSupplierAllocationRow`.
    - `canReadCost` is computed via `supplier_allocations:read_cost`.
    - Returned data respects cost redaction.
    - Raw DB rows are not returned.
    - Supabase/internal errors are logged server-side and returned as generic client-safe messages.
    - Successful cancel revalidates `/services` and `/services/[id]`.
  - Boundaries:
    - Runtime cancel action is implemented.
    - Supplier Allocations full write layer is not complete.
    - CRUD is not complete.
    - Update action remains deferred.
    - Delete/restore actions remain deferred.
    - Rate-card allocation creation and server-side snapshot generation remain deferred.
    - Service detail UI panel remains deferred.
    - Supplier allocation history UI remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Rate-card-driven quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `3b2364d feat(suppliers): add manual allocation create action`
  - Action Facts:
    - `createSupplierAllocation(input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
    - `actions.ts` uses `"use server"`.
    - The action returns the project ActionResult pattern.
    - The action requires `supplier_allocations:write`.
    - The action uses `user.clerk_user_id` for both `created_by` and `updated_by`.
    - The action uses `supplierAllocationCreateSchema.safeParse`.
    - The action rejects `costSource = rate_card` as not yet supported.
    - The action forces `status = draft` server-side.
    - The action does not allow selected/cancelled creation.
    - The action does not trust client-provided identity fields.
    - The action does not accept or insert `estimated_total_cost`.
    - The action does not insert `supplier_rate_card_id` or `rate_card_snapshot` in this slice.
  - Cross-Table Validation Facts:
    - Parent Service must exist.
    - Parent Service must not be deleted.
    - Parent Service status must not be Cancelled.
    - Parent Service status must not be Completed.
    - Supplier must exist.
    - Supplier must not be deleted.
    - Supplier status must be active.
    - Optional `approvedQuotationId` must reference an existing quotation.
    - Optional `approvedQuotationId` must reference a not-deleted quotation.
    - Optional `approvedQuotationId` must belong to the same service.
    - Optional `approvedQuotationId` must have status approved.
    - Valid `approvedQuotationId` is inserted as `approved_quotation_id`.
  - Insert Payload & Return Safety Facts:
    - Insert payload is strictly cherry-picked.
    - Generated fields are excluded from client-controlled input.
    - Audit/default fields are excluded from client-controlled input.
    - Created row is mapped through `mapSupplierAllocationRow`.
    - `canReadCost` is computed via `supplier_allocations:read_cost`.
    - Returned data respects cost redaction.
    - Raw DB rows are not returned.
    - Supabase/internal errors are logged server-side.
    - Client receives generic safe errors, not internal DB details.
    - Successful create revalidates `/services` and `/services/[id]`.
  - Boundaries:
    - Runtime manual create action is implemented.
    - Supplier Allocations full write layer is not complete.
    - CRUD is not complete.
    - Delete/restore actions remain deferred.
    - Rate-card allocation creation remains deferred.
    - Server-side rate-card snapshot generation remains deferred.
    - Service detail UI panel remains deferred.
    - Supplier allocation history UI remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Rate-card-driven quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `486bdb9 feat(suppliers): add manual allocation update action`
  - Action Facts:
    - `updateSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
    - Existing export path remains `src/lib/supplier-allocations/index.ts`.
    - Uses `"use server"`.
    - Returns project ActionResult pattern with SupplierAllocation.
    - Requires `supplier_allocations:write`.
    - Does not use `supplier_allocations:cancel`.
    - Uses `user.clerk_user_id` for `updated_by`.
    - Enforces `canReadCost` redaction using `checkPermission("supplier_allocations:read_cost")`.
    - Validates `id` as a non-empty string.
    - Uses `supplierAllocationUpdateSchema.safeParse`.
    - Schema no longer requires `supplierId` because `supplier_id` is immutable.
    - Does not allow client control of `id`, `serviceId`, `supplierId`, `estimatedTotalCost`, `supplierRateCardId`, `rateCardSnapshot`, audit fields, cancellation fields, and deletion fields.
  - Existing Allocation checks:
    - Loads row by `id` and `is_deleted = false`.
    - Missing allocation returns a client-safe not found error.
    - Already cancelled allocations cannot be updated.
    - Existing rate-card allocations cannot be manually updated in this slice.
  - Cross-Table Validation:
    - Loads parent Service by `existingAllocation.service_id`. Blocks if missing, deleted, `Cancelled`, or `Completed`.
    - Loads Supplier by `existingAllocation.supplier_id`. Blocks if missing, deleted, or status is not `active` (rejects `inactive`, `on_hold`, `blacklisted`).
    - Supplier cannot be changed by the action.
  - Manual-Only / Rate-Card Boundary:
    - Only updates `manual_estimate` allocations.
    - Rejects `costSource === "rate_card"`.
    - Leaves `supplier_rate_card_id` and `rate_card_snapshot` untouched.
    - Rate-card creation/snapshot generation remain deferred.
  - Status Transitions:
    - Transition guard strictly enforces:
      - `draft -> draft/planned`
      - `planned -> planned/selected`
      - `selected -> selected`
    - Blocked:
      - `any -> cancelled` (cancel action only)
      - `cancelled -> any`
      - `planned -> draft`
      - `selected -> planned/draft`
    - Omitted status preserves existing status safely.
  - Payload Safety:
    - Cherry-picks mutable database fields: `status` (via `nextStatus`), `category`, `itemName`, `unit`, `quantity`, `currency` (SAR only), `estimatedUnitCost`, `costSource` (`manual_estimate`), `scopeOfWork`, `internalNotes`, `approvedQuotationId` (only after validation), and `updated_by`.
    - Excludes `id`, `service_id`, `supplier_id`, `estimated_total_cost`, `supplier_rate_card_id`, `rate_card_snapshot`, audit/cancel/delete fields.
  - Approved Quotation:
    - If `approvedQuotationId` is provided, validates that quotation exists, is not deleted, has status `approved`, and matches the allocation's `service_id`.
    - If omitted, existing `approved_quotation_id` is preserved. Nullable clearing is not supported.
  - Return/Error/Revalidation:
    - Result mapped through `mapSupplierAllocationRow` respecting `canReadCost` redaction.
    - DB details are not returned to client. Internal errors logged server-side only.
    - Revalidates `/services` and `/services/[id]`.
  - Boundaries:
    - Manual update action is implemented.
    - Supplier Allocations CRUD is not complete.
    - Full write layer is not complete.
    - UI is not complete.
    - Delete/restore remains deferred.
    - Rate-card allocation creation remains deferred.
    - Server-side rate-card snapshot generation remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A` completed, validated, committed, and pushed.
  - Commit pushed:
    `2370e74 feat(suppliers): add read-only service allocations panel`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
    - `src/app/(dashboard)/services/[id]/page.tsx`
    - `src/lib/supplier-allocations/queries.ts`
    - `src/lib/supplier-allocations/types.ts`
    - `src/lib/supplier-allocations/mappers.ts`
  - UI Panel Behavior:
    - Adds a read-only Supplier Allocations panel to the internal dashboard Service detail page.
    - Mounts the panel between RelatedQuotationsCard and BillingPanel.
    - Uses getSupplierAllocationsByServiceId(serviceId) for the Service allocation list.
    - Does not fetch or render allocations unless `supplier_allocations:read` is granted.
    - Does not call createSupplierAllocation, updateSupplierAllocation, or cancelSupplierAllocation.
    - Does not add create/edit/cancel forms, drawers, dialogs, or mutation controls.
  - Supplier Display Behavior:
    - Allocation reads now include a safe supplier display join.
    - Mapper exposes `supplierName` safely.
    - Supplier name fallback is safe and does not expose banking/IBAN.
    - Query join avoids N+1 UI lookup.
  - Cost Redaction Behavior:
    - Backend mapper remains the cost redaction source of truth.
    - Service page computes/checks `supplier_allocations:read_cost` and passes `canReadCost` to the panel.
    - Unit cost and total cost columns are omitted when `canReadCost` is false.
    - UI does not calculate totals client-side.
    - UI does not display `rateCardSnapshot` in this slice.
    - No supplier costs are exposed to customer-facing pages, PDFs, or public routes.
  - Status / Empty State UX:
    - Panel displays allocation statuses: draft, planned, selected, cancelled.
    - Local status labeling is used without marking Supplier Bookings as implemented.
    - Empty state: "No supplier allocations recorded for this service yet."
    - Cancelled/Completed Services still show historical allocations read-only.
  - Boundaries:
    - This is read-only panel 1A only.
    - Supplier Allocations UI is not complete.
    - Supplier Allocations CRUD is not complete.
    - Full write layer is not complete.
    - Create/edit/cancel mutation UI remains deferred to 1B or later.
    - Delete/restore remains deferred.
    - Rate-card allocation UI remains deferred.
    - Rate-card snapshot UI remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.


- `SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B` completed, validated, committed, and pushed.
  - Commit pushed:
    `49793f7 feat(suppliers): add manual allocation create ui`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
    - `src/app/(dashboard)/services/[id]/page.tsx`
    - `src/lib/suppliers/queries.ts`
    - `src/lib/suppliers/types.ts`
  - Completed Scope:
    - Added Create-only internal Supplier Allocation UI.
    - Added dedicated route: `/services/[id]/allocations/new`.
    - Added manual allocation create form.
    - Added safe active supplier options query.
    - Supplier options require both `supplier_allocations:write` and `suppliers:read`.
    - Create route requires `supplier_allocations:read`, `supplier_allocations:write`, `supplier_allocations:read_cost`, and supplier option access.
    - CTA is gated by `canWrite`, `canReadCost`, and service status.
    - Completed/Cancelled services block creation.
    - Payload is manual-only with currency `SAR` and `costSource` `manual_estimate`.
    - No customer-facing/PDF/public supplier cost exposure.
  - Boundaries Preserved (Still deferred):
    - Edit Allocation UI.
    - Cancel Allocation UI.
    - Delete/Restore Allocation UI.
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D` completed, validated, committed, and pushed.
  - Commit pushed:
    `7dc5063 feat(suppliers): add manual allocation cancel ui`
  - Backend Hardening pushed:
    `a24999c fix(suppliers): block allocation cancel for closed services`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/SupplierAllocationCancelForm.tsx`
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
    - `src/app/(dashboard)/services/[id]/page.tsx`
  - Completed Scope:
    - Added Cancel-only internal Supplier Allocation UI.
    - Added dedicated route: `/services/[id]/allocations/[allocationId]/cancel`.
    - Added controlled cancellation form requiring a cancellation reason.
    - Cancel route requires `supplier_allocations:read`, `supplier_allocations:cancel`, and `supplier_allocations:read_cost`.
    - Cancel CTA is gated by `canCancel` permission, allocation status (must not be cancelled), and Service status.
    - Completed/Cancelled services block cancellation (both UI and server-side).
    - Status transitions directly to `cancelled` and is irreversible through the UI.
    - No customer-facing/PDF/public supplier cost exposure.
  - Boundaries Preserved (Still deferred):
    - Delete/Restore Allocation UI.
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C` completed, validated, committed, and pushed.
  - Commit pushed:
    `1348dc9 feat(suppliers): add manual allocation edit ui`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx`
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - Completed Scope:
    - Added Edit-only internal Supplier Allocation UI.
    - Added dedicated route: `/services/[id]/allocations/[allocationId]/edit`.
    - Added controlled edit form for manual allocations.
    - Supplier is displayed read-only and `supplierId` is not editable.
    - Edit route requires `supplier_allocations:read`, `supplier_allocations:write`, and `supplier_allocations:read_cost`.
    - Edit CTA is gated by `canWrite`, `canReadCost`, allocation status, `costSource`, and Service status.
    - Completed/Cancelled services block editing.
    - Cancelled allocations block editing.
    - Rate-card allocations block editing.
    - Editable fields are limited to safe manual fields: `category`, `itemName`, `unit`, `quantity`, `estimatedUnitCost`, `scopeOfWork`, `internalNotes`, `status`.
    - Status transition UI is forward-only (`draft -> draft/planned`, `planned -> planned/selected`, `selected -> selected`), and `cancelled` is not selectable through edit.
    - Payload stays manual-only with currency `SAR` and `costSource` `manual_estimate`.
    - No customer-facing/PDF/public supplier cost exposure.
  - Boundaries Preserved (Still deferred):
    - Cancel Allocation UI.
    - Delete/Restore Allocation UI.
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier change/replacement after creation.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1` completed, validated, committed, and pushed.
  - Commit pushed:
    `2307a42 feat(suppliers): add allocation delete restore flow`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/lib/supplier-allocations/actions.ts`
    - `src/lib/supplier-allocations/queries.ts`
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
    - `src/app/(dashboard)/services/[id]/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/SupplierAllocationDeleteForm.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/SupplierAllocationRestoreForm.tsx`
  - Completed Scope:
    - Added Delete and Restore backend actions `deleteSupplierAllocation` and `restoreSupplierAllocation`.
    - Both actions require `supplier_allocations:write` and do NOT require `supplier_allocations:read_cost`.
    - Soft delete/restore implemented purely via `is_deleted` toggling and updating `updated_by`/`updated_at` (no hard delete, no SQL migrations, no `deleted_at`/`restored_at` columns added).
    - Restore action preserves the original allocation status.
    - Both actions reject Completed/Cancelled services, missing/deleted services, and rate-card allocations.
    - Updated read queries `getSupplierAllocationsByServiceId` and `getSupplierAllocationById` to support `includeDeleted` option (defaulting to active-only).
    - Service Detail page reads `searchParams` to support `?showDeleted=true` query.
    - `SupplierAllocationsPanel` displays "Active" / "Show Deleted" toggle tabs.
    - Deleted rows render with muted visual styling (opacity/grayscale) and clear "Deleted" badge.
    - Active rows display "Delete" CTA when allowed (manual_estimate, open service, write access).
    - Deleted rows hide Edit/Cancel/Delete and show "Restore" CTA when allowed (manual_estimate, open service, write access).
    - Added dedicated internal delete and restore confirmation routes/forms with safe read-only summary fields (supplierName, category, itemName, quantity, unit, status) without exposing estimated costs or currency variables.
    - Delete form redirects back to `/services/[id]`, restore form redirects back to `/services/[id]?showDeleted=true`.
    - No modal/dialog/sheet/react-hook-form used.
  - Boundaries Preserved (Still deferred):
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier change/replacement after creation.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1` completed, validated, committed, and pushed.
  - Commit pushed:
    `9dd6839 feat(suppliers): add rate-card allocation create flow`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
  - Implemented in:
    - `src/lib/supplier-allocations/schemas.ts`
    - `src/lib/suppliers/rate-card-actions.ts`
    - `src/lib/supplier-allocations/actions.ts`
    - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
    - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
    - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - Completed Scope:
    - Added support for `costSource = rate_card` in `createSupplierAllocation` Server Action.
    - Client does not submit `rateCardSnapshot`. The server loads `supplier_rate_cards` server-side, validates it (existence, active status, not deleted, SAR currency, base cost, supplier ownership, expiration check), and builds the snapshot server-side.
    - Historical Service costing must not change when supplier rate card changes later.
    - Allocation row and rate_card_snapshot preserve pricing context at creation time.
    - Updated `supplierAllocationCreateSchema` to omit `rateCardSnapshot` client requirement, while still requiring `supplierRateCardId` when `costSource === 'rate_card'`.
    - Manual estimate validation remains unchanged.
    - Snapshot schema remains available for server-built snapshots.
    - Form UI checks `supplier_costing:read` permission. Only displays `From Rate Card` mode toggle when allowed.
    - Manual Estimate remains default.
    - Added dynamic loading of active rate cards upon supplier selection.
    - Form displays cost details (cost, category, item name, unit) as read-only, allowing user input only for quantity, scope of work, and internal notes.
    - Enabled soft-deletion and restoration for rate-card allocations, while preserving their read-only state in manual edit flow.
    - Rate-card allocations can be cancelled.
    - Soft delete/restore preserves supplier_rate_card_id and rate_card_snapshot.
    - Existing Edit UI remains manual_estimate only.
  - Boundaries Preserved (Still deferred):
    - Rate-card edit flow.
    - Rate-card management CRUD/write workflows.
    - Rate-card overlap enforcement.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Actual expense posting.
    - Costing/margin reports.
    - Quotation automation from supplier cost.
    - Customer-facing/PDF/public supplier cost exposure.




**Guarded Service Status Transitions:**
- `SERVICE-STATUS-GUARDED-TRANSITIONS-1` implemented and manual smoke passed.
- Latest implementation commit: `1a4748f feat(services): guard status transitions`.
- Service status workflow now uses guarded manual transitions.
- Free status jumping is removed.
- `services:update_status` permission is implemented in code.
- Automation remains deferred.
- **Manual smoke follow-up notes (Non-blocking observations tracked for future backlog):**
  - Visible Customer UUID remains in Service Detail Customer Summary (Track under `HUMAN-REFERENCE-DISPLAY-1`).
  - Currency/date formatting remains inconsistent in some service/billing areas (Track under `FORMAT-STANDARDIZATION-1` and `DATE-FORMAT-STANDARDIZATION-1`).
  - Location/data typo such as `ryade` appears from existing data (Track under future `DATA-QUALITY-INPUT-NORMALIZATION-1`).
  - Billing labels such as `Prior Invoiced` / `Remaining` still need wording polish according to Team Lead backlog (Track under `BILLING-LABEL-COPY-POLISH-1`).
  - Browser/DevTools showed minor non-blocking warnings: form field missing `id` or `name`, and CSP warning about `eval`. These did not block the status transition workflow during smoke (Track under `UI-QUALITY-WARNINGS-CLEANUP-1`).

**Team Lead / Codex UX-ERP Review Backlog:**
- Team Lead UX/UI review is captured as an official backlog input, not as completed work. Overall score: `6.4/10`.
- Current readiness: suitable for guided internal demo; not operational-ready; not client-production-ready.
- Strongest product advantage: Service-centric workflow for Saudi events operations.
- Biggest confirmed gaps: workflow blockers, visible UUIDs, inconsistent currency/date formats, missing search/filter parity, missing breadcrumbs, RBAC clarity, and module-specific UX gaps.
- Codex UX-ERP analysis completed and used to separate stale findings from still-open items. Directionally accurate Team Lead findings remain useful; stale items were not treated as current defects.
- Already fixed or present: supplier live/read/create/UX fixes, quotation Approve/Reject, paid or zero-balance invoice payment disablement, Admin self-role/self-deactivation protection, last-active-admin protection, and Related Quotations create CTA in Service Detail.
- Still open or partly open: approved quotation to Deposit Invoice CTA, removal of disabled standalone Create Invoice from Invoices page, human reference display instead of visible UUIDs, standardized currency/date formatting, and search/filter parity.
- **Historical / superseded focus note:** At this sync point, the next implementation focus was recorded as Sprint 1 workflow blockers. This statement no longer defines current priority and does not override Feature 006.

**Billing Flexibility Smoke:**
- `BILLING-FLEXIBILITY-1` manual smoke passed for Direct Final Invoice without Deposit.
- No invoice code patch is required for the no-deposit direct final path.
- Historical pre-Stage-1 evidence: `SVC-2026-0008` remained `Inquiry` after quotation approval, direct final invoice creation, invoice issuing, and full payment recording.
- `INV-2026-0008` was created as a final invoice directly from `QT-2026-0012` for `SAR 20,000.00`.
- No Deposit Invoice existed before final invoice creation.
- The invoice was issued and paid.
- Duplicate active Final Invoice was blocked.
- Service status automation remains a deferred workflow gap. Future workflow must define guarded transitions.
- Invoice numbering development gap confirmed: `INV-2026-0001` to `INV-2026-0003` are absent. Stored invoices start at `INV-2026-0004` up to `INV-2026-0008`. `number_sequences` is `8`. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices.

**Manual Status Control:**
- `SERVICE-STATUS-WORKFLOW-1` Stage 1 completed.
- Implemented in commit `0b0cc78 feat(services): add manual service status control`.
- Service status can now be manually changed from the Service detail page.
- Status is saved in `services.status`.
- Manual smoke passed on `SVC-2026-0008`.
- `SVC-2026-0008` reached `Completed` and appeared correctly in Service detail and Services list.
- Status persisted after UI refresh / navigation.
- Current behavior is manual-only.
- The system does not yet validate quotation, invoice, payment, or delivery state before changing Service status.
- Guarded transitions are implemented under `SERVICE-STATUS-GUARDED-TRANSITIONS-1`.

**Invoice List Sort:**
- `INVOICE-LIST-SORT-1` completed.
- Implemented in commit `9c297a6 fix(invoices): sort invoice list by invoice number`.
- Invoices page now sorts by `invoice_number` ascending.
- Manual smoke passed.
- Current verified visible order:
  - `INV-2026-0004`
  - `INV-2026-0005`
  - `INV-2026-0006`
  - `INV-2026-0007`
  - `INV-2026-0008`
- No invoice numbering reset, fake filler invoices, or manual renumbering was done.

**Compact Invoice PDF Breakdown:**
- `INVOICE-PDF-BREAKDOWN-1` completed and pushed.
- Implemented in commit `b38a75f fix(invoices): add compact invoice pdf breakdown`.
- Invoice PDF now displays compact display-only breakdown rows in the existing totals section using persisted invoice fields and existing snapshot data only.
- Rows include Approved Quotation Total when available, Previous Invoices / Deposits when available, Total Amount, Amount Paid, and Balance Due.
- Manual visual smoke passed on `INV-2026-0004` and `INV-2026-0005`; both tested PDFs fit one A4 page after final duplicate footer cleanup.
- `Commercial Invoice` title and Tax/VAT `Not applied` behavior were preserved.
- No financial logic, tax behavior, SQL, migrations, schema, packages, invoice/payment/quotation/service-status/number-generation logic, or write paths changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Future page numbering for genuinely multi-page PDFs remains separate/deferred.

**Snapshot DB verification:**
Snapshot DB verification passed for INV-2026-0004:
invoice_number = INV-2026-0004
invoice_type = deposit
status = draft
document_label = Commercial Invoice
vat_mode = not_registered
vat_rate = 0.00
snapshot_seller = present, object
snapshot_buyer = present, object
snapshot_quotation = present, object
snapshot_bank_details = present, object
snapshot_document_rules = present, object

Important note:
INV-2026-0004 is smoke-test/dev data used for snapshot verification.
It must be cleaned up or isolated before production handover.

**Invoice Module Operational Definition of Done:**
- Deposit Invoice UI works
- Final Invoice UI works
- Invoice can be issued from Draft
- Issued invoice can be printed/exported as PDF from live snapshot
- Payment can be recorded manually
- Balance due updates correctly
- Invoice list distinguishes Deposit vs Final
- Raw internal codes are hidden from UI
- RBAC/RLS verified for production access pattern
- Snapshot fields verified in DB

ERP-3B Final Invoice Settlement Design Review - Completed:
- ERP-3B Final Invoice Settlement Design Review completed.
- Recommendation accepted: SIMPLE_SUM_FOR_T018.
- Locked Accounting Formula: `Final Invoice = Approved Quotation Total - SUM(active prior deposit/progress invoice grand_total)`.
- Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- Do not use: `Approved Quotation Total - SUM(amount_paid)`. Reason: Using paid amount can cause over-invoicing when a Deposit Invoice is unpaid or partially paid.
- MVP Policy: If an active Deposit Invoice is unpaid or partially paid, creating a Final Invoice is allowed only as long as total active invoice grand_total does not exceed the approved quotation total. This can leave two open balances for the customer and is accepted as a known MVP workflow gap until Void/Cancel lifecycle and Service status workflow are designed.
- invoice_prepayment_applications remains deferred.
- T018 implementation is now unblocked from a design perspective, but no implementation has started in this task.

ERP-3B T015C Deposit Invoice Persistence - Final Technical Review Passed:
- ERP-3B T015C deposit invoice persistence diff has passed final technical review.
- Lint passes with only the two known <img> warnings.
- Build passes.
- T015C remains uncommitted until docs/tasks alignment is reviewed.
- Current architecture decisions for deposit/final invoices are finalized and must be treated as source-of-truth.

ERP-3A Invoice Schema Foundation - Manual Supabase apply completed / Verified:
Created SQL migration `20260623200000_erp3a_invoice_schema.sql` to prepare the database schema for invoices and payments. The migration implements the safe schema updates required for the invoice workflow, adding `service_id` to invoices, renaming `quotation_id` to `approved_quotation_id`, renaming `type` to `invoice_type`, and preparing snapshot columns (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, etc.) as nullable JSONB. Note that composite FK enforcement is partial while `service_id` remains nullable, and NOT NULL enforcement for snapshots is deferred to ERP-3B. No UI, Server Action, or RPC for invoice creation was implemented. Tax Invoice, ZATCA, and VAT 15% remain blocked while `vat_mode = not_registered`. Manual Supabase apply was completed and post-apply verification passed.

CUSTOMER-REPORT-METRICS-VIEW-1 implemented: Created SQL migration `20260623100000_customer_report_metrics_view.sql` to provide a read-only `customer_report_metrics` view. This view safely aggregates `services_count`, `quotations_count`, `approved_quotations_count`, `draft_quotations_count`, and `total_quoted_amount` using secure server-side aggregations.

Manual verification evidence:
* `public.customer_report_metrics` was manually applied in Supabase by Mozfer.
* The view was verified successfully and is the source of real customer summary metrics.
* Verified rows:
  - CUST-2026-0007: services_count=2, quotations_count=3, approved_quotations_count=1, draft_quotations_count=2, total_quoted_amount=408558.00
  - CUST-2026-0006: services_count=2, quotations_count=2, approved_quotations_count=1, draft_quotations_count=0, total_quoted_amount=13223.00
  - CUST-2026-0008: services_count=1, quotations_count=4, approved_quotations_count=0, draft_quotations_count=4, total_quoted_amount=66953.00

EXPORT-REPORTS-XLSX-1 implemented: Customers raw CSV export replaced with a professional, branded XLSX report using `exceljs`. A shared `generateExcelReport` helper was introduced in `src/lib/reports/exportExcel.ts`.

CUSTOMERS-SECURE-SUMMARY-XLSX-1B implemented: Replaced stale metrics with the `customer_report_metrics` view. Added `customers:export` permission explicitly, restricted Viewer from exporting, and updated Excel columns for text phone/email and currency values.

CUSTOMERS-EXPORT-POLISH-AND-DOCS-1 implemented: Polished the Customers XLSX export to be a lightweight customer-level summary. Removed pipeline breakdown columns (Approved/Draft Quotations) from the export but kept them in the database view, types, and queries for future detailed reports. Documented the overall reporting strategy and deferred export enhancements.

CUSTOMERS-EXCEL-HEADER-POLISH-1 implemented: Customers XLSX now uses a professional merged blue report header. Phone/text cells are explicitly text-safe to prevent scientific notation. The export remains a lightweight current filtered view report. No change was made to reporting strategy, permissions, view, queries, or data model.

Final Customers XLSX export columns are exactly:
- Customer Number
- Company
- Contact Person
- Email
- Phone
- City
- Status
- Services Count
- Quotations Count
- Total Quoted Amount (SAR)

Notes:
* `Approved Quotations` and `Draft Quotations` were intentionally removed from the Customers export only.
* `Approved/Draft` metrics remain available in `customer_report_metrics`, types, mappers, and queries for future reports.
* Customers export remains a lightweight current filtered view report.
* Customers export is not a full pipeline report and not a full customer activity report.

## 4.1 Reporting Strategy

Each main module should eventually have its own dedicated report:
1. Customers Report
2. Services Report
3. Quotations Report
4. Invoices Report
5. Payments Report

Additionally, each customer should eventually have a fixed full customer-specific report from `/customers/[id]`.

Customers Report:
- Current implemented report.
- Source: Customers page.
- Scope: current filtered customer list.
- Format: lightweight XLSX.
- Purpose: customer-level summary.

Services Report:
- Future dedicated report.
- Scope: service/booking details.

Quotations Report:
- Future dedicated report.
- Scope: quotation details, quotation amounts, quotation status breakdown.
- Approved/Draft/Rejected/Expired analysis belongs here.

Invoices Report:
- Future dedicated report.
- Scope: invoice/billing details and totals.

Payments Report:
- Future dedicated report.
- Scope: collection/payment tracking.

Customer Full Report:
- Future dedicated report from `/customers/[id]`.
- One customer only.
- Should combine the customer profile and all related business activity.
- Suggested XLSX workbook sheets:
  - Profile
  - Services
  - Quotations
  - Invoices
  - Payments

Future UI Direction:
- List page export means: Export current filtered view.
- Future selection export can add selected customers and column configuration.
- Customer-specific reports should live inside the Customer Detail page.

## 5. Deferred Decisions

Detailed deferred decisions are tracked in `docs/deferred-decisions.md` so they remain visible and can be revisited before the relevant phase starts.

### Historical / Superseded Pre-ERP Decision Gates

> This block records an earlier planning state before the implemented ERP-3B Invoice and Payment foundation. It is retained as historical evidence and is not current authorization or execution order. Any still-unresolved tax or compliance item remains governed by current deferred decisions and the `not_registered` VAT constraint.

- ZATCA/proforma invoice direction beyond the current "do not overclaim" rule
- invoice void/cancellation, credit note, and refund flow
- exact quotation expiry override behavior
- quotation approval workflow before invoices
- customer official/billing details before ERP-3 invoices
- Service Hub before or alongside ERP-3
- full invoice schema/service linkage in ERP-3
- soft-delete documentation cleanup: `DOC-SOFTDELETE-FIX`
- leads/inquiries
- supplier implementation after completed `SUPPLIERS-SCHEMA-DESIGN-1` design package
- demo data security level
- remaining production RLS hardening, `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production
- audit log details

## 6. Decisions Already Resolved

- **Workflow:** New ERP work follows `Customer Profile -> Service -> Quotation -> Invoice -> Payment`. Service / Booking replaces Project as the operational unit. Quotations and invoices must belong to a Service; standalone quotations and standalone invoices are not allowed.
- **Customer Profile hub:** Customer detail must explicitly show related Services, Quotations through Services, Invoices through Services, Payments through Invoices, and later Activity.
- **Service status exit criteria:** Inquiry = service/request captured; Quoted = at least one quotation created/sent; Approved = customer approval recorded; Deposit Paid = valid/cleared deposit payment recorded; In Progress = operations started; Completed = service delivered; Cancelled = cancellation reason recorded. Do not add a separate Confirmed status. `Cancelled` is terminal and non-linear, not a progress step.
- **Quotations:** Quotations are Service-scoped. `customer_id`, if retained, is derived server-side from Service. One Service can have multiple Quotations; do not add `UNIQUE(service_id)`. Approval requires `quotations:approve`, separate from `quotations:write`. Non-draft quotations must not be fully editable through ordinary `quotations:write`, and approved quotations must not be soft-deleted through ordinary `quotations:write`. `valid_until` is the offer expiry date, not a service execution date. It must be on or after Issue Date and, when Service Start Date exists, on or before `service.event_start_date`. If the Service already started before Issue Date, quotation create/update is blocked.
- **Invoices:** No Invoice may exist without a Service. Each Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK. Invoice numbering uses one shared `INV-YYYY-0001` sequence. Use `invoice_type = deposit | final`; do not create separate `DEP-` or `FIN-` sequences.
- **Payments:** Payment must link to an Invoice. Payment is connected to Service through the Invoice. If `service_id` is also stored on payments for query convenience, it must match the invoice's `service_id` and be enforced in the data layer, preferably by database design. If a customer pays before an invoice exists, the UI must require creating a Deposit Invoice first or prevent payment recording. Prevent overpayment unless explicitly approved.
- **Deposit flow:** Deposit amount must be greater than `0` and less than or equal to the approved quotation total or remaining uninvoiced balance. Deposit is flexible, not fixed at 50%. Deposit Invoice is created manually after quotation approval. A Deposit Invoice alone does not confirm booking, and a pending payment does not confirm booking. Service status changes to `Deposit Paid` only after a valid/cleared deposit payment.
- **Event dates:** Prefer `event_start_date` and nullable `event_end_date`, not only `event_date`, to support single-day and multi-day events. `event_end_date` may be null for single-day or inquiry cases. Planned DB constraint: `CHECK (event_end_date IS NULL OR event_end_date >= event_start_date)`. Event fields should stay flexible at inquiry stage; Saudi partner/business owner should confirm event types.
- **Service numbering:** Use `SVC-YYYY-0001`. Service numbers must be generated server-side. ERP-1 DB foundation now supports this through `generate_document_number('service')`; app usage is still pending.
- **Quotation approval permission:** Approval requires `quotations:approve`. Recommended roles are Admin and Manager. Sales can create/send quotations but cannot approve unless explicitly granted. Do not treat `quotations:write` as approval permission.
- **Quotation expiry:** `valid_until` or `expiry_date` must be on or after issue date. Expired quotations cannot be approved without renewal/extension or an authorized override. Exact override behavior remains deferred.
- **Service cancellation:** Cancellation requires `cancellation_reason`. If no invoice/payment exists, cancellation can be simple. If invoice/payment exists, cancellation must not silently delete financial records; future void/refund/credit-note flow is required.
- **Company Settings:** CS-A is live settings only. CS-B document snapshots remain deferred. Old documents must not mutate when Company Settings changes.
- **VAT/ZATCA safety:** The current implemented Company Settings VAT field is `company_settings.vat_mode`. `not_registered` means VAT defaults to `0`, VAT number/effective date remain null, and no premature Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, reporting, or Phase 2 claims are allowed.
- **Financial trust and retention:** Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic. Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- **Security:** Do not treat UI hiding as security. Server-side permission checks and server-side masking are required. Production RLS for `company_settings` is now applied and verified on the remote database because it contains bank/legal/VAT data.
- **Viewer bank masking test:** Viewer opens `/settings`; response/data passed to the client must not include full IBAN, bank account holder, or bank account values.
- **Sensitive Server Action rate limiting:** Consider rate limiting quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- **Historical / superseded TAX-0 phase-ordering note:** At this earlier pre-ERP planning state, the recorded rule was: "TAX-0 cleanup should happen before ERP implementation. ERP-0 may be planning/report-only before TAX-0, but implementation should not proceed before premature tax/ZATCA wording is cleaned or explicitly accepted as a known risk." This is not current authorization or execution order. Any still-unresolved tax or compliance item remains governed by current deferred decisions and the `not_registered` VAT constraint.

## 7. Last Known Good State
- `main` contains Customers CRUD, Customers Export, Core Security/RBAC, Quotations RPC Foundation, Quotations Data Layer, Quotations UI create/edit/delete controls, Quotation Detail, and Browser Print.
- Quotations core flow is stabilized.
- Quotation creation works after manual Supabase apply.
- Company Settings CS-A is committed on `main`.
- Financial totals remain server-side/database-side via PostgreSQL RPC.
- CUST-OFFICIAL-DETAILS-1C manual smoke passed and was merged. SEC-SERVICE-INVARIANTS-1B was merged. SERVICE-HUB-1B is implemented and ready for review/manual smoke.
- **Historical / superseded execution-order note:** At this sync point, the recorded post-review order was `QUOTE-APPROVAL-FLOW-1`, followed by `ERP-3`. This sequence is retained as historical evidence, is no longer current execution authority, and does not override active Feature 006.
- At that same sync point, `QUOTE-APPROVAL-FLOW-1B` was code-ready / pending review. DOCUMENT-BRANDING-PRINT-1B was complete.

## Supplier Allocations UI Implementation Guidelines
Supplier Allocations backend foundation and read-only internal Service detail panel are implemented.
Manual create, manual update, cancel, delete, and restore server actions are implemented.
Manual Supplier Allocation lifecycle is now closed for Create/Edit/Cancel/Delete/Restore.
Rate-card workflows, `Supplier Bookings`, supplier invoices/payments, costing/margin reports, and customer-facing supplier costs remain deferred.
Internal supplier allocation cost estimation is approved for Admin/Manager planning only.

### Supplier Allocation Status State Machine
Approved statuses: `draft`, `planned`, `selected`, `cancelled`
Forward movement: `draft` -> `planned`, `planned` -> `selected`
Allowed same-state persistence: `draft` -> `draft`, `planned` -> `planned`, `selected` -> `selected`
Blocked through update: `planned` -> `draft`, `selected` -> `planned`, `selected` -> `draft`, any -> `cancelled`, `cancelled` -> any
Cancellation must happen only through cancel action.

### selected Terminology
`selected` means preferred supplier allocation for internal planning only.
`selected` does not mean `Supplier Booking`.
`selected` does not mean supplier commitment.
`selected` does not mean financial commitment.

### SAR-Only Currency
Supplier allocation currency is `SAR`-only for MVP.
Zod schemas and server actions must reject non-`SAR` currency.
UI fixed value alone is not enough.

### Service Status Timing
Supplier allocations may be created during active Service planning for internal cost estimation.
Create/update is blocked only for Services in: `Cancelled`, `Completed`.
Supplier allocations do not create supplier commitment, issue Supplier Bookings, confirm supplier booking, or create financial commitment.
## Quotations 1A Docs Sync
- `I18N-RTL-QUOTATIONS-RUNTIME-1A` completed.
- Scope: quotations list page, list client/table/filter UI, New Quotation page, and shared quotation form runtime i18n.
- Introduced module-local quotations dictionary.
- Initial senior review returned HOLD because an `expired` status filter option was added.
- FIX-1 removed `expired` from selectable status filter options.
- Final selectable status filter options remain exactly `all`, `draft`, `sent`, `approved`, and `rejected`.
- Re-review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- List page rendered correctly.
- RTL list layout passed visually.
- New/form quotation surfaces rendered correctly.
- Quotation numbers, service numbers, customer names, SAR values, dates, and statuses remained readable/LTR-safe.
- No quotation detail page implementation was intentionally included in this slice.
- No PDFs/document routes touched.
- No ZATCA/QR/XML/FATOORA touched.
- No quotation action/query logic changed.
- No RBAC/permission/service-gating/create-flow behavior changed.
- No totals/SAR calculation behavior changed.
## Invoices 1A Docs Sync
- `I18N-RTL-INVOICES-RUNTIME-1A` completed.
- Scope: invoices list route/runtime page only.
- Introduced module-local invoices dictionary.
- Localized route permission/error states, list header/stats/table/filter/status labels, and side panel/detail drawer labels/buttons.
- IssueInvoiceAction untouched.
- RecordPaymentModal untouched.
- PDF/document/ZATCA routes untouched.
- Invoice actions/queries untouched.
- No RBAC/permission drift.
- No stats/calculation drift.
- No side-panel behavior drift.
- No route/link behavior drift.
- Focused senior review initially returned HOLD for a glossary mismatch in `partial`.
- FIX-1 corrected `partial` from `مدفوعة جزئيًا` to `مدفوعة جزئياً`.
- Re-review outcome: PASS.
- Mozfer manual/browser smoke result: PASS.
- Invoices list, stats, table, side panel, and RTL shell passed visually.
- Invoice numbers, customer names, quotation refs, SAR values, dates, and statuses remained readable/LTR-safe.
- Non-blocking UX follow-up: list feels crowded because it shows more than 10 rows at once; future pagination task suggested as `INVOICES-LIST-PAGINATION-10-1`.
## Invoices List Search/Filter UX Sync
- `INVOICES-LIST-SEARCH-FILTER-UX-1` completed as an invoices list UX slice.
- KPI money cards were removed to reduce visual crowding.
- Search by invoice number and customer name was added.
- Status filtering was fixed to actual invoice status values only.
- 10-row pagination was added and the list now filters before paginating.
- Side panel behavior remained safe, and the close button affordance was improved.
- Focused senior review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- `INVOICES-DETAIL-PREVIEW-UX-1` is now satisfied by `INVOICES-FULL-DETAIL-VIEW-1`; remaining follow-up focus is payment history and richer detail context.

## Invoices Full Detail View
- `INVOICES-FULL-DETAIL-VIEW-1` completed as the non-PDF invoice detail slice.
- Scope: full invoice detail page, list View navigation, and in-app Back navigation.
- The invoice list stays wide and uncluttered, with no row-wide click and no checkbox column without bulk actions.
- Explicit View opens `/invoices/[id]`; explicit Print/PDF opens `/invoices/[id]/pdf`.
- Global pending navigation is used for View and in-app Back.
- Raw UUIDs stay hidden from normal business-facing invoice UI.
- Focused senior review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- No query/action/payment/PDF/schema/RBAC/auth changes were introduced.
- No VAT/ZATCA/FATOORA/QR/XML/Tax Invoice behavior was introduced.
- Historical snapshots remain read-only source of truth.
- Deferred follow-ups remain payment history, richer deposit/advance payment timeline, richer service/event context if needed, first-class invoice line item data if snapshot line data is insufficient, and list-action consistency review for other modules.

## Customers List Actions Consistency
- `LIST-ACTIONS-CONSISTENCY-CUSTOMERS-1` completed as a narrow list-action consistency slice.
- The Customers list now uses an explicit View action instead of row-wide navigation.
- View opens `/customers/[id]` through the approved pending navigation pattern.
- No Print/PDF action was added for Customers.
- Search, filter, export, Add Customer, and detail route behavior remained unchanged.
- Focused review result: PASS.
- Mozfer manual/visual smoke result: PASS.
- `CUSTOMERS-PROFILE-UX-POLISH-1` remains deferred as a non-blocking follow-up for profile-only polish.

## Services List Actions Consistency
- `LIST-ACTIONS-CONSISTENCY-SERVICES-1` completed as a narrow list-action consistency slice.
- The Services list now uses an explicit View action instead of row-wide navigation.
- View opens `/services/[id]` through the approved pending navigation pattern.
- No Print/PDF action was added for Services.
- Status filter and New Service behavior remained unchanged.
- Service detail route remained unchanged.
- Services table alignment was refined locally for readability.
- No query/action/schema/RBAC/auth changes were introduced.
- No supplier/internal cost exposure changes were introduced.
- Focused review result: PASS.
- Mozfer visual review result: PASS.

## Quotations 1B Docs Sync
- `I18N-RTL-QUOTATIONS-RUNTIME-1B` completed.
- Scope: quotation detail runtime page only.
- Reused and extended the module-local quotations dictionary.
- Focused senior review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- Detail page rendered correctly.
- Financial Summary rendered correctly.
- Deposit Invoice card rendered correctly.
- Line Items rendered correctly.
- Print / Save as PDF button/link remained visible and behavior-preserved.
- Quotation numbers, invoice numbers, customer/service names, SAR values, dates, quantities, and statuses remained readable/LTR-safe.
- PDFs/document routes untouched.
- ZATCA/QR/XML/FATOORA untouched.
- Quotation actions/queries untouched.
- No RBAC/permission drift.
- No finance/totals drift.
- No PDF link behavior drift.
- No deposit invoice behavior drift.
- RTL shell passed visually with the known non-blocking English-locale direction note.

## Service Detail Status UX
- `SERVICE-DETAIL-STATUS-UX-1` completed as a Service Detail workflow/status UX slice.
- The oversized Service Detail status timeline was replaced with a compact A-lite Workflow card.
- The header status badge remains the authoritative current status surface.
- The Workflow card does not repeat Current Status.
- The Workflow card shows Current Phase and Next Action.
- Status History is collapsed and secondary.
- Status Actions remain separate and unchanged.
- Last Updated is omitted because no dedicated status-transition timestamp was available.
- Completed and Cancelled are handled as terminal states.
- No workflow/schema/query/action/RBAC/billing/supplier/PDF changes were introduced.
- Focused review result: PASS.
- Mozfer visual review result: PASS for default Quoted and Completed detail views.
- Expanded history, Cancelled visual state, and mobile/small-width smoke remain to be confirmed manually if needed.

### I18N-RTL-INVOICES-RUNTIME-1B
- `I18N-RTL-INVOICES-RUNTIME-1B` completed as an Invoices runtime action/payment slice.
- Focused senior review initially returned HOLD on the `online` payment label.
- FIX-2 corrected `paymentModal.methods.online` to `Online Payment` / `دفع إلكتروني`.
- Re-review result: PASS.
- Mozfer manual/browser smoke was recorded as PASS for the slice.
- IssueInvoiceAction and RecordPaymentModal copy were localized without changing behavior, validation, permissions, or action/query logic.

## Approved Billing Scope Design Sync
- `APPROVED-BILLING-SCOPE-SCHEMA-DESIGN-V2-1` completed and returned `PASS`.
- `APPROVED-BILLING-SCOPE-SCHEMA-DESIGN-V2-REVIEW-1` completed and returned `PASS WITH MINOR DOCS-SYNC NOTES`.
- `APPROVED-BILLING-SCOPE-DOCS-SYNC-2` was the current docs-only recording step.
- `APPROVED-BILLING-SCOPE-INVOICE-SNAPSHOT-FROM-SCOPE-DOCS-SYNC-1` records the invoice snapshot fix for approved billing scope billing items.
- Commit `c66975d` fixed invoice snapshot behavior for approved scope billing items.
- Manual DEV/DEMO smoke passed for `INV-2026-0025` and `INV-2026-0026`.
- Deposit invoice `INV-2026-0025` captured one summary snapshot row for `Deposit Payment = 10000`.
- Final invoice `INV-2026-0026` captured one summary snapshot row for `Final Settlement = 20000`, with prior deposit `INV-2026-0025` for `10000`.
- Result: `PASS WITH WARN`.
- WARN: full-scope accepted/adjusted/excluded/customer_supplied item-decision smoke remains untested because there is no real item-decision UI yet.
- `APPROVED-BILLING-SCOPE-DRAFT-CREATE-COMMIT-1` was completed and pushed as `4ec323f feat(billing): add approved scope draft creation`.
- Manual DEV/DEMO smoke for the create-draft action passed with candidate quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe`.
- Smoke verification confirmed `scopeId = 2fb8a324-4bd2-44be-8a23-a2b37e9b6e72`, `status = draft`, `line_safety_status = pending_review`, item counts and totals matched, and the duplicate second click returned `scope_duplicate_draft`.
- `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-1` completed with `PASS WITH NOTES`.
- `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-REVIEW-1` completed with `PASS WITH REQUIRED CHANGES`.
- `APPROVED-BILLING-SCOPE-RUNTIME-DECISIONS-LOCK-1` records the locked V1 runtime/product/security decisions in docs/spec only.
- `APPROVED-BILLING-SCOPE-DRAFT-DISCARD-SMOKE-DOCS-SYNC-1` verified the manual apply of draft discard migration `20260708110000_approved_billing_scope_draft_discard_function.sql` in DEV/DEMO and manual app smoke test (creation of draft `0ace1c81-68c0-4cdd-8d9b-db563cd49949` and its atomic deletion). The temporary local DEV harness was removed.
- `APPROVED-BILLING-SCOPE-DRAFT-ITEM-EDIT-COMMIT-1` and `APPROVED-BILLING-SCOPE-DRAFT-ITEM-EDIT-PUSH-1` implemented, verified, and pushed atomic draft item edit.
  - Production query relation disambiguation implemented in `src/lib/approved-billing-scopes/queries.ts` to solve PostgREST embedding ambiguity.
  - Aggregate column-qualify corrective migration `20260708123000_approved_billing_scope_item_edit_function_column_qualify_fix.sql` applied/verified.
  - RHS line safety qualify corrective migration `20260708124000_approved_billing_scope_item_edit_function_line_safety_qualify_fix.sql` applied/verified.
  - Manual browser app smoke test passed via temporary DEV harness `/approved-billing-scopes/dev/item-edit-smoke` using existing draft scope `39949bf2-4b0e-4311-9cef-d84a57da7845` (edited item `353699f1-e7b2-4f73-9c1c-11283b05272c` setting qty to 4 and unit price to 400).
  - All 8 correctness checks passed. Draft scope discarded. Temporary DEV harness removed.
  - Commit pushed as `7f26ca3 fix(billing): stabilize approved scope item edit`.
- `APPROVED-BILLING-SCOPE-LIVE-SCHEMA-ENFORCEABILITY-CHECK-1` completed with `WARN` (audit expectation mismatch only; all database tables, constraints, FKs, indexes, triggers, RLS, and RPC grants verified and enforceability is sound; the draft creation write path is confirmed to be an app-layer action rather than a database RPC function; no runtime or migration blocker exists; data state is clean).
- `APPROVED-BILLING-SCOPE-MIGRATION-DRAFT-1` reclassified as completed/no-op after live schema audit confirmed that no database migration is required. Draft creation is app-layer, draft discard and edit child items RPCs exist, and other runtime actions operate on the existing database schema.
- `APPROVED-BILLING-SCOPE-RBAC-RLS-REVIEW-1` completed with `PASS` (security review completed; app-layer permissions, RLS posture, table grants, and service-role write paths verified as secure).
- `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-DESIGN-1` completed with `PASS` (invoice ceiling design parameter clear).
- **Historical / superseded next-task note:** At this sync point, `QUOTATION-REVISION-FALLBACK-DESIGN-1` was identified as the next safe task. It does not supersede Feature 006 as the current active planning feature or next implementation slice.
