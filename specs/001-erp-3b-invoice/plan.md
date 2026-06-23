# Implementation Plan: ERP-3B Invoice Creation

**Feature Branch**: `[001-erp-3b-invoice]`

**Status**: Draft

## Technical Context

- Next.js App Router
- TypeScript
- Tailwind
- Supabase/Postgres
- Server Actions
- Existing ERP-3A invoice schema foundation already applied
- Current `vat_mode = not_registered`

## Constitution Check

All requirements align with G7 CRM Constitution. No implementation details violate the `not_registered` VAT constraints or security boundaries.

## Architecture & Integration

- **Server Actions**: Will house the trusted server logic to validate, create, and link invoices to services and quotations.
- **Database Layer**: Existing ERP-3A schema remains strictly unchanged; no SQL will be applied and no new migrations will be created. The `service_id` is nullable at the DB level, so composite FK enforcement is partial and must be strictly handled by the server actions.
- **RBAC**: Handled in server actions/database policy layer ensuring Viewer and unpermitted Sales roles cannot create invoices.

## Phase 1: Design & Contracts

- **Data Model**: `data-model.md` details the schema mappings and validations.
- **Research**: `research.md` outlines how specific constraints (like shared sequence and RBAC) are technically structured within the existing setup.
- **Contracts**: `/contracts/invoice-action.ts` defines the Server Action input/output boundaries.
- **Quickstart**: `quickstart.md` defines how to validate the end-to-end functionality.

## Deferred / Out of Scope

The following items are explicitly deferred to future phases:
- Payment workflow implementation and confirmation.
- ZATCA/FATOORA/QR/XML integration.
- Tax Invoice generation (deferred until `vat_mode` is no longer `not_registered`).
- Supabase SQL migrations.
- Invoice PDF redesign.
- Automatic email/WhatsApp sending.
- Refunds, Credit notes, Full accounting journal entries.
