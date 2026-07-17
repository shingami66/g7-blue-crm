# Atomic Invoice Creation Contract

## 1. Status and scope

| Field | Value |
| --- | --- |
| Design status | **Locked for migration implementation** (Task 18) |
| Environment | **DEV/DEMO only** |
| Scope | **Invoice create path hardening only** (Deposit and Final) |
| Installed? | **No.** This document does **not** claim the RPC or migration is implemented or installed. |
| Production | **No production-readiness or production-apply claim.** |
| Canonical consumers | `createInvoiceAction` (application orchestration today); future RPC `create_invoice_atomic` |

Related:

- Current multi-step create: `src/lib/invoices/actions.ts` (`createInvoiceAction`)
- Authority: `resolveInvoiceBillingAuthorityForService` (`src/lib/approved-billing-scopes/queries.ts`)
- Exposure: `src/lib/invoices/exposure.ts`
- Lifecycle matrix: `src/lib/invoices/service-invoice-lifecycle.ts`
- Money: `src/lib/invoices/money.ts`
- Permissions: `INVOICE_PERMISSIONS.write` (`src/lib/auth/role-permissions.ts`)
- Safe UI errors: `src/lib/invoices/action-error-presentation.ts`
- Existing insert guard (defense-in-depth): `check_invoices_before_write` (invoice integration migration)

## 2. Problem statement

This contract addresses residuals **1–4** from the Invoice financial lifecycle residual list:

1. **Legacy Quotation concurrent Deposit race** remains non-atomic (check-then-insert across application queries).
2. **Database create enforcement lacks the legacy Quotation ceiling branch** (DB trigger ceiling is ABS-active oriented; legacy path is app-only).
3. **Lifecycle validation and Invoice insert are non-atomic** (status can change between app check and insert).
4. **Complete seven-state Deposit/Final lifecycle is not guaranteed atomically** for create (matrix is application-enforced today).

## 3. Non-goals

Explicitly out of scope for this contract and the follow-on migration:

- Invoice update / delete / issue redesign
- Payment mutation redesign
- ABS void or supersede redesign or UI
- Customer or Quotation CRUD redesign
- VAT registration behavior, Tax Invoice wording, ZATCA, FATOORA, QR, XML
- Production rollout or production apply
- Destructive cleanup of retained DEV/DEMO smoke evidence
- Silent restoration of a non-atomic multi-query create path after integration

## 4. Canonical database function identity

Naming follows existing service-role RPCs (`generate_document_number`, `edit_approved_billing_scope_item`, ABS lifecycle functions).

### Function

```text
public.create_invoice_atomic(
  p_service_id uuid,
  p_quotation_id uuid,
  p_invoice_type text,
  p_requested_amount numeric,
  p_actor_clerk_user_id text,
  p_document_label text,
  p_vat_mode text,
  p_snapshot_seller jsonb,
  p_snapshot_buyer jsonb,
  p_snapshot_quotation jsonb,
  p_snapshot_bank_details jsonb,
  p_snapshot_document_rules jsonb,
  p_invoice_date date DEFAULT (CURRENT_DATE),
  p_due_date date DEFAULT (CURRENT_DATE)
)
RETURNS TABLE (
  error_code text,
  invoice_id uuid,
  invoice_number text
)
```

| Argument | Type | Nullability | Notes |
| --- | --- | --- | --- |
| `p_service_id` | `uuid` | NOT NULL | Target Service |
| `p_quotation_id` | `uuid` | NOT NULL | Approved Quotation basis FK |
| `p_invoice_type` | `text` | NOT NULL | Exactly `deposit` or `final` |
| `p_requested_amount` | `numeric` | NULL for Final; required for Deposit | Canonical non-negative; Deposit must be **> 0** |
| `p_actor_clerk_user_id` | `text` | NOT NULL | Audit identity only — **not** a permission claim |
| `p_document_label` | `text` | NOT NULL | From server-side snapshot builder (`not_registered` labels) |
| `p_vat_mode` | `text` | NOT NULL | Must equal `not_registered` for this slice |
| `p_snapshot_*` | `jsonb` | NOT NULL | Server-built document snapshots (see §13) |
| `p_invoice_date` | `date` | NOT NULL default today | Maps to `invoices.date` |
| `p_due_date` | `date` | NOT NULL default today | Maps to `invoices.due_date` |

