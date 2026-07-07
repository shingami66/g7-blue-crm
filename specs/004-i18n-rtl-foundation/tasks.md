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
- Status: DONE
- Scope:
  - module-local modal RTL review
  - close icon position
  - action button ordering
  - form alignment
  - focus handling
  - portal / focus-trap / accessibility behavior
- Outcome:
  - overall result: `DEFER`
  - follow-up implementation task: `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`
  - no supplier-cost leakage or customer-facing internal cost exposure found
  - no Shell-1A or Shell-1B implementation mixed in
  - not a prerequisite blocker before Shell-1A or Shell-1B

### I18N-RTL-SHELL-1A

- Type: implementation
- Status: DONE
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
- Delivery note:
  - pushed in commit `3f627b1`
  - manual smoke passed with `G7_DEV_RTL=1`
  - no DB, cookie, or persistent runtime locale wiring introduced

### I18N-RTL-SHELL-1B

- Type: implementation
- Status: DONE
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
- Delivery note:
  - pushed in commit `7f4c19f`
  - manual smoke passed in RTL dev mode and LTR normal mode
  - page numbers remain ascending while prev/next presentation mirrors direction

### I18N-RTL-MODULE-TEXT-INVENTORY-1

- Type: readonly audit
- Status: DONE
- Purpose:
  - inventory visible module text before runtime rollout
  - split translation scope by module and screen
  - isolate RBAC-sensitive labels, operational terminology, and mixed-direction value surfaces
- Outcome:
  - readonly inventory completed
  - overall result: `PASS`
  - no files were changed by the inventory task
- Required before:
  - `ARABIC-COPY-REVIEW-1`
  - any module runtime translation pass
- Must record:
  - Customers as first rollout candidate
  - Services as second rollout candidate
  - Quotations list/detail non-PDF surfaces as third rollout candidate
  - Invoices list non-PDF surfaces as fourth rollout candidate
  - Payments as fifth rollout candidate
  - Suppliers as sixth rollout candidate
  - Settings/Admin as later rollout candidates
  - document/PDF language remains deferred
  - `document_locale` remains deferred
  - Customer `preferred_language` remains deferred
  - supplier/internal cost labels remain RBAC-sensitive
  - Service is the locked operational core; Booking terminology still needs care

### I18N-RTL-MODULES-1+

- Type: phased module implementation
- Status: BLOCKED until `I18N-RTL-MODULE-TEXT-INVENTORY-1` and `ARABIC-COPY-REVIEW-1` are complete

### DOCUMENT-LANGUAGE-SNAPSHOT-1

- Type: document architecture
- Status: BLOCKED until separately reviewed after Foundation-1

### ARABIC-COPY-REVIEW-1

- Type: product copy review
- Status: DONE
- Outcome:
  - completed as readonly Arabic copy/glossary review
  - overall result: `PASS`
  - no runtime code was implemented
- Notes:
  - customer-facing terminology, RBAC-sensitive wording, and mixed-direction copy rules were reviewed
  - `I18N-RTL-MODULE-TEXT-INVENTORY-1` remains the readonly source for module readiness
  - the next runtime module recommendation remains Customers, but only after docs are committed/pushed

### I18N-RTL-CUSTOMERS-RUNTIME-1
- Type: module runtime implementation
- Status: DONE
- Outcome:
  - Customers runtime implementation completed as the first runtime module slice after copy review
  - senior review result: `PASS`
  - manual smoke result: `PASS` based on Mozfer visual/browser smoke
  - Customers list LTR passed
  - Add Customer modal LTR passed
  - Customer profile LTR passed
  - Edit Profile modal LTR passed
  - Dev RTL shell visual smoke passed with minor non-blocking notes
  - no runtime Arabic locale selector was introduced
  - Arabic runtime labels remain not directly reachable because `getLocale()` still resolves to `en`
  - Customers dictionary was added as module-local runtime i18n dictionary
  - Customers runtime pages now use `getLocale()` + Customers dictionary
  - Revenue label was corrected: English `Quoted Value`, Arabic `قيمة العروض`
  - Customer statuses are dictionary-backed: Lead, Active, Inactive
  - mixed-direction protections were added for customer numbers, phone, email, CR/VAT, dates, service numbers, and SAR values
  - no PDF/document routes touched
  - no schema/migrations touched
  - no middleware/cookies touched
  - no `document_locale`
  - no Customer `preferred_language`
  - no shared UI refactor
  - no supplier/internal-cost leakage

