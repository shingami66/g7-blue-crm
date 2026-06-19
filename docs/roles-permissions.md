# Roles & Permissions

The application uses Role-Based Access Control (RBAC) managed via the `app_users` table.

## Roles Matrix

| Role | Permissions |
|---|---|
| **admin** | All permissions across all modules. |
| **manager** | `customers:read/write`, `quotations:read/write`, `quotations:approve`, `invoices:read`, `payments:read`, `projects:read/write`, `suppliers:read/write`, `dashboard:read` |
| **sales** | `customers:read/write`, `quotations:read/write`, `invoices:read`, `payments:read`, `dashboard:read` |
| **operations** | `customers:read`, `quotations:read`, `projects:read/write`, `suppliers:read/write`, `dashboard:read` |
| **accountant** | `customers:read`, `quotations:read`, `invoices:read/write`, `payments:read/write`, `settings:read`, `dashboard:read` |
| **viewer** | Read-only access to all modules (`*:read`). |

## Company Settings CS-A

- `settings:read` allows viewing Company Settings.
- `settings:write` is required for updates. Admin has this through the wildcard `*`; no non-admin role receives `settings:write` in CS-A.
- Bank details are visible only to Admin and Accountant. Viewer can load `/settings`, but bank values are not sent to the client.
- Production RLS must be planned for `company_settings` before real/semi-real data because it contains bank, legal, CR/TIN, and VAT data.
- Viewer bank-detail masking test case: Viewer opens `/settings`; response/data passed to the client must not include full IBAN, bank account holder, or bank account values.

## Quotation Approval

- Approval requires `quotations:approve`.
- Recommended roles: Admin and Manager.
- Sales can create/send quotations with `quotations:write`, but cannot approve unless explicitly granted `quotations:approve`.
- Quotation approval must not be treated as the same permission as `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- Quotations are Service-scoped; no standalone quotation creation is allowed.
- Quotation `customer_id`, if present, must be derived server-side from the Service rather than accepted from the client.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.

## Invoice And Payment Permissions

- No Invoice may exist without a Service.
- Every Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice type uses `invoice_type = deposit | final`.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence; do not create separate `DEP-` or `FIN-` sequences.
- Payment must link to an Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed at 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Financial records must use void/cancel/reversal workflows rather than hard deletion.

## Security Notes

- Do not treat UI hiding as security. Server-side permission checks are required.
- Server-side masking is required for sensitive values such as bank details.
- Consider rate limiting sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.

## Implementation Guidelines
In Server Actions and API routes, permissions are enforced using helper functions from `src/lib/auth/permissions.ts`:
- `getCurrentAppUser()`
- `requireUser()`
- `requireRole(role)`
- `requirePermission(permission)`

**Note:** The application uses these helpers directly to perform authorization checks. Direct calls to `auth()` should be avoided in favor of `requireUser` or `requirePermission` which automatically check the `app_users` table and return the user record.
