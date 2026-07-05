# Arabic / English i18n + RTL Foundation Tasks

## Task Scope Rules

- Keep this package specification-only.
- Do not implement runtime code from these tasks unless a later approved prompt explicitly allows it.
- Separate audit, decision lock, implementation, docs sync, commit, and push into separate controlled prompts.

## Task Cards

### I18N-RTL-FOUNDATION-AUDIT-1

- Type: readonly audit
- Status: DONE
- No code
- Output:
  - audit.md
  - hardcoded text inventory
  - hardcoded left/right inventory
  - Service / Quotation / Invoice / `invoice_type` status label inventory
  - SAR amounts / dates / document numbers rendering inventory
  - supplier cost / RBAC-sensitive label inventory
  - document / PDF language snapshot impact inventory
  - recommended implementation slices
  - risk and file-collision report

### I18N-P0-DECISIONS-LOCK-1

- Type: product / team decision
- Status: DONE
- Output:
  - document language model decision
  - numeral / date / currency formatting decision
  - split status glossary approval
  - Booking terminology decision
  - role rollout decision
  - Hijri deferral decision

### I18N-RTL-FOUNDATION-1

- Type: implementation
- Status: BLOCKED until the Foundation-1 prompt passes senior review
- Note:
  - Foundation-1 prompt must include `app_users.locale` and `company_settings.default_locale` as explicit, separately staged SQL-draft-only schema items following standard migration governance.
  - Runtime implementation remains not started.

### I18N-RTL-SHELL-1

- Type: implementation
- Status: BLOCKED until foundation completes

### I18N-RTL-MODULES-1+

- Type: phased module implementation
- Status: BLOCKED until shell is stable

### DOCUMENT-LANGUAGE-SNAPSHOT-1

- Type: document architecture
- Status: BLOCKED until document language model is decided

### ARABIC-COPY-REVIEW-1

- Type: product copy review
- Status: CAN START AFTER GLOSSARY INVENTORY
- No runtime code

## Delivery Sequence Notes

- Start with the audit.
- Lock product decisions before any runtime foundation work.
- Keep document/PDF language work behind the document language model decision.
- Keep supplier pending UX as a later separate slice.
