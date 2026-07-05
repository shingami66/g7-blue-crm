# Arabic / English i18n + RTL Foundation Tasks

## Task Scope Rules

- Keep audit, decision lock, foundation implementation, shell refactor, module rollout, document-language work, docs sync, commit, and push in separate controlled prompts.
- Runtime code is approved only for the closed Foundation-1 scope recorded below; broader shell/module/document work remains separate.
- Separate SQL drafts from migration files and live DB changes.

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
- Status: DONE
- Note:
  - Senior-reviewed Foundation-1 prompt was executed as a narrow additive slice only.
  - Scope delivered: locale helpers, root `lang` / `dir` scaffolding, English-only dictionary skeletons, bidi/formatting helpers, docs sync, and SQL-draft-only planning for `app_users.locale` and `company_settings.default_locale`.
  - Shared UI shell refactor, module translation, document/PDF language work, `document_locale`, and Customer `preferred_language` remain deferred.
  - No migration file, Supabase apply, or live DB change was created.

### I18N-RTL-SHELL-1

- Type: implementation
- Status: READY NEXT

### I18N-RTL-MODULES-1+

- Type: phased module implementation
- Status: BLOCKED until shell is stable

### DOCUMENT-LANGUAGE-SNAPSHOT-1

- Type: document architecture
- Status: BLOCKED until separately reviewed after Foundation-1

### ARABIC-COPY-REVIEW-1

- Type: product copy review
- Status: CAN START AFTER GLOSSARY INVENTORY
- No runtime code

## Delivery Sequence Notes

- Start with the audit.
- Lock product decisions before any runtime foundation work.
- Keep Foundation-1 narrower than the shell/navigation RTL refactor.
- Keep document/PDF language work behind the document language model decision.
- Keep `document_locale` and Customer `preferred_language` out of Foundation-1.
- Keep supplier pending UX as a later separate slice.
