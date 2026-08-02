# G7 Skill Routing Policy

## 1. Document Status

**APPROVED**

- Approved by: Mozfer Mohamed Elhadi
- Approval date: 2026-08-02

This approval accepts the policy as repository governance content. Agent
Control's canonical execution modes remain authoritative, and protected
repository governance remains higher authority than ordinary task scope.
Approval does not activate automatic skill selection, authorize implementation
or Git mutation, or integrate this policy into active governance. Active-routing
reference integration, staging, commit, and push remain separate authorized
operations.

This document is docs-only routing-policy governance content. It is not active repository authority. It does not modify `AGENTS.md`, existing skills, automatic skill selection, implementation behavior, or runtime behavior.

Activation requires independent review, owner approval, a separately authorized commit, and later reference integration through active repository governance. Generated recommendations in this document are not approval.

## 2. Purpose

This policy defines how G7 BLUE CRM tasks select and combine skills while preserving least privilege, repository-local authority, explicit mutation boundaries, and low context noise.

It routes work to existing authorities. It does not duplicate their complete instructions or create new installed skills.

## 3. Scope

This policy covers the 31 skills inventoried in the approved repository-local, user-global, and Codex-configured roots. It covers task mode selection, repository governance, domain guards, capability skills, lifecycle tools, review gates, external side effects, and Git separation.

Repository-local authority outranks generic user-global and Codex-configured capability skills for G7 work.

## 4. Non-Goals

This draft does not:

- modify `AGENTS.md`, any `SKILL.md`, or active routing metadata;
- install, remove, rename, move, merge, archive, disable, or repair skills;
- activate Event ERP, Feature 009, runtime design implementation, or any future module;
- authorize implementation, SQL, migrations, external issue creation, staging, commit, or push;
- replace the G7 ERP Design Contract, ERP guard, security guard, migration review, or Agent Control;
- make generic tools into G7 authorities;
- consolidate skill files; routing consolidation is preferred over file merging.

## 5. Authority Hierarchy

The following hierarchy applies in descending authority:

1. Protected repository governance:
   - `AGENTS.md`.
   - `g7-crm-agent-control`.
   - Approved non-negotiable repository and domain guards.
2. Owner-approved task scope and decisions, valid within protected governance.
3. Relevant G7 domain authority or guard.
4. Verified current repository evidence.
5. One task-specific capability skill where needed.
6. Specialized audit, review, or test gate.
7. `g7-crm-precommit-gate` for separately authorized Git work.
8. Generated recommendations or proposals.

Protected repository governance sets non-negotiable constraints. Owner approval defines task scope and may activate a permitted task, but does not silently waive or override `AGENTS.md`, protected guards, mutation controls, SQL controls, review separation, or Git separation. A protected-governance change requires a separate explicit governance-edit task; owner approval for that task does not imply a change inside an unrelated task. Generic skills cannot override G7-specific guards. A capability skill never grants itself mutation, SQL, external-service, staging, commit, or push authority. Generated output is not approval.

## 6. Routing Principles

- Establish the task mode before selecting capability skills.
- Apply `AGENTS.md` and `g7-crm-agent-control` before task-specific work.
- Select only the relevant domain guard; shared safety wording is not a reason to load every guard.
- Use wrapper-first routing for design and Spec Kit work.
- Select at most one primary capability skill by default.
- Add another capability only when its responsibility is clearly distinct and necessary.
- Keep planning, implementation, review, testing, staging, commit, and push as separate authorized stages.
- Treat explicit-only and quarantined skills as unavailable for implicit routing.
- Mark unknowns and return HOLD rather than loading unrelated skills to resolve uncertainty.
- Reduce context noise without weakening safety or authority.

## 7. Task Mode Classification

Classify each request using one primary descriptive routing category:

