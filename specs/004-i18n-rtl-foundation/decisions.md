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

### Still Deferred / Not Approved

- Final Arabic terminology.
- Runtime implementation.
- Bilingual side-by-side documents.
- Hijri calendar.
- Full document/PDF redesign.
- SMACC-inspired invoice/quotation UX polish.
- Fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared claims.
- Tax Invoice / VAT 15% unless company settings prove VAT registration.
