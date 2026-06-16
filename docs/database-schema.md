# Database Schema & Supabase Setup (Local Only)

## Overview
This document outlines the Supabase PostgreSQL database schema reference for the G7 BLUE CRM backend.

`supabase/schema.sql` is a schema reference snapshot of the verified live Supabase DB shape after manually applied SQL through the Core Security, Quotations RPC, and Company Settings CS-A work. It is not migration tracking, and it should not be treated as proof that `supabase_migrations.schema_migrations` exists. SQL has been applied manually through the Supabase SQL Editor, so migration tracking tables may be absent.

**WARNING: DO NOT apply migrations through the MCP connection.** The current setup is purely local for development. Follow the manual application steps if needed on a live instance.

## Tables

### Core Entities
- `app_users`: Server-side app user and RBAC role table keyed by Clerk `clerk_user_id` text. RLS is enabled, but no broad `DEV_ONLY` policy is present by design; access should remain through protected server logic and the Supabase service role.
- `company_settings`: Singleton seller/master-company settings for CS-A. It stores English and Arabic legal names, CR, TIN, VAT mode, nullable VAT number/effective date, official contact details, national address, bank details, currency, default VAT percent, and default terms. The stable `setting_key='default'` column enforces one active settings row.
- `number_sequences`: Atomic counters for generated IDs (e.g., QT-2026-0001). Current allowed types are `quotation`, `invoice`, `payment`, and `project`; `service` is not supported until ERP-1 deliberately extends the constraint and `generate_document_number`.
- `customers`: Client database with revenue metrics and soft deletes.
- `suppliers`: Third-party vendor database.
- `audit_logs`: Centralized event tracking for actions (`create`, `update`, etc.).
- Planned `services`: Future operational unit that replaces Projects for new ERP planning. Do not add SQL until ERP-1 review.

### Financial & Workflow
- `quotations` / `quotation_items`: Quotes with subtotal/vat/grand_total calculation foundations.
- `invoices` / `invoice_items`: Current invoice tables referencing quotes. `invoices.type` exists as text without a CHECK constraint; ERP-3 should decide the approved invoice type model later.
- `payments`: Financial tracking of invoice payments. Current `payments.method` allowed values are `bank_transfer`, `cash`, `cheque`, and `online`; ERP-4 planning may later decide whether to change this to Cash / Bank Transfer / Card / Other.
- `projects` / `project_tasks`: Existing legacy execution tracking. New ERP planning should use Service as the operational unit.

## Relationships
- Current legacy schema still contains direct Customer → Quotation / Invoice / Project relationships.
- New ERP planning must follow **Customer Profile → Service → Quotation → Invoice → Payment**.
- Planned **Service** belongs to a **Customer**.
- Planned **Quotation** belongs to a **Service** and can keep `customer_id` only for reporting/query convenience.
- Planned **Invoice** belongs to a **Service** and can reference a **Quotation**.
- Planned **Payment** must belong to an **Invoice**. Payment is connected to Service through the Invoice.
- If `payments.service_id` is stored for query convenience, it must match the invoice's `service_id`. Enforce this in the data layer and preferably with database design.

## Planned ERP Schema Notes

### Services
- Service replaces Project as the operational unit for new ERP work.
- Planned service number format: `SVC-YYYY-0001`.
- Service numbering must be generated server-side, not client-side. It is not supported in the current DB yet because `number_sequences.type` and `generate_document_number` do not allow `service`.
- Planned event date fields: `event_start_date` and nullable `event_end_date`, not only `event_date`.
- Planned event date constraint: `CHECK (event_end_date IS NULL OR event_end_date >= event_start_date)`.
- `event_end_date` can be null for single-day events or inquiry-stage records.
- Event fields should stay flexible at inquiry stage; Saudi partner/business owner should confirm event types.
- Plan service ownership with `assigned_to` or `sales_owner_id`; exact implementation can be finalized in ERP-1.
- Service cancellation requires `cancellation_reason`.
- If no invoice/payment exists, cancellation can be simple. If invoice/payment exists, cancellation must not silently delete financial records.

### Quotations
- Quotations must belong to a Service. Standalone quotations are not allowed in new ERP work.
- `valid_until` or `expiry_date` must be on or after issue date.
- Expired quotations cannot be approved without renewal/extension or authorized override.
- Approval requires `quotations:approve`, not only `quotations:write`.

