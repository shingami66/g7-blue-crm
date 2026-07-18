# Database Schema & Supabase Setup (Local Only)

## Overview
This document outlines the Supabase PostgreSQL database schema reference for the G7 BLUE CRM backend.

`supabase/schema.sql` is a schema reference snapshot of the verified Supabase DB shape after the Core Security, Quotations RPC, Company Settings CS-A, ERP-1 Services DB foundation, and subsequent DEV/DEMO ERP work. It is not a complete migration ledger. The approved billing scope financial-lifecycle migration has connector-generated DEV/DEMO history (`20260714113857`); this does not authorize production apply or imply that every older manually applied change has migration history.

**WARNING: DO NOT apply migrations through the MCP connection.** The current setup is purely local for development. Follow the manual application steps if needed on a live instance.

## Approved ERP Schema Direction

These are approved target rules for future reviewed schema changes; they do not imply that the current DB already contains every target column.

- Service / Booking is the core operational entity for new ERP work, not Project.
- The locked relationship chain is Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- Quotations are Service-scoped. No standalone quotations are allowed.
- Quotation `customer_id`, if retained, must be derived server-side from Service.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.
- No Invoice may exist without Service.
- Every Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence. Do not create separate `DEP-` or `FIN-` sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Payment must link to Invoice. Payment connects to Service through the Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear, not a progress step.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.

## Tables

### Core Entities
- `app_users`: Server-side app user and RBAC role table keyed by Clerk `clerk_user_id` text. RLS is enabled, but no broad `DEV_ONLY` policy is present by design; access should remain through protected server logic and the Supabase service role.
- `company_settings`: Singleton seller/master-company settings for CS-A. It stores English and Arabic legal names, nullable CR, TIN, VAT mode, nullable VAT number/effective date, official contact details, national address, bank details, currency, default VAT percent, and default terms. The stable `setting_key='default'` column enforces one active settings row. The current implemented VAT field is `company_settings.vat_mode`.
  - **Snapshot Rule (Intended):** Generated customer-facing documents must snapshot company details, financial values, VAT mode, VAT rate, document labels, logo path, and bank/payment details at issue time. Historical documents must not change if Company Settings change later. (This does not invent new migrations, but outlines the required snapshot fields for future document logic).
- `number_sequences`: Atomic counters for generated IDs (e.g., QT-2026-0001). Current allowed types are `quotation`, `invoice`, `payment`, `project`, `service`, and `customer`. Current prefixes are `QT`, `INV`, `PAY`, `PRJ`, `SVC`, and `CUST`.
- `customers`: Client database with revenue metrics, soft deletes, and a system-generated unique `customer_number`.
- `services`: ERP-1 operational unit linked to `customers(id)` with `service_number`, event fields, status, ownership, cancellation reason, timestamps, audit text fields, and soft-delete timestamp. The DB foundation and app list/create/detail/edit foundation are implemented; controlled status transitions remain deferred.
- `suppliers`: Third-party vendor database.
- `service_supplier_allocations`: Supplier Allocations planning layer. Database/permissions foundation implemented under `SUPPLIER-ALLOCATIONS-FOUNDATION-1A`; domain types, Zod schemas, and mappers implemented under `SUPPLIER-ALLOCATIONS-SCHEMAS-1A`; runtime CRUD/actions/UI are deferred.
- `audit_logs`: Centralized event tracking for actions (`create`, `update`, etc.).

### Financial & Workflow
- `quotations` / `quotation_items`: Quotes with subtotal/vat/grand_total calculation foundations.
- `invoices` / `invoice_items`: Current invoice tables referencing quotes. `invoices.type` exists as text without a CHECK constraint; ERP-3 target design must use `invoice_type = deposit | final` after reviewed schema work.
  - **Approved Billing Scope Integration:** Added `approved_billing_scope_id` as a nullable UUID referencing `approved_billing_scopes(id, service_id)` via a composite foreign key constraint, enforcing invoice ceiling limits and validation guards via `check_invoices_before_write` trigger.
