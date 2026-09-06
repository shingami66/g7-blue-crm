# Database Migrations

This document explains how to apply structural schema changes, sequence numbering, and user seeding.

## Atomic Sequence Generation
The `generate_document_number(doc_type)` function provides document sequencing (e.g., `QUO-2026-0001`).
- The function guarantees atomic unique numbering under concurrency.
- Gapless numbering requires generating the number inside the final document creation transaction.

## Admin User Seeding
To seed an initial admin user (or yourself):
1. Obtain your Clerk User ID from the **Clerk Dashboard → Users → [Your User] → User ID**.
2. Run the following manual SQL snippet in the Supabase SQL Editor:

```sql
INSERT INTO app_users (
  clerk_user_id,
  email,
  name,
  role,
  is_active
)
VALUES (
  'user_xxxxxxxxx',
  'my-email@example.com',
  'Mozfer Mohamed',
  'admin',
  true
)
ON CONFLICT (clerk_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'admin',
  is_active = true,
  updated_at = now();
```

## Migration Safety Steps
- Never run migrations that mutate user data without a verified local test.
- Use `text` instead of `uuid` for all user ID relations to accommodate Clerk.
- Manually run `.sql` files in the Supabase SQL Editor until automated CLI migrations are fully integrated.

## DEV/DEMO Application Record

### One Active Deposit per Service — 2026-07-23

`supabase/migrations/20260722120000_enforce_one_active_deposit_per_service.sql` was manually applied through the Supabase SQL Editor to G7 BLUE CRM DEV/DEMO project `dpddrqjzqohexixgdqiq`. The SQL Editor returned: `Success. No rows returned.` Production was not accessed.

- Verified `public.create_invoice_atomic(...)` exists with `SECURITY DEFINER` and `search_path = pg_catalog, public`.
- Deposit duplicate detection is Service-wide; the exact `uq_invoices_one_active_deposit_per_service` unique-index race maps to `deposit_invoice_already_exists`, while the Final Invoice duplicate guard remains intact.
- Unique index `public.uq_invoices_one_active_deposit_per_service` exists, is unique, valid, and ready, indexes only `service_id`, and uses this active Deposit predicate:
  `service_id IS NOT NULL AND invoice_type = 'deposit' AND COALESCE(is_deleted, false) = false AND voided_at IS NULL AND status NOT IN ('voided', 'cancelled')`.
- Function execution is granted to `service_role` and revoked from `anon` and `authenticated`.
- Pre-apply duplicate aggregate was clean: `0` affected Services and `0` active Deposit rows.
- Repository migration history was not repaired or marked. This record does not claim that migration history contains version `20260722120000`.

## W4 Procurement & Commitments Migration Ledger — 6 September 2026

The following 13 local migrations represent the W4 Procurement & Commitments schema foundation delivered in reconstructed local history.

- All exact local migration filenames are preserved without modification, reordering, rewriting, or squashing.
- Known local-to-DEV identity mappings are recorded based on canonical evidence from DEV project `dpddrqjzqohexixgdqiq`.
- Migrations where DEV identity remains unproven from current canonical evidence are recorded as `UNKNOWN` rather than inventing an unverified mapping.
- No database migration was applied, mutated, or squashed during this documentation synchronization.

| Local Migration Filename | DEV Project Migration Identity | Scope & Description |
|---|---|---|
| `20260901061855_w4_procurement_requirement_sourcing.sql` | `UNKNOWN` | Foundation for service procurement requirements and sourcing compatibility (`service_procurement_requirements`, `service_procurement_candidates`). |
| `20260901065813_w4_procurement_requirement_rpc_ambiguity_repair.sql` | `UNKNOWN` | RPC parameter qualification repair for procurement requirement functions. |
| `20260901071504_w4_procurement_candidate_rpc_ambiguity_repair.sql` | `UNKNOWN` | RPC parameter qualification repair for procurement candidate functions. |
| `20260901150000_shared_business_document_storage_foundation.sql` | `UNKNOWN` | Private business-evidence bucket foundation, metadata tables (`business_documents`, `business_document_links`), and RLS. |
| `20260901170000_w4_supplier_quotation_history.sql` | `20260901121001` | Supplier quotation history foundation and attachment linking (`supplier_quotations`, `create_supplier_quotation`). |
| `20260901173000_w4_supplier_quotation_document_attachment_rpc_ambiguity_repair.sql` | `20260901122500` | RPC repair for `attach_document_to_supplier_quotation` parameter qualification. |
| `20260902090000_w4_first_class_supplier_quotations.sql` | `20260902062807` | First-class supplier quotations schema extensions, status, and numbering (`QUO-SUP-`). |
| `20260902110000_l1_d07_commitment_receipt.sql` | `20260902112824` | Approved commitments (`approved_commitments`, `approved_commitment_amendments`) and service receipts (`service_receipts`) schema foundation. |
| `20260902120000_l1_d07_audit_action_compatibility.sql` | `20260902115725` | Compatibility trigger and audit log action updates for commitment and receipt lifecycle events. |
| `20260904100000_w4_procurement_package_foundation.sql` | `20260905062018` | Procurement package foundation (`service_procurement_packages`, `service_procurement_package_requirements`, `upsert_procurement_package`, `select_procurement_package_supplier`). |
| `20260905062323_w4_procurement_package_upsert_rpc_ambiguity_repair.sql` | `20260905062323` | RPC parameter qualification repair for `upsert_procurement_package`. |
| `20260905062540_w4_procurement_package_audit_action_compatibility.sql` | `20260905062540` | Audit action enum compatibility for procurement package lifecycle events. |
| `20260905140000_w4_supplier_quotation_line_items.sql` | `20260905114939` | Detailed supplier quotation line items (`supplier_quotation_lines`), pricing modes (`total_only`, `line_items`), and package requirement linkage. |
