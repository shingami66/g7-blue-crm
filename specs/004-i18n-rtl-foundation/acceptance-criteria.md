# Arabic / English i18n + RTL Acceptance Criteria

## Foundation-1 Completion Gate

- locale helpers exist for `en` / `ar`, including a safe parser and default `en` fallback
- root `html` `lang` / `dir` scaffolding exists and safely defaults to `en` / `ltr`
- English-only typed dictionary skeletons exist for common, navigation, statuses, document types, and RBAC-sensitive namespaces
- bidi isolation helper exists for mixed-direction values
- formatter helper exists and explicitly forces `numberingSystem: 'latn'`
- SQL draft exists for `app_users.locale` and `company_settings.default_locale`
- no migration file or live DB change is created in Foundation-1
- shared UI shell RTL refactor remains deferred to `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1`, `I18N-RTL-SHELL-1A`, and `I18N-RTL-SHELL-1B`
- document/PDF language implementation, `document_locale`, and Customer `preferred_language` remain deferred

## Shared Overlays Inventory

- `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` is complete as a readonly inventory
- no shared overlay primitives were found under `src/components/ui` or `src/components/layout`
- module-local overlays remain important but are deferred to `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1`
- `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1` is not a prerequisite blocker before Shell-1A
- future Shell-1A and Shell-1B remain focused on their approved files only

## Mode Smoke

- English mode smoke
- Arabic mode smoke
- RTL layout smoke

## Layout And Navigation

- sidebar right in Arabic
- breadcrumbs mirrored
- tables mirrored
- forms mirrored
- modals checked
- toasts checked
- dropdowns checked
- pagination checked
- `PageHeader` explicitly defines primary CTA logical position, back-button logical position, and breadcrumb behavior
- `PaginationFooter` mirrors prev/next chevrons only; page numbers remain ascending `1 2 3 ...`
- `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` remains untouched in Shell-1A and Shell-1B

## Verification Method

- Shell-1A and Shell-1B use a temporary manual/dev-only RTL verification method until real `app_users.locale` runtime wiring is approved
- the temporary verification method is non-persistent
- the temporary verification method does not write the database
- the temporary verification method does not use migrations
- the temporary verification method does not become source of truth
- the temporary verification method does not imply document locale support
- the temporary verification method is marked for removal after real locale wiring

## Module Rollout Gate

- `I18N-RTL-MODULE-TEXT-INVENTORY-1` is complete as a readonly inventory
- overall result is `PASS`
- no files were changed by the inventory task
- `ARABIC-COPY-REVIEW-1` is complete as a readonly Arabic copy/glossary review
- overall result is `PASS`
- the next runtime module recommendation remains Customers, but only after docs are committed/pushed
- `I18N-RTL-CUSTOMERS-RUNTIME-1` is complete as a Customers runtime module slice
- senior review result is `PASS`
- manual smoke result is `PASS` based on Mozfer visual/browser smoke
- Customers list LTR, Add Customer modal LTR, Customer profile LTR, Edit Profile modal LTR, and Dev RTL shell visual smoke all passed
- no runtime Arabic locale selector was introduced
- Arabic runtime labels remain not directly reachable because `getLocale()` still resolves to `en`
- Customers dictionary was added as module-local runtime i18n dictionary
- Customers runtime pages now use `getLocale()` + Customers dictionary
- Revenue label was corrected to `Quoted Value` in English and `قيمة العروض` in Arabic
- Customer statuses are dictionary-backed: Lead, Active, Inactive
- mixed-direction protections were added for customer numbers, phone, email, CR/VAT, dates, service numbers, and SAR values
- no PDF/document routes touched
- no schema/migrations touched
- no middleware/cookies touched
- no `document_locale`
- no Customer `preferred_language`
- no shared UI refactor
- no supplier/internal-cost leakage
- Shell-1A and Shell-1B are completed and pushed before module rollout begins
- `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1` is completed as readonly review with overall result `DEFER`
- overlay hardening is deferred to `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`
- the next runtime phase must not begin as a broad "translate everything" pass
- Arabic copy remains unapproved until `ARABIC-COPY-REVIEW-1` is completed
- `I18N-RTL-MODULE-TEXT-INVENTORY-1` completes before any module runtime translation
- module rollout is split into small tasks, not one broad implementation
- recommended rollout order starts with Customers, then Services, then Quotations non-PDF surfaces, then Invoices non-PDF surfaces, then Payments, then Suppliers, with Settings/Admin later
- document/PDF language remains deferred
- `document_locale` remains deferred
- Customer `preferred_language` remains deferred
- VAT, ZATCA, FATOORA, QR, XML, clearance, and cleared-status claims remain forbidden during module rollout
- supplier/internal cost labels remain RBAC-sensitive during all translation work
- Service remains the locked operational core; Booking terminology requires explicit copy review before broad rollout
- `I18N-RTL-SERVICES-RUNTIME-1A` is complete as a Services runtime module slice
- senior review result is `PASS`
- manual smoke result is `PASS` based on Mozfer visual/browser smoke
- Services list, New Service form, Service detail, Edit Service form, and RTL dev shell all passed
- no runtime Arabic locale selector was introduced
- Arabic runtime labels remain not directly reachable because `getLocale()` still resolves to `en`
- Services dictionary was added as module-local runtime i18n dictionary
- Services runtime pages now use `getLocale()` + Services dictionary
- Service status family is dictionary-backed: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled
- `status-transitions` copy moved to dictionary-backed copy without changing transition behavior
- mixed-direction protections were added for service numbers, quotation numbers, SAR values, dates/date ranges, and customer references
- no billing/invoice action files touched
- no supplier allocation/booking files touched
- no allocation subflows touched
- no PDF/document routes touched
- no schema/migrations touched
- no middleware/cookies touched
- no RBAC/shared UI refactor touched
- no supplier/internal-cost leakage
- minor follow-up: `EditServiceForm` subtitle may need future RTL polish because service number and localized subtitle should not force the whole sentence LTR; not a blocker after smoke
- `I18N-RTL-SERVICES-RUNTIME-1B` is complete as a Services billing/invoice action UI slice
- senior review initially held due disabled reason mapping mismatch
- FIX-1 aligned BillingPanel disabled reason mappings with real ServiceBillingState reason codes
- focused re-review result is `PASS`
- manual smoke result is `PASS` based on Mozfer visual/browser smoke
- Billing panel LTR passed
- Deposit/final invoice action UI passed or rendered unavailable states correctly
- disabled reason messages passed
- RTL dev shell billing panel passed with minor non-blocking English-locale punctuation note
- no invoice routes touched
- no PDF/document routes touched
- no supplier allocation/booking files touched
- no schema/migrations touched
- no middleware/cookies touched
- no RBAC or financial logic changed
- AGENTS.md untouched

