# Data Model Guidelines: ERP-3B Invoice Creation

*Note: The ERP-3A schema is already applied. No SQL migrations are allowed in this phase.*

## Entity: Invoice (Existing)

The server action will interact with the following existing columns:
- `approved_quotation_id` (UUID, required by server logic)
- `invoice_type` (Enum/String: `deposit` | `final`)
- `service_id` (UUID, nullable in DB, required by server logic)
- `amount_paid` (Numeric, calculated/derived by server logic)
- `balance_due` (Numeric, calculated/derived by server logic)
- `document_label` (String: e.g., 'Commercial Invoice')
- `vat_mode` (String: e.g., 'not_registered')
- `vat_rate` (Numeric: e.g., 0)
- `snapshot_seller` (JSONB)
- `snapshot_buyer` (JSONB)
- `snapshot_quotation` (JSONB)
- `snapshot_bank_details` (JSONB)
- `snapshot_document_rules` (JSONB)
- `issued_at` (Timestamp)
- `voided_at` (Timestamp, nullable)
- `void_reason` (String, nullable)

## Server Validation Rules

- **Client Totals**: The UI may submit a requested deposit amount, but `amount_paid` and `balance_due` are verified by the server. The deposit amount must be flexible, non-negative, and not exceed the quotation total.
- **VAT**: While `vat_mode = not_registered`, VAT 15% and Tax Invoice references must never be generated.
- **RBAC**: Only Admins and appropriately permitted Managers/Accountants can write to the invoice table.
