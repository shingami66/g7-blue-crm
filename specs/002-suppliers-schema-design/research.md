# Research & Design Decisions: Supplier Module Schema Design

## Supplier Module Is Core To G7 BLUE

- **Decision**: Treat suppliers as a core delivery, costing, and reliability domain, not a side directory.
- **Rationale**: G7 BLUE is a pure-service events/production company. The company orchestrates customer experiences through external suppliers/subcontractors. Supplier cost and delivery quality directly affect Service/Booking success and Gross Profit.
- **Implication**: Supplier design must integrate with Service/Booking and later support costing, bookings/internal POs, supplier invoices, supplier payments, and role-restricted profit visibility.

## Supplier Invoices Must Not Reuse Customer Invoices

- **Decision**: Use separate `supplier_invoices`.
- **Rationale**: Customer invoices are receivable documents tied to G7 BLUE billing the customer. Supplier invoices are payable documents from vendors/subcontractors to G7 BLUE. Reusing customer invoices would mix opposite financial directions, statuses, permissions, document semantics, and reporting.
- **Implication**: Supplier invoices are AP-like outbound cost records, separate from customer invoice numbering, customer invoice PDFs, customer document labels, and customer VAT/ZATCA behavior.

## Supplier Payments Must Not Reuse Customer Payments

- **Decision**: Use separate `supplier_payments`.
- **Rationale**: Customer payments are incoming receipts against customer invoices. Supplier payments are outgoing payments against supplier invoices. Mixing them would distort collected revenue, payable balances, dashboards, permissions, and audit trails.
- **Implication**: Supplier payments should have their own statuses, methods, references, confirmation audit, and permissions.

## `is_preferred` Separate From Lifecycle Status

- **Decision**: Model preferred supplier as a boolean `is_preferred`, not only as a lifecycle status.
- **Rationale**: Lifecycle status answers whether the supplier may be used (`active`, `on_hold`, `blacklisted`, `inactive`). Preferred answers whether the supplier is favored among usable suppliers. Combining them would make it hard to represent active preferred suppliers without losing lifecycle meaning.
- **Implication**: Supplier filters can combine lifecycle status with `is_preferred`.

## Bank Details Must Be Role-Masked

- **Decision**: Supplier bank/IBAN details are optional at supplier creation, required before confirmed supplier payment, and masked by role.
- **Rationale**: Bank details are sensitive. Admin and Accountant need full details for governance and payment execution. Manager/Operations may only need masked confirmation. Viewer should not see bank details.
- **Implication**: Future reads must avoid sending full bank details to unauthorized clients; masking must happen server-side and, later, at RLS/policy boundaries.

## Rate Cards Need `valid_from` And `valid_to`

- **Decision**: `supplier_rate_cards` require effective dates.
- **Rationale**: Supplier pricing changes over time. Effective dates prevent current price changes from rewriting historical estimates, bookings, or margin analysis.
- **Implication**: Rate cards are internal defaults/estimates only. Rate-card-driven quotation automation is deferred and must not automatically set customer quotation pricing in MVP.

## Estimated And Actual Costs Must Be Separate

- **Decision**: `service_supplier_allocations` must store estimated and actual costs separately.
- **Rationale**: Estimated cost supports planning before quotation or confirmation. Actual cost is learned later from supplier confirmation or supplier invoice. Overwriting estimates would destroy variance analysis and make Gross Profit unreliable.
- **Implication**: Service P&L can later compare Supplier Estimated Cost, Supplier Actual Cost, variance, and Gross Profit for Admin/Manager roles.

## Supplier Invoice `service_id` Linkage

- **Decision**: Normal supplier invoices link to Service/Booking through `service_id`; `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs.
- **Rationale**: G7 BLUE needs service-level profitability. Most supplier costs are tied to a Service/Booking. Rare overhead/non-service supplier invoices should not force an artificial Service link, but they must be clearly classified so they do not distort Service P&L.
- **Implication**: Future schema/RLS must distinguish service-linked payables from Admin-only overhead/non-service payables.

## Supplier Booking/Internal PO Snapshots

- **Decision**: Supplier bookings/internal POs require supplier snapshot fields.
- **Rationale**: Supplier name, contact, status, payment terms, and bank details may change after booking. Historical records must preserve the agreed supplier context.
- **Implication**: Future booking/PO records should snapshot supplier identity, contact details, agreed terms, location, date/time, agreed amount, and notes.

## Supplier Invoice Snapshots

- **Decision**: Supplier invoices require supplier snapshot fields.
- **Rationale**: A payable invoice must remain historically accurate if supplier master data changes later. The invoice should preserve supplier identity, external reference, supplier-side VAT facts, terms, and relevant Service/Booking context.
- **Implication**: Supplier invoices should not depend solely on live supplier master fields for historical display or audit.

## Costing/Margin Admin/Manager Only

- **Decision**: Supplier costs, variance, Service P&L, and Gross Profit are Admin/Manager-only by default.
- **Rationale**: Margin is commercially sensitive. Accountant needs supplier invoice/payment visibility and full bank details, but not gross margin unless approved later. Operations needs supplier directory and booking details, but not internal margin by default. Viewer must not see bank/cost/margin data.
- **Implication**: Future RBAC and RLS must separate directory access from cost, margin, invoice, payment, and bank-detail access.

## VAT/ZATCA Boundary

- **Decision**: Supplier-side VAT facts may be stored for payables, but this must not introduce G7 BLUE customer Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior while company settings remain `not_registered`.
- **Rationale**: Supplier payables and customer e-invoicing are different concerns. Current project rules prohibit official Saudi e-invoicing behavior until VAT registration and explicit approval.
- **Implication**: Supplier design can track supplier invoice VAT amount as a supplier-side fact, but customer quotation/invoice documents remain unchanged.