## Shared Overlays Inventory

- `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` records exact Modal/Dialog/Toast/Dropdown paths before shell implementation
- each overlay path is classified as shared primitive, module-local component, or third-party wrapper
- overlay findings are either approved into a later RTL task or deferred to a named follow-up task

## Icon Rules

- directional icons mirrored only
- object icons not mirrored
- G7 logo not mirrored

## Mixed-Direction Data Safety

- numbers in Arabic remain visually safe
- dates in Arabic remain visually safe
- SAR amounts in Arabic remain visually safe
- document numbers in Arabic remain visually safe
- bidi isolation is applied where needed
- Shell-1A and Shell-1B preserve compatibility with Foundation-1 bidi/formatting helpers
- unsafe bidi call sites discovered during shell work are reported, not converted inline

## RBAC And Sensitive Labels

- Viewer role cannot see supplier costs in either language
- supplier/internal labels remain RBAC-safe

## Document Safety

- existing invoice PDF snapshot does not silently change meaning after locale/default changes
- historical documents do not silently change meaning after locale/settings changes
- document language reuses snapshot strategy once approved

## Status And Workflow Safety

- Cancelled Service status remains non-linear terminal state
- Service / Quotation / Invoice / `invoice_type` glossaries remain explicitly reviewed
- `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` remains a separate reviewed task because `Cancelled` must not be treated as a mirrored progress step
- document-language integrity smoke: `document_locale` persists at creation and never changes retroactively
- numeral-consistency smoke: financial/document values render Western digits in English and Arabic modes
- formatter safety smoke: `Intl.NumberFormat` / date formatter call sites are checked for `numberingSystem: 'latn'` or equivalent
- type/status separation smoke: no UI control mixes `invoice_type` and invoice status in one dropdown/filter/badge
- status display consistency smoke: StatusBadge and Timeline use canonical shared glossary terms with optional short/long variants
- existing invoice cancelled/voided translation does not imply business-logic approval

## Future Report Evidence

- future implementation reports list changed files
- future implementation reports state forbidden files touched: `NONE`
- future implementation reports state actual `ServiceStatusTimeline` path touched: `NONE`
- future implementation reports list Modal/Dialog/Toast/Dropdown touched or `NONE`
- future implementation reports state PDF/document/schema/migration touched: `NONE`
- future implementation reports include Tailwind compatibility evidence
- future implementation reports include the RTL verification method used
- future implementation reports confirm the verification method is dev-only and non-persistent
- future implementation reports confirm the temporary verification method is marked for removal after real locale wiring
- future implementation reports include validation outputs
- future implementation reports state whether the covered sub-pass was `Shell-1A` or `Shell-1B`

## Compliance And Claim Safety

- no fake VAT claims
- no fake ZATCA claims
- no fake FATOORA claims
- no fake QR claims
- no fake XML claims
- no fake clearance claims
- no fake cleared claims

## SMACC / ERP Reference Guard

- SMACC / warehouse ERP is used as UX inspiration only
- warehouse code is not copied unless separately approved
- salesman code is not copied unless separately approved
- item code is not copied unless separately approved
- loyalty card is not copied unless separately approved
- promotions are not copied unless separately approved
- cleared status is not copied unless real support exists
