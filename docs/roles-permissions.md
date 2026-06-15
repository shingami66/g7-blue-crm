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

## Security Notes

- Do not treat UI hiding as security. Server-side permission checks are required.
- Server-side masking is required for sensitive values such as bank details.
- Consider rate limiting sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, and settings update.

## Implementation Guidelines
In Server Actions and API routes, permissions are enforced using helper functions from `src/lib/auth/permissions.ts`:
- `getCurrentAppUser()`
- `requireUser()`
- `requireRole(role)`
- `requirePermission(permission)`

**Note:** The application uses these helpers directly to perform authorization checks. Direct calls to `auth()` should be avoided in favor of `requireUser` or `requirePermission` which automatically check the `app_users` table and return the user record.
