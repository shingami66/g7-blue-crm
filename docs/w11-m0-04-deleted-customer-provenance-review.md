# W11 M0-04 — Deleted Customer Provenance Review

**Evidence date:** 29 October 2026
**Task verdict:** `PASS WITH WARN` — the exact-nine read-only review is complete; the missing deletion timestamps' cause and financial impact remain unknown, and the proposed disposition is not Owner-approved.
**W11 readiness:** `NO-GO`. M0-01 remains `CLOSED — CONTROLLER PASS`; this review does not reopen it or close M0-04.

## 1. Baseline and scope

- Repository: `D:/G7/g7-crm`, branch `main`; HEAD, `origin/main`, and live remote `main` were `48cdca364cec9176f171c3f29ecf2d95f5805308`; the worktree was clean before this task.
- Read-only target: DEV project `dpddrqjzqohexixgdqiq` only. No DEMO or PROD access.
- The exact-nine SELECT-only query is [w11m0_04_deleted_customers_provenance_review.sql](../supabase/verification/w11m0_04_deleted_customers_provenance_review.sql). It selects fixed Customer IDs and bounded relationship/audit metadata; it contains no DDL, DML, fixture creation, or mutation call.
- The one-statement DEV observation cutoff is `2026-10-29 06:45:34.31624+00`, snapshot `14658:14658:`. The exact target set returned nine rows, all with `is_deleted=true` and `deleted_at IS NULL`.
- The review does not reopen or recompute the full 26 October M0 inventory. It is a dated M0-04 supplement. Existing M0-01, M0-02, and M0-03 decisions remain unchanged; overlapping records are not counted as new cases or financial exposure.

## 2. Cohort evidence and classification