### I18N-RTL-SERVICES-RUNTIME-1A
- Type: module runtime implementation
- Status: DONE
- Outcome:
  - Services runtime implementation completed as the next runtime module slice after copy review
  - senior review result: `PASS`
  - manual smoke result: `PASS` based on Mozfer visual/browser smoke
  - Services list passed
  - New Service form passed
  - Service detail passed
  - Edit Service form passed
  - RTL dev shell passed with minor non-blocking notes
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

### I18N-RTL-SERVICES-RUNTIME-1B
- Type: module runtime implementation
- Status: DONE
- Outcome:
  - Services billing/invoice action UI only
  - senior review initially HOLD due disabled reason mapping mismatch
  - FIX-1 aligned BillingPanel disabled reason mappings with real ServiceBillingState reason codes
  - focused re-review result: `PASS`
  - manual smoke result: `PASS` based on Mozfer visual/browser smoke
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

### I18N-RTL-SERVICES-RUNTIME-1C
- Type: module runtime implementation
- Status: DONE
- Outcome:
  - Services supplier allocation/booking display panels only
  - focused senior review result: `PASS`
  - manual smoke result: `PASS` based on Mozfer visual/browser smoke
  - Supplier Allocations panel passed
  - Supplier Bookings panel passed
  - cost/internal labels remained internal and permission-gated
  - SBK numbers, supplier names, SAR values, dates, quantities, units, and notes remained readable
  - RTL dev shell passed with minor non-blocking English-locale punctuation note
  - no supplier action files touched
  - no allocation subflows touched
  - no RBAC/permission/cost visibility logic changed
- no invoice/payment/quotation/PDF/document routes touched
- no schema/migrations touched
- no middleware/cookies touched
- no shared UI refactor touched
- AGENTS.md untouched

### I18N-RTL-SERVICES-RUNTIME-1D

- Type: module runtime implementation
- Status: DONE
- Scope:
  - `src/app/(dashboard)/services/[id]/SupplierAllocationStatusActions.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierBookingActions.tsx`
  - `src/lib/i18n/dictionaries/services.ts`
- Outcome:
  - supplier action buttons/modals only
  - focused senior review result: `PASS`
  - Mozfer manual/browser smoke result: `PASS`
  - supplier allocation action copy passed
  - supplier booking action copy passed
  - destructive/cancel wording remained explicit
  - server action message mapping stayed safe with fallback to original message for unmapped future errors
  - RTL shell smoke passed visually for the service detail supplier action area
  - no allocation subflow pages touched
  - no lib supplier allocation/booking action logic touched
- no RBAC/permission/DB/action behavior drift
- no cost leakage observed
- deferred navigation issue: `allocations/new` and browser back navigation do not show the global pending bolt; handle in a later `allocations/**` or navigation task

### I18N-RTL-SERVICES-RUNTIME-1E

