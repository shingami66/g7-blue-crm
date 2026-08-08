# Post-G1 Task 2B — DEV/DEMO Curated Seed Baseline

**Date:** 8 August 2026
**Scope:** Authorized G7 BLUE CRM DEV/DEMO data only; no production access and no UX, document, quotation-commercial, or G2 work.
**Status:** `CLOSED — CURATED SEED AND AUTHENTICATED READ-ONLY SMOKE PASS`

## Environment

- Supabase project ref: `dpddrqjzqohexixgdqiq`
- Project name: `shingami66's Project`
- Region: `ap-northeast-1`
- Project status: active/healthy
- The connected ref matched the authorized DEV/DEMO ref; production was not accessed.
- At seed verification, the canonical repository was `D:\G7\g7-crm` on `main` at `5320788af1a9369691d2904305dc2f4a79194bc3` with `origin/main` aligned at `0/0`; this record is now included in the controlled closure commit.

## Pre-seed baseline and corrected owner classification

The authorized reset removed all prior mock/test business rows, including the old G1 DEV fixtures, and left all business tables at zero, with `app_users=2`, `company_settings=1`, and all current 2026 customer, service, quotation, invoice, payment, and supplier-booking sequences reset to zero before this task.

- Owner correction: all current DEV/DEMO business rows were classified as mock/test data and authorized for removal, including former G1 invoices, quotations, services, customers, ABS rows, supplier rows, payments, and audit rows.
- Preserve outside the live business dataset: G1 regression authority in repository tests, migrations, documentation, and Git history; app/auth identities, system settings, schema, security objects, and migration history.
- No current business row was retained merely because it had prior acceptance or legacy value.

## Curated database seed executed

The seed used one atomic database transaction directly against DEV/DEMO. It populated exactly 10 synthetic active customers, 10 synthetic active suppliers, and 10 synthetic `Inquiry` services, with one Service mapped deterministically to each Customer. Existing database numbering generated `CUST-2026-0001..0010` and `SVC-2026-0001..0010`; suppliers intentionally have no generated supplier number because the current schema has no supplier-number authority.

Customer and supplier values are fictional Saudi event-business demo data using Arabic, English, and mixed-language names. CR/VAT registrations, bank accounts, IBANs, and supplier tax numbers were left null; demo emails use the reserved `g7blue.invalid` domain. `created_by` and `updated_by` use an existing DEV/DEMO app-user identity consistent with current creation semantics. No quotations, ABS rows/items, invoices, payments, supplier rate cards/bookings/allocations, projects/tasks, or audit rows were created.

## Post-seed verification

- Final counts: customers 10, suppliers 10, services 10; quotations 0, quotation items 0, approved billing scopes 0, approved billing scope items 0, invoices 0, invoice items 0, payments 0, supplier rate cards 0, supplier bookings 0, service supplier allocations 0, projects 0, project tasks 0, and audit logs 0.
- All 10 Customers are active; all 10 Suppliers are active; all 10 Services are active, non-deleted, and in `Inquiry`. Every Service resolves to exactly one seeded Customer, with no orphan relationship and no duplicate customer/service number.
- System/bootstrap state remains present: `app_users` 2 and `company_settings` 1. Database-side schema, constraint, trigger, function, policy, RLS, grant, and migration digests match the pre-seed snapshot.
- Current-year sequences are customer `10`, service `10`, quotation `0`, invoice `0`, payment `0`, and supplier booking `0`. A transactional proof returned next Customer/Service numbers `CUST-2026-0011` and `SVC-2026-0011`, while next quotation/invoice/payment/SBK numbers remained `QT/INV/PAY/SBK-2026-0001`; the probe rolled back completely.
- No former G1 or legacy business rows reappeared. Legitimate audit count remains `0`; no audit events were fabricated.
- The four canonical G1 migrations remain present; historical drift version `20260807185325` remains absent.
- Schema, migration, RLS, grant, function, trigger, extension, and foreign-key digests remain unchanged.

## Authenticated seeded-baseline application smoke and gate

An existing authenticated DEV/DEMO Chrome session was discovered in the supported browser tooling; no credentials were exposed or entered by the agent.

- Dashboard loaded with 10 Customers, 10 Services, zero Quotations, zero open Invoices, and no attention items.
- Customers displayed all 10 seeded records, including Arabic and English values; representative Arabic and English Customer details opened correctly.
- Suppliers displayed all 10 seeded records with sensible categories; a representative Supplier detail opened correctly with no bank or rate-card data.
- Services displayed all 10 seeded records; representative Arabic and English Service details opened with the correct Customer relationship, `Inquiry` status, zero related Quotations, and a Service-scoped Create Quotation link.
- Quotations displayed `Showing 0 of 0 quotations` and `No quotations found.` Invoices displayed `Showing 0 invoices` and `No invoices found.`
- Sidebar navigation remained usable across the seeded-baseline routes.
- No create, approve, issue, pay, cancel, delete, or other mutation action was performed.
- Browser diagnostics were not used as a substitute for the database evidence; no application server error was observed during the seeded-baseline smoke.

The recorded Task 2B execution performed the authorized database seed only; no browser mutation was performed. The repository application source, tests, SQL, migrations, schema, security objects, and Git history remained unchanged during that execution. Production was not accessed.

Cleanup & Rebaseline is `CLOSED`. DEV/DEMO Data Hygiene is `CLOSED` with the curated baseline available for owner manual workflow testing. `UX / LOADING STABILIZATION` is `PENDING` and is the next required task. Customer Document System and Quotation Commercial Model Impact Check remain pending. G2 Payment Precision remains blocked/not started.
