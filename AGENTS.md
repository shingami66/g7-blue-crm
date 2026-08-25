<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Resolve the installed repository version and read the relevant bundled guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# G7 BLUE CRM — Agent Project Guidance

## G7 Delegated Writer Execution

For bounded G7 application work, Luna may use `$agy-delegate` as the single Writer when the Owner's request calls for delegation. The normal lifecycle is:

Owner request
→ Luna Controller
→ one Gemini Writer through `$agy-delegate`
→ Gemini bounded inner loop: inspect → edit → task-authorized focused validation → diagnose → repair → repeat until locally green → report
→ Luna/Codex independent validation
→ separate native Codex Reviewer using Alibaba OCR delegation rules when review is warranted
→ logical Writer-lane repair for confirmed in-scope findings
→ Luna revalidation and bounded rereview.

The Controller owns routine discovery and compiles compact evidence capsules plus task-specific delta prompts; standing repository law remains here and in the agent-control skill rather than being repeated in every routine prompt.

The Writer may inspect and modify directly affected files inside the task-authorized working boundary, including relevant tests, local types/contracts, and direct callers/consumers required to complete the task. Exact-file allowlists remain binding when the task explicitly specifies them or when governance-sensitive, database/schema/RLS/RPC/migration, security, financial-authority, protected-infrastructure, or other materially high-risk work makes a broader envelope unsafe. A directly affected local file inside the authorized boundary is not by itself a HOLD or new Owner-approval condition; stop before a protected, materially excluded, destructive, database, deployment, production, or genuinely scope-expanding mutation. The Writer may run only task-authorized local focused tests, TypeScript, lint, or related validation inside that boundary; it is not the independent validator or final reviewer. The Writer never stages, commits, pushes, applies SQL, deploys, or changes production. Luna owns independent validation, evidence, and the final verdict. A same logical Writer does not require the same provider conversation: prefer resumption, but after a classified authentication, session, transport, or comparable environment failure, preserve work, avoid repeated discovery, ensure no prior mutating Writer remains active when checkable, and start one fresh bounded session with a Recovery Capsule. Never run two mutating Writers concurrently. Do not make `--dangerously-skip-permissions` a default; it requires explicit Owner authorization for the affected task only. Never expose authentication material or substitute an unapproved implementer. The model is selected by the task or current AGY configuration; this standing file does not freeze a model version.

## GOVERNANCE PRECEDENCE AND SAFETY

1. `AGENTS.md`
   Top-level repository authority, product rules, and relevant skill routing.
2. `.agents/skills/g7-crm-agent-control/SKILL.md`
   Bounded scope, Git/database/deployment safety, evidence, and report truthfulness.
3. Routed domain guard skills
   Such as ERP, security, documentation, tests, migrations, and precommit gates.
4. `docs/repository-worktree-governance.md`
   Supporting checkout and worktree guidance when those operations are in scope.
5. Task prompt
   Defines task-specific scope only.

A task prompt must not weaken the preserved product, security, database, Git, or deployment safeguards. A clear bounded Owner instruction authorizes ordinary in-scope work; the task boundary may be defined by the primary feature/domain/behavior, directly affected implementation, relevant tests, local types/contracts, and direct callers/consumers. Task-specific instructions may add tighter restrictions, including exact-file allowlists. Execution-mode labels remain available for specialized operations but are not required for ordinary bounded work.

## Project Identity

G7 BLUE CRM is an Events CRM + Billing System. It supports an event-company workflow where customer relationships, quotations, invoices, payments, and operations must stay connected.

Do not treat the product as a generic billing-only CRM. Business-domain decisions for events must guide invoice and project work.

## Core Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- PostgreSQL RPC
- Clerk Auth
- RBAC via `app_users` + roles + permissions
- Server Actions

## Repo Commands