### Invoices And Payments
- Invoices must belong to a Service. Standalone invoices are not allowed in new ERP work.
- Deposit Invoice is created manually after quotation approval.
- Deposit amount must be greater than `0`.
- Deposit amount must be less than or equal to the approved quotation total or remaining uninvoiced balance.
- Deposit is flexible and not fixed at 50%.
- Deposit payment changes Service status to `Deposit Paid` only through a Deposit Invoice payment.
- Payment must link to an Invoice. If a customer pays before an invoice exists, the UI must require creating a Deposit Invoice first or prevent recording the payment until an invoice exists.
- Future invoice void/cancellation may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices.
- Issued/paid financial records must be preserved for auditability.

### Index Planning
- Plan indexes on `services.customer_id`, `quotations.service_id`, `invoices.service_id`, `payments.invoice_id`, `payments.service_id` only if stored, and `audit_logs.user_id`.

## Data Integrity Constraints
- **Current Status And Method Checks**: Database `status` and `method` fields use explicit CHECK constraints where they exist. Current `payments.method` values are `bank_transfer`, `cash`, `cheque`, and `online`. Future ERP-4 payment method labels such as Card or Other require an approved schema change before use.
- **Invoice Type Caveat**: `invoices.type` currently has no CHECK constraint. ERP-3 should decide the approved invoice type model before invoice implementation proceeds.
- **Financial Safety**: To prevent invalid negative financial amounts, rigid numeric `CHECK (value >= 0)` constraints protect fields like `subtotal`, `discount`, `vat_amount`, `grand_total`, `amount`, `budget`, `revenue`, `qty`, `unit_price`, `vat`, `total`, and `default_vat_percent`. Company Settings VAT values are defaults only; quotations and invoices must keep document-level snapshots.
- **Rounding And Currency**: Future invoice/payment work must document SAR 2-decimal rounding rules. Financial rounding must be server-side/PostgreSQL-side. Currency should be snapshotted on issued documents.
- **VAT Mode Safety**: `company_settings.vat_mode='not_registered'` requires `default_vat_percent=0`, no VAT number, and no VAT effective date. `phase2_integrated` is reserved for future FATOORA work and must not be claimed by CS-A UI.
- **Bank Detail Visibility**: Bank details are sensitive. CS-A reads them server-side only for Admin and Accountant; Viewer can read settings without receiving bank values from the server.

## Numbering Strategy
Unique Document Numbers (`quotation_number`, `invoice_number`, `payment_number`, `project_number`) are generated using the `number_sequences` table and `generate_document_number(doc_type text)`. Current supported document types are `quotation`, `invoice`, `payment`, and `project`. Planned Service numbers should use `SVC-YYYY-0001` and be generated server-side, but ERP-1 must first extend both the `number_sequences.type` CHECK constraint and `generate_document_number`.

## Soft Delete Strategy
Entities like `customers`, `quotations`, `invoices`, and `projects` implement a soft delete pattern using `is_deleted` (boolean) and `deleted_at` (timestamptz). This preserves historical references in financial data while hiding records from the active UI. Future schema should prefer `deleted_at` timestamp over only `is_deleted`, or document any `is_deleted`-only usage as technical debt.

## Row Level Security (RLS)
All tables have Row Level Security enabled. 

`app_users` has RLS enabled and intentionally has no broad `DEV_ONLY` policy. It should be accessed server-side through service role / protected server logic only.

**DEV ONLY RLS:**
Currently, the `schema.sql` creates wildcard (`true`) policies for the `authenticated` role. This allows full read/write access to any logged-in user during development.
> **WARNING:** These `DEV_ONLY_*` policies MUST be replaced with granular tenant-based or role-based access controls before deploying to production.
> **WARNING:** Server-side masking protects the CS-A UI path, but `DEV_ONLY_company_settings` is still not acceptable for real or semi-real data because direct Supabase Data API exposure may bypass UI masking.
Production RLS for `company_settings` must be planned explicitly because the table contains bank, legal, CR/TIN, and VAT data.

## Migration Rollback Procedure
- Migrations are forward-only by default.
- Risky migrations require backup/export/snapshot before apply.
- Rollback should be a new corrective migration, not editing old applied migrations.
- Agents must not apply SQL automatically.

## Manual Application Steps (If required)
Do not apply `supabase/schema.sql` automatically. Treat it as a reference snapshot for review, local reset planning, or schema comparison.

Manual DB changes should continue to follow the project workflow: inspect live DB shape, propose SQL text, review, create a migration only when approved, review the migration, apply manually in Supabase SQL Editor, verify, then update this reference snapshot if the live schema changed.