- Type: module runtime implementation
- Status: DONE
- Scope:
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/SupplierAllocationCancelForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/SupplierAllocationDeleteForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/SupplierAllocationRestoreForm.tsx`
  - `src/lib/i18n/dictionaries/services.ts`
- Outcome:
  - Services allocation subflow runtime i18n only
  - focused senior review result: `PASS`
  - manual smoke result: `PASS` based on Mozfer visual/browser smoke
  - New/Create Allocation, Edit, Cancel, Delete, and Restore flows were localized
  - destructive cancel/delete wording remained explicit
  - restore wording remained clear and non-destructive
  - supplier names, service number/title, quantities, units, SAR values, IDs, and dates remained readable
  - pending-bolt route navigation from the prior task remained preserved
  - `Show Deleted` remains a local panel/filter toggle and does not show the global pending bolt by design
  - no navigation helper files changed
  - no lib supplier allocation action logic changed
  - no RBAC/permission/DB/server action behavior changed
  - no customer-facing PDF/document surfaces changed

### SERVICES-ALLOCATIONS-NAV-PENDING-BOLT-1

- Type: implementation
- Status: DONE
- Scope:
  - allocation subflow navigation pending-bolt wiring only
  - `src/components/ui/useGlobalNavigationPending.ts`
  - `src/components/ui/PendingLink.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/SupplierAllocationCancelForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/SupplierAllocationDeleteForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/SupplierAllocationRestoreForm.tsx`
- Outcome:
  - New Allocation link now shows the global centered pending bolt
  - Back to Service links now show the pending bolt
  - app-controlled cancel/back navigation now uses pending navigation
  - post-success navigation after create/edit/cancel/delete/restore now triggers the centered bolt
  - native browser back remains untouched by design
  - focused navigation review result: `PASS`
  - Mozfer manual/browser smoke result: `PASS`
  - no action logic drift
  - no permission/RBAC drift
  - no DB/server action drift
  - no i18n/copy drift
  - no cost/financial drift
  - previously deferred New Allocation/back navigation pending-bolt issue resolved

## Delivery Sequence Notes

- Start with the audit.
- Lock product decisions before any runtime foundation work.
- Keep Foundation-1 narrower than the shell/navigation RTL refactor.
- Split shell/navigation RTL from shared data-component RTL so each pass has a smaller blast radius.
- Require the shared overlays inventory before either shell implementation pass.
- Treat overlay hardening as a separate follow-up after the readonly review; do not mix it into shell or module rollout.
- Do not start the next runtime phase as broad "translate everything".
- Split module rollout into small controlled tasks after a readonly module text inventory and Arabic copy review.
- Keep document/PDF language work behind the document language model decision.
- Keep `document_locale` and Customer `preferred_language` out of Foundation-1.
- Keep supplier pending UX as a later separate slice.
### I18N-RTL-QUOTATIONS-RUNTIME-1A

- Type: module runtime implementation
- Status: DONE
- Scope:
  - quotations list page
  - list client/table/filter UI
  - New Quotation page
  - shared quotation form runtime i18n
- Outcome:
  - module-local quotations dictionary introduced
  - initial senior review returned HOLD because an `expired` status filter option was added
  - FIX-1 removed `expired` from selectable status filter options
  - final selectable status filter options remain exactly `all`, `draft`, `sent`, `approved`, and `rejected`
  - focused re-review result is `PASS`
  - Mozfer manual/browser smoke result is `PASS`
  - quotation numbers, service numbers, customer names, SAR values, dates, and statuses remained readable/LTR-safe
  - no quotation detail page implementation was intentionally included in this slice
  - no PDFs/document routes touched
  - no ZATCA/QR/XML/FATOORA touched
  - no quotation action/query logic changed
  - no RBAC/permission/service-gating/create-flow behavior changed
  - no totals/SAR calculation behavior changed
### I18N-RTL-INVOICES-RUNTIME-1A

- Type: module runtime implementation
- Status: DONE
- Scope:
  - invoices list route/runtime page
- Outcome:
  - module-local invoices dictionary introduced
  - route permission/error states localized
  - invoice list header/stats/table/filter/status labels localized
  - side panel/detail drawer labels and buttons localized
  - IssueInvoiceAction untouched
  - RecordPaymentModal untouched
  - PDF/document/ZATCA routes untouched
  - invoice actions/queries untouched
  - no RBAC/permission drift
  - no stats/calculation drift
  - no side-panel behavior drift
  - no route/link behavior drift
  - focused senior review initially returned HOLD for a glossary mismatch in `partial`
  - FIX-1 corrected `partial` from `مدفوعة جزئيًا` to `مدفوعة جزئياً`
  - re-review outcome is `PASS`
  - Mozfer manual/browser smoke result is `PASS`
  - invoice numbers, customer names, quotation refs, SAR values, dates, and statuses remained readable/LTR-safe
  - non-blocking UX follow-up: list feels crowded because it shows more than 10 rows at once; future pagination task suggested as `INVOICES-LIST-PAGINATION-10-1`
### I18N-RTL-QUOTATIONS-RUNTIME-1B

- Type: module runtime implementation
- Status: DONE
- Scope:
  - quotation detail runtime page
- Outcome:
  - module-local quotations dictionary reused and extended
  - focused senior review result is `PASS`
  - Mozfer manual/browser smoke result is `PASS`
  - detail page rendered correctly
  - financial summary rendered correctly
  - deposit invoice card rendered correctly
  - line items rendered correctly
  - print / save as PDF button/link remained visible and behavior-preserved
  - quotation numbers, invoice numbers, customer/service names, SAR values, dates, quantities, and statuses remained readable/LTR-safe
  - PDFs/document routes untouched
  - ZATCA/QR/XML/FATOORA untouched
  - quotation actions/queries untouched
  - no RBAC/permission drift
  - no finance/totals drift
  - no PDF link behavior drift
  - no deposit invoice behavior drift