- `DISCOVERY`
- `AUDIT`
- `PROPOSAL`
- `PLANNING`
- `IMPLEMENTATION`
- `REVIEW`
- `TESTING`
- `DOCUMENTATION`
- `MIGRATION / DATABASE`
- `SECURITY`
- `DESIGN`
- `COMMIT / PUSH`
- `EXTERNAL SIDE EFFECT`

These are descriptive routing categories, not replacements for Agent Control's
canonical execution modes. They identify task intent, domain, side-effect
class, required guard, and capability selection; the category itself grants no
authority. Every task must still select exactly one applicable canonical Agent
Control execution mode, and a capability skill cannot choose or expand that
mode.

| Descriptive routing category | Canonical Agent Control mode examples |
|---|---|
| Discovery / Audit / Review | `READONLY_REVIEW` |
| Proposal / Planning | `PLAN_ONLY` |
| Documentation-only authoring | `DOCS_ONLY` |
| Runtime implementation without Git | `IMPLEMENT_NO_STAGE` |
| Protected governance or agent-context edit | `GUARD_EDIT_ONLY` |
| SQL or migration drafting | `SQL_DRAFT_ONLY` |
| Commit | `COMMIT_ONLY` |
| Push | `PUSH_ONLY` |

The exact canonical mode must be selected from Agent Control based on the
requested mutation and side effects when a category does not map to one
universal mode. `DESIGN` and `SECURITY` are usually domains, not execution
modes. `EXTERNAL SIDE EFFECT` is an authorization class, not a canonical
execution mode. `COMMIT` and `PUSH` are separate canonical modes. A routing
category cannot bypass Agent Control, and ordinary documentation tasks do not
require `GUARD_EDIT_ONLY`; that protected mode applies only to explicitly named
protected governance, constitution, agent-context, or equivalent files.

If the mode is unclear and the ambiguity affects safety, write scope, sensitive data, financial behavior, external systems, or Git authority, return HOLD.

## 8. Core Routing Flow

1. Establish one descriptive routing category, one canonical Agent Control execution mode, and the exact authorized scope.
2. Verify the authorized repository, branch, baseline, and working-tree state when repository work is in scope.
3. Apply `AGENTS.md` and `g7-crm-agent-control`.
4. Select only the relevant domain guard or wrapper.
5. Select at most one primary capability skill.
6. Perform bounded work within the declared mode.
7. Apply a specialized review or test gate only when an artifact exists or review is explicitly requested.
8. Keep implementation, review, correction, staging, commit, and push separate.
9. Report PASS, WARN, or HOLD from verified evidence.

Do not load all 31 skills for a normal task.

## 9. Domain Guard Selection

| Task domain | Required authority | Boundary |
|---|---|---|
| ERP, business, finance, workflow, permission policy | `g7-crm-erp-guard` | Canonical ERP and financial authority; remains separate from design and migration specialists. |
| Design, UX, accessibility, RTL, responsive behavior | `g7-erp-design-guard` | Required before generic design tools for G7 work; does not authorize business or financial decisions. |
| Security, RLS, secrets, auth, payment security | `g7-security-hardening-guard` | Security authority for Clerk, RBAC, Supabase, SQL/RPC, Server Actions, APIs, secrets, and payment security. |
| Database, migration, RPC, RLS change review | `g7-crm-migration-review` | Specialist review; does not authorize automatic SQL execution or migration application. |
| Spec Kit planning | `g7-speckit-plan-guard` | Wrapper for safe planning; does not authorize implementation. |
| Commit or push | `g7-crm-precommit-gate` | Separate Git gate; never inferred from implementation approval. |

Multiple domain guards may apply only when the task genuinely crosses domains. They must not be loaded merely because they contain similar safety language.

## 10. Capability Skill Selection

The default is one primary capability skill matching the actual task. A second capability is allowed only when its responsibility is distinct, necessary, and separately bounded.

Do not load overlapping implementation skills simultaneously. Do not load an entire lifecycle family when only one phase is active. Guards define authority; capabilities perform bounded work under that authority.

