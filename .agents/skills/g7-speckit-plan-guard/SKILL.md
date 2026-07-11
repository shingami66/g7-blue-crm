---
name: g7-speckit-plan-guard
description: Guard Spec Kit planning workflows in G7 BLUE CRM so approved planning artifacts are generated without changing AGENTS.md, its managed block, or unrelated features.
---

# G7 Spec Kit Plan Guard

Use this guard with `$speckit-plan`, or with any Spec Kit sequence that can run plan-related context hooks.

## Authority

`.agents/skills/g7-crm-agent-control/SKILL.md` remains the workflow authority. This guard adds a plan-specific gate and does not authorize implementation, SQL, Supabase, smoke, commit, Graphify, or push work.

## Required Inputs

The task prompt must provide:

- The exact approved feature directory.
- The exact approved `plan.md` path inside that directory.
- The allowed planning artifacts.
- The validation scope.
- The next controlled task.

Never infer the feature from the branch, scan for the newest feature, or auto-select the newest `specs/*/plan.md`.

## Safe Plan Contract

- Run `.specify/scripts/powershell/setup-plan.ps1 -Json` only for the approved feature directory.
- Confirm the returned `IMPL_PLAN` exactly matches the approved `plan.md` path before continuing.
- Never run `speckit.agent-context.update`.
- Skip the optional `after_plan` context hook.
- Skip the optional `after_specify` context hook during a full Spec Kit pilot sequence.
- Never edit `AGENTS.md`.
- Never edit or replace the `<!-- SPECKIT START -->` to `<!-- SPECKIT END -->` block.
- Generate planning artifacts only: `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`.
- Do not automatically implement tasks or dispatch an implementation workflow.
- Keep SQL, migrations, RLS, RBAC, source implementation, smoke, commit, Graphify, and push as separate controlled G7 tasks.
- Browser or manual smoke remains user-only.
- Preserve `g7-crm-agent-control` as the workflow authority.

## HOLD Conditions

Return `HOLD` before making changes if:

- The feature directory is missing, ambiguous, or different from the approved path.
- The `plan.md` path is missing, ambiguous, or different from the approved path.
- The workflow attempts to auto-select the newest feature or plan.
- Any hook or skill attempts to write `AGENTS.md`.
- An `after_plan` or `after_specify` context hook cannot be skipped.
- An unexpected file would be created or modified.
- Automatic implementation begins.
- The repository state differs from the approved task state.

## Compact Usage

```text
$g7-speckit-plan-guard $speckit-plan

Feature directory: <exact approved path>
Plan path: <exact approved path>/plan.md
Allowed artifacts: plan.md, research.md, data-model.md, contracts/, quickstart.md
Validation: <task-specific checks>
Next: <next controlled task>
```

## Compact Report

```text
RESULT:
FEATURE:
ARTIFACTS:
GUARD CHECK:
VALIDATION:
FINAL STATE:
NEXT:
```

For `WARN` or `HOLD`, report only the exact issue, impact, and smallest recovery step.
