# G7 ERP Design Contract

## 1. Document Status

**Status: APPROVED.**
- **Approved by:** Mozfer Mohamed Elhadi
- **Approval date:** 2026-08-02
- **Effective authority:** Canonical design-governance authority when committed to the repository `main` branch.

This Contract governs future visual, interaction, accessibility, RTL/LTR, responsive, and presentation work. It remains subordinate to product, ERP, security, accounting, permission, workflow, repository, and verified implementation authority. This approval is governance approval, not blanket implementation approval; it does not activate runtime redesign or Event ERP implementation. Implementation requires clear bounded task authority, relevant scope, and acceptance criteria appropriate to the work; Agent Control governs execution workflow, review, publication, and final verdicts while current V1 development continues independently.

## 2. Purpose

Define the visual, interaction, accessibility, responsive, RTL/LTR, permission-aware, and financial-presentation contract for future G7 BLUE ERP interfaces.

## 3. Authority Hierarchy

Authority is ordered: owner-approved product decisions; canonical repository documentation; repository governance and execution guards; business, security, accounting, permission, and workflow rules; verified current implementation; this Design Contract; the G7 design guard; generic design skills; generated design proposals. Lower levels never override higher levels.

## 4. Scope

This contract covers future G7 BLUE CRM and Event ERP design proposals, bounded UI implementation, component reuse, states, responsive behavior, English/Arabic presentation, and design evidence.

## 5. Non-Goals

It does not invent product behavior, accounting or tax policy, permissions, schemas, APIs, routes, workflows, data, modules, legal claims, or a whole-application redesign.

## 6. Current Product Continuity

G7 BLUE remains an Events CRM + Billing system with the locked Customer Profile -> Service -> Quotation -> Invoice -> Payment flow and Service / Booking as the operational context. V1 continues; Feature 009 and Event ERP implementation remain inactive; ABS Void/Supersede remains a preserved preferred candidate pending activation.

## 7. G7 BLUE Visual Identity

Use the established G7 BLUE register: deep navy foundation, restrained gold hierarchy, clean enterprise SaaS clarity, calm operational surfaces, and professional event-company character. New modules must remain part of the existing G7 BLUE product family and must not receive a separate or competing visual identity. Do not use glassmorphism or excessive visual effects.

## 8. Enterprise ERP Design Principles

Design for accuracy, traceability, discoverability, permission safety, predictable actions, reversible review, and efficient completion of real operational work.

## 9. Operational Clarity and Information Density

Prioritize meaningful labels, visible state, useful columns, scan paths, and evidence over decorative whitespace or novelty. Density must serve the task, not become visual compression.

## 10. Progressive Disclosure

Show the next decision and critical context first; reveal secondary detail through sections, linked workspaces, drawers, or drill-down without hiding required evidence or actions.

## 11. Consistency Before Novelty

Reuse established G7 tokens and components when suitable. A new pattern requires a demonstrated task benefit and explicit review.

## 12. Accessibility Baseline

Target WCAG 2.2 AA-level practice for keyboard, focus, semantics, contrast, names, status communication, error recovery, zoom, reduced motion, and touch use; do not claim formal conformance without evidence.

## 13. Keyboard Navigation

All actionable controls, menus, filters, dialogs, drawers, tables, and pagination must be reachable in a logical order with no keyboard trap.

## 14. Focus Management

Visible focus is mandatory. Opening overlays moves focus appropriately, closing returns it to the invoking control, and route or validation changes announce the resulting context.

## 15. Semantic Structure

Use meaningful landmarks, heading order, labels, table semantics, button/link semantics, and status roles. Do not use visual styling as a substitute for structure.

## 16. Contrast and Non-Color Communication

Text, controls, focus, boundaries, errors, statuses, and differences must remain understandable without color alone. Exact thresholds and current values must be verified during review.

## 17. Reduced Motion

Motion is optional and state-oriented. Every animated behavior needs a reduced-motion alternative; loading and status must remain understandable when motion is disabled.

## 18. Typography

Use the verified current G7 type system and one coherent UI family unless an approved exception exists. Do not introduce display fonts or decorative typography into operational screens.

## 19. Type Hierarchy

Hierarchy must distinguish page title, section, field, value, helper, status, and metadata without excessive uppercase tracking, tiny labels, or oversized headings.