## 11. Review and Validation Selection

Use a specialized review or testing skill after an artifact exists or when the request explicitly asks for review or testing.

- Guards define authority, scope, and stop conditions.
- Capability skills perform bounded work.
- Review skills inspect existing output.
- Test skills validate behavior.
- `g7-crm-precommit-gate` controls separately authorized Git mutation.

A task must not silently move from proposal to implementation, implementation to review, review to correction, correction to commit, or commit to push.

## 12. Mutation and Git Separation

Implementation, review, staging, commit, and push are separate tasks. Implementation approval does not authorize staging, commit, or push. `COMMIT_ONLY` and `PUSH_ONLY` are separate canonical modes: commit approval does not authorize push, and push approval does not authorize new edits or a new commit.

Every write-capable or external-side-effect task requires:

- explicit task authorization;
- exact target scope;
- expected mutations;
- non-goals;
- rollback or recovery considerations;
- separate Git authority where applicable.

## 13. Complete Skill Routing Table

| Skill name | Scope | Routing category | When to use | Required wrapper or authority | Default mode | Writes or external side effects | Automatic use allowed? | Explicit approval required? | Key exclusions |
|---|---|---|---|---|---|---|---|---|---|
| `clean-code-guard` | Repository-local | SPECIALIZED REVIEW | Review production code quality | `AGENTS.md`; Agent Control; relevant domain guard | REVIEW | Review findings; conditional edits only when separately authorized | No | Yes for edits | Does not replace ERP, security, or test authority |
| `docs-guard` | Repository-local | SPECIALIZED REVIEW | Review documentation quality and staleness | `AGENTS.md`; Agent Control | DOCUMENTATION / REVIEW | Conditional documentation edits | No | Yes for edits | Does not activate routing or commit |
| `g7-blue-crm-product-erp-reviewer` | Repository-local | SPECIALIZED REVIEW | Review G7 product and ERP fidelity | `g7-crm-erp-guard` remains authoritative | REVIEW | Read-only by default | No | Yes for any write | Does not replace ERP guard; stale `g7-crm-senior-review` terminology remains a known issue |
| `g7-crm-agent-control` | Repository-local | PRIMARY GOVERNANCE | Every G7 repository task | `AGENTS.md` | Declared task mode | Governs mutation; does not itself grant unapproved mutation | Required | Task-specific approval still required | Cannot be bypassed by a capability or prompt |
| `g7-crm-erp-guard` | Repository-local | DOMAIN GUARD | ERP, business, finance, workflow, RBAC, core G7 UI | Agent Control; canonical ERP sources | AUDIT / PROPOSAL / IMPLEMENTATION / REVIEW | Conditional implementation writes; no automatic SQL or Git | Only when domain applies | Yes for implementation | Must remain separate from design and migration specialists |
| `g7-crm-migration-review` | Repository-local | SPECIALIZED REVIEW | Review SQL, migrations, RPC, RLS, schema changes | Agent Control; security guard when security applies | REVIEW | No automatic SQL or migration apply | No | Yes for any apply | Review does not authorize database mutation |
| `g7-crm-precommit-gate` | Repository-local | SPECIALIZED REVIEW | Separately approved staging, commit, or push readiness | Agent Control; exact approved file list | COMMIT_ONLY / PUSH_ONLY | Git-capable | No | Yes | Commit and push are separate; exact file and commit evidence required; neither is inferred from implementation, review, or documentation approval |
| `g7-crm-safe-engineer` | Repository-local | SPECIALIZED REVIEW | Safety review for auth, finance, product flow, and mutation risk | Agent Control; relevant domain guard | REVIEW | Conditional implementation only when explicitly authorized | No | Yes for edits | Does not replace canonical domain authority |
| `g7-erp-design-guard` | Repository-local | WRAPPER | G7 design, UX, accessibility, RTL, responsive, and visual evidence work | Agent Control; ERP guard for business rules | AUDIT / PROPOSAL / IMPLEMENTATION / REVIEW | Conditional design-tool and file writes | Only when design applies | Yes for implementation or tools | Does not authorize business, financial, Git, or security decisions |
| `g7-security-hardening-guard` | Repository-local | DOMAIN GUARD | Security, auth, RBAC, RLS, secrets, APIs, payment security | Agent Control; ERP guard when ERP rules apply | AUDIT / PROPOSAL / IMPLEMENTATION / REVIEW | Conditional security/code/SQL writes | Only when security applies | Yes for implementation or SQL | Does not replace migration or ERP authority |
| `g7-speckit-plan-guard` | Repository-local | WRAPPER | G7 Spec Kit planning | Agent Control | PLANNING | Planning artifacts only; no implementation or Git mutation | Only when Spec Kit planning applies | Yes for writes | Does not authorize implementation |
| `speckit-agent-context-update` | Repository-local | LIFECYCLE TOOL | Explicit update of exact named protected context files | Agent Control; named protected file scope | GUARD_EDIT_ONLY | Writes only explicitly named protected context files | No | Yes | Requires exact protected files and separate owner authorization; lifecycle hooks and specify, clarify, plan, tasks, analyze, implementation, review, commit, or push modes do not authorize the update; do not manually rewrite protected blocks |
| `speckit-analyze` | Repository-local | LIFECYCLE TOOL | Analyze active Spec Kit artifacts | Agent Control; applicable wrapper | AUDIT / PLANNING | May create analysis artifacts or follow documented hooks | No | Yes if writes occur | Does not authorize implementation or commit |
| `speckit-checklist` | Repository-local | LIFECYCLE TOOL | Generate a requirements checklist | Agent Control; active Spec Kit phase | PLANNING | Writes checklist artifacts | No | Yes | Does not authorize implementation or approval |
| `speckit-clarify` | Repository-local | LIFECYCLE TOOL | Clarify an active specification | Agent Control; plan guard where G7 planning applies | PLANNING | May update specification artifacts | No | Yes | Clarification does not authorize planning, implementation, or commit |
| `speckit-constitution` | Repository-local | LIFECYCLE TOOL | Explicit constitution maintenance | Agent Control; named protected scope | GUARD_EDIT_ONLY | Writes explicitly authorized constitution or governance artifacts | No | Yes | Protected constitution or governance changes require `GUARD_EDIT_ONLY`; if the target is not protected, select the exact canonical mode from Agent Control; does not grant implementation or Git authority or silently change `AGENTS.md` |
| `speckit-converge` | Repository-local | WRAPPER | Explicitly orchestrate named Spec Kit phases | Agent Control; plan guard; phase-specific authority | PLANNING / IMPLEMENTATION by explicit phase | May coordinate multiple writes | No | Yes for every activated phase | Must not silently execute all phases |
| `speckit-implement` | Repository-local | LIFECYCLE TOOL | Implement an approved Spec Kit task | Agent Control; plan guard; exact approved files | IMPLEMENTATION | Writes code and artifacts | No | Yes | Forbidden in AUDIT, PROPOSAL-only, and REVIEW-only tasks; no commit |
| `speckit-plan` | Repository-local | LIFECYCLE TOOL | Create an active implementation plan | `g7-speckit-plan-guard`; Agent Control | PLANNING | Writes plan artifacts | No | Yes | Planning does not authorize task generation or implementation |
| `speckit-specify` | Repository-local | LIFECYCLE TOOL | Create an active feature specification | Agent Control; applicable domain guard | PLANNING | Writes specification artifacts | No | Yes | Does not authorize planning, implementation, or external issues |
| `speckit-tasks` | Repository-local | LIFECYCLE TOOL | Generate tasks from an approved plan | Agent Control; active plan authority | PLANNING | Writes task artifacts | No | Yes | Task generation does not authorize implementation or issues |
| `speckit-taskstoissues` | Repository-local | EXTERNAL-SIDE-EFFECT TOOL | Convert approved tasks into external issues | Agent Control; explicit issue-system scope | EXTERNAL SIDE EFFECT | Creates or updates external issues | No | Yes | Never inferred from task generation |
| `test-guard` | Repository-local | SPECIALIZED REVIEW | Review or validate test changes | Agent Control; relevant domain guard | TESTING / REVIEW | Conditional test edits when authorized | No | Yes for edits | Does not replace domain or security review |
| `impeccable` | User-global | EXPLICIT-ONLY | Generic frontend design execution | `g7-erp-design-guard` required for G7 work | DESIGN | Browser, asset, and file writes may occur | No | Yes | Never a G7 business, finance, permission, or workflow authority |
| `imagegen` | Codex-configured | CAPABILITY TOOL | Generate or edit visual assets | `g7-erp-design-guard` for G7 assets | DESIGN / EXPLICIT ASSET | Creates or edits raster assets | No | Yes | May not invent product behavior or bypass design scope |
| `openai-docs` | Codex-configured | CAPABILITY TOOL | Retrieve current OpenAI product/API facts | Agent Control for repository scope | DISCOVERY | External documentation retrieval | No | Yes when external access is in scope | Does not override repository authority |
| `plugin-creator` | Codex-configured | EXPLICIT-ONLY | Create or update Codex plugins and marketplaces | Agent Control; explicit plugin scope | EXTERNAL SIDE EFFECT | Writes plugin and marketplace files; may trigger plugin refresh | No | Yes | Not interchangeable with `skill-creator`; no implicit marketplace changes |
| `review-agent` | Codex-configured | SPECIALIZED REVIEW | Generic read-only defect-first review | Agent Control; domain reviewer remains authoritative | REVIEW | Read-only by default | No | Yes for any write | Cannot replace ERP, security, migration, design, or test authority |
| `skill-creator` | Codex-configured | EXPLICIT-ONLY | Explicit skill-authoring work | Agent Control; no G7 automatic route | EXPLICIT-ONLY | Creates or updates skill artifacts when separately authorized | No | Yes | Codex-managed; six optional example references remain missing; no direct repair approved |
| `skill-installer` | Codex-configured | QUARANTINED | Only a separately approved skill installation task | Agent Control; verified source and owner approval | EXTERNAL SIDE EFFECT | Downloads, installs, or overwrites skill content | No | Yes, separately | Never implicit; source, version, destination, overwrite behavior, rollback, and review must be known |
| `lean-ctx` | Codex-configured | CAPABILITY TOOL | Required context and tool-routing infrastructure | Agent Control; current configured policy | INFRASTRUCTURE | Context tooling may have setup/write paths | Only as configured infrastructure | Yes for setup or configuration writes | Must not silently install, alter configuration, or become task authority |