- `payments`: Financial tracking of invoice payments. Current `payments.method` allowed values are `bank_transfer`, `cash`, `cheque`, and `online`; ERP-4 planning may later decide whether to change this to Cash / Bank Transfer / Card / Other.
- `projects` / `project_tasks`: Existing legacy execution tracking. New ERP planning should use Service as the operational unit.

### Views
- `customer_report_metrics`: Read-only view with `security_invoker = true`. Provides server-side aggregated metrics (`services_count`, `quotations_count`, `approved_quotations_count`, `draft_quotations_count`, `total_quoted_amount`) per customer for reporting and export.

## Relationships
- Current legacy schema still contains direct Customer → Invoice / Project relationships and denormalized quotation customer linkage for reporting/query convenience.
- `services` now exists as the new operational unit linked to `customers(id)`, and quotations are service-scoped through required `quotations.service_id`.
- New ERP planning must follow **Customer Profile → Service → Quotation → Invoice → Payment**.
- **Service** belongs to a **Customer**.
- **Quotation** belongs to a **Service** and can keep `customer_id` only for reporting/query convenience.
- **Invoice** is currently Service-linked: invoice creation persists `service_id` and its approved quotation basis. When an active Approved Billing Scope exists, invoice creation also persists `approved_billing_scope_id` and uses the scope accepted grand total as the billing ceiling; otherwise, the approved quotation total remains the transitional fallback.
- **Payment** belongs to an **Invoice** and therefore connects to the Service through that invoice. The current schema does not establish a direct `payments.service_id` relationship.

## Planned ERP Schema Notes

### Services
- ERP-1 Services DB foundation has been manually applied and verified.
- Service replaces Project as the operational unit for new ERP work, but legacy `projects` remain for now.
- Service number format is `SVC-YYYY-0001`.
- Service numbering is generated server-side through `generate_document_number('service')`.
- Event date fields are `event_start_date` and nullable `event_end_date`, not only `event_date`.
- Event date constraint is implemented as `CHECK (event_end_date IS NULL OR (event_start_date IS NOT NULL AND event_end_date >= event_start_date))`.
- `event_end_date` can be null for single-day events or inquiry-stage records.
- Event fields should stay flexible at inquiry stage; Saudi partner/business owner should confirm event types.
- Service ownership uses `sales_owner_id` at the DB foundation level.
- Service cancellation requires `cancellation_reason`.
- If no invoice/payment exists, cancellation can be simple. If invoice/payment exists, cancellation must not silently delete financial records.
- Services app UI/routes/server actions are implemented for list/create/detail/edit, with ordinary edit limited to Inquiry/Quoted and status transitions deferred.
- ERP-2 service-scoped quotation work added `quotations.service_id`. Current invoice creation is Service-linked; payments link to invoices and therefore reach the Service through the invoice rather than a direct payment-to-Service foreign key.

