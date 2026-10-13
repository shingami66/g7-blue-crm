# W11-M0 Service Lifecycle Integrity Repair

This record captures the bounded lifecycle integrity repair, its completed read-only DEV apply verification, and the publication evidence. It does not claim production readiness or authorize later W11 phases.

## Verified state and cause

- Repository baseline: main at 98edbc2ee43a0ed7fba13c0027102c342b52d979, with origin/main and live remote main at the same commit before local edits.
- Before apply, DEV contained 13 active Services and 11 lifecycle projections. The two missing projections were IDs 6371cd1f-69af-4b86-9096-b36c1e56bab0 and cd3448ff-c8cf-4ba4-89c0-6d6bd2f0b164; both Services remained Quoted. Post-apply reconciliation is recorded below.
- The existing service_lifecycle_states primary key is service_id. Before apply, its state_version check required > 0, while the repository's canonical legacy fallback for a Quoted Service uses version 0. The 30 pre-existing projections were at version 1 and were not rewritten.
- The W3 lifecycle migration backfilled existing rows but did not add an insert trigger. Before this repair, canonical application creation via create_service_atomic inserted a Service without a projection; lifecycle transitions fail closed if a projection is absent. This repair adds atomic projection initialization.
- Repository search at the baseline found no second production Service creation path.

## Repair manifest

Migration: supabase/migrations/20261012074856_g7_m0_service_lifecycle_integrity_repair.sql.

- Preflight checks the required table/column/type/nullability contract, service_id primary key, exact RPC result/security/search-path/volatility/ACL, the observed version constraint, 13 active Services, and the exact two missing IDs and Quoted status.
- Before CREATE OR REPLACE, it pins the exact live create_service_atomic source MD5 (597401363a3bdcffe045fac401020fa8), validates every referenced Service and Customer column, the Service primary/number/idempotency indexes, and the generate_document_number(text) source/metadata contract (MD5 1f4311228850c596c80670287a1f95c0).
- It locks the Services and lifecycle tables for the bounded preflight and transaction.
- It changes only the version check from state_version > 0 to state_version >= 0, matching the existing canonical initial state. Existing lifecycle versions are not rewritten.
- It replaces the existing create_service_atomic implementation without changing its signature, validation, advisory lock, return shape, security mode, search path, or caller ACL. It inserts one Inquiry projection in the same transaction and fails closed on a matching replay without a projection.
- It inserts exactly two canonical Quoted lifecycle projections. It does not update services.status or write quotations, ABS, invoices, payments, customers, suppliers, accounting rows, or audit rows.
- Any preflight mismatch, unexpected row count, constraint failure, or projection insert error aborts the transaction.


## DEV apply and verification

- DEV project: `dpddrqjzqohexixgdqiq`. Migration `20261012074856 / g7_m0_service_lifecycle_integrity_repair` is recorded exactly once; the applied migration SHA-256 is `37CB875CFF562451392953B323C4A856A4D43FA7070E2028EFC2FAF380F0A5BA`.
- Read-only verification reconfirmed 13 active Services, lifecycle coverage 13/13, zero active Services missing a lifecycle projection, and zero duplicate lifecycle Service IDs.
- Both repaired Services remain active and `Quoted`. Their canonical projections retain `legacy_status=Quoted`, `commercial_state=quoted`, payment/readiness `unassessed`, `execution_state=not_started`, `completion_state=pending`, `close_state=open`, `start_gate_basis=NULL`, `state_version=0`, and `mapping_version=w3-v1`.
- The repaired constraint permits `state_version >= 0`; existing lifecycle versions were not rewritten. `create_service_atomic` initializes the new Service lifecycle projection in the same transaction and fails closed when a matching replay has no projection.
- One fresh independent read-only findings-only Reviewer returned CLEAN. Historical anomaly causes and classifications below remain unchanged and unresolved.
- No migration-history repair or rewrite occurred. No DEMO/PROD mutation or deployment occurred. W11 remains NO-GO; this is not production readiness or overall Layer 1 real-use proof.

## Historical anomaly provenance

### Deleted Services with approved quotations

- Read-only DEV evidence: 17 deleted Services have current approved non-deleted quotations; 15 have a current active Approved Billing Scope and 2 do not.
- Those Services were created on 2026-08-17 between 10:09:59 and 10:14:27 UTC and deleted between 10:13:40 and 10:14:35 UTC.
- validateServiceCanBeDeleted currently rejects deletion if it finds a linked quotation with is_deleted = false. Git history attributes this guard to commit a5da59b6 dated 2026-06-21, before these Services were created.
- The available Service audit evidence contains 15 status_change events in the same August 17 window and no deletion events. The repository guard's history does not prove which code was deployed or which path performed those historical deletions. The historical deletion mechanism is UNKNOWN.

### Two approved quotations without ABS

- The two quotations were created in the same August 17 window. No audit rows were found for either quotation.
- The DEV migration history currently contains the ABS foundation (20260708090000) and approval/activation migrations (20260803090000, 20260803100000). Those migration identities establish current schema history, not their exact runtime availability on August 17.
- The records are not demonstrated to be pre-ABS records. With no quotation audit timeline or applied-at history, classify them UNKNOWN among incomplete historical workflow, bypass, or data corruption. No commercial record is reconstructed.

### Invoice audit references without source invoices

- Read-only DEV evidence: 14 distinct invoice references have only create audit events, timestamped between 2026-08-17 10:11:38 and 10:14:29 UTC.
- None of the 14 references resolve in invoices, payments, invoice_items, invoice draft mutations, AR bridge event versions/lines/links, customer credit adjustments, or receipt allocations. Exact IDs were not present in repository files.
- Current invoice server-action source has no hard-delete action. DEV grants DELETE on public.invoices to service_role; RLS is enabled but does not restrict that privileged role, and the invoice table has no DELETE guard trigger. Foreign keys restrict deletion where dependent rows exist; these 14 references have no such rows.
- Privileged direct database deletion is currently possible for otherwise unreferenced invoices, but no supported current application path was found. The historical cause remains UNKNOWN; cleanup residue or privileged hard deletion is plausible but unproven.

## Advisories left unchanged

- Nine Customers still have is_deleted = true with deleted_at IS NULL.
- Existing ACL advisories without an effective browser write path remain unchanged.
- These findings were not repaired or used to broaden this lifecycle task.

## Verification artifacts

- supabase/verification/w11m0_service_lifecycle_integrity_post_apply.sql records the read-only assertions used after the DEV apply; they were reconfirmed before publication.
- supabase/verification/w11m0_service_lifecycle_integrity_rollback_regression.sql is a disposable-database-only fixture; it was not run because no verified disposable target was available, a non-material warning. It covers creation, the Quoted mapping, replay, transition compatibility, validation, and rollback when projection initialization fails.

Migration 20261012074856 was applied only to DEV project dpddrqjzqohexixgdqiq. No migration-history repair or rewrite occurred. No DEMO/PROD mutation or deployment occurred. No historical commercial, invoice, customer, accounting, or audit cleanup occurred. W11 remains NO-GO.
