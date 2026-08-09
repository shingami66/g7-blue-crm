# Customer Document System — POST-G1 Task 4

Status: `ARCHITECTURE CORRECTED / CONTROLLER REVIEW` (9 August 2026)

## Canonical document contract

- Each quotation and invoice is one canonical business document with one document ID and one document number.
- Arabic and English are controlled human-readable representations of that same quotation or invoice; they are never separate records or revisions.
- Preview/print language is selected transiently with `?lang=ar` or `?lang=en`. It is not stored as document authority and does not change financial data.
- UI locale and output language are independent. Changing the employee UI locale cannot mutate a document, create a revision, create an invoice, change numbering, or force print language.
- Rendering may change labels, headings, direction, date/number presentation, and layout only. Financial values, quantities, prices, VAT, totals, approved scope, settlement metadata, document identity, and snapshot meaning remain unchanged.

## Current representation behavior

- Quotation, deposit invoice, and final invoice preview/print surfaces provide deliberate Arabic/English selection.
- Arabic uses RTL layout with bidi-safe LTR boundaries for identifiers, amounts, quantities, dates, account numbers, and IBANs.
- Quotation seller terms are customer-facing when present and render from `snapshot_seller.terms` with localized `Terms & Conditions` / `الشروط والأحكام` headings. The stored terms body is rendered exactly as stored; it is not auto-translated.
- Customer-safe output excludes internal details, supplier notes, cost data, private comments, and unrelated operational rule notes.
- Existing customer-entered descriptions remain rendered as stored. Selecting Arabic does not claim to translate an English description, and no automatic translation occurs during print.
- A4 sizing, repeated table headings, non-splitting rows where practical, normal-flow signatures/terms, and continuation-page identity remain preserved. Fake `Page X of Y` output is not implemented.

## Content capability and handoff

- Required capability: customer-facing business content must ultimately support stored English and Arabic forms, while internal details remain operational/internal and never print.
- Schema placement is intentionally deferred specifically one workstream to the **Quotation Commercial Model Impact Check**. That workstream must decide whether bilingual names/descriptions belong to Commercial Group, Package, Item, or more than one level before permanent fields or snapshot propagation are implemented.
- The Commercial Model Impact Check must also resolve customer visibility, approved-snapshot placement, Package/Itemized printing, missing-language handling, and legacy single-description readability.
- Future AI translation is document-only: generate a draft, require staff review/edit and explicit save/approval, then render approved stored text. It is not implemented here and must never silently alter approved or sent documents.

## Financial and compliance boundary

- G1 authority is unchanged: approved quotation authority remains immutable; active Approved Billing Scope remains invoice-scope authority; deposit and final amounts remain settlement metadata and do not become service prices.
- Arabic and English representations show equivalent financial truth and the same approved service scope.
- Human presentation language remains separate from canonical invoice data and any future ZATCA structured/compliance representation. ZATCA, QR, XML, clearance, and government integration are not implemented.

## Review and acceptance state

- The corrected implementation remains unstaged and uncommitted for controller review.
- The previous unapplied `document_locale` migration draft is removed from this Task 4 diff; no migration is applied and no database write is authorized.
- Automated focused/full validation and delegated review are engineering evidence only. Real quotation/deposit/final document creation, browser, English/Arabic, RTL, responsive/mobile, visual, print, and workflow acceptance remain pending.