### Quotations
- Quotations must belong to a Service. Standalone quotations are not allowed in new ERP work.
- `customer_id` in quotations must be derived server-side from the Service; do not trust client-submitted customer linkage.
- One Service can have multiple Quotations.
- Do not add `UNIQUE(service_id)` to quotations.
- `valid_until` or `expiry_date` must be on or after issue date.
- Expired quotations cannot be approved without renewal/extension or authorized override.
- Approval requires `quotations:approve`, not only `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- The `unique_approved_quotation_per_service` partial unique index on `quotations(service_id)` where `status = 'approved' AND is_deleted = false` was manually applied in the database.
- Index verification passed.
- `supabase/schema.sql` was synced to reflect this index.

### Approved Billing Scope (Current DEV/DEMO Implementation)
- Approved Billing Scope is implemented in DEV/DEMO as the billing-authority layer separate from quotation approval. Its foundation tables are `approved_billing_scopes` and `approved_billing_scope_items`.
- **Status model (DB):** scope `status` is `draft | approved | voided` only. **`superseded` is not a status enum value** — supersession uses `superseded_at` / `superseded_by_scope_id` (and related columns). Active scope = `status = approved` AND `superseded_at IS NULL` AND `voided_at IS NULL`.
- Implemented foundation rules include one active scope per Service, constraints/triggers, RLS, reductions-only line decisions (`accepted`, `excluded`, `adjusted`, `customer_supplied`), line-safety review before approval, and immutable approved or invoice-referenced records under ordinary edit.
- Implemented runtime includes the app-layer draft-creation path, narrow discard and draft-item-edit RPCs, review and approval **server actions**, invoice integration, a permission-gated Service Detail **read-only** card, and the nested **read-only** detail route.
- **Lifecycle implementation status:** the reviewed void/supersede financial lifecycle migration and RPC surface is installed once in G7 BLUE CRM DEV/DEMO (local `20260714090000_...`; connector history `20260714113857`) and was the latest lifecycle migration at successful-mutation-smoke review time. Successful mutation smoke and independent review have **passed** on synthetic DEV/DEMO data only (run ID `300d4edd-5c8e-45bc-bc85-b4f033750a14`). Application Deposit/Final stack and five-mode authority are pushed through `45cdfb73`. Explicitly authorized DEV/DEMO browser acceptance for Invoice creation closed **PASS WITH WARN**. Void/successor **management UI** remains unshipped. Management design: `docs/approved-billing-scope-management-design.md`.
- **Service-lifetime Invoice exposure:** applicable Invoice exposure is summed across the Service lifetime (active, historical, and null scope links), excluding validly cancelled/voided/deleted invoices (including soft-deleted). Draft can count. Payments do not reduce invoiced exposure. Equality between the active scope ceiling and current Service exposure is allowed (Fully allocated / remaining zero).
- **Void rule:** Void is allowed only for the active approved authority at zero Invoice exposure and zero payment history. Void does not delete invoices/payments; historical financial authority remains detectable after Void and quotation fallback stays closed once approved/voided ABS history exists.
- **Successor / supersession lineage:** successor drafts use `supersedes_scope_id`; the retired source keeps `superseded_at` / `superseded_by_scope_id`. Supersession is not a status enum value. Approve-and-supersede is atomic (retire old / activate new under Service-first locking).
- **Invoice write guard:** `check_invoices_before_write` enforces active-authority linkage and Service-lifetime ceiling; writes against inactive (including voided) authority fail closed (e.g. `billing_scope_inactive`).
- **Mutation boundary:** financial lifecycle mutation RPCs are service-role-only (`SECURITY DEFINER`, fixed search path); direct browser/client mutation authority is revoked. App-layer authority: Admin and Manager may drive lifecycle writes; Accountant remains lifecycle read-only.
- Invoice integration persists `approved_billing_scope_id` when an active scope exists and enforces the accepted grand total as the invoice ceiling. The approved quotation total remains the fallback only when no active scope exists and no historical approved/voided ABS authority has closed fallback.
- The implemented DEV/DEMO foundation includes the scope tables, related keys, trigger functions/triggers, and RLS. It must not be described as production-ready or production-applied.
- Still deferred or not authorized: production database authorization/apply, full user-facing Void/successor management UI, and unsupported audit/history capabilities.
- The foundation migration `20260708090000_approved_billing_scope_foundation.sql` was later applied to the DEV/DEMO database only and validated there; production remains unapplied.
- DEV/DEMO validation confirmed the foundation objects exist there, including `approved_billing_scopes`, `approved_billing_scope_items`, `quotation_items_id_quotation_id_key`, the trigger functions/triggers, and RLS on the new tables.
- Manual DEV/DEMO smoke for the create-draft action also passed after the foundation migration: source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` created scope `2fb8a324-4bd2-44be-8a23-a2b37e9b6e72`, duplicate protection returned `scope_duplicate_draft`.
- The draft discard migration `20260708110000_approved_billing_scope_draft_discard_function.sql` was manually applied in DEV/DEMO. It adds the narrow service_role-only transactional function `discard_approved_billing_scope_draft` for draft discard atomicity; this is a safety exception for one-scope cleanup, not a general Approved Billing Scope RPC direction.
- Manual app smoke test verified that the function successfully deletes the draft scope (`0ace1c81-68c0-4cdd-8d9b-db563cd49949`) and its child items atomically.
- The draft item edit migration `20260708120000_approved_billing_scope_item_edit_function.sql` was manually applied in DEV/DEMO. It introduces the narrow service_role-only RPC function `edit_approved_billing_scope_item` for draft item modification.
- Two corrective migrations were manually applied and verified in the DEV/DEMO database to resolve PL/pgSQL aggregate and RHS variable naming collisions:
  - `20260708123000_approved_billing_scope_item_edit_function_column_qualify_fix.sql` (qualifies `items.accepted_subtotal`, `items.accepted_vat_amount`, `items.accepted_grand_total`).
  - `20260708124000_approved_billing_scope_item_edit_function_line_safety_qualify_fix.sql` (qualifies `scopes.line_safety_status` and `scope_items.display_order`).