- `pnpm dev` is the documented local dev command and serves the app on `http://localhost:3000`.
- `pnpm build` is the required build verification command for build-affecting changes.
- `pnpm start` runs the built app after a successful `pnpm build`.
- `pnpm lint` runs the repo ESLint config.
- `pnpm exec next typegen` is the documented Next.js route type generation check for App Router changes that rely on generated types.
- `pnpm exec tsc --noEmit` is the documented typecheck verification command for runtime implementation slices.
- `git diff --check` is the documented whitespace/conflict-marker verification command before commit readiness for implementation or docs sync work.
- Controlled commit verification also uses `git diff --name-only`, `git diff --stat`, `git diff --cached --name-only`, `git diff --cached --stat`, `git show --check --stat HEAD`, and `git show --name-only --oneline --stat HEAD` as documented in `docs/workflow-prompt-templates.md`.
- Runtime validation is proportional to risk: run the affected focused tests, typecheck, lint, and diff checks; add a full build or manual smoke only when the touched behavior warrants it or the task requests it.
- `pnpm test` runs the focused Company Settings schema test at `src/lib/settings/schemas.test.ts`.
- `docker compose up --build` builds and serves the app with `.env.local` mounted into the container.
- `speckit.agent-context.update` is the repo-installed Spec Kit command for refreshing the managed `AGENTS.md` Spec Kit block; the `after_specify` and `after_plan` entries in `.specify/extensions.yml` remain individually disabled, so no lifecycle hook may auto-write protected context.
- **Protected context hooks:** Spec Kit hooks must not automatically modify `AGENTS.md` or other protected governance/agent-context files. Context updates must name their exact files and purpose; specification or planning approval does not silently authorize unrelated context changes. Detailed execution rules remain in `.agents/skills/g7-crm-agent-control/SKILL.md`.
- Verify Supabase connectivity at `GET /api/health/db` while the local app is running.
- The local Supabase health-check workflow assumes `.env.local` already provides `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; never read, print, or edit those secrets during ordinary tasks.
- `graphify query "<question>"` is an optional navigation aid; source, tests, diffs, and validation remain authoritative.
- Read-only status checks should use `git status --short --untracked-files=all`, `git status -sb`, and `git log -3 --oneline`.
- Documentation-only changes do not require app build, migrations, or database commands.

## Working Workflow

- **Bounded authorization:** A clear Owner request defines the evidence-driven working boundary: named repository, primary feature/domain/behavior, directly affected implementation, relevant tests, local types/contracts, direct callers/consumers, systems, exclusions, and actions. Ordinary bounded work may inspect or modify directly affected local files inside that boundary; exact-file allowlists remain binding when explicitly specified or required by risk. Do not widen scope by inference.
- Luna keeps one logical Writer lane per mutation slice and allows the bounded inner loop (inspect → edit → focused validation → diagnose → repair → repeat until locally green → report) to remain in the same Owner-authorized task; a provider conversation may be replaced only through classified session-resilient recovery.
- Ordinary failing tests, unexpected code structure, and directly affected local callers, tests, or types are implementation work inside that boundary, not automatic HOLD conditions.
- Classify OAuth/login prompts, permission denials, timeouts, provider transport failures, expired conversations, and wrapper failures before model escalation; do not label them model-capability failures without evidence.
- Verify the task-supplied repository and preserve unrelated dirty state. Do not silently switch checkouts, clean files, or merge worktrees.
- Use proportional validation: affected focused tests, typecheck, lint, and diff checks; add a build or manual smoke only when risk or the task requires it.
- After merges that change delivered behavior, phase status, or decisions, update `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` as applicable.
- Before committing docs, run a documentation staleness audit: identify what changed in code, what changed outside code, what moved from pending to complete, any stale wording that must be corrected, what remains truly pending, and the next locked priority.
- Before staging or commit work, confirm the intended branch.
- For docs-only sync tasks, verify with `git status --short --untracked-files=all`, `git status -sb`, `git diff --name-only`, `git diff --stat`, `git diff --check`, and targeted `rg -n` against the allowed docs.
- Before staging or commit work, run `git status --short`.
- Stage exact files only; confirm no unrelated files, secrets, `.env.local`, or unreviewed SQL/migration files are staged.
- After staging, run `git diff --cached --stat` and `git diff --cached --check`.
- For controlled push-only tasks, verify the exact outgoing commit with `git log -1 --oneline` and `git log origin/main..HEAD --oneline` before and after `git push origin main`.
- Do not force push. Open PRs only when requested.
- Manual smoke is human-owned unless the task explicitly authorizes it; when authorized, cover only the affected route and preserve the locked Service-centered workflow.
- Approved Billing Scope is an internal billing-control layer: normal Service UX uses Billing Summary; quotation approval activates it automatically; the nested route is technical evidence. Do not expose Create Scope, line-safety review, second approval, or Void as a normal Service workflow.
- The locked Service workflow and explicit lifecycle actions remain authoritative for billing, invoice, status, and payment changes; validate only the affected slice unless the task explicitly authorizes broader smoke.

## Independent Review

- Use separate read-only/findings-only review when material behavioral, security, financial, or governance risk warrants it.
- Preserve one Writer per mutation slice and close review workers before any repair or commit stage.
- If review capacity is unavailable, report the review as incomplete; do not relabel self-review as independent review.

## Navigation

- Graphify is optional navigation evidence. Verify conclusions from actual source, diffs, tests, and validation output.

## Reporting Discipline

Use `.agents/skills/g7-crm-agent-control/SKILL.md` as the standing workflow authority for execution modes, evidence, safety gates, and reporting. It includes the compact task/report protocol; numbered prompts still require every requested item to be answered explicitly.

## Non-Negotiable Rules

Standing execution, repository, secret, SQL/Supabase, validation, and HOLD controls live in `.agents/skills/g7-crm-agent-control/SKILL.md` and must not be weakened by task prompts. Preserve the domain-specific rules below and invoke the routed guard skills when their domains apply.

Task prompts should include only task-specific scope, exceptions, expected state, validation, and next action. Routine prompts should not repeat standing prohibitions unless they create a special exception, address a material risk directly, or are high-risk and require explicit gates.

## Approved ERP Domain Rules

- The core operational entity is Service / Booking, not Project.
- The locked workflow is Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- No standalone quotations. Quotations are Service-scoped.
- Quotation `customer_id`, if retained, is derived server-side from the Service.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.
- Quotation approval requires `quotations:approve`, separate from `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- No Invoice may exist without Service.
- Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence. Do not create separate `DEP-` or `FIN-` sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Payment must link to Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear, not a progress step.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.