Every Customer has a generated `CUST-G8-*` identifier and an August 17, 2026 creation time. Three exact five-Service families are documented as synthetic G8 DEV verification data in the [Completed G8 repair contract](w11-m0-01-completed-g8-repair-contract.md#4-read-only-evidence), which identifies the `lmu0p1`, `ctqe6e`, and `3yhlwg` families. The remaining six share the G8 naming/cohort pattern, but an exact-ID fixture or run mapping was not found; their provenance is therefore likely, not verified.

| Customer number | Customer ID | Services / quotations | Provenance classification | Deletion-time classification |
|---|---|---:|---|---|
| `CUST-G8-uknn7d` | `7f02982d-2468-46ca-ae2b-185f556f3fee` | 0 / 0 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-exwnub` | `784c2e16-f8cf-467a-ad33-95569e3cf9cc` | 0 / 0 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-al5dhr` | `d7909f6a-6ed1-48d7-8740-af5e7a44310a` | 1 / 0 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-tude08` | `d1b9619f-6e8f-4902-ad26-844069d31d3c` | 1 / 0 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-pj71cy` | `f682f4d0-1300-4392-a392-a838807c6314` | 1 / 1 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-bqy9hn` | `0476d4a9-d77b-4988-805a-1a319403748e` | 1 / 1 | `LIKELY SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-lmu0p1` | `21db71fc-ac14-44c1-b5f6-03fcfcf64fc9` | 5 / 5 | `VERIFIED SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-ctqe6e` | `2168cc59-0205-4218-a141-15a9ac666877` | 5 / 5 | `VERIFIED SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |
| `CUST-G8-3yhlwg` | `9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e` | 5 / 5 | `VERIFIED SYNTHETIC / TEST` | `BOUNDED BUT NOT EXACT` |

The six `LIKELY` rows have no exact historical fixture/commit linkage tying their IDs to a test run. Two are orphan Customers, two have one linked Approved Service and no quotation, and two have one linked Service and one approved quotation associated with the existing M0-02 pair. This cohort pattern is evidence of likely test data, not proof of the exact mutation that left `deleted_at` null.

## 3. Deletion-time evidence

All nine Customers were created on 17 August 2026. The Customers table has a `BEFORE UPDATE` trigger that sets `updated_at`. For each row, `created_at` to the observed `updated_at` bounds when the current deleted state was established, but it does not give the exact transition time or operator. The first eight rows share `updated_at = 2026-08-17 10:13:40.772174+00`; the ninth has `updated_at = 2026-08-17 10:14:35.382091+00`. The linked Services have `deleted_at` batches at `2026-08-17 10:13:40.350+00` and `2026-08-17 10:14:35.048+00`; those timestamps do not prove when or how the Customer flag changed.

No Customer deletion audit event was found. The current [`softDeleteCustomer` action](../src/lib/customers/actions.ts) sets both `is_deleted=true` and `deleted_at` in the same supported operation. Current Customer list/detail and [record-navigation](../src/lib/record-navigation/queries.ts) reads filter by `is_deleted=false`. Current and historical source inspection found no supported Customer hard-delete action. Neither source review nor the timestamp pattern establishes which historical path produced the inconsistent fields.

**Deletion-time classification for all nine:** `BOUNDED BUT NOT EXACT`. Do not backfill `deleted_at` from `updated_at` or a linked Service timestamp; that would reconstruct history.

## 4. Current state, related cohorts, and impact

- The nine Customers link to 19 soft-deleted Services (18 `Approved`, one `Completed`) and 17 approved, current, non-deleted quotations. The 26 October inventory already included these relationships; this review does not add them to other exception counts.
- Fifteen associated Approved Billing Scopes are now `voided`, with no active scope authority, following the separately authorized M0-01 work. The three verified G8 Customers each correspond to a five-Service/five-quotation G8 family in that cohort. M0-01 remains closed by Controller PASS.
- The two one-Service/one-quotation Customers are the existing M0-02 cases. Their disposition and records are unchanged.
- Fourteen `invoice.created` audit-only references over the linked G8 Services are the exact M0-03 overlap. The audit payloads provide no monetary amount and no source invoice rows exist. The M0-03 MONITOR / PRESERVE EVIDENCE decision remains unchanged. The fifteenth G8 Service has no matching `invoice.created` reference.
- Audit pattern: the 14 `invoice.created` references fall between `2026-08-17 10:11:38+00` and `2026-08-17 10:14:29+00`; the cohort also has 15 quotation-approval, 15 Approved Billing Scope-approval, and 15 Service-status-change events from the same generated-data window. No Customer-deletion event appears. Subsequent governed M0-01 ABS retirements are recorded at `2026-10-27 11:16:00.308696+00` (14) and `2026-10-29 05:07:10.15677+00` (one). These later events document the already-authorized M0-01 work and are not evidence of the historical Customer mutation.
- Current DEV reads found zero linked invoice, payment, receipt/allocation, credit/refund, project, accounting bridge, journal, revenue-recognition, procurement, expense, event-cost, or business-document rows across the bounded checks. No downstream financial/accounting effect is proven by this observation; it does not establish historical absence outside the inspected sources.
- The 17 quotations total SAR 14,900.00 in approved commercial value. This is quotation context only, overlaps M0-01/M0-02, and is not an M0-04 financial impact, invoice, receivable, cash, revenue, accounting balance, loss, or write-off. **Financial impact classification: `UNKNOWN`; no amount attributable to M0-04 is established.**
- Customer list/detail and record-navigation paths filter by `is_deleted=false`; no current query depending on `deleted_at` was found in the reviewed Customer paths. The mismatch is therefore a metadata inconsistency; no current exposure or operational behavior caused by the null timestamp is proven.
- Customer RLS is enabled with no policies. `service_role` currently has table DELETE capability, as do `anon` and `authenticated` in ACL metadata; without RLS policies, ordinary table access is blocked. This capability does not prove any role used DELETE. No supported application hard-delete path was found. No exploit or historical privileged use is claimed.

**Current integrity impact classification:** `METADATA INCONSISTENCY ONLY`. The `is_deleted` flag currently hides these Customers in the reviewed operational reads. The missing timestamp is real, but no separate current operational, financial, or accounting effect is proven.

## 5. Cause and disposition

- **Cause classification:** `UNKNOWN`. No evidence establishes the historical mutation that left `deleted_at` null.
- **Cohort provenance evidence:** partly explained: exact documentation verifies synthetic G8 provenance for three rows, while the G8 naming/cohort supports only likely synthetic provenance for the remaining six.
- **Disposition recommendation:** `MONITOR / PRESERVE EVIDENCE`, pending Mozfer's Owner/Controller decision. Preserve records and audit evidence unchanged. Do not backfill timestamps, restore Customers/Services, reconstruct invoices, clean up records, or infer financial history.
- This is not an approval, waiver, phase closure, or remediation authorization. M0-04 remains open. M0 overall remains open and W11 stays **NO-GO**. M0-01 remains closed and is not reopened.

**Accountable decision owner:** Mozfer (Owner/Controller). **Decision boundary:** before M0 exit or any applicable W11 phase exit. No calendar deadline was supplied.

Evidence that could change the classification includes a Customer-specific deletion audit/history record; a backup/snapshot or immutable log that establishes the exact update and actor; exact fixture/run mapping for the six likely rows; source invoice/payment/accounting evidence establishing an impact; or proof of a current supported application path whose behavior depends on `deleted_at`.

## 6. Validation, review, and mutation boundary

- The exact-nine SELECT-only artifact executed successfully against DEV once. No fixture or probe row was created.
- Static review confirms the artifact consists of one read statement and does not call mutating RPCs. `git diff --check` and documentation/link checks are recorded after review.
- No INSERT, UPDATE, DELETE, migration, grant change, history repair, cleanup, deployment, DEMO/PROD access, or Controller/handover edit occurred in this task.
- One fresh independent read-only/findings-only Reviewer reviewed the final evidence and mirror diff via normal OCR delegation; the explicit result is recorded after review.