## 20. Data Typography

Use stable readable numerals, tabular alignment where comparison benefits, and deliberate treatment of long identifiers, dates, quantities, and monetary values.

## 21. Arabic Typography Considerations

Arabic must remain legible at operational density, with appropriate line height, wrapping, shaping, punctuation, and mixed-script handling. Do not treat Arabic as a translated afterthought.

## 22. Color Roles

Colors must have semantic roles for ink, surface, border, action, focus, status, warning, danger, and sensitive data. Avoid unrelated palettes and color choices made only for decoration.

## 23. Primary Navy Foundation

Deep navy is the primary visual foundation for the shell and key actions, consistent with the verified token layer in `src/app/globals.css`. Exact values remain **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION** when a design task requires them.

## 24. Restrained Gold Accents

Gold is reserved for hierarchy, selected states, emphasis, and approved brand accents; it is not a background wash, gradient substitute, or repeated decoration. Decorative gradients are prohibited unless separately approved for a defined functional or brand purpose.

## 25. Surface and Border Roles

Use established surface and border roles to separate work areas and preserve scanability. Avoid arbitrary raw color values and decorative borders that compete with content.

## 26. Status Colors

Status colors must be semantic, consistent, named, and paired with text or icon meaning. Existing status vocabulary is evidence; new statuses require product approval.

## 27. Sensitive Financial States

Financial, cost, margin, bank, tax, and supplier-sensitive states must communicate access, review, pending, blocked, and redacted conditions without exposing restricted values.

## 28. Spacing Scale

Use the verified spacing tokens and current component rhythm. Exact token values are **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION** rather than invented in this contract.

## 29. Layout Density

Choose density based on work: lists and reports support scanning, forms support completion, and review workspaces support evidence comparison without crowding.

## 30. Compact, Standard, and Review Workspace Density

Compact density is for high-volume lists; standard density is the default; review density gives approvals and comparisons enough context. Density changes must remain accessible and responsive.

## 31. Touch Targets

Controls must have usable touch targets and sufficient separation on tablet and mobile. Icon-only controls require accessible names and visible state.

## 32. Borders and Radius

Use the existing restrained shape language. Do not add excessive rounding, pills for non-status content, or side-stripe accents as a default visual system.

## 33. Shadows and Elevation

Elevation is structural and sparse, not a decorative card effect. Prefer clear surface and border relationships; exact shadow values are **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION**.

## 34. Icons

Use the existing icon family consistently, with icons supporting recognition rather than replacing labels. Icon-only controls need names, focus, and state.

## 35. Application Shell

The shell provides stable navigation, locale/direction context, account context, permission-aware entry points, and a predictable content container without obscuring the primary task.

## 36. Sidebar

The sidebar presents business domains in a stable order, hides unauthorized navigation, preserves active context, and remains direction-aware. It must not become a dumping ground for every future module.

## 37. Collapsible Navigation Groups

Use grouped domains and progressive disclosure for deeper ERP areas. Group expansion state must not erase active location or hide a route the user is authorized to use.

## 38. Mobile Navigation

Mobile navigation must have an accessible menu control, clear open/close state, focus behavior, overlay dismissal, direction-aware placement, and parity for critical authorized routes.

## 39. Topbar

The topbar may carry search, locale, notifications, user context, and global actions only when those affordances have verified behavior and permission-safe scope.

## 40. Page Container Width

Use the existing page-container contract and responsive margins from verified implementation. Do not widen dense ERP surfaces merely to create visual spectacle.

## 41. Page Header Anatomy

A page header should establish title, concise context, breadcrumbs or back navigation where needed, and permission-aware actions. Reuse `PageHeader` when its semantics fit.

## 42. Breadcrumbs and Back Navigation

Navigation context must reflect real routes and the Service-centered hierarchy. Back actions must preserve expected filter or record context where the product supports it.

## 43. Cards

Cards group a meaningful unit of information or action; they must not turn every row, label, or metric into an oversized decorative container. Avoid nested card grids.

## 44. KPI Cards

KPI cards present role-safe, decision-relevant measures with a clear label, value, period or scope, and state. They must not invent metrics or expose unavailable values.

## 45. Tables

