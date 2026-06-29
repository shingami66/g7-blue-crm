# Roles & Permissions

The application uses Role-Based Access Control (RBAC) managed via the `app_users` table.

## Roles Matrix

| Role | Permissions |
|---|---|
| **admin** | All permissions across all modules. |
| **manager** | `customers:read/write/export`, `quotations:read/write`, `quotations:approve`, `services:read/write`, `invoices:read`, `payments:read`, `projects:read/write`, `suppliers:read/write`, `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `dashboard:read` |
| **sales** | `customers:read/write`, `quotations:read/write`, `services:read/write`, `invoices:read`, `payments:read`, `dashboard:read` |
| **operations** | `customers:read`, `quotations:read`, `services:read`, `projects:read/write`, `suppliers:read/write`, `dashboard:read` |
| **accountant** | `customers:read/export`, `quotations:read`, `services:read`, `invoices:read/write`, `payments:read/write`, `settings:read`, `dashboard:read` |
| **viewer** | Read-only access to all modules, including `services:read`. Cannot export bulk data. |

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

## Service Permissions

- `services:read` allows viewing Services and the Service Hub.
- `services:write` is required for service create/edit/delete controls.
- Visible Service edit controls must be hidden unless the user has `services:write`; route/action enforcement remains server-side.
- Service status transition permissions/actions remain deferred. Do not treat `services:write` as status automation.

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

## Supplier Allocations Permissions

- `supplier_allocations:read` and `supplier_allocations:read_cost` are separate permissions. MVP separation ensures cost visibility remains restricted.
- MVP requires Admin and Manager to have full access.
- Operations, Sales, and Viewer have no access in the MVP.
- No `supplier_allocations:approve` permission exists for allocations in the MVP.

### Status Transitions
- `Create -> draft`: `supplier_allocations:write`
- `draft -> planned`: `supplier_allocations:write`
- `planned -> selected`: `supplier_allocations:write`
- `Any -> cancelled`: `supplier_allocations:cancel`

Avoid confirmed status at allocation level because confirmation/commitment belongs to future Supplier Booking / Internal PO.

## Security Notes

- **Access model decision:** G7 BLUE CRM will use an invite-only access model for production. New users must be invited/created by an authorized admin through `Admin > Users`, assigned a role, and activated before CRM access is permitted. Self-signup is not the official production access workflow.
- **Production hardening checklist:** Before production deployment, Clerk Dashboard must be configured to invitation-only signup mode to prevent unauthorized account creation at the Clerk level.
- Authentication is not authorization. A signed-in Clerk user must not access internal CRM pages unless they have an active `app_users` row. The current security gate blocks any Clerk-authenticated user without an active `app_users` row.
- The `(dashboard)` layout enforces an `app_users` membership gate server-side. Users without an active `app_users` row are redirected to `/unauthorized` and never see dashboard content, sidebar, or internal navigation.
- The `app_users` lookup matches on `clerk_user_id` (TEXT). Email is not used as a lookup key for authorization.
- New Clerk signups remain blocked from CRM access unless they have an active `app_users` row. `ADMIN-USER-MANAGEMENT-1A` selected an invite-first design for future implementation: Clerk invitation acceptance will be synced into `app_users` by a verified `user.created` webhook in `ADMIN-USER-MANAGEMENT-1B`.

## Admin User Management Permissions

- `users:invite` — Admin only
- `users:manage` — Admin only

Invitation metadata is bootstrap-only for creating the initial `app_users` row after Clerk invitation acceptance. It must not be used as an authorization source after user creation. Final CRM authorization remains based on `app_users.role`.

If webhook metadata is missing, invalid, or contains an unrecognized role, the webhook must not create an `app_users` row and must not assign a fallback role such as `viewer`.
- ADMIN-USER-MANAGEMENT-1B code implementation is complete; real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- Real Clerk webhook testing requires `CLERK_WEBHOOK_SIGNING_SECRET`; the webhook must fail safe if the signing secret is missing.
- Admins may invite another user with any allowed CRM role, including `admin`, only by explicitly selecting that role. The system must not default invitations to `admin`.
- No real Clerk users/invitations were created during implementation.
- Self-deactivation, self-role-change, final-active-admin deactivation, and final-active-admin demotion are blocked server-side to reduce admin lockout risk.
- Pending invitation revocation uses a CRM-styled confirmation modal instead of native browser `confirm()`.
- Real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
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
