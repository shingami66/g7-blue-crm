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

- `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1`
- Readonly inventory of shared Modal/Dialog/Toast/Dropdown paths and ownership.

### P3

- `I18N-RTL-SHELL-1A`
- Navigation shell only:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Topbar.tsx`
  - `src/components/ui/PageHeader.tsx`
  - `src/app/(dashboard)/layout.tsx`
- Must not touch `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx`.
- Must use a temporary dev-only RTL verification method until real `app_users.locale` wiring is approved.
- Status:
  - completed and pushed in commit `3f627b1`
  - smoke passed with `G7_DEV_RTL=1`

### P4

- `I18N-RTL-SHELL-1B`
- Shared data components only:
  - `src/components/ui/DataTable.tsx`
  - `src/components/ui/PaginationFooter.tsx`
  - `src/components/ui/FilterBar.tsx`
- Must not touch `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx`.
- Page-number order stays ascending; only prev/next chevrons mirror direction.
- Status:
  - completed and pushed in commit `7f4c19f`
  - smoke passed in RTL dev mode and LTR normal mode

### P5

- `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1`
- Readonly review completed with overall result `DEFER`.
- Future hardening task remains separate:
  - `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`
- Accessibility hardening is not a blocker for Shell-1A or Shell-1B.

### P6

- `I18N-RTL-MODULE-TEXT-INVENTORY-1`
- Recommended next step:
  - readonly inventory of visible module text before runtime rollout
  - split text by module, screen, and sensitivity
  - record glossary/open-copy decisions needed for safe rollout

### P7

- `ARABIC-COPY-REVIEW-1`
- Required before module runtime translation.
- Arabic copy is not finally approved yet.

### P8

- Module-by-module rollout
  - Customers
  - Services
  - Quotations list/detail non-PDF surfaces
  - Invoices list non-PDF surfaces
  - Payments
  - Suppliers
  - Settings / Admin later

### P9

- Document / PDF language strategy and implementation
- `document_locale` remains deferred.
- Customer `preferred_language` remains deferred.

### P10

- Arabic copy glossary approval follow-through and later polish

### P11

- SMACC-inspired invoice / quotation UX polish after i18n foundation, not before

### P12

- `GLOBAL-PENDING-SUPPLIER-ALLOCATION-FORMS-1` remains a later medium-risk supplier UX slice

## Program Constraints

- Foundation-1 runtime implementation is complete only for the narrow helper/scaffolding scope above.
- This roadmap does not approve broader shell/module/document implementation by default.
- Shell-1A and Shell-1B must not perform broad bidi conversion, sweeping formatter changes, PDF/document bidi work, or module-level value-rendering refactors.
- The next runtime phase must not start as a broad "translate everything" pass.
- Module rollout must stay split into small controlled tasks.
- Recommended first runtime module after planning/copy review is Customers.
- Service remains the locked operational core entity; Booking terminology needs explicit care during copy review and rollout.
- Future implementation prompts must collect Tailwind compatibility evidence before refactor:
  - `package.json` Tailwind version
  - RTL-specific plugin presence/absence
  - Tailwind config context
  - global CSS context
  - existing logical utility usage and `dir=` / `[dir=` usage
- HOLD if logical utility support is uncertain; do not invent unsupported classes.
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
