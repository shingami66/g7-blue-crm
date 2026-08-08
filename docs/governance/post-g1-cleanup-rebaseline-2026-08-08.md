# Post-G1 Cleanup & Rebaseline Manifest

**Date:** 8 August 2026
**Scope:** Cleanup & Rebaseline only; no DEV/DEMO data hygiene, UX stabilization, document-language implementation, quotation commercial-model implementation, or G2 work.

## Baseline

- Canonical repository: `D:\G7\g7-crm`
- Branch after alignment: `main`
- G1 closure baseline: `e34ea4176044f4dc663555a8794dfa5d3042206c`
- `origin/main`: `e34ea4176044f4dc663555a8794dfa5d3042206c`
- Divergence: `0/0`
- Index and tracked working tree before this task: empty/clean
- Protected untracked files: `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log`

The checkout was initially on `post-g1-stabilization` at the same clean SHA; it was aligned to the explicitly required local `main` branch without changing the commit or files.

## Authoritative Expansion Master

`D:\G7\g7-crm\docs\product\G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md` is the sole current Expansion Master, reconciled to Revision 0.12 and the 7 August 2026 decision sync.

The requested `G7_BLUE_Event_ERP_Future_Expansion_Master_Handover_REV_0.12_PENDING.md` filename was absent. The only staging candidate, `G7_BLUE_Event_ERP_Future_Expansion_Master_Handover(2).md`, matched the title, Revision 0.12, and latest decision sync and was used as the reconciled source; the source was preserved in the dated archive below.

The master records that G1 is closed and pushed, the Post-G1 gate remains active, only Cleanup & Rebaseline is closed here, G2 is blocked/not started and remains Payment Precision, and broader accounting, procurement, production, SaaS, multi-company, VAT, and ZATCA activation is not claimed.

## Kept

- Canonical repository, current project status/roadmap, sole Expansion Master, and current governance/product documentation.
- Review and evidence packages: `D:\G7\g7-crm-review-campaign`, `D:\G7\g7-crm-review-candidates`, `D:\G7\return-audit-20260805`, `$evidence`, `spec-kit-previews`, and `spec-kit-snapshots`.
- Active tooling/configuration, unique business/product research, and the `.perf-watch` evidence directory.
- The four protected build-watch logs remain unsearched, unchanged, unstaged, and unarchived.

## Archived

- Superseded tracked expansion documents under `D:\G7\g7-crm\docs\product\archive\`, explicitly marked historical.
- The 2 August expansion Markdown/DOCX copies and reconciled Rev 0.12 source under `D:\G7\archive\2026-08-08-post-g1-rebaseline\expansion-sources\`.
- The generated `D:\G7\g7-crm-obsidian-graph` snapshot under `D:\G7\archive\2026-08-08-post-g1-rebaseline\generated\`; it is recoverable and not treated as current implementation proof.

## Deleted

- `D:\G7\docs\project-status.md` (0-byte redundant shell copy).
- `D:\G7\docs\deferred-decisions.md` (1-byte redundant shell copy).

## Deliberately Untouched

- Protected build-watch logs and their contents.
- Application source, tests, SQL, migrations, database/Supabase state, financial behavior, RBAC, package dependencies, environment files, and repository history.
- Review/evidence/tooling/research material retained above; ambiguous historical evidence was archived rather than deleted.
- The now-empty `D:\G7\g7-doc-staging` directory remains as a harmless staging boundary; its only Rev 0.12 source was archived after reconciliation.

## Repository Baseline After Cleanup

- Canonical repository remains `D:\G7\g7-crm`.
- `main`, `HEAD`, `origin/main`, and `0/0` divergence remain at the G1 closure baseline.
- Only documentation/archive paths are changed by this task; no application source/test/SQL/migration path is changed.
- Before this closure commit, no commit, push, pull, merge, rebase, reset, clean, or database operation had occurred; staging was reserved for the exact seven approved documentation paths.

## Review and Validation Record

- Fresh OCR CLI check: `open-code-review v1.8.10` is installed.
- OCR preview identified 11 workspace changes; all Markdown/document files are excluded as `unsupported_ext`, and the four protected logs are excluded by the user protection rule.
- `ocr llm test` could not run a provider review because no valid OCR LLM endpoint/token/model is configured; no OCR pass is claimed.
- Host review of the exact tracked and new Markdown surfaces found no confirmed in-scope documentation defect after correcting archived-document status labels.
- `ConvertFrom-Markdown` parsed the current Master, project status, project roadmap, cleanup manifest, and both tracked archive documents successfully.
- `git diff --check` passed with only the repository's existing LF/CRLF conversion warnings.
