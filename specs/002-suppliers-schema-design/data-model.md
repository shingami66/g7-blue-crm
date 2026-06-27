# Data Model Plan: Supplier Module Schema Design

This document proposes the Supplier Module data model in prose/table form only. It does not include SQL, migrations, constraints, indexes, grants, or RLS policies.

## Current State Notes

- Current `suppliers` table is minimal and does not satisfy the target design.
- Current `/suppliers` UI uses static `suppliersData`.
- Current RBAC has broad `suppliers:read` and `suppliers:write`, but no `supplier_costing`, `supplier_bookings`, `supplier_invoices`, or `supplier_payments` permissions.
- Future implementation must go through reviewed schema/migration/RLS tasks.

## Entity: `suppliers`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Supplier master profile for external delivery partners/subcontractors. |
| Key fields | supplier number/code, supplier type (`company`, `individual`), legal/commercial name, display name, category, contact person or primary contact name, phone, WhatsApp phone if separate, email, city, country, coverage area. |
| Lifecycle | `active`, `on_hold`, `blacklisted`, `inactive`. |
| Preferred | `is_preferred` boolean flag, separate from lifecycle status. |
| Rating | Manual optional rating for MVP; automatic rating deferred. |
| Compliance | CR/commercial registration optional at creation; required for official company suppliers when available or when formal supplier documents/audit require it; not required for individual suppliers by default. VAT registration status and VAT number optional. |
| Payment | Payment terms; bank/IBAN strategy; IBAN optional at creation and required before confirmed supplier payment. Full bank details visible only to Admin and Accountant by default; Manager/Operations may see masked bank details if needed; Viewer cannot see bank details. |
| Soft delete | `deleted_at`, optional `deleted_by`; historical linked records remain readable to permitted users. |
| Blacklist audit | `blacklisted_reason`, `blacklisted_at`, `blacklisted_by`, unblacklist reason/history. |
| Relationships | One supplier can have many `supplier_rate_cards`, `service_supplier_allocations`, `supplier_bookings`, `supplier_invoices`, and `supplier_payments`. |
| Access/RBAC sensitivity | Basic directory can be broader; bank details, blacklist audit, costs, invoices, payments, and margin are sensitive. |

## Entity: `supplier_rate_cards`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Effective-dated internal supplier cost defaults for planning and estimates. |
| Key fields | `supplier_id`, item/service name, category, unit, base_cost, currency, `valid_from`, `valid_to`, active/inactive state, notes, audit fields. |
| Required/optional notes | `supplier_id`, item/service name, unit, base_cost, currency, and `valid_from` should be required in a future schema. `valid_to` may be nullable for current active rate. |
| Relationships | Belongs to `suppliers`; may be referenced by `service_supplier_allocations`. |
| Status values | active/inactive. |
| Access/RBAC sensitivity | Cost values are internal; read/write should require `supplier_costing:read` or `supplier_costing:write` in future implementation. |
| Design caveat | Rate cards are estimates/defaults only and must not automatically drive customer quotation pricing in MVP. Rate-card-driven quotation automation is deferred. |

## Entity: `service_supplier_allocations`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Connect a Service/Booking to supplier work and internal costing. |
| Key fields | `service_id`, `supplier_id`, nullable `rate_card_id`, item description, quantity, unit, estimated_unit_cost, estimated_total_cost, actual_unit_cost, actual_total_cost, currency, status, internal notes, audit fields. |
| Costing | Estimated costs can attach to Service/Booking before quotation when known. Actual costs attach later after supplier invoice/confirmation. Estimated and actual costs must be stored separately; actual cost must not overwrite estimated cost. |
| Variance | Preserve variance between estimated and actual cost for later permitted Admin/Manager reporting and Gross Profit analysis. |
| Status values | `draft`, `requested`, `quoted`, `confirmed`, `cancelled`, `completed`. Statuses are manual for MVP; guarded transitions are deferred. |
| Relationships | Belongs to `services` and `suppliers`; may reference `supplier_rate_cards`; may later be referenced by `supplier_bookings`. |
| Access/RBAC sensitivity | Cost and variance are Admin/Manager-only by default; Operations can view operational booking details but not internal margin by default. |

