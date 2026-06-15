# Auth And RBAC Guardrails

Use this reference for Clerk authentication, `requirePermission`, role and permission enforcement, webhooks, unauthorized/forbidden behavior, and role boundaries in G7 BLUE CRM.

## Non-Negotiables

- Require server-side authentication for all write actions.
- Require `requirePermission` for all write actions.
- Treat Clerk authentication as identity only; enforce authorization separately.
- Do not trust roles, permissions, user IDs, organization IDs, statuses, or ownership claims submitted by the browser.
- Keep Viewer read-only.
- Keep Sales from approving quotations unless explicitly approved.
- Return clear Unauthorized or Forbidden behavior; do not hide authorization failures as empty data or fake success.

## Clerk And Server Boundaries

- Check authentication on the server before reading or mutating sensitive CRM or financial data.
- Enforce permissions in Server Actions, API routes, webhooks, and server-side data helpers.
- Do not rely on hidden UI buttons, disabled form fields, route guards, or client state as security controls.
- Do not expose raw auth provider errors to users.
- Keep role and permission derivation server-side and consistent with existing `src/lib/auth/permissions.ts` patterns.

## Webhooks

- Verify Clerk/Svix webhook signatures before processing any webhook body.
- Reject invalid, unsigned, expired, replayed, or malformed webhooks.
- Do not trust webhook payloads until the signature is verified.
- Make user sync idempotent so duplicate webhook delivery does not create duplicate users, roles, or inconsistent state.
- Log webhook failures safely without secrets or raw sensitive payloads.

## Sensitive Permissions

- `settings:write`: Admin only unless explicitly approved.
- `quotations:approve`: Manager/Admin.
- `services:update_status`: Operations/Manager/Admin.
- `invoices:write`: Accountant/Admin.
- `invoices:void`: Accountant/Admin.
- `payments:write`: Accountant/Admin.

## Review Questions

- Does every write path check both authentication and `requirePermission` server-side?
- Can a user escalate by editing request JSON, IDs, role names, permission names, hidden fields, or query params?
- Are unauthorized and forbidden states distinct enough for debugging without leaking sensitive data?
- Are role boundaries consistent with the existing G7 BLUE permissions model?
- Are webhook signatures verified before any database mutation?
