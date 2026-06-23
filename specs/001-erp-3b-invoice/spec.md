# Feature Specification: ERP-3B Invoice Creation

**Feature Branch**: `[001-erp-3b-invoice]`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "ERP-3B Invoice Creation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Deposit Invoice (Priority: P1)

An admin, manager, or accountant can create a deposit invoice based on an approved quotation for a specific service.

**Why this priority**: Required to initiate the invoicing process and bill the customer partially before the service is fully delivered.

**Independent Test**: Can be fully tested by creating a deposit invoice with a flexible manually entered amount and verifying that it is linked to the Service and Quotation properly, with snapshots captured.

**Acceptance Scenarios**:

1. **Given** an approved quotation linked to a Service, **When** an authorized user generates a deposit invoice with a valid deposit amount, **Then** the invoice is created successfully with the deposit amount and snapshot fields populated.
2. **Given** a quotation that is not approved, **When** a user tries to create an invoice, **Then** the action is blocked.
3. **Given** a user with Viewer role, **When** they try to create an invoice, **Then** the action is blocked.
4. **Given** an invalid deposit amount (e.g. negative), **When** a user tries to create a deposit invoice, **Then** the server blocks the creation.
5. **Given** a VAT mode of "not_registered", **When** the invoice is generated, **Then** the document is labeled as "Commercial Invoice", "Proforma", or "Receipt", with no VAT 15% calculation and no Tax Invoice wording.

---

### User Story 2 - Create Final Invoice (Priority: P1)

An admin, manager, or accountant can create a final invoice based on an approved quotation for a specific service, which will eventually account for previously paid deposits.

**Why this priority**: Required to finalize the billing for a completed service.

**Independent Test**: Can be tested by creating a final invoice and ensuring the invoice totals derive from the approved quotation authoritative data and snapshots are recorded.

**Acceptance Scenarios**:

1. **Given** an approved quotation linked to a Service, **When** an authorized user generates a final invoice, **Then** the invoice is created successfully using totals from the approved quotation and snapshot fields populated.
2. **Given** a request with client-submitted manipulated totals, **When** the user attempts to create the invoice, **Then** the server-calculated totals from the approved quotation override the client input.
3. **Given** a VAT mode of "not_registered", **When** the invoice is generated, **Then** no ZATCA/FATOORA/QR/XML clearance behavior is triggered or displayed.

### Edge Cases

- What happens when the underlying company settings, VAT mode, or customer details change after an invoice is issued? The historical invoice must remain unchanged as it relies on snapshot columns (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, `snapshot_bank_details`, `snapshot_document_rules`, `vat_mode`, `vat_rate`, `document_label`).
- How does the system handle an approved quotation that does not belong to the selected Service? The server explicitly blocks creation as `ERP-3B must enforce approved quotation + service alignment in trusted server logic.`
- How does the system handle more than one approved quotation per Service? It is blocked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT allow invoice creation without a linked Service/Booking.
- **FR-002**: System MUST NOT allow invoice creation unless the basis quotation is approved.
- **FR-003**: System MUST NOT allow invoice creation from draft, sent, rejected, expired, or cancelled quotations.
- **FR-004**: System MUST block more than one approved quotation per Service.
- **FR-005**: System MUST enforce that the approved quotation belongs to the selected Service.
- **FR-006**: System MUST create deposit invoices with flexible, manually entered deposit amounts (not fixed 50%).
- **FR-007**: System MUST validate that the deposit amount is not negative and does not exceed the quotation grand total.
- **FR-008**: System MUST generate final invoices where totals derive strictly from the approved quotation authoritative data/snapshot.
- **FR-009**: System MUST NOT trust client-submitted financial totals; `balance_due` and `amount_paid` must be derived/validated by trusted server logic.
- **FR-010**: System MUST NOT create Tax Invoices, calculate VAT 15%, display VAT number, or trigger ZATCA/FATOORA/QR/XML behavior while `vat_mode` is `not_registered`.
- **FR-011**: System MUST use Commercial Invoice / Proforma / Receipt styles while `vat_mode` is `not_registered`.
- **FR-012**: System MUST capture snapshots at issue time for `snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, `snapshot_bank_details`, `snapshot_document_rules`, `vat_mode`, `vat_rate`, and `document_label`.
- **FR-013**: System MUST restrict invoice creation to Admin, and appropriately permitted Manager/Accountant roles; Viewer and unpermitted Sales roles MUST NOT be able to create invoices.
- **FR-014**: System MUST NOT apply any SQL or Supabase migrations; the existing ERP-3A schema MUST remain unchanged.
- **FR-015**: Invoices use the shared invoice number sequence INV-YYYY-0001. Deposit and final invoices share the same invoice numbering pattern (no separate DEP- or FIN- sequences).
- **FR-016**: Financial records require void/cancel/reversal workflows rather than hard delete. ERP-3B must not introduce hard deletion of issued invoices.

### Key Entities

- **Invoice**: Contains `invoice_type` (deposit | final), `service_id`, `approved_quotation_id`, amounts (`amount_paid`, `balance_due`), `document_label`, VAT info (`vat_mode`, `vat_rate`), snapshots (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, `snapshot_bank_details`, `snapshot_document_rules`), and lifecycle fields (`issued_at`, `voided_at`, `void_reason`).
- **Service / Booking**: The core entity representing the work provided; every invoice must link to a service.
- **Quotation**: The basis for an invoice; must be in the approved state to generate an invoice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of created invoices have all snapshot fields accurately populated at issue time.
- **SC-002**: 100% of created invoices are linked to an approved quotation and a matching Service.
- **SC-003**: Unauthorized users (Viewers) have a 0% success rate when attempting to create invoices.
- **SC-004**: Server validation ensures that 0% of deposit invoices have negative deposit amounts or exceed the total quotation amount.

## Assumptions

- Admin can create invoices.
- Manager and Accountant roles may be configured via RBAC to create invoices, but Viewers cannot.
- `service_id` is nullable at the DB level. Composite FK enforcement remains partial while service_id is nullable. ERP-3B must enforce approved quotation + service alignment in trusted server logic until service_id becomes NOT NULL in a future migration/backfill.
- Existing quotation approval flow is fully functional and ready to be used as a basis.

## Out of Scope

- Payment workflow implementation.
- Payment confirmation.
- ZATCA/FATOORA/QR/XML.
- Tax Invoice while not VAT registered.
- Supabase migration.
- SQL apply.
- invoice PDF redesign unless required by spec as future work.
- Automatic email/WhatsApp sending.
- Refunds.
- Credit notes.
- Full accounting journal entries.
