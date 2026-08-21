# Roles & Permissions

The application uses Role-Based Access Control (RBAC) managed via the `app_users` table.

## Roles Matrix

| Role | Permissions |
|---|---|
| **admin** | All permissions across all modules via `*` (including `services:read_billing_summary`, `invoices:read`, `invoices:write`, and relevant ABS write permissions). Canonical map: `src/lib/auth/role-permissions.ts` (re-exported through `src/lib/auth/permissions.ts`). |
| **manager** | `customers:read/write/export`, `quotations:read/write/approve`, `services:read/write/update_status`, `services:read_billing_summary`, **`invoices:read` and `invoices:write`** (bounded application workflow for Deposit/Final creation under the same server gates as Admin), `payments:read`, `projects:read/write`, `suppliers:read/write`, Supplier Allocations permissions, Supplier Bookings (`supplier_bookings:read/read_cost/write/cancel`), Approved Billing Scope V1 (`approvedBillingScopes:read/create/update/review/approve/void/supersede/discard` via manager ABS grant set), `dashboard:read`. Detailed sections and `role-permissions.ts` / `permissions.ts` are authoritative. |
| **sales** | `customers:read/write`, `quotations:read/write`, `services:read/write`, `services:read_billing_summary`, `invoices:read`, `payments:read`, `dashboard:read` |
| **operations** | `customers:read`, `quotations:read`, `services:read`, `services:read_billing_summary`, `services:update_status`, `projects:read/write`, `suppliers:read/write`, `dashboard:read` |
| **accountant** | `customers:read/export`, `quotations:read`, `services:read`, `services:read_billing_summary`, **`invoices:read` only (no `invoices:write`)**, `payments:read/write`, `settings:read`, `dashboard:read`, plus ABS accountant read grants. Financial visibility without Invoice mutation authority. |
| **viewer** | Limited read-only access: `customers:read`, `quotations:read`, `services:read`, `invoices:read`, `payments:read`, `projects:read`, `suppliers:read`, `dashboard:read`, and `settings:read`. Viewer is not granted `services:read_billing_summary`. No bulk export, Approved Billing Scope, Supplier Allocation, or Supplier Booking access; no internal supplier cost visibility; and no full bank values in Company Settings responses. |

## Company Settings CS-A

- `settings:read` allows viewing Company Settings.
- `settings:write` is required for updates. Admin has this through the wildcard `*`; no non-admin role receives `settings:write` in CS-A.
- Bank details are visible only to Admin and Accountant. Viewer can load `/settings`, but bank values are not sent to the client.
- Production RLS must be planned for `company_settings` before real/semi-real data because it contains bank, legal, CR/TIN, and VAT data.
- Viewer bank-detail masking test case: Viewer opens `/settings`; response/data passed to the client must not include full IBAN, bank account holder, or bank account values.

## Supplier Directory V1

- `suppliers:read` permits the live Supplier directory and detail route. The normal directory DTO is summary-only and excludes notes, CR/VAT values, bank values, blacklist audit details, and Clerk audit IDs.
- `suppliers:write` permits the non-bank create, edit, lifecycle, and blacklist workflows for the roles defined in the matrix. Visible controls do not replace server-side permission enforcement.
- `suppliers:read_bank`, `suppliers:write_bank`, and `suppliers:delete` are Admin-only through the Admin wildcard `*`. Manager and Operations do not receive bank values; bank write actions, soft delete, and restore enforce their permission server-side.
- Soft delete is blocked when active Supplier Allocations or Supplier Bookings exist. The application-layer dependency check is not transactional.
- Accountant has no Supplier Directory bank grant in the current role map. Accountant Supplier-bank access is deferred. This rule is distinct from Company Settings bank visibility.
- Production RLS/readiness is not asserted by Supplier Directory V1.

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

## Approved Billing Scope

- V1 read access: Admin, Manager, Accountant.
- V1 create draft: Admin, Manager.
- V1 edit draft: Admin, Manager.
- V1 line safety review: Admin, Manager.
- V1 approve: Admin, Manager.
- V1 void: Admin, Manager.
- V1 supersede: Admin, Manager.
- V1 discard draft: Admin, Manager.
- Viewer has no Approved Billing Scope access in V1.
- Sales has no Approved Billing Scope access in V1.
- Internal notes and reviewer reasons are visible only to Admin and Manager in V1.
- Accountant may read scope headers and items in V1, but not internal notes or reasons.
- Supplier/internal cost and margin must not exist in customer-facing scope snapshots or outputs.
- Scope approval, supersede, and void actions must be audited.
- The foundation migration has now been applied and smoke-tested in DEV/DEMO only; this does not grant production permission or change the locked approval-role assumptions above.

## Service Permissions

- `services:read` allows viewing Services and the Service Hub.
- `services:write` is required for service create/edit/delete controls.
- Visible Service edit controls must be hidden unless the user has `services:write`; route/action enforcement remains server-side.
- Service status transition permissions/actions remain deferred. Do not treat `services:write` as status automation.

## Service Billing Summary Permission

- `services:read_billing_summary` is distinct from both `services:read` and `invoices:read`.
- It requires `services:read` and permits only the effective billing ceiling, aggregate applicable Invoice exposure, and remaining billable amount on Service Detail.
- It does not expose Invoice IDs, numbers, dates, individual statuses or amounts, records, documents, workspace data, mutation eligibility, quotation identity, ABS identity/provenance, or supplier cost data.
- Admin receives it through `*`; Manager, Accountant, Operations, and Sales receive it explicitly; Viewer does not.
- Server authorization occurs before privileged service-role financial reads. Parent Service Detail omits the section when the capability is unavailable.