Tables are the default for comparable ERP records. Use semantic headers, stable columns, useful row actions, empty/loading/error states, and permission-aware data.

## 46. Table Density

Density must support scanning while preserving readable labels, focus, row separation, and touch behavior. Long fields may wrap or reveal detail rather than forcing unreadable columns.

## 47. Numeric Alignment

Align comparable quantities, amounts, counts, and dates consistently while preserving RTL semantics. Use bidi-aware wrappers for structured LTR values.

## 48. Sticky Headers and Columns

Sticky elements are allowed only when they improve long-table comprehension and do not trap content, cover focus, break RTL, or create mobile overflow failures.

## 49. Row Actions

Row actions must be predictable, permission-aware, discoverable, and separated from data values. Destructive or irreversible actions require clear confirmation and server authority.

## 50. Table Overflow

Overflow must be intentional, keyboard-usable, direction-aware, and signposted. Never clip financial values or make required actions unreachable.

## 51. Responsive Table Strategy

Choose responsive columns, horizontal scrolling, stacked records, or linked detail based on task evidence. Preserve the critical record identity, status, and authorized actions on small screens.

## 52. Filters

Filters must identify their scope, support keyboard use, preserve active state, and map to real data or an explicit read-only proposal. Visual-only filter affordances require remediation or an explicit limitation.

## 53. Filter State and Reset

Users must be able to understand active filters, clear individual filters when useful, reset the set, and retain or intentionally discard state during navigation.

## 54. Forms

Forms are organized around real business input and validation rules. Do not add fields, defaults, totals, or workflow transitions without product evidence.

## 55. Field Anatomy

Each field has a visible label, control, value state, helper or constraint when needed, validation message, and permission/read-only treatment.

## 56. Labels and Help Text

Labels use domain language from canonical product docs. Help explains consequences and evidence requirements without inventing policy.

## 57. Validation Errors

Errors identify the field or action, explain correction, preserve safe input where possible, announce changes, and avoid exposing raw server or database errors.

## 58. Required and Optional Fields

Requiredness comes from verified product rules, not visual convention. Mark optional fields when ambiguity would impede completion.

## 59. Form Sections

Sections follow the user's decision order and may use progressive disclosure. Sensitive or review-only sections must be clearly separated and permission-gated.

## 60. Buttons and Actions

Buttons state the real action, use a consistent hierarchy, and preserve permission, loading, disabled, focus, and error behavior.

## 61. Primary and Secondary Actions

One primary action should represent the next safe step; secondary, navigation, and cancel actions must not compete with it or imply a workflow that does not exist.

## 62. Destructive Actions

Destructive, void, cancel, delete, or supersede actions require the applicable product rule, explicit permission, clear consequence, reason where required, and server-side enforcement.

## 63. Loading and Disabled Actions

Loading states prevent duplicate intent, explain progress, preserve focus, and do not falsely imply completion. Disabled controls need an understandable reason or an available alternative.

## 64. Status Badges

Badges communicate current state with text and semantic styling. They must not imply approval, payment, tax status, booking confirmation, or authorization beyond verified facts.

## 65. Alerts

Alerts are reserved for consequential information, use an appropriate role, remain readable in both directions, and do not rely on color alone.

## 66. Toasts and Notifications

Transient feedback supplements, but never replaces, durable page state or accessible error content. Notification controls require real behavior or must be labeled as proposal-only.

## 67. Modals

Use modals for focused confirmation or short decisions, with focus trapping, escape behavior, accessible names, and a non-modal alternative when the task requires context.

## 68. Drawers

Drawers are for bounded supporting work or evidence; they must not hide essential workflow context, create direction bugs, or substitute for a dedicated workspace when complexity grows.

## 69. Tabs

Tabs group genuinely parallel views of the same context, preserve selected state and keyboard behavior, and must not conceal required approvals, financial warnings, or mobile-critical actions.

## 70. Empty States

Empty states distinguish no records, filtered-out records, unavailable data, and unauthorized access, and teach the next valid action without inventing data.

## 71. Loading States

Loading states preserve layout intent, announce status appropriately, respect reduced motion, and avoid suggesting that unavailable data is zero.

## 72. Error States

Errors are actionable, localized where supported, safe to display, and distinguish retryable data failure from invalid input, missing record, and workflow denial.

