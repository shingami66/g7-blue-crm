# Feature Specification: Invoice PDF Customer Cleanup

**Feature**: `006-invoice-pdf-customer-cleanup`

**Created**: 2026-07-28

**Status**: **Active planning packet — implementation not started**

**Input**: Owner-approved Invoice customer-output cleanup direction following the completed Quotation PDF cleanup.

## Purpose

Bring the customer-facing Invoice PDF presentation to the approved Quotation customer-output baseline without changing Invoice data, financial authority, snapshots, lifecycle, or Payment behavior.

This is a rendering-only cleanup. Internal data remains stored and available to authorized internal application surfaces.

## Current Source Baseline

The current Invoice PDF route is `src/app/(dashboard)/invoices/[id]/pdf/page.tsx`. It:

- loads the persisted Invoice and its seller, buyer, Quotation, bank, and document-rule snapshots;
- renders `item.description` and the internal `item.details`;
- renders snapshot document notes and terms;
- renders a `Prepared By: System Generated | System generated document` footer;
- preserves the Draft watermark, Invoice number/type/status/dates, Deposit/Final behavior, line quantities and prices, VAT state, totals, Amount Paid, Balance Due, bank information, and Official Stamp; and
- renders Approved Quotation Total and Previous Invoices / Deposits when those persisted snapshot values are available.

The current source does not render a dedicated Event field or a customer-signature block. This cleanup must not invent either field. Stored event and snapshot data remain untouched, and any currently rendered event context must remain correct.

The approved Quotation PDF contract is the customer-output precedent: internal details, notes/terms, system-preparation wording, generated-document disclosure, and fake page-count text are absent while authoritative customer and financial content remains.

## User Story 1 — Clean Customer-Facing Invoice Output

As a G7 BLUE user producing a customer Invoice, I need the PDF to omit internal operational content and system/creator disclosures so that the customer receives only intentional business and financial information.

### Acceptance Scenarios

1. Given an Invoice snapshot containing `item.description` and `item.details`, when the PDF renders, then `item.description` remains visible and `item.details` is absent from rendered output.
2. Given snapshot document notes or terms, when the PDF renders, then neither notes nor terms appear in customer output.
3. Given the current system-preparation footer, when the PDF renders, then Prepared By, System Generated, and generated-document disclosure wording are absent.
4. Given the removed footer content, when the cleanup is implemented, then no employee, creator, account, username, or email identity replaces it.

## User Story 2 — Preserve Financial And Document Integrity

As a customer or internal reviewer, I need the cleaned Invoice PDF to preserve the same authoritative Invoice values and lifecycle presentation so that cleanup cannot alter financial meaning.

### Acceptance Scenarios

1. Deposit and Final Invoices retain their existing type-specific labels, settlement context, and calculations.
2. Draft Invoices retain the Draft watermark and current status presentation.
3. Quantity, unit price, discount, VAT state, subtotal, total, Amount Paid, Balance Due, and currency remain unchanged.
4. Seller, buyer, Invoice identity/dates, bank information, and existing customer-facing stamp/payment content remain intact.
5. Approved Quotation Total and Previous Invoices / Deposits remain unchanged where present in persisted snapshot data.

## Functional Requirements

