# Specification Requirements Checklist: Invoice PDF Customer Cleanup

**Feature**: `006-invoice-pdf-customer-cleanup`

**Purpose**: Verify that the completed implementation and acceptance evidence remain bounded, testable, and faithful to current source. Checked items record the evidence available, including commit and push completion.

## Scope And Authority

- [x] Customer-facing rendering cleanup is the only implementation scope.
- [x] Invoice source of truth, snapshots, financial calculations, lifecycle, actions, RPCs, ABS, and Payments are explicitly protected.
- [x] Service remains the mandatory Invoice linkage.
- [x] Global Quotation and Invoice entry work is excluded.
- [x] The future implementation manifest is bounded and defines a HOLD on expansion.

## Removed Customer Output

- [x] Internal `item.details` is removed from rendering only.
- [x] Internal document notes and terms are removed from customer output.
- [x] Prepared By and System Generated presentation is removed.
- [x] Generated-document disclosure wording is removed.
- [x] Employee, creator, account, username, and email identity are prohibited as replacements.

## Retained Customer Output

- [x] `item.description` remains customer-facing.
- [x] Seller, buyer, Invoice number/type/status/dates, and stored event context are protected.
- [x] Deposit and Final behavior is protected.
- [x] Approved Quotation Total and prior Invoice/Deposit context are protected where available.
- [x] Quantity, unit price, discount, VAT state, subtotal, total, Amount Paid, Balance Due, and currency are protected.
- [x] Bank/payment information, current stamp presentation, and Draft watermark are protected.
- [x] A4 normal/long pagination criteria are explicit.

## VAT And Compliance

- [x] Current `vat_mode = not_registered` behavior remains not applied.
- [x] Tax Invoice, VAT 15%, VAT Number, ZATCA, FATOORA, QR, XML, and clearance work are excluded.
- [x] No production-readiness, VAT-readiness, ZATCA-readiness, backup-readiness, or accounting-finality claim is made.

## Document Language

- [x] One authoritative financial record may later render in Arabic or English.
- [x] A future default rendering locale does not become an exclusive document language.
- [x] Financial data and historical snapshots remain identical across renderings.
- [x] Silent machine translation of stored business text is prohibited.
- [x] Side-by-side bilingual layout remains a separate future decision.
- [x] Feature 006 implements no language, locale-schema, or font behavior.

## Verification And Stage Separation

- [x] A focused Invoice PDF contract is required.
- [x] Removed and retained source-contract assertions are specified.
- [x] Standard runtime validation passed for the completed implementation.
- [x] Mozfer owns normal and long Print Preview smoke; supplied evidence covers the accepted short Deposit and Final examples only.
- [x] Implementation, review, smoke, commit, and push were separate tasks and are now complete.
- [x] No unchecked implementation task is represented as complete.

## Checklist Result

**IMPLEMENTATION EVIDENCE CHECKLIST: PASS WITH LIMITS**

Feature 006 implementation, independent review, the accepted short Print Preview examples, controlled commit, and controlled push are recorded. Long-fixture smoke remains a separate boundary.
