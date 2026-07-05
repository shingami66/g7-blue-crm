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