- PostgREST embedding ambiguity was resolved by updating the select string constant in `src/lib/approved-billing-scopes/queries.ts` to `approved_billing_scope_items:approved_billing_scope_items!approved_billing_scope_id(*)`.
- Live schema enforceability audit completed on DEV/DEMO database with `WARN` (audit packet expectation mismatch only; all target database tables, check/FK/unique constraints, indexes, triggers, RLS status, and table grants successfully verified).
- Clarified draft write path: `createApprovedBillingScopeDraft` is an app-layer server action, NOT a database RPC. There is no expected `public.create_approved_billing_scope_draft` database function. It performs direct table writes using `createAdminClient` / `service_role`, is protected by app-layer `requirePermission(approvedBillingScopes:create)`, and relies on table-level constraints and triggers for enforceability and concurrency safety.
- Production authorization remains deferred until a separate production review approves it.
- The financial-lifecycle migration is `supabase/migrations/20260714090000_approved_billing_scope_financial_lifecycle.sql` (local hash `414bb40863c10a5294f254e11d198d2f874467b3`) and is installed in G7 BLUE CRM DEV/DEMO as connector history version `20260714113857`, name `approved_billing_scope_financial_lifecycle` (installed once; latest at smoke review time).
- Post-apply read-only verification and later successful mutation smoke review confirmed the lifecycle surface in DEV/DEMO. Aggregate catalog gates at review: functions 14/14, unexpected overloads 0, triggers 3/3, constraints 29/29, indexes 14/14, RLS 11/11, privilege matrix 176/176, missing/duplicate/failed catalog counts 0. Successful mutation smoke retained only synthetic DEV/DEMO evidence (no production claim).

### Invoices And Payments
**Status: ERP-3A Invoice Schema Foundation — Manual Supabase apply completed / Verified; application Deposit/Final create stack pushed through `45cdfb73` (DEV/DEMO only; not production-ready)**
- Migration 20260623200000_erp3a_invoice_schema.sql was manually applied in Supabase.
- Post-apply verification passed.
- approved_quotation_id exists.
- invoice_type exists.
- old quotation_id and type columns are gone.
- service_id exists but remains nullable.
- snapshot_* columns exist and remain nullable jsonb.
- invoices_invoice_type_check exists and remains NOT VALID by design.
- quotations_id_service_id_key exists.
- invoices_approved_quotation_id_service_id_fkey exists.
- Composite FK enforcement remains partial while service_id is nullable.
- Application Invoice create uses the service-role RPC for financial authority; UI/control visibility and billing-state presentation remain application-side (see Application vs database enforcement below).
- ZATCA/FATOORA/QR/XML remain deferred.
- Do not document unbuilt migrations as installed.

