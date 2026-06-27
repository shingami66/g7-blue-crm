# Implementation Plan: Supplier Module Schema Design

**Feature Branch**: `[002-suppliers-schema-design]`

**Date**: 2026-06-27

**Spec**: `specs/002-suppliers-schema-design/spec.md`

**Status**: Draft

**Input**: Feature specification from `specs/002-suppliers-schema-design/spec.md`

## Summary

Design the supplier module as a core G7 BLUE service-delivery foundation. The plan converts the approved supplier specification into a controlled architecture and rollout path for supplier directory, rate cards, service supplier allocations/costing, supplier bookings/internal POs, supplier invoices, supplier payments, RBAC/RLS direction, snapshots, and validation.

No code implementation is included in this phase. No SQL or migration is included in this phase.

## Technical Context

- **Application**: Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Clerk Auth.
- **Authorization**: Existing RBAC uses `app_users` roles and permission strings. Current supplier permissions are broad (`suppliers:read`, `suppliers:write`) and must be expanded in a future approved implementation for supplier costing, bookings, invoices, and payments.
- **Current Supplier State**: `/suppliers` uses static `suppliersData` from `src/lib/data/suppliers.ts`. The current `suppliers` schema is minimal (`name`, `service`, `contact`, `phone`, `rating`, `status`, `recent_project`, audit fields).
- **Target Supplier State**: Future live supplier data should be modeled through separate supplier-domain entities and integrated through Service/Booking, not legacy Project.
- **Storage**: PostgreSQL/Supabase in a later reviewed migration task. This plan does not write SQL.
- **Testing/Validation Later**: Future tasks should validate RBAC, RLS, masking, status behavior, snapshot immutability, and service-level cost/profit reporting after explicit implementation approval.

## Constitution Check

- `AGENTS.md` remains authoritative.
- Spec Kit does not authorize staging, commit, push, SQL apply, Supabase commands, `.env*` reads, secrets reads, builds, or code changes.
- Locked flow is preserved: Customer Profile -> Service/Booking -> Quotation -> Invoice -> Payment.
- Supplier module integrates later with Service/Booking and must not replace Service/Booking.
- Customer-facing documents must never expose supplier cost/margin.
- Company remains `not_registered`; no Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, or clearance behavior is introduced.
- Supplier invoices and supplier payments are outbound/payable flows and remain separate from customer receivable flows.
- Snapshot behavior is required for supplier bookings/internal POs and supplier invoices.

## Scope

- Design-only planning for supplier domain architecture.
- Future entity model for `suppliers`, `supplier_rate_cards`, `service_supplier_allocations`, `supplier_bookings`, `supplier_invoices`, and `supplier_payments`.
- Role and permission strategy for Admin, Manager, Accountant, Operations, and Viewer.
- RLS policy direction in prose only.
- Snapshot strategy for supplier bookings/internal POs and supplier invoices.
- Phased rollout recommendation from schema design through reporting.

## Non-Goals

- No implementation in this phase.
- No SQL or migrations in this phase.
- No UI changes in this phase.
- No edits to `supabase/schema.sql`.
- No changes to package files.
- No supplier create/edit/delete implementation in this phase.
- No tasks.md in this phase.
- No contracts in this phase.
- Supplier PO PDF generation is deferred.
- WhatsApp/email sending is deferred.
- Supplier portal is deferred.
- Supplier invoice attachment upload is deferred.
- Supplier payment approval workflow implementation is deferred.
- Rate-card-driven quotation automation is deferred.
- Automatic margin reports are deferred.
- ZATCA/FATOORA/QR/XML behavior is deferred.
- Tax Invoice/VAT 15% behavior for G7 BLUE customer invoices is deferred.
- Chamber/PO attestation workflow is deferred.

## Architecture Plan

### Current State