## Auth / RBAC Facts

- `app_users.clerk_user_id` is TEXT, not UUID.
- Never cast `clerk_user_id` to UUID.
- Fixed roles: `admin`, `manager`, `sales`, `operations`, `accountant`, `viewer`.
- `settings:read` is currently granted to `accountant` and `viewer`; `settings:write` remains admin-only via `*`.
- `services:update_status` is implemented in code for guarded manual Service status actions.
- `payments:read` gates the live read-only `/payments` page.
- `src/lib/auth/errors.ts` is canonical for `UnauthorizedError` and `ForbiddenError`.
- `UnauthorizedError` redirects to `/sign-in`.
- `ForbiddenError` shows Access Denied UI.

## Migration Workflow

Database changes must follow:

Inspect -> proposed SQL text -> review -> migration file -> review -> explicit owner-approved `SUPABASE_APPLY_ONLY` DEV/DEMO apply -> verification -> commit/push/PR/merge.

Never skip review gates for SQL, migrations, RLS, RPC, triggers, grants/revokes, or schema changes.

- Keep reviewed migration SQL in `supabase/migrations/`.
- Treat `supabase/schema.sql` as a schema reference file; do not assume it is the apply path for production changes.
- Migration application must use the exact owner-approved `SUPABASE_APPLY_ONLY` workflow against an explicitly identified non-production target; production requires separate explicit authorization. Manual SQL Editor execution remains the fallback until an approved migration-aware agent/CLI workflow is available; do not force manual execution when approved tooling can safely apply the exact reviewed migration.
- One explicit Mozfer owner approval covers the bounded DEV/DEMO sequence from preflight through final verification, including explicitly scoped verification fixtures and cleanup; no extra approval is needed between predictable in-scope steps, but material unexpected or out-of-scope conditions require HOLD and a new approval to continue.
- Admin-user seeding remains a manual Supabase SQL Editor task after review and explicit approval.

## Quotation / RPC Lessons

