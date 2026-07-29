# Implementation Plan: Invoice PDF Customer Cleanup

**Feature**: `006-invoice-pdf-customer-cleanup`

**Date**: 2026-07-28

**Status**: **Implemented, independently reviewed, and owner-accepted; controlled commit/push remain separate**

## Summary

Perform one rendering-only cleanup of the existing browser-print Invoice PDF. Remove internal details, notes/terms, and system-preparation disclosures while protecting every authoritative financial value, persisted snapshot, Invoice type/status distinction, and intended customer-facing field.

## Technical Context

- Next.js 16 App Router server-rendered PDF/print route.
- Existing browser-native `window.print()` and A4 `@media print` behavior.
- Existing persisted Invoice snapshots are the document authority.
- Existing `company_settings.vat_mode = not_registered` behavior remains unchanged.
- No dependency, schema, migration, RPC, or Server Action change.

## Constitution Check

- PASS — Service remains the mandatory Invoice aggregate link.
- PASS — Client financial totals remain untrusted.
- PASS — `create_invoice_atomic`, Payment recording, ABS authority, and lifecycle behavior are untouched.
- PASS — Issued snapshots remain historical truth.
- PASS — Not-registered VAT restrictions remain unchanged.
- PASS — No Tax Invoice, VAT 15%, VAT Number, ZATCA, FATOORA, QR, XML, or clearance behavior is introduced.
- PASS — Customer output receives no employee/account identity.
- PASS — Arabic/English rendering remains future work over one authoritative record.

## Current Source Inspection

Primary source:

- `src/app/(dashboard)/invoices/[id]/pdf/page.tsx`

Current removal targets:

- the rendered `item.details` paragraph;
- `snapshot_document_rules.notes`;
- `snapshot_document_rules.terms`;
- the Prepared By/System Generated footer; and
- generated-document disclosure wording.

Current retention targets:

- `item.description`;
- Invoice number, type, status, dates, Draft watermark, and related Quotation identity;
- seller and buyer snapshot presentation;
- line quantity, unit price, VAT state, and totals;
- Approved Quotation Total and Previous Invoices / Deposits where available;
- subtotal, discount, total, Amount Paid, Balance Due, and currency;
- Deposit/Final settlement distinctions;
- bank details, payment instructions, and Official Stamp; and
- A4/natural-pagination behavior.

The source currently contains no dedicated Event field or customer-signature block. This cleanup preserves stored event data and existing output; it does not add either presentation.

## Future Implementation Manifest

The implementation task should authorize only:

- `src/app/(dashboard)/invoices/[id]/pdf/page.tsx`
- `src/lib/invoices/pdf-contract.test.ts`
- `src/app/globals.css` only if source review or Mozfer Print Preview proves a scoped print correction is necessary

If another source, test, style, snapshot, action, query, type, migration, or configuration file is required, the implementation task must HOLD and return for owner approval.

## Implementation Approach

1. Reconfirm the exact current Invoice PDF template and print styles.
2. Add a focused source contract modeled on the approved Quotation PDF contract.
3. Remove only the customer-rendering branches for internal details, notes/terms, and system-preparation/disclosure content.
4. Remove newly unused local rendering helpers/imports only when they are confined to the Invoice PDF file.
5. Preserve all retained-field expressions and snapshot access paths.
6. Change print CSS only if the removal produces a proven A4/pagination issue.
7. Run focused and standard runtime validation in the separately approved implementation task.
8. Hand normal/long Deposit and Final Print Preview smoke to Mozfer.

## Focused Contract Design

The future `src/lib/invoices/pdf-contract.test.ts` should:

- extract the final Invoice PDF render block without depending on fragile exact whitespace;
- assert absence of `item.details`, notes/terms rendering, Prepared By, System Generated, generated-document disclosure, and fake page-count text;
- assert presence of `item.description`, quantity, unit price, VAT not-applied behavior, financial totals, Amount Paid, Balance Due, Invoice type/status, Draft watermark, bank fields, and Official Stamp;
- assert the Invoice PDF remains snapshot-driven;
- assert no locale/document-locale implementation is introduced;
- protect A4, repeated-header, and non-splitting-row print rules when those rules apply to the Invoice template; and
- avoid asserting data mutations or behavior outside the PDF source.