## 73. Unauthorized States

Unauthorized presentation must be controlled and consistent, reveal no sensitive data, and follow server-side redirect/forbidden behavior. UI hiding is not the security boundary.

## 74. Archived and Read-Only States

Archived and read-only records preserve history, explain why mutation is unavailable, show permitted evidence, and avoid presenting disabled controls as active workflow options.

## 75. Voided and Superseded Records

Void and superseded presentation must preserve the original record and audit context, clearly distinguish current authority from historical evidence, and follow the approved ABS lifecycle rules.

## 76. Attachments and Evidence

Attachments, source documents, approvals, and evidence need provenance, safe labels, permission treatment, upload/review state, and clear relationship to the Service or record.

## 77. Original Document Preservation

Original supplier, customer, financial, and operational documents must remain preserved when extraction, comparison, or assisted entry is proposed. A derived view never replaces the source.

## 78. Approval Workspaces

Approval views foreground scope, requester, evidence, changes, permissions, state, reasons, and the next decision. Approval is not implied by visual emphasis.

## 79. Separation of Duties

Visual flows must reflect verified separation between request, prepare, review, approve, pay, and close roles. The design must not collapse distinct authorities for convenience.

## 80. Financial Value Presentation

Show financial values with label, scope, currency, state, and sensitivity appropriate to the user. Never create financial truth through presentation alone.

## 81. SAR Formatting

Use the repository's authoritative `formatSarAmount`/financial-formatting behavior and preserve the established currency convention. Exact display examples are **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION** when required.

## 82. Bidi Isolation for Numbers

Use the repository bidi helpers and structured LTR treatment for amounts, dates, IDs, and ranges inside Arabic text. Do not put an entire mixed-language sentence in one LTR wrapper.

## 83. Zero, Empty, and Unknown Values

Distinguish a verified zero from no value, not applicable, redacted, pending, and unknown. Never render missing financial evidence as zero.

## 84. Sensitive Data Presentation

Mask or omit restricted values server-side and in UI representations. A design review must identify who can see each sensitive category and how denial is communicated.

## 85. Supplier Cost and Margin Visibility

Supplier cost, margin, internal notes, and booking details remain internal and permission-sensitive. Customer-facing quotations, invoices, PDFs, and public routes must not expose them.

## 86. Bank and Tax Information

Bank details, TIN/CR/VAT fields, and tax language follow canonical current product rules. Do not invent VAT, ZATCA, FATOORA, QR, XML, clearance, or statutory behavior.

## 87. Permission-Aware UI

Surface only actions and data the role, permission, assignment, and sensitivity context supports. Every proposal documents its permission assumptions and unknowns.

## 88. UI Hiding vs Server Authorization

Hidden navigation improves usability; it never authorizes access. Routes, Server Actions, APIs, data selection, and privileged work remain server-authorized.

## 89. Role-Based Dashboards

Dashboards must derive useful work queues and measures from role and permissions, not from manually hard-coded individual user identities.

## 90. Assignment and Responsibility-Based Widgets

Widgets may reflect assigned Services, approvals, ownership, responsibility, deadlines, or sensitivity only when those sources and scopes are verified.

## 91. Dashboard Information Hierarchy

Prioritize actions and exceptions, then status and workload, then supporting measures. Do not lead with decorative metrics or unsupported future ERP claims.

## 92. Dashboard Empty and Partial States

Dashboards distinguish no assigned work, no permission, unavailable source, filtered state, and partial widget failure; one missing widget must not masquerade as a system-wide zero.

## 93. Detail Pages

Detail pages establish identity, status, critical actions, evidence, history, related records, and linked workspace entry points without becoming uncontrolled monoliths.

## 94. Service Overview

Service is the operational overview and source context for current quotation, billing, payments, allocations, bookings, and approved scope links as permitted.

## 95. Linked Workspaces

Billing, approvals, reports, comparisons, and other complex domains may be dedicated linked workspaces from Service; links must preserve context, authority, and return navigation.

## 96. Reports and Drill-Down

Reports use named measures, source scope, date context, permission-safe values, clear filters, and drill-down paths that lead to real records or explicitly labeled proposals.

## 97. Managerial vs Statutory Reports

