# Service Status State Machine Plan

## Current Code Touchpoints

- `src/types/service.ts`
  - Defines `SERVICE_STATUSES`: `Inquiry`, `Quoted`, `Approved`, `Deposit Paid`, `In Progress`, `Completed`, `Cancelled`.
- `src/lib/services/schemas.ts`
  - Validates requested status against the existing status list.
  - Requires cancellation reason when status is `Cancelled`.
- `src/lib/services/actions.ts`
  - `updateServiceStatusAction` currently requires `services:write`.
  - The action loads the Service but does not validate a transition map or workflow evidence.
- `src/app/(dashboard)/services/[id]/ServiceStatusControl.tsx`
  - Renders every status in a select list.
- `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx`
  - Already shows the intended linear timeline and says status transitions are future controlled workflow actions.
- `src/app/(dashboard)/services/[id]/BillingPanel.tsx`
  - Exposes approved quotation, Deposit Invoice, Final Invoice, and billing state.
- `src/lib/invoices/billing-state.ts`
  - Finds approved quotation and active deposit/final invoices for a Service.
- `src/lib/payments/actions.ts`
  - Records invoice payments through a trusted payment RPC and does not currently update Service status.
- `src/lib/auth/permissions.ts`
  - Does not yet define `services:update_status`.
- `supabase/schema.sql`
  - Existing Service status constraint already includes the needed status labels.

## Implementation Strategy

1. Add a Service transition model in the service domain layer.
   - Define valid next statuses by current status.
   - Define terminal statuses.
   - Define blocked statuses and reason keys.
2. Add server-side precondition checks.
   - Query Service from the database.
   - Query quotations by Service.
   - Query active invoices by Service.
   - Query payments through the Deposit Invoice path.
   - Compute whether the requested transition is allowed.
3. Add a dedicated permission.
   - Introduce `services:update_status` in the code permission map.
   - Grant to Admin through wildcard, plus Manager and Operations.
   - Do not grant to Accountant, Sales, or Viewer by default.
4. Replace free status selection in the UI.
   - Show only valid next transition actions.
   - Show unavailable next steps with explanation where helpful.
   - Keep terminal states read-only.
5. Keep automatic transitions deferred at first.
   - Manual guarded transitions should land first.
   - A later task can call the same server helper from payment recording to move to `Deposit Paid`.
6. Preserve route revalidation and safe errors.
   - Revalidate Service detail and Services list.
   - Do not expose raw database errors.

## File And Module Impact Estimate

Likely implementation files:

- `src/types/service.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/services/schemas.ts`
- `src/lib/services/actions.ts`
- New service transition helper under `src/lib/services/`
- `src/app/(dashboard)/services/[id]/ServiceStatusControl.tsx`
- `src/app/(dashboard)/services/[id]/page.tsx`
- Possibly `src/lib/invoices/billing-state.ts` if shared evidence helpers are reused or extended

Likely manual smoke surfaces:

- `/services`
- `/services/[id]`
- `/quotations/[id]`
- `/invoices`
- payment recording modal

## Database Migration Verdict

No database migration is expected for the first guarded-transition implementation.

Reasons:

- `services.status` already supports the needed labels.
- `cancellation_reason` already exists.
- `updated_by` already exists.
- Related evidence already exists through quotations, invoices, and payments.
- Permissions are currently code-defined in `src/lib/auth/permissions.ts`.

A future migration may be justified only if the team approves a status audit/history table, database-enforced transition triggers, or a database-backed permission model. Those are deferred.

## Testing And Smoke Plan

Code verification for a later implementation:

- TypeScript check.
- Lint if source files change.
- Focused action/unit tests if a test harness exists for service transition helpers.

Manual smoke for a later implementation:

1. Service in `Inquiry` with no quotation shows no `Quoted` action or shows it disabled with reason.
2. Service in `Inquiry` with a quotation allows `Quoted`.
3. Service in `Quoted` without approved quotation blocks `Approved`.
4. Service in `Quoted` with approved quotation allows `Approved`.
5. Service in `Approved` without Deposit Invoice/payment blocks `Deposit Paid`.
6. Service with confirmed deposit payment allows `Deposit Paid`.
7. Service in `Deposit Paid` allows `In Progress`.
8. Service in `In Progress` with unpaid active invoices blocks `Completed`.
9. Service in `In Progress` with paid active invoices allows `Completed`.
10. Cancellation requires a reason.
11. Terminal statuses do not show normal forward actions.
12. Viewer cannot see status mutation controls.
13. Sales and Accountant cannot manually change Service status by default.
14. Manager, Operations, and Admin can use valid transitions only.

## Risk Analysis

- High risk: allowing manual status changes that bypass quotation, invoice, or payment evidence.
- High risk: granting status mutation through broad `services:write`.
- Medium risk: over-blocking real operations before finance cancellation flow is designed.
- Medium risk: stale existing Services may need step-by-step catch-up.
- Low risk: adding the transition map in code if status labels remain unchanged.

## Rollout Strategy

1. Confirm this spec and open questions.
2. Implement the server transition helper and permission change first.
3. Update UI to consume next valid states.
4. Manually smoke the full Service-centered workflow.
5. Run docs sync after implementation is verified.
6. Commit and push only through separate controlled prompts.

## Do Not Code Yet

This plan is design-only. No source code, schema, migration, SQL, package, hook, install, staging, commit, or push action is authorized by this artifact.
