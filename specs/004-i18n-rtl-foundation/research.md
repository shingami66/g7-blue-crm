# Arabic / English i18n + RTL Research

## Locale Strategy Options

### Option A: `app_users.locale`

- Pros:
  - role-aware internal CRM source of truth
  - stable across devices and sessions
  - fits authenticated user model
- Cons:
  - first-render direction can flash incorrectly if only loaded server-side after request start

### Option B: Cookie mirror

- Pros:
  - prevents wrong-direction flash before authenticated user data is loaded
  - useful for SSR direction and early HTML attributes
- Cons:
  - should not become the authoritative locale store
  - can drift if not mirrored from the real source of truth

### Option C: `company_settings.default_locale`

- Pros:
  - can seed a sensible first-time default
  - useful for organization-level onboarding
- Cons:
  - unsafe as a persistent override for individual user preference
  - could silently change user experience if edited centrally

### Option D: URL segmentation (`/ar`, `/en`)

- Pros:
  - common in public sites
  - explicit route-based locale
- Cons:
  - poor fit for an internal authenticated CRM
  - increases route complexity
  - multiplies navigation/testing burden
  - can complicate deep internal links

### Option E: Browser preference

- Pros:
  - useful as a first-run hint
- Cons:
  - weak for internal business workflows
  - can conflict with explicit product terminology and team rollout decisions

## Recommended Locale Strategy

- Use `app_users.locale` as the source of truth.
- Use a cookie mirror only to prevent wrong-direction flash.
- Do not use `/ar` or `/en` URL segmentation for this internal authenticated CRM.
- Use `company_settings.default_locale` only to seed first login and never to override an explicit user preference.
- Browser preference may inform first-run defaults only if it does not override the product decision.

## RTL Strategy

- Prefer CSS logical properties and logical utility classes over hardcoded left/right rules.
- Mirror directional icons only.
- Never mirror object icons such as:
  - document
  - calendar
  - money
  - print
  - G7 logo
- Cover all shared UI surfaces:
  - sidebar
  - tables
  - breadcrumbs
  - forms
  - buttons
  - modals
  - toasts
  - dropdowns
  - pagination
- Apply bidi isolation to:
  - numbers
  - SAR amounts
  - dates
  - document numbers

## Dictionary Strategy Research

- Common dictionary:
  - shared shell text
  - navigation labels
  - generic actions and states
- Module dictionary:
  - Customers
  - Services
  - Quotations
  - Invoices
  - Payments
  - Suppliers
  - Settings
  - Users / RBAC
- Document dictionary:
  - printed and customer-facing document labels
  - document metadata labels
  - totals and tax wording
- RBAC-sensitive dictionary:
  - supplier cost/internal labels
  - operational-only or finance-only wording
  - strings that must not appear in customer-facing surfaces

## Document / PDF Language Research

- Document language should reuse the existing snapshot model.
- Historical documents must not silently change meaning after locale/default changes.
- Language choice for a generated document must be tied to an approved document-language decision, not live UI state alone.
- The company remains not VAT registered unless settings prove otherwise.
- Do not introduce fake Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, or cleared claims while planning localization.

## SMACC / Warehouse ERP Reference

- Treat SMACC / warehouse ERP as inspiration only.
- Useful inspiration:
  - list/manage tabs
  - result count beside List
  - search/filter area
  - page size controls
  - go-to-page controls
  - View eye icon
  - Print/PDF icon
  - invoice/detail split between metadata, line items, and totals
- Do not copy inventory-only concepts:
  - warehouse code
  - salesman code
  - item code
  - loyalty card
  - promotions
  - cleared status
