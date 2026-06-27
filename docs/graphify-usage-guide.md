# Graphify Usage Guide

## Purpose

Graphify is used in G7 BLUE CRM as a manual navigation aid for understanding codebase structure.

It can reduce token usage by guiding file discovery before broad `rg` searches or large file reads. It does not replace reading source files, git diffs, tests, build output, smoke results, or database verification.

## Current Status

- The local graph was refreshed from commit `b20b64f`.
- Generated output lives under ignored `graphify-out/`.
- No Graphify hooks are installed.
- No Codex integration is installed.
- Graphify is manual/query-first only.

## Safe Usage Rules

- Graphify is navigation, not proof.
- Do not use stale graph output as final evidence.
- Verify final decisions with source files and git diff.
- Verify higher-risk work with tests, build, smoke checks, or database verification as appropriate.
- Do not run install, hook, or Codex integration commands without explicit approval.
- Do not commit `graphify-out/`.
- Do not let Graphify results override user instructions, `AGENTS.md`, project skills, canonical docs, source files, migrations, or database verification.
- Do not read `.env*` or secrets.

## Suggested Manual Query Workflow

1. Check git state.
2. Use `graphify query` for scoped architecture or file discovery.
3. Confirm candidate files by reading the actual files.
4. Use targeted `rg` after Graphify narrows the search.
5. Make changes only through normal controlled prompts.
6. Verify with git diff, tests, build, or smoke checks depending on task risk.

## Example Queries

```powershell
graphify query "Which modules import suppliersData?"
graphify query "Show invoice PDF dependencies"
graphify query "What files connect payments to invoices?"
graphify query "Where is requirePermission used in server actions?"
graphify query "Which files define supplier-related types or plans?"
graphify query "What docs mention SUPPLIERS-SCHEMA-DESIGN-1?"
```

## Refresh Policy

- Refresh Graphify only through a separate approved task like `GRAPHIFY-REFRESH-1`.
- Do not install hooks.
- Do not enable automatic refresh without separate approval.
- Do not run `graphify codex install` without explicit approval.

After any approved refresh, confirm:

- `graphify-out/` remains ignored.
- No tracked files changed.
- The graph report commit matches current `HEAD`.
- No hooks were installed.

## Authority Hierarchy

Use this order when information conflicts:

1. User instruction / approved prompt.
2. `AGENTS.md` and project skills.
3. Canonical docs.
4. Source files and migrations.
5. Git diff, tests, build, and database verification.
6. Graphify as navigation hint only.
