# Arabic / English i18n + RTL Decisions

## Review Verdict

- Verdict: APPROVED WITH CHANGES
- `I18N-RTL-FOUNDATION-AUDIT-1`: READY as readonly work
- `I18N-RTL-FOUNDATION-1`: BLOCKED until audit output, P0 decisions, and review gate are complete

## P0 Gates Before `I18N-RTL-FOUNDATION-1`

### 1. Document Language Model

Decision required:

- single-language document
- bilingual Arabic + English side-by-side document

This must be decided before document-facing implementation because layout, snapshot payload, and legal/business wording depend on it.

### 2. Numeral / Date / Currency / Document-Number Formatting

Decision required:

- Western digits vs Arabic-Indic digits
- SAR amount rendering rules
- date rendering rules
- document number rendering rules

Constraints:

- SAR amounts, dates, and document numbers must remain visually safe in RTL
- bidi isolation is required

### 3. Split Status Glossary

Decision required for distinct business vocabularies:

- Service statuses
- Quotation statuses
- Invoice statuses
- `invoice_type` values: deposit / final

Constraint:

- Preserve Service `Cancelled` as a non-linear terminal state, not a mirrored progress step

## P1 Decisions

### 1. Booking Terminology

Confirm whether Booking is approved as a secondary label for Service or should be removed from user-facing language.

### 2. Arabic Rollout Order By Role

Confirm whether rollout starts with all roles together or a narrower role sequence first.

### 3. Company Settings Name Reuse

Reuse existing Company Settings Arabic / English company name fields rather than inventing parallel naming sources.

### 4. Hijri Calendar

Hijri support is explicitly deferred unless later approved.

## Recommended, Pending Approval

- `app_users.locale` should be the locale source of truth
- cookie mirror should exist only to prevent wrong-direction flash
- no `/ar` or `/en` URL segmentation should be used for the internal authenticated CRM
- `company_settings.default_locale` should seed first login only and must not override explicit user preference
- use a temporary manual/dev-only RTL verification method until real `app_users.locale` wiring is approved and implemented

## Explicit Non-Decisions

This package does not approve:

- final Arabic terminology
- document language output
- runtime implementation
- fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared claims

## P0 Decisions - LOCKED

- Team Lead verdict: APPROVED WITH CHANGES.
- Changes are incorporated in this decision lock.
- This locks product and architecture decisions only.
- It does not approve runtime implementation or final Arabic terminology.

### Decision 1: Document Language Model

- Single-language per document for MVP.
- Bilingual side-by-side Arabic + English is deferred, not rejected.
- `document_locale` is captured explicitly at document creation time, via create-form choice or Customer `preferred_language`.
- `document_locale` is NEVER inherited from the creator's UI session locale.
- Document language must be snapshot-safe.
- Reuse the existing snapshot mechanism, including seller `legalNameEn` / `legalNameAr` where available.
- Historical documents remain immutable once issued and must not silently change meaning after locale/settings changes.

### Decision 2: Numeral / Date / Currency / Document-Number Formatting

- Western digits `0-9` are permanent for all documents/PDFs, not MVP-only.
- Arabic-Indic digits must not be used in documents/PDFs.
- Arabic-Indic digits may be reconsidered later only as a UI cosmetic preference, never for documents/PDFs.
- All locale-aware number/date formatters must explicitly force `numberingSystem: 'latn'` or equivalent.
- Do not rely on `ar-SA` formatter defaults.
- Bidi isolation is required for SAR amounts, balances, totals, dates, document numbers, quotation numbers, invoice numbers, payment numbers, service numbers, phone numbers, CR/VAT numbers, IBAN, bank details, percentages, and VAT/tax values wherever they render inside RTL text.

### Decision 3: Split Status Glossary

- Keep separate glossaries for:
  - Service statuses
  - Quotation statuses
  - Invoice statuses
  - Payment statuses
  - Supplier statuses
  - Supplier allocation statuses
  - Supplier booking statuses
- Do not merge all statuses into one generic dictionary.
- `invoice_type` values `deposit` / `final` are document-type labels, filed separately from the invoice status glossary.
- `invoice_type` is not a lifecycle status.
- Service `Cancelled` remains a non-linear terminal state, never a mirrored progress step.
- StatusBadge and Timeline components must share one canonical term per status, with optional short/long display variants.
- Do not independently translate StatusBadge and Timeline into separate meanings.
- This decision approves glossary structure only.
- Final Arabic wording is not approved by this task.
- Existing invoice cancelled/voided split is translated as-is under this decision.
- Business-logic correctness of the cancelled/voided distinction is out of scope for this i18n decision and remains flagged separately.