**Return:** exactly **one row**.

| Column | Success | Failure |
| --- | --- | --- |
| `error_code` | `NULL` | stable code (see §14) |
| `invoice_id` | new UUID | `NULL` |
| `invoice_number` | `INV-YYYY-####` | `NULL` |

**Volatility:** `VOLATILE` (writes + sequence).

### Forbidden inputs (must not exist)

The function **must not** accept:

- caller role or permission claims
- client-computed ceiling, exposure, remaining, or Final amount
- client-computed monetary totals that the database can recompute (`subtotal`, `vat_amount`, `grand_total`, `balance_due`)
- raw browser JSON that is trusted as financial truth without recomputation

### Application still supplies (non-financial document snapshots)

Server Action may build seller/buyer/bank/document-rule/quotation presentation snapshots from already-authorized server reads and pass them as `jsonb`. The RPC:

- stores those document snapshots on insert;
- **recomputes** `subtotal`, `vat_rate`, `vat_amount`, `grand_total`, `amount_paid`, `balance_due` from authoritative rules;
- for Final, may **enrich** `snapshot_quotation` with a settlement basis object using RPC-computed numbers (mirroring current `final_invoice_settlement` shape).

## 5. Security contract

| Rule | Requirement |
| --- | --- |
| Definer | `SECURITY DEFINER` |
| Search path | Fixed safe `search_path` (project standard: `public` + `pg_temp` pattern used by existing financial RPCs) |
| Qualification | Explicit `public.` on tables/functions |
| Grants | `EXECUTE` to **`service_role` only** |
| `anon` | `EXECUTE` false / revoked |
| `authenticated` | `EXECUTE` false / revoked |
| `PUBLIC` | `EXECUTE` revoked |
| App gate | Application **must** call `requirePermission(INVOICE_PERMISSIONS.write)` **before** creating the admin client / invoking the RPC |
| RPC trust | RPC **must not** trust any role/permission argument; `p_actor_clerk_user_id` is audit-only |
| Browser | No direct browser/PostgREST invocation contract |

Rate limiting remains an **application** responsibility (`consumeRateLimit` on `createInvoiceAction`).

## 6. Transaction and locking contract

All steps below run in **one** PostgreSQL transaction (the RPC body).

### Deterministic order

1. Validate structural input (`p_invoice_type`, UUID forms, Deposit amount presence/shape, `p_vat_mode = not_registered`, non-null snapshot payloads).
2. **`SELECT … FROM public.services WHERE id = p_service_id FOR UPDATE`** (serialization boundary for concurrent creates on that Service).
3. Re-read Service lifecycle fields while locked (`status`, `deleted_at`).
4. Resolve ABS history and active authority (same positive-proof rules as current app).
5. Resolve legacy Quotation authority **only** after exact-zero ABS history proof.
6. Recompute Service-lifetime Invoice exposure under the same predicate as `applyApplicableServiceInvoiceExposurePredicate`.
7. Compute ceiling and remaining authority.
8. Apply Deposit or Final business guards (duplicates, amounts).
9. Allocate invoice number via `public.generate_document_number('invoice')` inside the same transaction.
10. Insert exactly one `public.invoices` row.
11. Return success evidence **or** a single stable failure code with **no partial Invoice insert**.

### Guarantees

- No validation result from a prior application query may be trusted by the RPC.
- Concurrent create requests for the same Service serialize on the Service row lock.
- Failure rolls back the entire RPC (no orphan invoice number consumption policy: prefer generating the number only after guards pass; if `generate_document_number` runs inside the same transaction, rollback restores sequence consumption consistent with existing quotation numbering lessons — **document that sequence gaps remain acceptable** for invoices as today).

### Lock order note

