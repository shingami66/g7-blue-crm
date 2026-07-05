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

### I18N-RTL-SHARED-OVERLAYS-INVENTORY-1

- Type: readonly audit
- Status: DONE
- Output:
  - readonly overlay inventory completed
  - no shared overlay primitive layer found under `src/components/ui` or `src/components/layout`
  - no shared `Dialog`, `Popover`, `AlertDialog`, `Sheet`, `Drawer`, `Tooltip`, `Toast`, or similar primitive found
  - no third-party overlay wrapper or overlay-specific UI dependency found
  - current overlays are hand-rolled module-local modal blocks
 - Shell-1A is not blocked by shared overlay primitives
 - module-local overlays remain important but are deferred to `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1`

### I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1

- Type: follow-up review
- Status: READY NEXT
- Scope:
  - module-local modal RTL review
  - close icon position
  - action button ordering
  - form alignment
  - focus handling
  - portal / focus-trap / accessibility behavior
 - no Shell-1A or Shell-1B implementation mixed in
 - not a prerequisite blocker before Shell-1A

### I18N-RTL-SHELL-1A

- Type: implementation
- Status: BLOCKED until `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` is complete
- Scope:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Topbar.tsx`
  - `src/components/ui/PageHeader.tsx`
  - `src/app/(dashboard)/layout.tsx`
- Purpose:
  - safer shell/navigation logical-direction refactor
  - smaller blast radius
  - independently validated and committed before shared data components
- Explicitly forbidden:
  - `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx`
  - shared data components reserved for `I18N-RTL-SHELL-1B`
  - Modal/Dialog/Toast/Dropdown runtime edits before the readonly inventory is reviewed

### I18N-RTL-SHELL-1B

- Type: implementation
- Status: BLOCKED until `I18N-RTL-SHELL-1A` is complete
- Scope:
  - `src/components/ui/DataTable.tsx`
  - `src/components/ui/PaginationFooter.tsx`
  - `src/components/ui/FilterBar.tsx`
- Purpose:
  - separate pass because these components affect many modules at once
  - Customers, Services, Quotations, Invoices, Payments, and Suppliers may all be impacted through shared list UI
- Explicitly forbidden:
  - `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx`
  - shell/navigation files already scoped to `I18N-RTL-SHELL-1A`
  - Modal/Dialog/Toast/Dropdown runtime edits before the readonly inventory is reviewed

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
- Split shell/navigation RTL from shared data-component RTL so each pass has a smaller blast radius.
- Require the shared overlays inventory before either shell implementation pass.
- Keep document/PDF language work behind the document language model decision.
- Keep `document_locale` and Customer `preferred_language` out of Foundation-1.
- Keep supplier pending UX as a later separate slice.