- **FR-001**: The rendered Invoice PDF MUST continue to show customer-facing `item.description`.
- **FR-002**: The rendered Invoice PDF MUST NOT show internal `item.details`.
- **FR-003**: Removing `item.details` MUST NOT remove, rewrite, null, or mutate it in stored snapshots, mappers, queries, internal Invoice detail, or other internal surfaces.
- **FR-004**: The rendered Invoice PDF MUST NOT show snapshot document notes.
- **FR-005**: The rendered Invoice PDF MUST NOT show snapshot document terms.
- **FR-006**: The rendered Invoice PDF MUST NOT show Prepared By or System Generated blocks.
- **FR-007**: The rendered Invoice PDF MUST NOT show a generated-document disclosure sentence or equivalent footer wording.
- **FR-008**: The cleanup MUST NOT add employee, creator, account, username, email, or other audit identity to customer output.
- **FR-009**: Seller, buyer, Invoice number, Invoice type, status, and dates MUST retain current authoritative values.
- **FR-010**: Stored event context MUST remain unchanged. This cleanup does not add a new Event field.
- **FR-011**: Deposit and Final Invoice distinctions MUST remain unchanged.
- **FR-012**: Approved Quotation Total and Previous Invoices / Deposits MUST remain unchanged when present.
- **FR-013**: Quantity, unit price, discount, VAT state, subtotal, total, Amount Paid, Balance Due, and currency MUST remain unchanged.
- **FR-014**: While `vat_mode = not_registered`, Tax/VAT MUST remain displayed as not applied; no Tax Invoice, VAT 15%, VAT Number, ZATCA, FATOORA, QR, XML, or clearance behavior may be introduced.
- **FR-015**: Bank details and current intentionally customer-facing stamp and payment information MUST remain.
- **FR-016**: The Draft watermark and status presentation MUST remain.
- **FR-017**: Browser print MUST preserve A4 output, natural pagination, repeated table headers where currently supported, and non-splitting line-item rows.
- **FR-018**: Output MUST NOT add a blank trailing page, clipped totals, broken table rows, or fake page-count text.
- **FR-019**: The implementation MUST add a focused Invoice PDF source contract protecting removed and retained presentation.
- **FR-020**: Print CSS MAY change only when source inspection or manual Print Preview proves it is required for this bounded cleanup.
- **FR-021**: No Invoice source of truth, financial calculation, snapshot, creation action, RPC, issue workflow, lifecycle, ABS, or Payment behavior may change.

## Acceptance Criteria

1. Customer-facing Invoice `item.description` remains visible.
2. Internal `item.details` is absent from rendered Invoice PDF.
3. Internal notes and terms are absent from rendered Invoice PDF.
4. Prepared By and System Generated blocks are absent.
5. The generated-document footer sentence or equivalent disclosure is absent.
6. No employee or account identity is added.
7. Seller, buyer, stored event context, Invoice number, type, status, and dates remain correct; no new Event field is required by this cleanup.
8. Deposit and Final distinctions remain correct.
9. Approved Quotation Total and prior Invoice/Deposit context remain unchanged where applicable.
10. Subtotal, discount, VAT state, total, Amount Paid, and Balance Due remain unchanged.
11. Bank details and currently intended customer-facing authorization/signature/stamp areas remain intact; no missing signature area is invented.
12. Draft watermark remains.
13. A4 Print Preview works for normal and long fixtures.
14. No blank trailing page, clipped totals, broken table rows, or fake page-count text appears.
15. No source of truth, snapshot, lifecycle, RPC, schema, or Payment behavior changes.

## Document-Language Boundary

- Each Quotation or Invoice remains one authoritative financial record.
- Future Arabic and English outputs are alternative renderings of that same record.
- A future stored default rendering locale may choose an initial view but must not prevent either rendering.
- Financial values and historical snapshots must be identical across Arabic and English renderings.
- Stored customer, event, and item text must not be silently machine-translated. Explicit stored translations or a reviewed fallback are required.
- Side-by-side bilingual layout is a separate product decision and is not part of Feature 006.

## Explicit Exclusions

- Arabic or English document rendering implementation.
- `document_locale` or any document-language schema.
- Font files or font-package changes.
- Quotation source, tests, PDF, or presentation changes.
- Global Quotation eligible-Service selector.
- Global Invoice Service chooser.
- Invoice creation actions, Invoice RPCs, or financial authority changes.
- Invoice issue workflow changes.
- Payment actions, RPCs, balances, or status behavior.
- Approved Billing Scope behavior.
- Financial recomputation.
- VAT registration, Tax Invoice, or ZATCA/FATOORA implementation.
- Supplier AP, Vendor Bills, Supplier Credits, or Supplier Payments.
- Company Expenses, Event Costing, RFQ, Supplier Quote, or Purchase Order work.
- Service navigation or broader document redesign.
- Drag-and-drop template builders or arbitrary HTML/CSS editors.

## Evidence And Completion Boundary

Automated source-contract checks can verify retained and removed template content. Mozfer owns browser and Print Preview acceptance using normal and long Deposit/Final fixtures. Automated validation alone does not establish visual acceptance, production readiness, VAT readiness, ZATCA readiness, backup readiness, or accounting finality.