#### Application vs database enforcement (Invoice financial lifecycle)
**Database-enforced (committed/installed DEV/DEMO facts):** invoice foundation columns/FKs; ABS foundation + financial-lifecycle migration/RPC surface where applied; `check_invoices_before_write` active-authority linkage and Service-lifetime ceiling guards for ABS-linked paths; service-role-only financial lifecycle RPCs; **DEV/DEMO-installed and app-used** `public.create_invoice_atomic` (atomic Deposit/Final create RPC; owns service/quotation validation, ABS history/active authority, exposure, lifecycle eligibility, duplicates, Deposit/Final amounts, numbering, and insert); soft-delete and non-negative amount CHECKs where present.

**Application-enforced (presentation / gates around the RPC):** five billing-authority modes for Service Detail UI and reads (`active_abs`, `historical_abs_only`, `legacy_quotation`, `no_authority`, `unavailable`); control visibility; safe UI error presentation; authoritative money parsing for non-create surfaces. **Live Deposit/Final create** uses `createInvoiceAction` → single `create_invoice_atomic` call (service_role only); no multi-query financial create write and no silent fallback to direct insert.

**Atomic Invoice create RPC (installed in DEV/DEMO; used by application create path):**
- Contract: [`docs/atomic-invoice-creation-contract.md`](./atomic-invoice-creation-contract.md)
- Migration: `supabase/migrations/20260717180000_atomic_invoice_create.sql` (commit `5ad23f257b542aa2edc5d01cf403d7dcd1bd1925`)
- App integration: `a83c1d28c416066a5879acf204006af41341ed48` (`createInvoiceAction` Deposit + Final)
- Function: `public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date)`
- Returns: `TABLE(error_code text, invoice_id uuid, invoice_number text)`
- Language: `plpgsql`; `SECURITY DEFINER` true; fixed `search_path = pg_catalog, public`; owner verified as `postgres` in DEV/DEMO
- Grants: `EXECUTE` to **`service_role` only**; `PUBLIC`, `anon`, and `authenticated` execute **revoked/false**
- Financial authority: RPC-owned (app supplies presentation snapshots + actor audit id only; does not trust client totals)
- Mozfer DEV/DEMO apply verification: metadata + privilege matrix PASS; three structural dry-checks returned stable codes (`invalid_invoice_input`, `invalid_deposit_amount`, `invalid_invoice_input`) with null IDs/numbers; zero invoices for zero Service UUID; no real Invoice created by dry-checks
- DEV/DEMO runtime smoke verification (local application, DEV/DEMO data only, Admin): Deposit creation PASS for `10,000.00 SAR` as `INV-2026-0032` with exactly one Draft Deposit and verified Service/Quotation linkage; Final creation PASS for server-derived `50,840.00 SAR` as `INV-2026-0033` with exactly one Draft Final and verified linkage; remaining billing authority reached `0.00 SAR`; Deposit/Final controls disappeared after full allocation; duplicate and fully allocated creation was safely prevented; no SQL, stack trace, constraint, or internal database details appeared in the UI; repository preflight/postflight matched byte-for-byte; no unexpected tracked or untracked files were created; production was not touched.
- **Not installed / not claimed for production.**

**Still deferred / separate:** optional broader write-side numeric work beyond current ABS write normalization; production database apply; `issueInvoiceAction` remains a separate non-create update path; some RPC `error_code` values still present via safe generic UI fallback until dictionary expansion.

**Service-lifetime exposure (application predicate + server reads):** exposure is based on active non-deleted, non-voided, non-cancelled Invoice rows for the Service (`is_deleted` not true, `voided_at` null, status not in `voided`/`cancelled`); includes Draft and other applicable active statuses; **Payment amounts do not reduce Invoice exposure** (payments affect collected balance, not invoiced exposure).

