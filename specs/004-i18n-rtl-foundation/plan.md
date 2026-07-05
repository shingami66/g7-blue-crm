# Arabic / English i18n + RTL Foundation Plan

## Delivery Roadmap

### P0

- `I18N-RTL-FOUNDATION-AUDIT-1`
- Resolve P0 decisions:
  - document language model
  - numeral/date/currency/document-number formatting
  - split status glossary

### P1

- `I18N-RTL-FOUNDATION-1`
- Complete:
  - locale type + parser + default locale foundation
  - direction helpers and root `html` `lang` / `dir` scaffolding
  - English-only dictionary skeletons
  - bidi isolation and `numberingSystem: 'latn'` formatting helpers
  - SQL-draft-only planning for `app_users.locale` and `company_settings.default_locale`

### P2

- Shell/navigation RTL and shared UI translation
- This remains the next separate task (`I18N-RTL-SHELL-1`).
- It must not be collapsed back into Foundation-1.

### P3

- Module-by-module translation
  - Customers
  - Services
  - Quotations
  - Invoices
  - Payments
  - Suppliers
  - Settings
  - Users / RBAC

### P4

- Document / PDF language strategy and implementation

### P5

- Arabic copy review and glossary approval

### P6

- SMACC-inspired invoice / quotation UX polish after i18n foundation, not before

### P7

- `GLOBAL-PENDING-SUPPLIER-ALLOCATION-FORMS-1` remains a later medium-risk supplier UX slice

## Program Constraints

- Foundation-1 runtime implementation is complete only for the narrow helper/scaffolding scope above.
- This roadmap does not approve broader shell/module/document implementation by default.
- Arabic / English support must be real direction-aware behavior, not literal translation only.
- Historical document meaning must not silently change.
- Supplier/internal cost must never leak to customer outputs.
- RBAC must remain intact.
- No fake Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, or cleared claims.

## Acceptance Criteria

- English mode smoke is defined.
- Arabic mode smoke is defined.
- RTL layout smoke is defined.
- Sidebar is on the right in Arabic.
- Breadcrumbs are mirrored correctly.
- Tables are mirrored correctly.
- Forms are mirrored correctly.
- Modals, toasts, and dropdowns are checked.
- Directional icons are mirrored only when appropriate.
- Object icons are not mirrored.
- G7 logo is not mirrored.
- Numbers, dates, SAR amounts, and document numbers remain LTR or bidi-isolated when needed in Arabic mode.
- Viewer role cannot see supplier costs in either language.
- Existing invoice PDF snapshot meaning does not silently change after locale/default changes.
- Cancelled Service status remains a non-linear terminal state.
- No fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared claims are introduced.