- `src/app/(dashboard)/suppliers/page.tsx` renders static supplier rows from `suppliersData`.
- `src/types/supplier.ts` only supports `active`, `inactive`, and `blacklisted`.
- `supabase/schema.sql` includes a minimal `suppliers` table with no supplier type, `is_preferred`, rate cards, allocations, supplier bookings, supplier invoices, or supplier payments.
- `src/lib/auth/permissions.ts` grants broad supplier directory permissions only: `suppliers:read` and `suppliers:write`.

### Target State

- `suppliers` becomes the master supplier profile with supplier type (`company` or `individual`), lifecycle status (`active`, `on_hold`, `blacklisted`, `inactive`), separate `is_preferred`, CR rules, optional VAT registration facts, bank/IBAN masking strategy, soft delete, and blacklist audit.
- `supplier_rate_cards` stores effective-dated internal cost defaults with `valid_from` and `valid_to`; rate cards are estimates/defaults only and must not automatically drive customer quotation pricing in MVP.
- `service_supplier_allocations` attaches estimated and actual supplier costs to Service/Booking with variance preserved for later Admin/Manager reporting.
- `supplier_bookings` stores future internal booking/PO records and supplier snapshots.
- `supplier_invoices` stores outbound/payable supplier invoices in a separate table from customer invoices.
- `supplier_payments` stores outbound supplier payments in a separate table from customer payments.

## Phasing Plan

### Phase A - Supplier Directory Foundation

- Start with schema design only, then a separate reviewed migration task later.
- Model `suppliers` with supplier type, lifecycle status, `is_preferred`, MVP categories, required MVP fields, CR rules, bank/IBAN masking strategy, soft delete, and blacklist audit.
- Replace static `/suppliers` data with live read-only supplier records in a later approved task.
- Add supplier create/edit only after separate approval.

### Phase B - Supplier Rate Cards

- Introduce `supplier_rate_cards` with effective dates (`valid_from`, `valid_to`), currency, unit, and base cost.
- Treat rate cards as internal estimates/defaults only.
- Do not automatically drive customer quotation pricing in MVP.

### Phase C - Service Supplier Allocations / Costing

- Add `service_supplier_allocations` to connect suppliers and costs to Service/Booking.
- Allow estimated costs before quotation when known.
- Add actual costs later after supplier invoice/confirmation.
- Store estimated and actual values separately and preserve variance.
- Restrict cost/margin visibility to Admin/Manager by default.

### Phase D - Supplier Bookings / Internal PO

- Add supplier booking record first.
- Require supplier snapshot fields and terms/notes snapshots.
- Keep Supplier PO PDF deferred.
- Keep WhatsApp/email sending deferred.

### Phase E - Supplier Invoices & Payments