- Invoices must belong to a Service. Standalone invoices are not allowed in new ERP work.
- Every invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence.
- Do not create separate `DEP-` or `FIN-` invoice sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Deposit Invoice is created manually after quotation approval (Service Detail mutation authority).
- Deposit amount must be greater than `0`.
- Deposit amount must be less than or equal to the remaining uninvoiced authority (enforced on create by `create_invoice_atomic`; active ABS ceiling overrides Quotation total when active).
- Deposit is flexible and not fixed at 50%.
- Direct Final is supported when lifecycle and authority gates allow (Final amount derived from remaining; no requirement that a Deposit already exist solely for Direct Final).
- `Deposit Paid` requires a valid/cleared deposit payment.
- A Deposit Invoice alone does not confirm booking.
- A pending payment does not confirm booking.
- Deposit payment changes Service status to `Deposit Paid` only through a cleared Deposit Invoice payment.
- Payment must link to an Invoice. If a customer pays before an invoice exists, the UI must require creating a Deposit Invoice first or prevent recording the payment until an invoice exists.
- Prevent overpayment unless explicitly approved.
- Future invoice void/cancellation may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices.
- Issued/paid financial records must be preserved for auditability.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.

### Supplier Allocations
- **Table:** `service_supplier_allocations` exists (database/permissions foundation implemented under `SUPPLIER-ALLOCATIONS-FOUNDATION-1A` via migration `20260629100000_service_supplier_allocations_foundation.sql` and synced in `schema.sql`; domain types, Zod schemas, and mappers implemented under `SUPPLIER-ALLOCATIONS-SCHEMAS-1A`; server-only read queries implemented under `SUPPLIER-ALLOCATIONS-READ-1A`; manual create action implemented under `SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A`). Other server actions, write mutations, and UI remain deferred.
- **Costing:** Manual cost is allowed (`cost_source` = `rate_card` | `manual_estimate`).
- **Statuses:** `draft` | `planned` | `selected` | `cancelled`.
- **Planned Fields:**
  - `quantity NUMERIC(10,3) NOT NULL` (decimal because events may need 0.5 day, 1.5 day, 2.5 hours, or 2.5 meters).
  - `estimated_unit_cost NUMERIC(14,2) NOT NULL`
  - `estimated_total_cost NUMERIC(14,2) GENERATED ALWAYS AS (quantity * estimated_unit_cost) STORED` (DB-generated, not client-submitted).
  - `currency CHAR(3) NOT NULL DEFAULT 'SAR'` (SAR-only for MVP unless Team Lead later approves multi-currency).
- **Integrity Rules:**
  - `service_id` is required and immutable after creation.
  - `quantity > 0` and `estimated_unit_cost >= 0`.
  - Server-side validation remains mandatory for quantity and estimated_unit_cost before insert/update.
  - `supplier_rate_card_id` is optional.
  - If `cost_source = rate_card`, `supplier_rate_card_id` and `rate_card_snapshot` are required.
  - If `cost_source = manual_estimate`, `supplier_rate_card_id` may be null.
  - If `supplier_rate_card_id` is selected, it must belong to the same `supplier_id`. MVP enforcement for `supplier_rate_card_id`/`supplier_id` matching is server-side validation (preferred future DB option: composite FK or trigger, not an MVP blocker).
  - `approved_quotation_id` is nullable and present on allocation.
  - If `approved_quotation_id` is set, it must belong to the same `service_id` and reference only an approved quotation. MVP enforcement for `approved_quotation_id` integrity is server-side validation (preferred future DB integrity rule should be considered in DB foundation).
  - Block new allocations for blacklisted or inactive suppliers.
  - Cancelled parent Service: If the parent Service is cancelled, block new allocations and keep existing allocations read-only historical records.

### Index Planning
- Implemented ERP-1 service indexes: `services.customer_id`, `services.status`, `services.deleted_at`, `services.event_start_date`, `services.sales_owner_id`, and `services.created_at`.
- Future ERP phases should plan indexes on `quotations.service_id`, `invoices.service_id`, `payments.invoice_id`, `payments.service_id` only if stored, and `audit_logs.user_id`.