Lock **Service first**, then read ABS/invoice/quotation rows as needed. Do not lock ABS rows before Service in a way that reverses ABS void/supersede RPC locking if those paths also lock Service first (existing financial lifecycle RPCs use Service-first locking). Avoid locking customer or quotation rows for update unless required by FK inserts (ordinary `SELECT` is enough).

## 7. Authority-resolution contract

Modes align with `ServiceBillingAuthorityMode` and `resolveInvoiceBillingAuthorityForService` / billing-state:

| Mode | Condition | Create allowed? |
| --- | --- | --- |
| `active_abs` | Exactly one active Approved ABS (not voided, not superseded) with valid ceiling | Yes, when other gates pass |
| `historical_abs_only` | Proven ABS history count **> 0** and no active ABS | **No** — fail `billing_scope_inactive` |
| `legacy_quotation` | Positive proof ABS history count **= 0** and valid approved Quotation | Yes, when other gates pass |
| `no_authority` | Exact zero ABS history but no valid approved Quotation | **No** |
| `unavailable` | Malformed, contradictory, inaccessible, or failed reads | **No** — fail closed |

### Active ABS

- `status = 'approved'`
- `voided_at IS NULL`
- `superseded_at IS NULL`
- Ceiling = authoritative `accepted_grand_total` (non-null, finite, non-negative canonical money)
- Sets `invoices.approved_billing_scope_id` to that scope id

### Historical ABS

Any proven ABS row counts as history, including **Draft**, Approved, Voided, Superseded-derived, and other statuses. Positive count **blocks** legacy Quotation fallback forever for that Service until product rules change.

### Legacy Quotation

- Available **only** after positive proof that ABS history count is exactly **0** (empty successful history probe; not query failure; not limit truncation treated as empty).
- Requires approved, non-deleted Quotation matching `p_quotation_id` and `p_service_id`.
- Ceiling = Quotation `grand_total` (authoritative money).
- `approved_billing_scope_id` is **NULL**.

### Unavailable / contradiction

Examples that must fail closed: duplicate active scopes; active without history evidence; history probe active without active result; malformed counts/rows; query errors.

## 8. Service-lifetime exposure contract

Matches `src/lib/invoices/exposure.ts`:

| Rule | Value |
| --- | --- |
| Scope | `service_id = p_service_id` |
| Include | Draft and other non-voided/non-cancelled active statuses |
| Exclude soft-delete | `is_deleted` is not true |
| Exclude void timestamp | `voided_at IS NULL` |
| Exclude status | status not in `voided`, `cancelled` |
| Payments | **Never** reduce exposure |
| Money | Each included `grand_total` must parse as authoritative money; any failure → exposure unavailable |
| ABS FK | Exposure is **independent** of which ABS version an invoice linked |

Exposure sum uses the same fail-closed accumulation semantics as `sumAuthoritativeMoney` / `parseApplicableServiceInvoiceExposureResult`.

## 9. Remaining-authority contract

```text
remaining = ceiling - Service_lifetime_exposure
```

| Rule | Value |
| --- | --- |
| Zero | Valid numeric remaining (fully allocated) |
| Zero ≠ unavailable | Distinct from fail-closed unavailable |
| Negative remaining | Fail closed (conflict) |
| Equality at ceiling | Valid; remaining 0; Fully allocated |
| Client remaining | **Never trusted** |

**Deposit** uses remaining for max amount check.

**Final** amount **equals** authoritative remaining (unifies with Service-lifetime exposure).

**Compatibility note:** Current `createInvoiceAction` Final path computes `billingCeiling - SUM(active prior deposit invoices)` and embeds `SIMPLE_SUM_FOR_T018` settlement metadata. Before first Final, with only deposit-type prior invoices, that sum equals Service-lifetime exposure. The atomic contract **locks Service-lifetime exposure** for Final amount so concurrent non-deposit applicable invoices (if any) cannot be ignored. Settlement snapshot should record method `SERVICE_LIFETIME_EXPOSURE` (or keep a dual field documenting equivalence) without inventing payment inclusion.

## 10. Lifecycle matrix

Matches `SERVICE_INVOICE_LIFECYCLE_MATRIX` / `getServiceInvoiceLifecycleDecision`:

