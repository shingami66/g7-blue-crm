# I18N-RTL-FOUNDATION-AUDIT-1

- Result: PASS
- Repo HEAD audited: `691555b`
- Scope: readonly inspection only
- implementation_plan.md: absent

## A. Hardcoded Text Summary

- Root app shell and dashboard shell still contain hardcoded English UI text and labels.
- Sidebar, topbar, data tables, and pagination controls still use English copy.
- Status chips and shared filter controls remain English-first.

## B. Hardcoded LTR Layout Summary

- Root HTML language is hardcoded to `en`.
- No runtime `dir` switching was found.
- The dashboard shell, sidebar, topbar, tables, pagination, and service status timeline still assume left-to-right layout.

## C. Status Glossary Summary

- Service statuses: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- Quotation statuses: draft, sent, approved, rejected, expired.
- Invoice statuses: draft, sent, paid, partial, overdue, cancelled, voided.
- Payment statuses: pending, confirmed, failed, refunded.
- Supplier statuses: active, on_hold, blacklisted, inactive.
- Supplier allocation statuses: draft, planned, selected, cancelled.
- Supplier booking statuses: draft, cancelled.
- invoice_type values: deposit, final.

## D. Number / Date / Currency / Bidi Summary

- Payments and finance-related list pages use English labels plus locale-aware number/date formatting assumptions.
- No authenticated locale switch or bidi-safe formatting foundation was found in the app shell.
- SAR amounts, dates, and document numbers will need bidi isolation once RTL is introduced.

## E. Document / PDF Snapshot Impact

- Quotation and invoice PDF pages still hardcode LTR document layout decisions.
- Company settings and snapshot-based document rules are already part of the broader architecture, so RTL support must preserve snapshot semantics and historical document meaning.
- Document language changes must not alter old documents after locale/settings changes.

## F. RBAC-Sensitive Text

- Supplier allocation and supplier booking surfaces expose internal cost-sensitive language.
- Supplier and document modules already warn against customer-facing leakage of internal cost data.
- Localization must preserve those redactions and labels.

## G. Direction-Sensitive Components

- Sidebar navigation
- Topbar search / action layout
- Data tables
- Pagination controls
- Filter bar controls
- Service status timeline
- Quotation and invoice document PDFs

## H. Locale Architecture Findings

- No source of truth for app-level locale switching was found in the audited runtime surface.
- No cookie mirror / direction fallback was found.
- No `/ar` or `/en` URL segmentation is present or required for the current internal CRM direction.
- A locale foundation must preserve `app_users.locale` as the source of truth and avoid wrong-direction flash.

## I. Active Risk Hotspots

- Layout mirroring for authenticated shell components.
- Document/PDF bidi correctness.
- Number, currency, and date rendering in tables and documents.
- Supplier cost-sensitive text redaction.
- Status glossary consistency across service, quotation, invoice, payment, and supplier modules.

## J. P0 Decisions Still Open

- Document language model.
- Numeral, currency, date, and document-number formatting strategy.
- Split status glossary approval for service, quotation, invoice, and invoice_type values.

## K. Recommended Next Step

- Task: `I18N-P0-DECISIONS-LOCK-1`
- Reason: the audit confirms the shell is still LTR-first, the document layer still depends on snapshot rules, and the status glossary / formatting model must be locked before implementation.