- Quotation numbers use `QT-YYYY-0001`.
- New quotations are service-scoped. Do not add or restore standalone quotation creation flows; start from a Service context and pass `serviceId`.
- `/quotations/new` without `serviceId` is intentionally blocked; use the Service detail or related customer flow to reach quotation creation.
- Invoice creation now resolves the active Approved Billing Scope for the Service when present, stores `approved_billing_scope_id` server-side, and uses that scope's `acceptedGrandTotal` as the billing ceiling. Fall back to the approved quotation total only when no active scope exists.
- Service create/edit keeps `customer_id`, `service_number`, and `status` non-editable in ordinary Service edit; explicit lifecycle actions, not arbitrary status selection, govern Start Execution, Complete Service, and guarded cancellation.
- Service editing and quotation creation remain limited to Services in `Inquiry` or `Quoted`; quotation approval activates the internal ABS and Approved state, deposit settlement leads to Deposit Paid, and explicit lifecycle actions govern later transitions.
- VAT is a document-level snapshot when VAT behavior is valid for that document; after CS-A, future VAT values must come from Company Settings and document snapshots, not hardcoded current-state text.
- While Company Settings is `not_registered`, quotation create/detail/PDF flows must keep VAT as not applied and avoid tax-invoice wording.
- Discount applies before VAT.
- `quotation_items.vat` stores VAT amount, not VAT rate.
- In PL/pgSQL `RETURNS TABLE` functions, qualify column names with table aliases to avoid ambiguity with output variables.

## Supplier Allocation Lessons