## Entity: `supplier_bookings`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Future internal supplier booking or internal PO record tied to a Service/Booking. |
| Key fields | booking number, `service_id`, `supplier_id`, nullable `allocation_id`, status, booked date/time, delivery date/time, location, agreed amount, currency, supplier snapshot fields, terms/notes snapshot, created/approved/cancelled audit fields. |
| Snapshot fields | Supplier identity, supplier type, legal/display names, contact details, lifecycle status at booking time, payment terms, relevant bank/IBAN masked/full-display policy, terms, notes, agreed amount, currency, location, and delivery timing. |
| Required/optional notes | `service_id` and `supplier_id` normally required. `allocation_id` nullable because a booking may be created before a formal allocation in some future workflow. |
| Relationships | Belongs to `services` and `suppliers`; may reference `service_supplier_allocations`; may be referenced by `supplier_invoices`. |
| Status values | To be finalized later; likely draft/requested/confirmed/cancelled/completed aligned with allocation lifecycle. |
| Access/RBAC sensitivity | Operational details visible to Operations/Manager/Admin by permission; agreed amount and cost-sensitive details restricted. |
| Deferred items | Supplier PO PDF, WhatsApp/email sending, and formal approval workflow are deferred. |

## Entity: `supplier_invoices`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Outbound/payable supplier invoice record, separate from customer `invoices`. |
| Key fields | internal supplier invoice number, `supplier_id`, `service_id`, overhead/non-service classification, nullable `supplier_booking_id`, external supplier invoice reference, issue date, due date, subtotal, VAT amount, grand total, currency, status, supplier snapshot fields, approval fields, notes, audit fields. |
| Service linkage | Normal event/service supplier invoices must link to Service/Booking. `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs. Overhead/non-service invoices must be clearly classified so they do not distort Service P&L. |
| Status values | `received`, `approved`, `partially_paid`, `paid`, `disputed`, `cancelled`. |
| Snapshot fields | Supplier identity, legal/display names, supplier type, CR/VAT registration facts, payment terms, bank/IBAN display policy as applicable, external invoice reference, issue/due dates, currency, supplier-side VAT amount, and relevant Service/Booking context. |
| Relationships | Belongs to `suppliers`; normally belongs to `services`; may belong to `supplier_bookings`; has many `supplier_payments`. |
| Access/RBAC sensitivity | Supplier invoices visible to Accountant/Admin by default; Manager access subject to business role; supplier invoice visibility does not imply gross margin visibility. |
| VAT boundary | Supplier-side VAT amount may be stored as a payable fact, but must not introduce Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior for G7 BLUE customer invoices. |

## Entity: `supplier_payments`

| Area | Proposed Design |
|------|-----------------|
| Purpose | Outbound supplier payment record, separate from customer payments. |
| Key fields | `supplier_invoice_id`, `supplier_id`, nullable `service_id`, amount, payment method, payment date, reference, status, created_by, confirmed_by, confirmed_at, notes. |
| Required/optional notes | `supplier_invoice_id` and `supplier_id` should be required. `service_id` may be copied through the supplier invoice where available, nullable for Admin-only overhead/non-service payables. |
| Status values | `draft`, `confirmed`, `cancelled`. |
| Relationships | Belongs to `supplier_invoices` and `suppliers`; may reference `services` for reporting. |
| Access/RBAC sensitivity | Accountant/Admin by default; bank/payment details are sensitive. Supplier payment access does not imply Gross Profit or margin access. |

## Service P&L Concept

Service P&L should later derive from:

- Customer Revenue.
- Supplier Estimated Cost from `service_supplier_allocations`.
- Supplier Actual Cost from confirmed actual costs and/or supplier invoices.
- Variance between estimated and actual supplier costs.
- Gross Profit = Customer Revenue - Supplier Actual Cost, with expected Gross Profit based on estimated cost before actuals are available.

Visibility is Admin/Manager-only by default. Automatic margin reports are deferred.

## RBAC/RLS Sensitivity Summary

| Data Area | Default Visibility |
|-----------|--------------------|
| Basic supplier directory | Broader, including permitted Operations/Viewer read access. |
| Supplier master writes | Admin/Manager/Operations subject to final `suppliers:write` policy. |
| Supplier bank/IBAN full details | Admin and Accountant only by default. |
| Masked bank details | Manager/Operations only if needed. |
| Supplier costing/rate cards/variance | Admin/Manager only by default. |
| Supplier bookings operational details | Operations/Manager/Admin by permission. |
| Supplier invoices/payments | Accountant/Admin by default; Manager by explicit business approval if needed. |
| Gross Profit and margin | Admin/Manager only by default. |

No RLS SQL is defined here. Future RLS must enforce these boundaries in addition to server-side RBAC.