## 14. Spec Kit Lifecycle Routing

The Spec Kit skills are lifecycle-specific, not duplicates:

1. `speckit-specify` — define the feature scope.
2. `speckit-clarify` — resolve specification uncertainty.
3. `speckit-plan` — create the implementation plan, behind `g7-speckit-plan-guard` for G7 work.
4. `speckit-checklist` — produce a requirements checklist when needed.
5. `speckit-tasks` — generate tasks from an approved plan.
6. `speckit-analyze` — analyze active artifacts.
7. `speckit-implement` — implement approved tasks with exact file scope.
8. `speckit-taskstoissues` — create external issues only after explicit approval.
9. `speckit-agent-context-update` — update exact named protected context files only through an explicit `GUARD_EDIT_ONLY` task with separate owner authorization; lifecycle hooks and other Spec Kit phases do not grant this authority.
10. `speckit-constitution` — protected constitution or governance changes require an explicit `GUARD_EDIT_ONLY` task; a non-protected target still requires the exact canonical mode from Agent Control and does not grant implementation or Git authority.
11. `speckit-converge` — orchestrate only explicitly activated phases.

Only the active phase should normally be loaded. Planning does not authorize task generation. Task generation does not authorize implementation. Implementation does not authorize commit. Task generation does not authorize external issue creation. Constitution and agent-context updates are protected writes requiring `GUARD_EDIT_ONLY` when their exact targets are protected; ordinary documentation remains `DOCS_ONLY` when applicable.