## Invoice And Payment Permissions

- Canonical permission constants: `INVOICE_PERMISSIONS.read` (`invoices:read`) and `INVOICE_PERMISSIONS.write` (`invoices:write`) live in `src/lib/auth/role-permissions.ts`.
- **Admin:** retains Invoice write authority through wildcard `*` (and therefore `invoices:write`).
- **Manager:** receives bounded Invoice write parity (`invoices:write`) for Service Detail Deposit/Final creation under the same server-side lifecycle, authority, exposure, and ceiling checks as Admin. UI control visibility is not sufficient authorization.
- **Accountant:** remains Invoice **read-only** (`invoices:read` only; no `invoices:write`). May view financial billing/ABS surfaces granted for read, but cannot create or mutate Invoices through application write paths.
- Server-side `requirePermission` / `checkPermission` (via `hasPermissionForRole`) are the security boundary. Permission denial must occur before privileged service-role / admin-client work.
- No Invoice may exist without a Service.
- Every Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice type uses `invoice_type = deposit | final`.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence; do not create separate `DEP-` or `FIN-` sequences.
- Payment must link to an Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed at 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Financial records must use void/cancel/reversal workflows rather than hard deletion.
- **Browser evidence (DEV/DEMO):** Admin path browser-proven for the financial lifecycle acceptance. Manager and Accountant Invoice RBAC behavior is covered by automated permission tests; dedicated Manager and Accountant browser sessions remain optional future smoke and must not be claimed as completed.

## Supplier Allocations Permissions

- Permissions added for Admin/Manager only:
  - `supplier_allocations:read`
  - `supplier_allocations:read_cost`
  - `supplier_allocations:write`
  - `supplier_allocations:cancel`
- No `supplier_allocations:approve` permission exists for allocations in the MVP.
- Operations, Sales, Viewer, and Accountant still have no Supplier Allocations access.
- MVP separation between `supplier_allocations:read` and `supplier_allocations:read_cost` ensures cost visibility remains restricted.
- Domain module `src/lib/supplier-allocations/` implements types, Zod schemas, mappers, server-only reads, and Service-scoped create/edit/transition/cancel/delete/restore actions. Mappers redact `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` without `supplier_allocations:read_cost`; server reads require `supplier_allocations:read` and evaluate `read_cost` before mapping. Create/update inputs do not accept generated totals or service reassignment. Manual mutations require the applicable server permission, are blocked for terminal Services and active Bookings, and use conditional affected-row checks. Restore rechecks the active, non-deleted, non-blacklisted Supplier. Rate-card allocations may be created only from currently valid active cards and cannot be deleted or restored.


### Status Transitions
- `Create -> draft`: `supplier_allocations:write`
- `draft -> planned`: `supplier_allocations:write`
- `planned -> selected`: `supplier_allocations:write`
- `Any -> cancelled`: `supplier_allocations:cancel`

Avoid confirmed status at allocation level because confirmation/commitment belongs to future Supplier Booking / Internal PO.

## Supplier Bookings Permissions

- Supplier Bookings are internal, Service-scoped Admin/Manager workflows only: `supplier_bookings:read`, `supplier_bookings:read_cost`, `supplier_bookings:write`, and `supplier_bookings:cancel`.
- Operations, Sales, Viewer, and Accountant have no Supplier Booking access in this V1 slice.
- Booking creation derives the allocation, Supplier, Service, and cost snapshot server-side. It requires an active, non-deleted, non-blacklisted Supplier and prevents a second active Booking for the same allocation.
- Booking cancellation requires `supplier_bookings:cancel`, a non-empty reason, and a conditional affected-row check. The UI does not surface raw server/database error text.

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

## MVP RBAC Role Mapping (Supplier Allocations)
Supplier Allocations access is Admin/Manager-only in MVP.
Admin: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`
Manager: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`
No Supplier Allocations access in MVP: Accountant, Sales, Operations, Viewer.
Future access for Accountant, Sales, or Operations requires explicit Project Owner approval.

## write/read_cost Invariant
Any role with `supplier_allocations:write` must also have `supplier_allocations:read_cost` in MVP.

## Cost-Bearing Update Enforcement
For MVP, any `updateSupplierAllocation` operation should require `supplier_allocations:read_cost`.
This is approved as an MVP simplification because Supplier Allocation write access is Admin/Manager-only, and both roles have `read_cost`.
This should be revisited if future non-cost contributor roles are introduced.

## Supplier Options Permission Rule
Future `getActiveSupplierOptions` must require both `supplier_allocations:write` and `suppliers:read`.
It must return minimal safe fields only: supplier id, safe display name.
It must not return: IBAN, bank details, account details, internal notes, rate-card data, supplier financial secrets.

## Server-Action Defense-in-Depth
Server actions should enforce `supplier_allocations:read_cost` when accepting cost-bearing create/update input.
UI hiding alone is not sufficient.

## Sales / Pricing Clarification
Early-stage supplier cost estimates inform Admin/Manager pricing decisions directly.
Sales does not have direct access to supplier allocation cost data in MVP.
Sales relies on Admin/Manager-provided or Admin/Manager-approved quotation pricing rather than viewing supplier estimates independently.