### Decision 4: Shell-1 Planning Boundary

- Split the previous single shell implementation idea into two sequential tasks:
  - `I18N-RTL-SHELL-1A` for navigation shell only
  - `I18N-RTL-SHELL-1B` for shared data components only
- `I18N-RTL-SHELL-1A` scope:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Topbar.tsx`
  - `src/components/ui/PageHeader.tsx`
  - `src/app/(dashboard)/layout.tsx`
- `I18N-RTL-SHELL-1B` scope:
  - `src/components/ui/DataTable.tsx`
  - `src/components/ui/PaginationFooter.tsx`
  - `src/components/ui/FilterBar.tsx`
- `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` is explicitly forbidden for Shell-1A and Shell-1B.
- Reason:
  - `Cancelled` is a non-linear terminal state
  - timeline/status-machine visual logic requires a separate reviewed task

### Decision 5: Shared Overlays Prerequisite

- Add `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1` before Shell-1A or Shell-1B implementation.
- This task is readonly only.
- It must inventory shared Modal/Dialog/Toast/Dropdown components, record exact file paths, and classify each path as shared primitive, module-local component, or third-party wrapper.

### Decision 6: Temporary RTL Verification Method

- Use a temporary manual/dev-only RTL verification method until real `app_users.locale` runtime wiring is approved and implemented.
- The temporary verification method:
  - must not write the database
  - must not use migrations
  - must not use cookie/runtime persistence as a source of truth
  - must not be exposed to real users
  - must be clearly temporary
  - must be marked for removal after real `app_users.locale` wiring
  - must not affect document language
  - must not imply document locale support

### Decision 7: Tailwind Compatibility Evidence

- Future implementation prompts must collect:
  - `package.json` Tailwind version
  - presence/absence of RTL-specific Tailwind plugins such as `tailwindcss-rtl`
  - Tailwind config context
  - global CSS context
  - existing logical utility usage, if any:
    - `ms-`
    - `me-`
    - `ps-`
    - `pe-`
    - `text-start`
    - `text-end`
    - `border-s-`
    - `border-e-`
  - existing `dir=` or `[dir=` usage
- HOLD if logical utility support is uncertain.
- Do not invent unsupported classes.
- Check for lighter `[dir=\"rtl\"]` fallback patterns before proposing Tailwind upgrade work.

### Decision 8: Bidi Scope Boundary

- Shell-1A and Shell-1B must not perform broad bidi conversion.
- Allowed:
  - preserve compatibility with Foundation-1 bidi/formatting helpers
  - avoid introducing new hardcoded left/right assumptions
  - use direction-aware layout patterns in approved shared components
- Forbidden:
  - broad conversion of number/date/SAR/document-number call sites
  - sweeping formatter changes
  - PDF/document bidi work
  - financial/document rendering changes
  - module-level value-rendering changes
- If unsafe bidi call sites are discovered:
  - report them as findings
  - do not fix them inline
  - recommend a separate follow-up task

### Decision 9: Pagination And PageHeader Direction Rules

- Shell-1B pagination rule:
  - prev/next chevrons mirror direction
  - page-number sequence stays ascending numeric order
  - do not reverse `1 2 3 ... 10`
- Shell-1A PageHeader rule:
  - explicitly define primary CTA logical position
  - explicitly define back-button logical position
  - explicitly define breadcrumb direction behavior
  - English/LTR visual behavior must remain unchanged
  - Arabic/RTL behavior must be manually smoke-tested through the temporary dev-only RTL method

### Decision 10: Future Codex Report Evidence

- Future implementation reports must include:
  - changed files
  - forbidden files touched: `NONE`
  - actual `ServiceStatusTimeline` path touched: `NONE`
  - Modal/Dialog/Toast/Dropdown touched: `[list or NONE]`
  - PDF/document/schema/migration touched: `NONE`
  - Tailwind compatibility evidence
  - RTL verification method used
  - confirmation that the verification method is dev-only and non-persistent
  - confirmation that the temporary verification method is marked for removal after real locale wiring
  - validation outputs
  - sub-pass covered: `Shell-1A` or `Shell-1B`

### Still Deferred / Not Approved

- Final Arabic terminology.
- Runtime implementation.
- Bilingual side-by-side documents.
- Hijri calendar.
- Full document/PDF redesign.
- SMACC-inspired invoice/quotation UX polish.
- Fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared claims.
- Tax Invoice / VAT 15% unless company settings prove VAT registration.