| Service status | Deposit | Final |
| --- | --- | --- |
| Inquiry | Allow when all other gates pass | Allow when all other gates pass |
| Quoted | Allow when all other gates pass | Allow when all other gates pass |
| Approved | Allow when all other gates pass | Allow when all other gates pass |
| Deposit Paid | Deny | Allow when all other gates pass |
| In Progress | Deny | Allow when all other gates pass |
| Completed | Deny | Deny |
| Cancelled | Deny | Deny |

Additional fail-closed:

| Evidence | Outcome |
| --- | --- |
| `deleted_at IS NOT NULL` | Deny (`service_lifecycle_unavailable`) |
| Missing Service row | Deny (`service_lifecycle_unavailable`) |
| Blank / unknown / malformed status | Deny (`service_lifecycle_unavailable`) |
| Deposit denied by matrix | `service_not_eligible_for_deposit` |
| Final denied by matrix | `service_not_eligible_for_final` |

## 11. Deposit creation contract

Derived from current `createInvoiceAction` Deposit branch:

| Rule | Requirement |
| --- | --- |
| Amount required | `p_requested_amount` present |
| Shape | Canonical positive amount: finite, **> 0**, authoritative non-negative decimal rules |
| Ceiling | Authoritative remaining: `p_requested_amount ≤ remaining` |
| Exact remaining | **Allowed** |
| Infer from ceiling | **Forbidden** — client/HTML max is UX only |
| Duplicate Deposit | Deny if an active Deposit exists for the **same** `service_id` + `approved_quotation_id` with status not in voided/cancelled, `voided_at` null, `is_deleted` false → `deposit_invoice_already_exists` |
| Direct Final independence | Deposit rules do not require a prior Final; Final does not require a prior Deposit |
| Draft exposure | Successful Deposit insert (status `draft`) **immediately** counts toward Service-lifetime exposure |

## 12. Final creation contract

| Rule | Requirement |
| --- | --- |
| Client Final amount | **Not accepted** (`p_requested_amount` must be NULL) |
| Amount | `grand_total = remaining` (Service-lifetime based) |
| Direct Final | Supported with zero prior deposits when gates pass |
| Payments | Do not reduce Final calculation |
| Remaining | Must be **> 0** (fully allocated / zero remaining → deny with a fully-allocated style code; see §14) |
| Duplicate Final | Deny active Final for `service_id` (same void/delete filters as today) → `final_invoice_already_exists` |
| After success | Exposure increases by Final amount; remaining becomes 0 when starting remaining was exact |

## 13. Insert and snapshot contract

### Columns the RPC must set (from current insert)

| Column | Source |
| --- | --- |
| `invoice_number` | `generate_document_number('invoice')` |
| `customer_id` | From approved Quotation row (required; else `invoice_customer_unavailable`) |
| `approved_quotation_id` | `p_quotation_id` |
| `approved_billing_scope_id` | Active ABS id or NULL (legacy) |
| `service_id` | `p_service_id` |
| `date` / `due_date` | `p_invoice_date` / `p_due_date` |
| `invoice_type` | `p_invoice_type` |
| `status` | `'draft'` |
| `subtotal` | Authoritative invoice amount |
| `vat_rate` | `0` while `not_registered` |
| `vat_amount` | `0` while `not_registered` |
| `grand_total` | Authoritative invoice amount |
| `amount_paid` | `0` |
| `balance_due` | Authoritative invoice amount |
| `document_label` | `p_document_label` |
| `vat_mode` | `p_vat_mode` (`not_registered`) |
| `snapshot_seller` | `p_snapshot_seller` |
| `snapshot_buyer` | `p_snapshot_buyer` |
| `snapshot_quotation` | `p_snapshot_quotation` (Final may enrich settlement) |
| `snapshot_bank_details` | `p_snapshot_bank_details` |
| `snapshot_document_rules` | `p_snapshot_document_rules` |
| `issued_at` | `NULL` |
| Soft-delete / void | Defaults (`is_deleted` false, `voided_at` null) per table defaults |

### Application responsibilities (not invented as new DB columns)