Managerial reporting must be labeled as such and must not be presented as statutory or tax reporting. Statutory behavior requires qualified policy and official evidence.

## 98. English and Arabic

English and Arabic are first-class UI locales. Copy, labels, states, validation, direction, dates, and numerals must be reviewed in both languages where the surface supports them.

## 99. RTL and LTR

Direction changes layout logic, order, navigation, icon meaning, tables, overlays, and mixed content; it is not equivalent to text-align changes.

## 100. Logical CSS Properties

Prefer logical inline/block properties and direction-aware component APIs. Physical left/right utilities require evidence or a bounded exception, especially in shared components.

## 101. Mixed-Language Content

Names, supplier text, addresses, IDs, product terms, and stored business text may mix scripts. Preserve source text and isolate segments without corrupting reading order.

## 102. Dates, Ranges, IDs, and Currency in RTL

Review structured values in Arabic and English for order, separators, punctuation, wrapping, copyability, and screen-reader meaning using the repository's i18n utilities.

## 103. Desktop Behavior

Desktop may expose denser tables, side navigation, parallel evidence, and broader workspace context while maintaining clear hierarchy and usable zoom.

## 104. Tablet Behavior

Tablet layouts must preserve core actions and data, adapt columns and navigation deliberately, and avoid desktop-only hover or width assumptions.

## 105. Mobile Behavior

Mobile must preserve critical lookup, review, approval, status, evidence, and navigation functionality. It may reorganize information but may not silently remove authorized work.

## 106. Responsive Action Placement

Actions must remain discoverable, reachable, and ordered by consequence across widths; sticky action bars require focus, safe-area, and overflow review.

## 107. Mobile Feature Parity

Any omitted or deferred mobile capability must be explicitly justified, risk-assessed, and approved; it must not hide a critical permission, financial, or workflow decision.

## 108. Animation and Motion Limits

Use only motion that communicates state, continuity, or feedback. No decorative motion, auto-playing effects, or motion-dependent content; apply reduced-motion behavior.

## 109. Design Tokens

The current token layer in `src/app/globals.css` is the starting source of truth. New tokens must have semantic names, evidence, reuse, and separate approval; exact values are **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION**.

## 110. Existing Component Reuse

Assess `PageHeader`, `DataTable`, `FilterBar`, `Button`, `StatusBadge`, `KpiCard`, state panels, pagination, locale, and bidi/formatting utilities before proposing new primitives.

## 111. Component Consolidation

Consolidate only where repeated behavior and a safe API are evidenced across current surfaces. Do not erase legitimate domain differences or change workflow semantics under a visual cleanup.

## 112. New Component Approval

Each new shared component requires a bounded problem statement, current alternatives, accessibility contract, RTL/responsive behavior, permission implications, owner approval, and adoption plan.

## 113. Page Template Families

Future proposals may use these families: Role-Based Dashboard; List and Filters; Record Detail; Create and Edit Form; Approval and Review; Report and Drill-Down; Settings and Master Data; Unauthorized/Error/Empty/Loading; Service Overview; Document Comparison and Matching.

## 114. Role-Based Dashboard Template

Start with role-safe work queues, assignments, approvals, exceptions, and permitted metrics; show scope and partial states; do not hard-code a dashboard for one person.

## 115. List and Filters Template

Use page header, filter state, table/list, pagination, row actions, and explicit loading/empty/error/forbidden states, preserving filter and direction behavior.

## 116. Record Detail Template

Use identity/status, critical actions, summary, evidence, history, related records, permission-aware sections, and linked workspace entry points without an uncontrolled monolith.

## 117. Create and Edit Form Template

Use real field authority, grouped sections, clear validation, save/cancel behavior, disabled/loading states, permission boundaries, and mobile-safe action placement.

## 118. Approval and Review Template

Present requested decision, scope, evidence, variance, change history, sensitive data treatment, separation of duties, reasons, and explicit approve/reject/return behavior where product rules support it.

## 119. Report and Drill-Down Template

Present report purpose, source scope, filters, period, definitions, permission-safe measures, table/chart only when useful, and drill-down to verified records.

## 120. Settings and Master Data Template

Separate configuration from transactional work, show effective scope and permissions, preserve sensitive-field masking, and avoid activating future company, tax, tenant, or accounting policy.

