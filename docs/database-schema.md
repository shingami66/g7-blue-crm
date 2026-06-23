# Database Schema & Supabase Setup (Local Only)

## Overview
This document outlines the Supabase PostgreSQL database schema reference for the G7 BLUE CRM backend.

`supabase/schema.sql` is a schema reference snapshot of the verified live Supabase DB shape after manually applied SQL through the Core Security, Quotations RPC, Company Settings CS-A, and ERP-1 Services DB foundation work. It is not migration tracking, and it should not be treated as proof that `supabase_migrations.schema_migrations` exists. SQL has been applied manually through the Supabase SQL Editor, so migration tracking tables may be absent.

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
- `audit_logs`: Centralized event tracking for actions (`create`, `update`, etc.).

### Financial & Workflow
- `quotations` / `quotation_items`: Quotes with subtotal/vat/grand_total calculation foundations.
- `invoices` / `invoice_items`: Current invoice tables referencing quotes. `invoices.type` exists as text without a CHECK constraint; ERP-3 target design must use `invoice_type = deposit | final` after reviewed schema work.
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
- Planned **Invoice** belongs to a **Service** and can reference a **Quotation**.
- Planned **Payment** must belong to an **Invoice**. Payment is connected to Service through the Invoice.
- If `payments.service_id` is stored for query convenience, it must match the invoice's `service_id`. Enforce this in the data layer and preferably with database design.

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
- ERP-2 service-scoped quotation work added `quotations.service_id`; invoices and payments are still not service-linked.

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

### Invoices And Payments
- Invoices must belong to a Service. Standalone invoices are not allowed in new ERP work.
- Every invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence.
- Do not create separate `DEP-` or `FIN-` invoice sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Deposit Invoice is created manually after quotation approval.
- Deposit amount must be greater than `0`.
- Deposit amount must be less than or equal to the approved quotation total or remaining uninvoiced balance.
- Deposit is flexible and not fixed at 50%.
- `Deposit Paid` requires a valid/cleared deposit payment.
- A Deposit Invoice alone does not confirm booking.
- A pending payment does not confirm booking.
- Deposit payment changes Service status to `Deposit Paid` only through a cleared Deposit Invoice payment.
- Payment must link to an Invoice. If a customer pays before an invoice exists, the UI must require creating a Deposit Invoice first or prevent recording the payment until an invoice exists.
- Prevent overpayment unless explicitly approved.
- Future invoice void/cancellation may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices.
- Issued/paid financial records must be preserved for auditability.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.

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