## Validation Plan For The Future Implementation

- Focused Invoice PDF contract.
- Existing Invoice and i18n tests affected by the template.
- `pnpm lint`.
- `pnpm exec tsc --noEmit`.
- `pnpm build`.
- `git diff --check`.
- Exact file-manifest and empty-index checks.

No automated validation is a substitute for Mozfer-owned Print Preview smoke.

## Mozfer-Owned Manual Smoke

Use authorized DEV/DEMO fixtures only:

1. Draft Deposit Invoice with normal line count.
2. Issued/paid or partially paid Deposit Invoice where available.
3. Draft or issued Final Invoice with Approved Quotation Total and prior Invoice/Deposit context.
4. Long multi-row Invoice exercising page breaks.
5. Confirm removed internal/system content is absent.
6. Confirm retained fields and every displayed financial value match the Invoice detail/source record.
7. Confirm A4 output has no trailing blank page, clipped totals, split rows, or fake page count.

Do not claim this smoke until Mozfer supplies the observations.

## Stage Separation

Implementation, review, manual smoke, commit, and push are separate owner-approved tasks:

1. `G7-INVOICE-PDF-CUSTOMER-CLEANUP-IMPLEMENT-1`
2. `G7-INVOICE-PDF-CUSTOMER-CLEANUP-REVIEW-1`
3. `G7-INVOICE-PDF-CUSTOMER-CLEANUP-SMOKE-1`
4. `G7-INVOICE-PDF-CUSTOMER-CLEANUP-COMMIT-1`
5. `G7-INVOICE-PDF-CUSTOMER-CLEANUP-PUSH-1`

No stage authorizes the next.

## HOLD Conditions

- Any need to change financial authority, snapshots, actions, RPCs, lifecycle, Payments, ABS, schema, migrations, VAT mode, or document-language behavior.
- Any need to modify a file outside the future approved manifest.
- Any proposal to replace system wording with employee/account identity.
- Any retained financial field changes unexpectedly.
- Required automated validation fails.
- Mozfer Print Preview finds clipped, split, missing, or misleading customer output.

## Final Delivery Evidence

- The implemented rendering strategy uses strict historical snapshot classification: full quotation snapshots render Approved Quotation Items, active Service scope snapshots render Approved Service Scope, and synthetic or ambiguous shapes render Invoice-summary-only output.
- Persisted authoritative financial values remain the source for Deposit and Final summaries; no live Quotation lookup, financial reconstruction, or historical snapshot rewrite was introduced.
- The runtime, Invoice print CSS, and contract test remained within the bounded approved manifest. Remediation 9 strengthened exact custom-property case handling and same-rule `!important`/source-order resolution without changing runtime source.
- Automated evidence: focused contract 12/12, Invoice actions 38/38, related Invoice suites 64/64, lint with only two existing image warnings, typecheck pass, and production build pass with the known workspace warning.
- Independent review passed. Mozfer-owned repeat Print Preview accepted `INV-2026-0021` Deposit and `INV-2026-0022` Final as short one-page A4 documents with truthful item pricing and type-specific summaries.
- No database, schema, migration, RPC, action, VAT, lifecycle, ABS, Payment, snapshot-builder, or live Quotation lookup change was made. Production-readiness, VAT-readiness, ZATCA-readiness, backup-readiness, and accounting-finality remain unclaimed.

## Locked Future Eight-Commit Alignment

The documentation supports the following future commit boundaries without creating them in this DOCS_ONLY task:

1. `feat(invoices): render truthful customer PDF statements` — Invoice PDF page.
2. `style(invoices): fit customer PDFs to A4 print` — global print CSS.
3. `test(invoices): lock customer-safe PDF contracts` — Invoice contract test.
4. `docs(spec): close invoice PDF requirements` — `spec.md` and requirements checklist.
5. `docs(plan): record invoice PDF delivery evidence` — `plan.md` and `tasks.md`.
6. `docs(project): record invoice PDF acceptance` — `docs/project-status.md`.
7. `docs(roadmap): advance service-scoped entry flow` — `docs/project-roadmap.md`.
8. `docs(decisions): preserve post-PDF boundaries` — `docs/deferred-decisions.md`.

No commit hashes are invented, and no commit or push completion is claimed here.
