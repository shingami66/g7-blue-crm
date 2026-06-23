# Research & Technical Decisions: ERP-3B Invoice Creation

## Shared Invoice Number Sequence

- **Decision**: Implement a database transaction-safe sequence generator or relying on an existing generator for `INV-YYYY-XXXX` within the Server Action before inserting.
- **Rationale**: Deposit and final invoices share the same sequence (`INV-YYYY-0001`). No separate `DEP-` or `FIN-` sequences are allowed.

## Trusted Server Logic for Service/Quotation Alignment

- **Decision**: Server Action must perform a fetch of the Quotation and Service to verify:
  1. The Quotation is approved.
  2. The Quotation belongs to the given Service.
  3. No other approved quotation exists for the Service.
- **Rationale**: `service_id` is nullable in the DB, so composite FK enforcement remains partial. We cannot rely solely on Postgres constraints; the Next.js server logic must enforce it.

## Snapshot Immutability

- **Decision**: The Server Action will copy the relevant current data from Customer, Company Settings, and Quotation into the `snapshot_*` columns of the invoice.
- **Rationale**: Ensures historical invoices do not mutate when settings change.

## Lifecycle Management

- **Decision**: Invoice rows will not be hard deleted. Instead, they will use `voided_at` and `void_reason` to represent void/cancel/reversal workflows.