## 15. Design Tool Routing

`g7-erp-design-guard` is required before generic design tools for G7 work. It governs visual and interaction evidence, accessibility, RTL/LTR, responsive behavior, Impeccable, Stitch, image generation, and browser evidence. `DESIGN` remains a descriptive domain category; the canonical execution mode comes from Agent Control.

`impeccable` and `imagegen` are subordinate capabilities. They do not authorize business behavior, financial policy, permission changes, routes, schemas, API changes, or production implementation. Image generation requires explicit asset-generation authorization and may not invent product behavior.

## 16. External-Side-Effect Routing

External-side-effect skills include `speckit-taskstoissues`, `skill-installer`, `plugin-creator`, and external retrieval through `openai-docs` where applicable.

They require explicit task authorization, exact target scope, expected side effects, non-goals, ownership, and recovery considerations. `EXTERNAL SIDE EFFECT` is not a canonical execution mode. External issue creation, plugin publication, skill installation, and external service access must never be inferred from planning or implementation approval.

## 17. Explicit-Only Skills

The following remain explicit-only:

- `skill-creator`: Codex-managed; no direct repair, official refresh, or automatic G7 routing approved; optional example references remain missing.
- `plugin-creator`: plugin scaffolding and marketplace side effects require a separate approved task.
- `impeccable`: generic design capability; requires the G7 design wrapper for G7 work.
- `imagegen`: explicit visual-asset authorization required.