- Add separate AP-like `supplier_invoices` and `supplier_payments`.
- Keep supplier invoices separate from customer invoices.
- Keep supplier payments separate from customer payments.
- Normal supplier invoices link to Service/Booking through `service_id`.
- `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs that are clearly classified.

### Phase F - Service P&L Reporting

- Add permitted reporting for Customer Revenue, Supplier Estimated Cost, Supplier Actual Cost, variance, and Gross Profit per Service.
- Keep automatic margin reports deferred until reporting scope and role visibility are explicitly approved.

## RBAC/RLS Strategy

- **Admin**: Full supplier, costing, payment, bank, and management visibility.
- **Manager**: Supplier/costing/margin visibility by default; masked bank details unless explicitly needed.
- **Accountant**: Supplier invoices, supplier payments, and full bank details; no gross margin unless explicitly approved later.
- **Operations**: Supplier directory and operational booking details; no internal margin by default; masked bank details only when needed.
- **Viewer**: Non-sensitive supplier directory visibility only; no sensitive bank, cost, or margin data.

Future RBAC permissions should include `suppliers:read`, `suppliers:write`, `supplier_costing:read`, `supplier_costing:write`, `supplier_bookings:read`, `supplier_bookings:write`, `supplier_invoices:read`, `supplier_invoices:write`, `supplier_payments:read`, and `supplier_payments:write`.

Future RLS policies should protect supplier master writes, costing, bookings, invoices, payments, bank details, audit fields, and Admin-only overhead/non-service supplier invoices. UI checks are not security; server actions and database policies must enforce permissions.

## Snapshot Strategy

- Supplier bookings/internal POs must snapshot supplier identity, supplier type, names, contact details, lifecycle status at booking time, payment terms, bank/IBAN display policy as applicable, and terms/notes.
- Supplier invoices must snapshot supplier identity, names, supplier invoice references, supplier-side VAT facts, payment terms, bank/IBAN display policy as applicable, and relevant Service/Booking context.
- Historical supplier bookings/internal POs and supplier invoices must not mutate when supplier master data changes later.
- Customer-facing quotation and invoice documents must never expose supplier cost, supplier actual cost, supplier rate cards, supplier margin, or Gross Profit.

## Validation Strategy

- Validate source spec and resolved clarifications before implementation tasks.
- Validate future migration SQL through the existing inspect -> proposed SQL -> migration review -> manual Supabase apply -> verification workflow.
- Validate RBAC at server/action and database policy layers, not UI only.
- Validate bank masking for Admin, Manager, Accountant, Operations, and Viewer.
- Validate that supplier invoices and supplier payments cannot be confused with customer invoices and customer payments.
- Validate that normal supplier invoices link to Service/Booking and that overhead/non-service invoices are Admin-only and clearly classified.
- Validate snapshot immutability by changing supplier master data after a booking/invoice exists and confirming historical records keep their captured values.
- Validate that no ZATCA/FATOORA/QR/XML, Tax Invoice, or VAT 15 behavior is introduced for G7 BLUE customer invoices.

## Risks and Mitigations

- **Risk**: Margin or supplier cost leaks into customer-facing documents.
  **Mitigation**: Keep supplier cost/margin fields internal and Admin/Manager-only; explicitly block them from quotation/invoice print/PDF surfaces.

- **Risk**: Supplier payable flows are accidentally mixed with customer receivable flows.
  **Mitigation**: Use separate `supplier_invoices` and `supplier_payments` tables and separate permissions.

- **Risk**: Existing broad `suppliers:read/write` is insufficient for costing/payables.
  **Mitigation**: Add granular future permissions for supplier costing, bookings, invoices, and payments.

- **Risk**: Bank details are overexposed.
  **Mitigation**: Mask by role and expose full IBAN/bank details only to Admin and Accountant by default.

- **Risk**: Historical bookings or invoices mutate when supplier master data changes.
  **Mitigation**: Use snapshot fields for supplier_bookings and supplier_invoices.

- **Risk**: Overhead/non-service supplier invoices distort Service P&L.
  **Mitigation**: Allow nullable `service_id` only for Admin-only overhead/non-service costs with explicit classification.

## Open Decisions For Later Phases

- Exact schema constraints, indexes, RLS SQL, grants/revokes, and migrations.
- Exact supplier number/code sequence and prefix.
- Exact supplier booking/internal PO approval workflow.
- Exact supplier invoice/payment approval workflow.
- Exact document format for Supplier PO PDF.
- Exact report layout and filters for Service P&L reporting.
- Whether Manager can ever see full bank details beyond masked display.

## File Impact Plan

This planning task creates only:

- `specs/002-suppliers-schema-design/plan.md`
- `specs/002-suppliers-schema-design/research.md`
- `specs/002-suppliers-schema-design/data-model.md`

Future approved implementation may affect:

- `supabase/migrations/` for reviewed migration SQL.
- `supabase/schema.sql` only after live DB verification and explicit schema reference update approval.
- `src/lib/auth/permissions.ts` for new supplier permissions.
- `src/lib/suppliers/` for future server-side data access and actions.
- `src/app/(dashboard)/suppliers/` for future live read-only and later write UI.
- `src/types/supplier.ts` for future TypeScript models.