## Data Integrity Constraints
- **Current Status And Method Checks**: Database `status` and `method` fields use explicit CHECK constraints where they exist. Current `payments.method` values are `bank_transfer`, `cash`, `cheque`, and `online`. Future ERP-4 payment method labels such as Card or Other require an approved schema change before use.
- **Invoice Type Caveat**: `invoices.type` currently has no CHECK constraint. The approved ERP-3 target is `invoice_type = deposit | final` after reviewed schema work.
- **Financial Safety**: To prevent invalid negative financial amounts, rigid numeric `CHECK (value >= 0)` constraints protect fields like `subtotal`, `discount`, `vat_amount`, `grand_total`, `amount`, `budget`, `revenue`, `qty`, `unit_price`, `vat`, `total`, and `default_vat_percent`. Company Settings VAT values are defaults only; quotations and invoices must keep document-level snapshots. Client-submitted totals must never be trusted.
- **Rounding And Currency**: Future invoice/payment work must document SAR 2-decimal rounding rules. Financial rounding must be server-side/PostgreSQL-side. Currency should be snapshotted on issued documents.
- **VAT Mode Safety**: The current implemented field is `company_settings.vat_mode`. `company_settings.vat_mode='not_registered'` requires `default_vat_percent=0`, no VAT number, and no VAT effective date. `phase2_integrated` is reserved for future FATOORA work and must not be claimed by CS-A UI.
- **Bank Detail Visibility**: Bank details are sensitive. CS-A reads them server-side only for Admin and Accountant; Viewer can read settings without receiving bank values from the server.

## Numbering Strategy
Unique document numbers (`quotation_number`, `invoice_number`, `payment_number`, `project_number`, `service_number`, `customer_number`) are generated using the `number_sequences` table and `generate_document_number(doc_type text)`. Current supported document types are `quotation`, `invoice`, `payment`, `project`, `service`, and `customer`. Current prefixes are `QT`, `INV`, `PAY`, `PRJ`, `SVC`, and `CUST`; the payment prefix remains `PAY` to preserve verified live DB behavior. Invoice numbering must remain one shared `INV-YYYY-0001` sequence for both deposit and final invoices.

## Soft Delete Strategy
Entities like `customers`, `quotations`, `invoices`, and `projects` implement a soft delete pattern using `is_deleted` (boolean) and `deleted_at` (timestamptz). `services` currently uses `deleted_at` without `is_deleted`. This preserves historical references in financial data while hiding records from the active UI. Future schema should prefer `deleted_at` timestamp over only `is_deleted`, or document any `is_deleted`-only usage as technical debt. Financial records must use void/cancel/reversal workflows rather than hard deletion.

## Row Level Security (RLS)
All tables have Row Level Security enabled.

`app_users` has RLS enabled and intentionally has no broad `DEV_ONLY` policy. It should be accessed server-side through service role / protected server logic only.

**DEV ONLY RLS:**
Currently, the `schema.sql` creates wildcard (`true`) policies for the `authenticated` role. This allows full read/write access to any logged-in user during development.
> **WARNING:** These `DEV_ONLY_*` policies MUST be replaced with granular tenant-based or role-based access controls before deploying to production.
> **WARNING:** Server-side masking protects the CS-A UI path, but `DEV_ONLY_company_settings` is still not acceptable for real or semi-real data because direct Supabase Data API exposure may bypass UI masking.
> **WARNING:** `DEV_ONLY_services` is also fake/dev-data only. Real or semi-real customer/service data remains blocked until production RLS hardening is implemented.
Production RLS for `company_settings` must be planned explicitly because the table contains bank, legal, CR/TIN, and VAT data.

## Migration Rollback Procedure
- Migrations are forward-only by default.
- Risky migrations require backup/export/snapshot before apply.
- Rollback should be a new corrective migration, not editing old applied migrations.
- Agents must not apply SQL automatically.

## Manual Application Steps (If required)
Do not apply `supabase/schema.sql` automatically. Treat it as a reference snapshot for review, local reset planning, or schema comparison.

Manual DB changes should continue to follow the project workflow: inspect live DB shape, propose SQL text, review, create a migration only when approved, review the migration, apply manually in Supabase SQL Editor, verify, then update this reference snapshot if the live schema changed.