## 121. Unauthorized/Error/Empty/Loading Template

Use shared state language and accessible recovery while distinguishing forbidden, unauthenticated, missing, failed, loading, empty, archived, and redacted conditions.

## 122. Service Overview Template

Keep Service identity and operational status central, show relevant customer and schedule context, and link billing, quotation, allocation, booking, ABS, and evidence workspaces only when permitted.

## 123. Document Comparison and Matching Template

Show original source, extracted/entered values, comparison scope, differences, confidence or review state where verified, decision reason, and preservation of the original document.

## 124. AI-Generated Design Boundaries

AI may propose structure, copy, or visual alternatives within approved scope. Generated designs are proposals, must use realistic structure without fake product facts, and require human review before implementation.

## 125. Impeccable Skill Boundaries

`impeccable` is a generic subordinate tool. It may not override product, governance, security, accounting, permission, workflow, RTL, responsive, or this Contract. Its exact version must be verified before any separately approved invocation; no invocation is implied by this document.

## 126. Google Stitch Boundaries

Stitch is pre-code exploration only for separately approved layout alternatives, information hierarchy, and controlled responsive prototypes. It is not authority for workflows, permissions, security, accounting, VAT/ZATCA, schemas, APIs, routes, final components, or production code.

## 127. Browser and Screenshot Evidence

Browser or screenshot evidence must identify environment, route, role, locale, direction, viewport, data sensitivity, and owner/manual provenance. Absence of evidence is an unknown, not a passing claim.

## 128. Design Review Gates

Apply relevant review gates for authority, scope, product fidelity, current evidence, component reuse, accessibility, responsive behavior, English/Arabic, RTL/LTR, permissions, financial sensitivity, and states. Manual owner acceptance is human-owned and required only when the active task requires it or claims it.

## 129. Manual Browser Smoke Requirements

Manual smoke is user-owned unless explicitly delegated in a bounded task. When required, test the approved route and role in English and Arabic, LTR and RTL, desktop/tablet/mobile, plus loading, empty, error, forbidden, and sensitive-data states as applicable.

## 130. Design Acceptance Criteria

When acceptance is in scope, use the relevant portions of Section 134, evidence for applicable claims, no invented behavior, no broad redesign, and explicit owner approval state. The Contract does not impose a fixed checklist on ordinary bounded maintenance.

## 131. Exceptions and Deviation Process

Record the reason, affected surface, authority conflict, risk, evidence, mitigation, owner, expiry or follow-up, and approval for any deviation from this Contract.

## 132. Ownership and Change Control

The owner approves this Contract; future changes require owner approval. Changes remain documentation-only until approved and must preserve canonical product decisions, guards, implementation reality, and current-work continuity.

## 133. Open Decisions

Open items include exact template details, role/assignment widget scopes, report definitions, future supplier evidence, component consolidation, and any values marked **TO BE EXTRACTED FROM VERIFIED CURRENT IMPLEMENTATION**. Open product questions remain UNKNOWN - MUST VERIFY.

## 134. Approval Checklist

- Product fidelity and authority hierarchy are confirmed.
- G7 identity, deep navy foundation, restrained gold, hierarchy, and density are preserved.
- Existing tokens and components are reused where suitable; any new component is separately approved.
- Accessibility, keyboard, focus, semantic structure, contrast, non-color communication, and reduced motion are addressed.
- English, Arabic, RTL, LTR, mixed-language values, dates, IDs, and currency are reviewed.
- Desktop, tablet, and mobile behavior preserves critical functionality and responsive action placement.
- Permissions, assignments, sensitivity, customer/supplier separation, financial values, bank/tax data, and server authorization are addressed.
- Loading, empty, error, unauthorized, archived/read-only, voided, superseded, attachments, evidence, and original preservation states are addressed.
- No workflow, accounting, tax, schema, API, route, fake metric, or product fact was invented.
- No critical mobile functionality is hidden; no unapproved dependency or broad redesign is introduced.
- Where runtime visual or interaction claims are made, manual browser smoke evidence is required with named ownership, tested language and direction, tested viewport or device class, relevant permission role, and a documented repository-verdict result; purely textual governance tasks do not require browser evidence. Evidence is supplied, unknowns are labeled, and owner approval state is recorded.
