# Atomic Payment Recording Contract

This document defines the interface, transaction safety rules, and operational requirements for recording invoice payments atomically.

## 1. Status and Scope
- **Environment:** DEV/DEMO only (applied and verified).
- **Production Status:** Not applied, not production-ready. Production apply remains unauthorized.
- **Migration File:** `supabase/migrations/20260718190000_payment_recording_hardening.sql`

---

## 2. PostgreSQL RPC: public.record_invoice_payment

The database function `public.record_invoice_payment` encapsulates the atomic logic for creating a payment record, updating invoice balances, executing service status transitions, and preserving immutable snapshots.

### Function Signature
```sql
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_invoice_id  uuid,
    p_amount      numeric,
    p_date        date,
    p_method      text,
    p_reference   text,
    p_user_id     text,
    p_request_id  uuid
)
RETURNS TABLE(
    error_code      text,
    payment_id      uuid,
    payment_number  text,
    amount_paid     numeric,
    balance_due     numeric,
    invoice_status  text
)
```

### Arguments

| Argument | Type | Description |
| :--- | :--- | :--- |
| `p_invoice_id` | `uuid` | Target Invoice ID to pay. |
| `p_amount` | `numeric` | Payment amount. Must be strictly positive (> 0). |
| `p_date` | `date` | Date of the payment. |
| `p_method` | `text` | Payment method (must match check constraints: `bank_transfer`, `cash`, `cheque`, `online`). |
| `p_reference` | `text` | Reference details (e.g., transaction/reference note). |
| `p_user_id` | `text` | User ID of the actor recording the payment (Clerk ID). |
| `p_request_id` | `uuid` | Client-generated idempotent UUID request ID. |

### Return Columns (exactly one row)

| Column | Success | Failure |
| :--- | :--- | :--- |
| `error_code` | `NULL` | Stable error code (e.g., `invalid_amount`, `idempotency_conflict`, etc.) |
| `payment_id` | `uuid` | `NULL` |
| `payment_number` | `text` | `NULL` |
| `amount_paid` | `numeric` (Invoice `amount_paid` snapshot) | `NULL` |
| `balance_due` | `numeric` (Invoice `balance` snapshot) | `NULL` |
| `invoice_status` | `text` (Invoice status snapshot) | `NULL` |

---

## 3. Transaction Safety and Concurrency

To guarantee atomicity and guard against concurrent double-submits, the RPC implements the following controls:

1. **Input Validation**: Rejects null or invalid request IDs (`p_request_id`) and non-positive amounts (`p_amount <= 0`) before any lock or mutation.
2. **Transaction-Level Advisory Lock**: Locks the transaction using a hash of the `p_request_id` to prevent simultaneous concurrent execution of the exact same request.
3. **Idempotency Replay Check**: Checks the `payments` table for an existing record matching `request_id`.
   - **Replay**: If a matching record is found, and the payment intent matches (same invoice, amount, method, etc.), it returns the stored payment snapshots without re-executing mutations.
   - **Conflict**: If the request ID matches but the intent (such as amount or invoice) differs, it immediately rejects the request with an `idempotency_conflict` error.
4. **Row-level Serialization Lock**: Locks the related `services` row first (`FOR UPDATE`), then the target `invoices` row (`FOR UPDATE`) to serialize concurrent payments against the same service or invoice.
5. **Overpayment Prevention**: Calculates the remaining balance using locked database states. Rejects the transaction with `payment_exceeds_balance` if `p_amount > balance_due`.
6. **Atomic Mutation**: Performs the payment insert, updates `invoices` balances/status, updates `services` statuses, and logs the audit event atomically in one transaction block.

---

## 4. Privileges and Security Definer

- **Security Policy**: Declared as `SECURITY DEFINER` with a fixed, safe search path (`SET search_path = pg_catalog, public`).
- **Grants**:
  - `EXECUTE` is granted exclusively to `service_role`.
  - `EXECUTE` is revoked/denied for `PUBLIC`, `anon`, and `authenticated` roles.
  - The application Server Action enforces `requirePermission('payments:write')` prior to utilizing the service-role client.

---

## 5. Invoice/Service Lifecycle Transitions

- **Deposit Invoices**: A fully-paid deposit invoice transitions the parent Service status from `Approved` to `Deposit Paid`. Partial payments of deposit invoices do not trigger this status change.
- **Final Invoices**: Final invoice payments do not trigger any Service status transitions.
- **Cancelled/Completed Services**: Payments are blocked if the parent service is cancelled or completed.

---

## 6. Historical Reference: Superseded Six-Argument Contract

Historically, a non-hardened version of payment recording was used. 

**Stale Signature (HISTORICAL - SUPERSEDED):**
`record_invoice_payment(uuid, numeric, date, text, text, text)` (lacked `p_request_id` for idempotency safety).
This six-argument signature is completely obsolete. All execute privileges on it have been revoked from `service_role`, `authenticated`, `anon`, and `PUBLIC` to prevent accidental usage.
