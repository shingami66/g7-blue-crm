# Service Status State Machine Tasks

## Task Scope Rules

- Keep the first implementation focused on guarded manual Service status transitions.
- Do not implement automatic transitions until manual guards are stable.
- Do not create SQL, migrations, schema edits, package changes, hooks, installs, or supplier workflow changes in the first implementation.
- Separate implementation, docs sync, commit, and push into separate controlled prompts.

## Phase 0: Design Confirmation

- [ ] T001 Confirm this Spec Kit artifact with the user; allowed files are read-only spec files; verify open questions about Deposit Invoice payment threshold and cancellation override; no staging or commit.
- [ ] T002 Confirm the canonical statuses remain `Inquiry`, `Quoted`, `Approved`, `Deposit Paid`, `In Progress`, `Completed`, and `Cancelled`; allowed files are read-only spec files and current service type/schema references; no staging or commit.
- [ ] T003 Confirm `services:update_status` is accepted as the dedicated permission for status transitions; allowed files are read-only spec/docs/code references; no staging or commit.

## Phase 1: Server-Side Transition Guard

- [ ] T004 Add a service transition map/helper under the service domain layer; likely files are `src/lib/services/*` and `src/types/service.ts`; verify no status label is renamed and no new `Confirmed` status is added.
- [ ] T005 Add server-side evidence checks for quotations, invoices, and payments; likely files are `src/lib/services/*`, with possible read-only reuse of invoice billing helpers; verify client-submitted evidence is ignored.
- [ ] T006 Update `updateServiceStatusAction` to require `services:update_status`, load the current Service from the database, validate current-to-next transition, enforce preconditions, require cancellation reason when needed, and return safe blocked messages.
- [ ] T007 Preserve route revalidation for `/services` and `/services/[id]`; verify no raw database errors are exposed to UI.

## Phase 2: UI Next-State Filtering

- [ ] T008 Replace the all-status select with next valid transition actions; likely file is `src/app/(dashboard)/services/[id]/ServiceStatusControl.tsx`; verify invalid statuses are not selectable.
- [ ] T009 Show blocked transition reasons where useful; likely files are Service detail status components; verify the copy tells users what to do next.
- [ ] T010 Keep terminal states read-only; verify `Completed` and `Cancelled` do not show normal forward actions.
- [ ] T011 Hide manual status mutation controls unless the user has `services:update_status`; verify Viewer, Sales, and Accountant do not get manual controls by default.

## Phase 3: Permission And RBAC Update

- [ ] T012 Add `services:update_status` to the code permission map; likely file is `src/lib/auth/permissions.ts`; grant Manager and Operations, while Admin keeps wildcard access.
- [ ] T013 Keep `services:write` for ordinary Service create/edit/delete behavior; verify status changes no longer use `services:write`.
- [ ] T014 Verify Accountant can still record payments through `payments:write` without receiving manual status mutation permission.

## Phase 4: Optional Later Automation

- [ ] T015 After manual guards pass smoke, design a separate task to call the same transition helper from payment recording when a confirmed Deposit Invoice payment is recorded; likely files are payment action and service transition helper; no implementation in this first task.
- [ ] T016 Keep quotation approval automation deferred unless separately approved; approval should enable `Approved` but not automatically change Service status in the first implementation.

## Phase 5: Manual Smoke

- [ ] T017 Smoke `Inquiry` with no quotation: `Quoted` is blocked or unavailable with a clear reason.
- [ ] T018 Smoke `Inquiry` with quotation: `Quoted` is allowed.
- [ ] T019 Smoke `Quoted` without approved quotation: `Approved` is blocked.
- [ ] T020 Smoke `Quoted` with approved quotation: `Approved` is allowed.
- [ ] T021 Smoke `Approved` without Deposit Invoice/payment: `Deposit Paid` is blocked.
- [ ] T022 Smoke `Approved` with Deposit Invoice and confirmed payment: `Deposit Paid` is allowed.
- [ ] T023 Smoke `Deposit Paid` to `In Progress`.
- [ ] T024 Smoke `In Progress` with unpaid active invoice: `Completed` is blocked.
- [ ] T025 Smoke `In Progress` with financial closure complete: `Completed` is allowed.
- [ ] T026 Smoke cancellation without reason: blocked.
- [ ] T027 Smoke cancellation with active financial records: blocked until finance cancellation policy exists.
- [ ] T028 Smoke role boundaries for Admin, Manager, Operations, Accountant, Sales, and Viewer.

## Phase 6: Docs Sync

- [ ] T029 After implementation and smoke pass, update canonical tracking docs in a separate docs-only task; exact allowed files must be named by that future prompt.
- [ ] T030 Docs sync must state that supplier edit/delete/finance workflows remain deferred and that no VAT/ZATCA/FATOORA behavior changed.

## Phase 7: Controlled Commit And Push

- [ ] T031 Commit implementation only through a controlled commit prompt after verification.
- [ ] T032 Push only through a separate controlled push prompt.
- [ ] T033 Commit docs sync only through a separate controlled docs commit prompt.
- [ ] T034 Push docs sync only through a separate controlled docs push prompt.

## Deferred Items

- Status history/audit table.
- Automatic quotation approval to Service status update.
- Automatic deposit payment to Service status update.
- Admin/Manager cancellation override with active financial records.
- Completion reversal or reopening.
- Supplier workflow integration.
- Complex approval workflow.