Explicit-only means the skill may be selected only when the user request and task mode directly require it. It is not a default route.

## 18. Quarantined Skills

`skill-installer` is quarantined and explicit-only. It must never be invoked implicitly. A later installation or refresh task requires verified official source, version or revision, destination, overwrite behavior, rollback, owner approval, and independent review.

No current repair, reinstall, overwrite, or source refresh is approved.

## 19. Mutual Exclusions

Explicitly prohibited:

- `impeccable` without `g7-erp-design-guard` for G7 work;
- `imagegen` without explicit visual-asset authorization;
- `speckit-implement` during AUDIT or REVIEW;
- implicit `skill-installer` invocation;
- implicit `plugin-creator` invocation;
- multiple Spec Kit write phases concurrently without explicit orchestration;
- migration execution inside read-only migration review;
- commit or push inside implementation tasks;
- treating `COMMIT_ONLY` as authorization for `PUSH_ONLY`, or treating `PUSH_ONLY` as authorization for edits or a new commit;
- treating a descriptive routing category as execution authority;
- treating protected constitution or agent-context work as ordinary documentation instead of `GUARD_EDIT_ONLY`;
- generic `review-agent` replacing ERP, security, migration, or design authority;
- capability skills granting themselves additional permissions;
- loading all 31 skills for a normal task.

## 20. Side-Effect Classes

| Class | Meaning | Required control |
|---|---|---|
| READ-ONLY DEFAULT | Reads, reviews, or proposes without mutation | Preserve evidence and report unknowns. |
| CONDITIONAL WRITE | May write only in an explicitly authorized mode | Exact files, scope, non-goals, and validation required. |
| WRITE-CAPABLE | Can create or modify repository or skill artifacts | Explicit write authorization and rollback/recovery plan required. |
| EXTERNAL SIDE EFFECT | Can create issues, access external services, install, publish, or refresh | Explicit external authorization, destination, ownership, and recovery required. |
| GIT-CAPABLE | Can stage, commit, or push | `g7-crm-precommit-gate` and separate Git authorization required; use `COMMIT_ONLY` for commit and `PUSH_ONLY` for push, never as one combined executable mode. |
| QUARANTINED | Not available for implicit use | Owner-approved controlled task only. |

