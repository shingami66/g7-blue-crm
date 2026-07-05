# Arabic / English i18n + RTL Acceptance Criteria

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
- document-language integrity smoke: `document_locale` persists at creation and never changes retroactively
- numeral-consistency smoke: financial/document values render Western digits in English and Arabic modes
- formatter safety smoke: `Intl.NumberFormat` / date formatter call sites are checked for `numberingSystem: 'latn'` or equivalent
- type/status separation smoke: no UI control mixes `invoice_type` and invoice status in one dropdown/filter/badge
- status display consistency smoke: StatusBadge and Timeline use canonical shared glossary terms with optional short/long variants
- existing invoice cancelled/voided translation does not imply business-logic approval

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
