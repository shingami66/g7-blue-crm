---
name: g7-rtl-bidi-guard
description: Narrow implementation guard for G7 UI tasks involving tables, metrics, reports, Arabic UI, mixed-language text, money/numbers, business identifiers, dates, pagination, directional navigation/icons, or responsive tabular/list surfaces.
---

# G7 RTL and Bidi Implementation Guard

Use with the broad `g7-erp-design-guard` for tables, metrics, reports, Arabic UI, mixed-direction values, and responsive Arabic/English surfaces. This skill supplies implementation detail only; it does not authorize a task or override `AGENTS.md`, Agent Control, product/security/permission rules, the G7 ERP Design Contract, or verified financial semantics.

## Direction and isolation

- Let the application shell own page direction. Do not place `dir="auto"` or `dir="ltr"` on a whole card, row, paragraph, form, or table to repair one value.
- Isolate only the semantic leaf: use natural `bdi dir="auto"` for names and free-form references; use `bdi dir="ltr"` for identifiers and explicitly LTR formatted numeric leaves.
- Prefer the shared `UiValueText` primitives for values. Keep the existing authoritative `UiDateText` date segmentation and formatter contracts; do not reformat dates or change stored values.
- Keep translated labels and prose in inherited direction. Do not infer structure, alignment, or action-column behavior from English or Arabic labels.
- Use logical CSS (`text-start/end`, `ms/me`, `ps/pe`, logical flex alignment) unless a bounded, evidenced physical-direction exception is required.
- Keep navigation and action placement in logical flow; mirror only genuinely directional icons, following the canonical Design Contract.

## Tables and responsive presentation

- Data-table columns declare stable keys, semantic kinds, and logical alignment explicitly. Header and body alignment must come from the same metadata; actions are an explicit kind, never a localized-label heuristic.
- Preserve semantic table markup, keyboard-usable local overflow, empty states, existing permission gates, and column ordering. Do not expose hidden financial values or raw database IDs as business identity.
- When a table has a mobile card alternative, preserve the same values, statuses, action permissions, and relationships. Check critical values and actions at narrow widths; avoid page-level horizontal overflow.
- Table and presentation tasks require representative English/LTR and Arabic/RTL verification at desktop and mobile widths. If mobile runtime verification is unavailable, report it as not exercised, never as a pass.
- Browser evidence is engineering evidence, not Owner manual acceptance; only the Owner grants manual acceptance.

## Change discipline

- Scope shared primitives to demonstrated repeated problems and migrate only directly affected consumers. Do not turn a bounded repair into a repository-wide bidi rewrite.
- Add behavior-oriented tests for alignment/normalization plus bounded structural checks for semantic leaves and representative consumers. Add browser-test infrastructure only when an existing deterministic fixture and runner justify it; otherwise use static contracts and bounded browser smoke.
- Current foundation decision: do not add Playwright yet; this repository has no established deterministic RTL fixture/runner, so use the focused structural tests and bounded EN/AR desktop/mobile browser smoke. Reconsider only when a stable fixture and repeatable runner can be maintained without authenticated session material.
- Keep localization, arithmetic, permissions, workflow, finance, dates, and document/PDF semantics unchanged unless separately authorized.
