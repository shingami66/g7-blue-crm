# Database Schema & Supabase Setup (Local Only)

## Overview
This document outlines the Supabase PostgreSQL database schema generated from the frontend TypeScript types. The schema acts as the single source of truth for the G7 BLUE CRM backend.

**WARNING: DO NOT apply migrations through the MCP connection.** The current setup is purely local for development. Follow the manual application steps if needed on a live instance.

## Tables

### Core Entities
- `company_settings`: Singleton seller/master-company settings for CS-A. It stores English and Arabic legal names, CR, TIN, VAT mode, nullable VAT number/effective date, official contact details, national address, bank details, currency, default VAT percent, and default terms. The stable `setting_key='default'` column enforces one active settings row.
- `number_sequences`: Atomic counters for generated IDs (e.g., QT-2026-0001).
- `customers`: Client database with revenue metrics and soft deletes.
- `suppliers`: Third-party vendor database.
- `audit_logs`: Centralized event tracking for actions (`create`, `update`, etc.).

### Financial & Workflow
- `quotations` / `quotation_items`: Quotes with subtotal/vat/grand_total calculation foundations.
- `invoices` / `invoice_items`: Final billing referencing quotes.
- `payments`: Financial tracking of invoice payments.
- `projects` / `project_tasks`: Project execution tracking.

## Relationships
- A **Customer** can have multiple **Quotations**, **Invoices**, and **Projects** (`ON DELETE RESTRICT`).
- A **Quotation** can have multiple **Quotation Items** (`ON DELETE CASCADE`).
- An **Invoice** references a **Customer** and an optional **Quotation** (`ON DELETE RESTRICT`), and has **Invoice Items** (`ON DELETE CASCADE`).
- A **Payment** belongs to an **Invoice** and **Customer** (`ON DELETE RESTRICT`).
- A **Project** references a **Customer** and an optional **Quotation**, and has **Project Tasks** (`ON DELETE CASCADE`).

## Data Integrity Constraints
- **TypeScript Union Alignment**: Database `status` and `method` fields strictly mirror the exact string literals defined in `src/types/*` (e.g., `invoices.status`, `projects.status`, `payments.method`). Display labels such as "Bank Transfer" or "Credit Card" belong in the frontend representation layer only and are not stored in the database.
- **Financial Safety**: To prevent invalid negative financial amounts, rigid numeric `CHECK (value >= 0)` constraints protect fields like `subtotal`, `discount`, `vat_amount`, `grand_total`, `amount`, `budget`, `revenue`, `qty`, `unit_price`, `vat`, `total`, and `default_vat_percent`. Company Settings VAT values are defaults only; quotations and invoices must keep document-level snapshots.
- **VAT Mode Safety**: `company_settings.vat_mode='not_registered'` requires `default_vat_percent=0`, no VAT number, and no VAT effective date. `phase2_integrated` is reserved for future FATOORA work and must not be claimed by CS-A UI.
- **Bank Detail Visibility**: Bank details are sensitive. CS-A reads them server-side only for Admin and Accountant; Viewer can read settings without receiving bank values from the server.

## Numbering Strategy
Unique Document Numbers (`quotation_number`, `invoice_number`, `payment_number`, `project_number`) are generated using the `number_sequences` table. It ensures atomic, sequential assignment based on year and document type (e.g., `INV-2023-001`). 

## Soft Delete Strategy
Entities like `customers`, `quotations`, `invoices`, and `projects` implement a soft delete pattern using `is_deleted` (boolean) and `deleted_at` (timestamptz). This preserves historical references in financial data while hiding records from the active UI.

## Row Level Security (RLS)
All tables have Row Level Security enabled. 

**DEV ONLY RLS:**
Currently, the `schema.sql` creates wildcard (`true`) policies for the `authenticated` role. This allows full read/write access to any logged-in user during development.
> **WARNING:** These `DEV_ONLY_*` policies MUST be replaced with granular tenant-based or role-based access controls before deploying to production.
> **WARNING:** Server-side masking protects the CS-A UI path, but `DEV_ONLY_company_settings` is still not acceptable for real or semi-real data because direct Supabase Data API exposure may bypass UI masking.

## Manual Application Steps (If required)
1. Open your Supabase Dashboard.
2. Navigate to the SQL Editor.
3. Open `supabase/schema.sql` from the repository.
4. Copy the entire contents of the file.
5. Paste it into the SQL Editor and click **Run**.
6. Verify that tables are created in the Table Editor.