| Responsibility | Owner |
| --- | --- |
| `requirePermission(invoices:write)` | Application before RPC |
| Rate limit | Application |
| Zod structural parse of browser input | Application |
| Company settings load + `buildInvoiceSnapshotData` | Application (server-only) before RPC |
| Mapping stable RPC `error_code` → localized UI via presentation helpers | Application |
| Invoice issue / PDF / payment flows | Out of scope |

### `vat_mode` gate

If `p_vat_mode <> 'not_registered'`, fail with `vat_registered_invoice_not_implemented_in_this_slice` (preserve current slice boundary).

### Defense-in-depth

Existing `check_invoices_before_write` remains enabled. RPC insert must satisfy ABS-active ceiling checks when `approved_billing_scope_id` is set. Legacy path (null scope) relies on RPC remaining math; trigger may not re-apply Quotation ceiling — that gap is why this RPC exists.

## 14. Stable return and error-code contract

### Success

```text
error_code = NULL
invoice_id = <uuid>
invoice_number = <text>
```

Application maps to `{ success: true, invoiceId, invoiceNumber }`.

### Failure

```text
error_code = <stable_code>
invoice_id = NULL
invoice_number = NULL
```

No raw SQLSTATE, constraint names, table names, roles, stacks, or exception text are returned to the UI. Application presentation continues to use dictionary messages only.

### Stable codes (repository-native where defined)

| Code | When |
| --- | --- |
| `invalid_invoice_input` | Structural / type failure |
| `deposit_amount_required` | Deposit missing amount |
| `invalid_deposit_amount` | Deposit amount non-canonical / non-positive |
| `quotation_not_found` | Quotation missing or deleted |
| `quotation_not_approved` | Quotation not approved |
| `quotation_service_mismatch` | Quotation.service_id ≠ p_service_id |
| `service_lifecycle_unavailable` | Missing/deleted/malformed Service status |
| `service_not_eligible_for_deposit` | Lifecycle matrix |
| `service_not_eligible_for_final` | Lifecycle matrix |
| `billing_scope_authority_unavailable` | Authority/ceiling unavailable |
| `billing_scope_inactive` | Historical ABS / inactive authority block |
| `invoice_exposure_unavailable` | Exposure fail-closed |
| `deposit_amount_exceeds_remaining` | Deposit > remaining or remaining invalid/negative |
| `deposit_invoice_already_exists` | Active deposit exists for quotation+service |
| `final_invoice_already_exists` | Active final exists for service |
| `prior_invoices_exceed_billing_scope_ceiling` | Ceiling conflict under active ABS (Final/remaining) |
| `prior_invoices_exceed_quotation_total` | Ceiling conflict under legacy Quotation |
| `company_settings_unavailable` | App-side before RPC; if RPC re-checks settings, same code |
| `vat_registered_invoice_not_implemented_in_this_slice` | vat_mode gate |
| `invoice_snapshot_unavailable` | App snapshot builder failure (app-side) |
| `invoice_number_unavailable` | Number generation failure |
| `invoice_customer_unavailable` | Quotation missing customer_id |
| `invoice_amount_exceeds_ceiling` | Trigger / ceiling exceed message mapping |
| `billing_scope_service_mismatch` | Scope service mismatch |
| `invoice_grand_total_invalid` | Null grand_total under ABS ceiling path |
| `invoice_insert_failed` | Generic insert failure |
| `invoice_creation_failed` | Presentation alias for insert-class failures |

**Permission codes remain application-side:** `Unauthorized`, `Forbidden` (never computed inside RPC).

**Minimal new code (only if needed):** prefer mapping zero remaining Final attempts to existing remaining/fully-allocated style messaging via `deposit_amount_exceeds_remaining` is wrong for Final — use `prior_invoices_exceed_*` only when remaining < 0; when remaining = 0 for Final, use a dedicated stable code only if presentation already requires it. **Preferred:** fail Final with `invoice_exposure_unavailable` is wrong; use **`final_invoice_already_exists` is wrong**. Document **`prior_invoices_exceed_quotation_total` / `prior_invoices_exceed_billing_scope_ceiling` when remaining ≤ 0 for Final** is imprecise.

