# Arabic / English i18n + RTL Foundation Spec

## Purpose

Define the specification and delivery gates for the G7 BLUE CRM Arabic / English internationalization and RTL program before any runtime implementation begins.

This program is not simple text replacement. It changes layout direction, mirrored navigation behavior, dictionary ownership, document language behavior, and the safety rules for mixed-direction business data such as amounts, dates, and document numbers.

## Problem Statement

The CRM currently behaves as a single-language LTR application. Team Lead review approved the direction with changes, which means a readonly audit can begin, but the foundation implementation is blocked until product and formatting decisions are locked.

Without a dedicated spec package, implementation work could drift into:

- literal translation without real RTL layout handling
- broken mixed-direction rendering for SAR amounts, dates, and document numbers
- inconsistent terminology across Service, Quotation, Invoice, and Payment surfaces
- silent document meaning changes after locale or settings changes
- accidental leakage of supplier/internal labels into customer-facing outputs
- fake VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared-status implications

## Goals

- Define the Arabic / English i18n + RTL program scope.
- Preserve the locked CRM flow: Customer Profile -> Service / Booking -> Quotation -> Invoice -> Payment.
- State that English mode is LTR and Arabic mode is RTL.
- Capture the business and safety constraints that must hold across UI and documents.
- Separate readonly audit work from implementation work.
- Capture the Team Lead review gates before implementation.
- Define the roadmap phases for audit, decisions, foundation, module rollout, document strategy, copy review, and later UX polish.

## Non-Goals

- No runtime implementation in this spec package.
- No app translation in this spec package.
- No layout code changes.
- No document/PDF redesign yet.
- No SMACC or warehouse ERP clone.
- No SQL, migration, schema, or package changes.
- No Hijri calendar support unless approved later.
- No VAT, ZATCA, FATOORA, QR, XML, clearance, or cleared-status behavior.

## Core Direction

- Arabic is not simple text replacement.
- English mode is LTR.
- Arabic mode is RTL.
- Language direction must affect navigation, forms, tables, breadcrumbs, pagination, modals, toasts, dropdowns, and document-facing UI.
- Numbers, SAR amounts, dates, VAT labels, and document numbers must remain visually safe in RTL.

## Business Constraints

- Service remains the operational core.
- Quotations, invoices, and payments remain Service-linked.
- RBAC must remain intact.
- Supplier/internal cost must never leak to customer outputs.
- Historical document meaning must not silently change after locale or settings changes.
- Customer-facing documents must preserve snapshot behavior.
- Do not claim fake Tax Invoice, VAT 15%, VAT Number, ZATCA, FATOORA, QR, XML, clearance, or cleared support.
- Company is currently not VAT registered unless settings prove otherwise.

## Team Lead Review Gate

- Verdict: APPROVED WITH CHANGES.
- `I18N-RTL-FOUNDATION-AUDIT-1` is safe to start as readonly work.
- `I18N-RTL-FOUNDATION-1` is blocked until audit output exists and P0 decisions are locked.
- Arabic terminology is not approved by this package.

## Primary Deliverables From This Package

- Locale strategy research.
- RTL behavior research.
- P0 and P1 decision gates.
- Corrected phased roadmap.
- Task breakdown for audit, decisions, implementation, and copy review.
- Acceptance criteria for later smoke and review.

## Success Conditions

- The repo has one dedicated spec package for the i18n + RTL program.
- Audit and implementation are clearly separated.
- P0 blockers are explicit before runtime work begins.
- Document safety, RBAC safety, and supplier-cost safety remain explicit.
- No one can mistake this spec for implementation approval.