## 21. HOLD Conditions

Return HOLD when:

- task mode is materially unclear;
- required domain authority is unavailable;
- a capability conflicts with a higher guard;
- write scope is unknown;
- sensitive permissions or financial context is unresolved;
- implementation is requested without approval;
- generic design tooling is requested without `g7-erp-design-guard`;
- migration execution is requested inside review mode;
- installer or plugin publication is implied rather than explicit;
- external issue creation is implied rather than explicit;
- commit or push authority is missing;
- a protected constitution or agent-context target is not named for `GUARD_EDIT_ONLY`;
- a commit or push task does not identify its exact canonical Git mode and evidence;
- the working tree is unexpectedly dirty for a write task;
- overlapping capability skills create ambiguous ownership;
- a managed system skill would require direct modification without verified authority;
- the repository baseline or authorized worktree differs unexpectedly.

## 22. Context-Efficiency Rules

- Load only relevant governance and skills.
- Prefer repository-local rules over generic tools.
- Use wrapper-first and authority-first routing.
- Load one primary capability skill by default.
- Add a specialized review skill only when needed.
- Do not paste complete skill inventories into routine tasks.
- Do not duplicate full guard content in task prompts.
- Reference authoritative files rather than restating them.
- Mark unknowns instead of loading unrelated skills.
- Do not sacrifice safety merely to reduce token use.

## 23. Known Issues and Unknowns

- `skill-creator` remains Codex-managed with six optional example references unresolved; no direct repair is approved.
- `skill-installer` remains quarantined; no official refresh is approved.
- `g7-blue-crm-product-erp-reviewer` contains stale `g7-crm-senior-review` terminology; this draft records the issue and does not silently resolve it.
- No content merge, deletion, rename, move, disablement, or consolidation is approved.
- Exact source revisions for managed Codex skills must be verified before any refresh or overwrite task.

## 24. Current-Work Continuity

- V1 continues.
- Feature 009 remains inactive.
- Event ERP implementation remains inactive; Event ERP is strategic direction only.
- Runtime/design implementation remains inactive unless separately authorized.
- ABS Void/Supersede remains preserved as a future candidate pending formal activation and bounded planning.
- Service remains the operational context and mutation authority.
- No active routing changed through this proposal.

## 25. Policy Activation Process

This approved policy is not active routing authority. Activation requires:

1. Independent read-only review of this document.
2. Owner approval of the routing hierarchy, exclusions, and explicit-only/quarantine decisions.
3. A separate controlled commit task for this file only.
4. A later governance task to reference the approved policy from active repository routing.
5. Verification that no existing skill, `AGENTS.md`, runtime code, or repository behavior was unintentionally changed.

Approval, commit, and routing-reference integration are separate stages.

## 26. Owner Review Checklist

- [ ] The status is **APPROVED** as governance content; active routing remains separately unactivated.
- [ ] Repository-local authority outranks generic capability skills.
- [ ] Agent Control precedes task-specific capability selection.
- [ ] Relevant domain guards are selected only when their domains apply.
- [ ] At most one primary capability skill is loaded by default.
- [ ] Review, testing, implementation, staging, commit, and push remain separate.
- [ ] `skill-creator` remains explicit-only and unchanged.
- [ ] `skill-installer` remains quarantined and unused implicitly.
- [ ] No skill content merge or lifecycle mutation is implied.
- [ ] Spec Kit phases remain separate and explicit.
- [ ] Design tools remain subordinate to `g7-erp-design-guard`.
- [ ] External issues, plugin publication, installation, and refresh require explicit approval.
- [ ] HOLD conditions are sufficient for unresolved authority, scope, baseline, or side-effect ambiguity.
- [ ] V1, Feature 009, Event ERP, runtime design, and ABS continuity are preserved.