- Supplier allocations are Service-scoped internal records. Keep allocation cost data out of customer-facing quotations, invoices, PDFs, and public/client routes.
- Supplier allocation cost visibility and write/cancel actions are Admin/Manager-only via `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, and `supplier_allocations:cancel`.
- New, updated, restored, or cancelled allocations must stay blocked when the parent Service is `Completed` or `Cancelled`.
- Manual allocation edit is currently limited to non-deleted, non-cancelled `manual_estimate` rows; rate-card allocations can be created but are not manually editable in this slice.
- Cancel preserves allocation history as `status = cancelled`; delete/restore uses the hidden-record path and `?showDeleted=true` on the Service detail view.
- Allocations linked to an active Supplier Booking must not be updated, cancelled, deleted, or restored until that booking is cancelled.

## Supplier Booking Lessons

- Supplier Bookings are internal-only Service Detail records created from selected supplier allocations. Do not add standalone routes, PDFs, portals, or customer-facing surfaces for this slice.
- Supplier Booking access is Manager/Admin-only via `supplier_bookings:read`, `supplier_bookings:read_cost`, `supplier_bookings:write`, and `supplier_bookings:cancel`; operations, sales, accountant, and viewer currently have no access.
- Create accepts only `sourceAllocationId`, derives business and cost fields server-side from the selected allocation, and must not manually set `booking_number`.
- Supplier Booking costs and internal details must remain permission-redacted unless `supplier_bookings:read_cost` is granted.
- Active Supplier Bookings are limited to one per source allocation; current statuses remain `draft` and `cancelled`, and cancellation requires a reason.
- New or cancelled Supplier Bookings must stay blocked when the parent Service is `Completed` or `Cancelled`.

## Product Direction

G7 BLUE CRM is moving toward Events CRM + Billing.

Do not start invoice schema work before business-domain answers are documented. Core Service-linked quotation, invoice, payment, VAT safety, and deposit/final invoice decisions are documented; leads/inquiries, vendors/suppliers, event type taxonomy, production RLS, and real-vs-fake demo data remain decision gates.

For CS-A, keep `/settings` limited to the live singleton `company_settings` record keyed by `setting_key='default'`. Do not wire live Company Settings into quotation or invoice print views until CS-B snapshot design is approved.

## Local Skills

Use local guard skills when their domain materially applies to the actual task. They reinforce these project rules; do not invoke unrelated guards merely because a broad keyword appears.

The Spec Kit agent-context extension manages only the `<!-- SPECKIT START -->` to `<!-- SPECKIT END -->` block in this file. Do not manually rewrite that managed block during ordinary tasks unless the task explicitly targets Spec Kit context maintenance.

## Guard Skill Routing

Choose guards from the actual change and risk, not from a ceremonial keyword checklist:

- Use `$g7-crm-erp-guard` for material ERP, financial, or product-workflow behavior.
- Use `$g7-security-hardening-guard` for actual auth, permissions, secrets, RLS, webhook, or security risk.
- Use `$clean-code-guard`, `$docs-guard`, `$test-guard`, and `$g7-crm-precommit-gate` when their substantive review improves the relevant implementation, documentation, tests, or Git stage.
- Use `$g7-crm-migration-review` for actual SQL, migration, RPC, RLS, grant, trigger, or schema work.
- Use `$g7-postgres-query-index-guidance` only for an explicitly bounded query-shape, missing-index, partial-index, WHERE/JOIN-index, or supplied-query-plan question. It provides recommendation-only technical guidance and never replaces migration, security, ERP, or Controller authority.
- Use `$g7-erp-design-guard` for material UI, UX, accessibility, RTL/LTR, or visual work, and `$g7-speckit-plan-guard` for Spec Kit planning.

Guard routing does not itself authorize implementation, staging, commit, push, database action, deployment, or production change. Do not rely on UI-only checks for security.

- `.agents/skills/g7-crm-erp-guard/SKILL.md`
  Consult for material G7 ERP, financial, or product-workflow changes.

- `.agents/skills/g7-security-hardening-guard/SKILL.md`
  Consult for actual security, auth, permissions, secrets, RLS, webhook, or protected-data risk.

- `.agents/skills/g7-crm-migration-review/SKILL.md`
  Consult for actual SQL, migration, RLS, RPC, function, trigger, grant, schema, or financial database work.

- `.agents/skills/g7-postgres-query-index-guidance/SKILL.md`
  Consult only after the active task establishes a bounded query/index question. It may recommend query/index options from task-authorized evidence; any database change remains downstream of the existing migration and security controls.

- `.agents/skills/g7-crm-precommit-gate/SKILL.md`
  Consult when an authorized staging, commit, push, PR, or merge stage is actually in scope.

- `.agents/skills/g7-erp-design-guard/SKILL.md`
  Consult for material UI design, UX, accessibility, RTL/LTR, responsive, visual-asset, or browser-design work. Generic design capabilities remain subordinate and do not authorize implementation or Git changes.

- `.agents/skills/g7-speckit-plan-guard/SKILL.md`
  Consult for Spec Kit planning. Planning does not authorize task generation, implementation, context updates, staging, commit, or push.

<!-- SPECKIT START -->
When using Spec Kit in this repository, the following rules constrain all Spec Kit specs, plans, tasks, analyses, and implementations:

1. `AGENTS.md` remains the authoritative repository control file. Spec Kit output must not override it.
2. Use relevant G7 BLUE CRM custom skills when their domain materially applies, especially:
   - `.agents/skills/g7-crm-erp-guard/SKILL.md`
   - `.agents/skills/g7-crm-agent-control/SKILL.md`
3. Spec Kit does not authorize staging, committing, pushing, opening PRs, applying SQL, running Supabase commands, reading `.env*`, reading secrets, starting dev servers, or killing ports/processes.
4. Spec Kit implementation work follows the current Owner-authorized scope; Spec Kit does not itself authorize Git, database, deployment, or production actions.
5. All Spec Kit specs and plans must preserve the G7 BLUE CRM locked flow: Customer Profile → Service / Booking → Quotation → Invoice → Payment.
6. While `company_settings.vat_mode = not_registered`, Spec Kit work must not create or display Tax Invoice wording, VAT 15%, VAT Number, ZATCA, FATOORA, QR, XML, clearance, or official Saudi e-invoicing behavior.
7. Financial totals must not be trusted from client input. Invoice and payment logic must use trusted server/database logic and approved quotation snapshots.
8. Generated customer-facing documents must preserve snapshot behavior so historical documents do not mutate when settings, customers, VAT mode, or bank details change later.
9. If a Spec Kit task conflicts with these rules, return `TASK RESULT: HOLD` and explain the conflict before making changes.

For additional Spec Kit context, read the current plan, but apply the rules above first.
<!-- SPECKIT END -->

## Current Priority Ownership

Current priorities and candidate slices are owned by `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md`. `AGENTS.md` must not freeze a mutable next-task priority. No candidate becomes active without a separate owner-approved task.