**Locked Final zero-remaining code:** `deposit_amount_exceeds_remaining` is Deposit-only. For Final with remaining ≤ 0, use **`prior_invoices_exceed_billing_scope_ceiling`** when active ABS, else **`prior_invoices_exceed_quotation_total`** (current Final negative path), and treat remaining = 0 as deny with the same family by mapping to those codes when `remaining <= 0` (fully allocated). Presentation already has remaining-oriented Deposit errors; Final UI may map these through `presentFinalInvoiceActionError` fallback until dictionary expansion (application task, not this contract).

## 15. Atomicity and concurrency acceptance criteria

| Scenario | Expected |
| --- | --- |
| Two concurrent Deposits (same Service, remaining allows one) | Exactly one insert succeeds; loser gets `deposit_amount_exceeds_remaining` or `deposit_invoice_already_exists` |
| Deposit and Final racing | Serialize on Service lock; second sees updated exposure; invalid combination fails closed |
| Two concurrent Finals | Exactly one succeeds; loser `final_invoice_already_exists` or ceiling/remaining denial |
| Exact-remaining Deposit | Allowed |
| Above-remaining Deposit | Denied `deposit_amount_exceeds_remaining`; no row |
| Historical ABS block | Denied `billing_scope_inactive`; no row |
| Active ABS ceiling override | Ceiling from ABS, not Quotation total |
| Legacy Quotation ceiling | Only after exact zero ABS history |
| Lifecycle denial | Stable lifecycle codes; no row |
| Failure mid-RPC | No partial Invoice row |

## 16. Compatibility and rollout sequence

1. **This contract docs commit** (`docs(billing): lock atomic invoice creation contract`).
2. Migration implementation + review (Task 18).
3. Migration commit and push (no agent apply).
4. **Mozfer** manually applies SQL to DEV/DEMO.
5. Read-only verification: function exists, signature, `SECURITY DEFINER`, grants, dry negative checks.
6. DEV/DEMO apply evidence documentation (Task 19).
7. Application switches `createInvoiceAction` to the verified RPC (Task 20).
8. Automated validation + Graphify refresh.
9. Separate explicitly authorized DEV/DEMO browser re-smoke.
10. **No production claim.**

### Integration fail-closed rule

After Task 20 integration:

- If the RPC is missing or not executable by service_role → **fail closed** (stable create failure).
- **No silent fallback** to the multi-query non-atomic insert path.

## 17. Rollback contract

| Stage | Rollback |
| --- | --- |
| Before DEV apply | Revert/replace migration commit only |
| After DEV apply, before app integration | RPC may remain unused; removal requires explicit follow-up migration |
| After app integration | Application rollback and database rollback are **separate** controlled tasks; **never** silently restore non-atomic create; preserve existing Invoice records |

## 18. Migration review checklist (Task 18)

- [ ] Exact function name `public.create_invoice_atomic` and signature match §4
- [ ] `SECURITY DEFINER` + fixed `search_path`
- [ ] Schema-qualified table/function references
- [ ] Grants: service_role only; anon/authenticated/PUBLIC revoked
- [ ] Service `SELECT … FOR UPDATE` first
- [ ] Authority resolution modes match §7 (incl. exact-zero history)
- [ ] Exposure predicate matches §8
- [ ] Remaining math matches §9
- [ ] Lifecycle matrix matches §10
- [ ] Deposit / Final guards match §11–12
- [ ] Insert columns match §13
- [ ] Stable `error_code` set matches §14
- [ ] No production apply instructions; no VAT/ZATCA expansion
- [ ] Harmless verification queries documented for Mozfer
- [ ] User owns DEV/DEMO apply

---

**Document control**

| Field | Value |
| --- | --- |
| Locked by | `G7-FIN-HARDEN-17-ATOMIC-INVOICE-CONTRACT` |
| Next implementation task | `G7-FIN-HARDEN-18-ATOMIC-INVOICE-RPC-MIGRATION-1` |
| Environment | DEV/DEMO only |
