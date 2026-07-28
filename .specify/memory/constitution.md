# G7 BLUE CRM Constitution

## 1. Repository Authority
- `AGENTS.md` is authoritative.
- Spec Kit output must never override `AGENTS.md`.
- G7 custom skills remain mandatory where applicable:
  - `.agents/skills/g7-crm-erp-guard/SKILL.md`
  - `.agents/skills/g7-crm-agent-control/SKILL.md`

## 2. Agent Control Workflow
- Implementation begins with `MODE: IMPLEMENT_NO_STAGE`.
- Staging/commit/push require explicit controlled modes and user approval.
- No `git add .`
- No auto-commit.
- No auto-push.
- No PR unless explicitly requested.
- Return `TASK RESULT: HOLD` if conflict exists.

## 3. Database and Secrets Safety
- No SQL apply without explicit human approval.
- No Supabase command without explicit approval.
- No `.env*` reading.
- No secrets reading.
- No database writes unless explicitly approved.
- No dev server/port kills unless explicitly approved.

## 4. Locked ERP Flow
- Customer Profile → Service / Booking → Quotation → Invoice → Payment
- Quotations and Invoices are Service-scoped; no standalone Quotation or Invoice is allowed.
- No invoice without linked Service / Booking.
- No invoice without approved quotation basis.
- Service is the core entity name, not Project.
- Global module entry points may select an eligible Service first, but they must delegate to the same Service-scoped authority.
- Global Invoice creation is not implemented. Any future global Invoice chooser must deep-link to Service Billing and must not add a second mutation authority.

## 5. VAT and Saudi E-Invoicing Constraints
- Current `company_settings.vat_mode = not_registered`.
- No Tax Invoice wording while not VAT registered.
- No VAT 15% calculation/display while not VAT registered.
- No VAT number display while not VAT registered.
- No ZATCA/FATOORA/QR/XML/clearance behavior while not VAT registered.
- Commercial Invoice / Proforma / Receipt only while not registered.

## 6. Financial Correctness
- Never trust client financial totals.
- Server/database logic must calculate/validate financial totals.
- Invoice creation is implemented through the ordered-migration `create_invoice_atomic` RPC path.
- Payment recording is implemented through the hardened atomic `record_invoice_payment` RPC path with request-id idempotency.
- Invoice totals must derive from approved quotation snapshots.
- Deposit amount is flexible, not fixed 50%.
- Financial records require void/cancel/reversal workflows rather than hard delete.

## 7. Snapshot Immutability
- Customer-facing documents must snapshot seller, buyer, quotation, bank, VAT mode, document label, and rules at issue time.
- Issued financial snapshots are historical truth and must not mutate if company settings, customers, VAT mode, or bank details change later.
- A Quotation or Invoice is one authoritative financial record. Future Arabic and English output are rendering options over that same record, not duplicated financial data.
- A future default rendering locale must not prevent rendering the same authoritative record in Arabic or English.
- Stored customer, event, and item text must not be silently machine-translated. Explicit stored translations or a reviewed fallback are required.
- Side-by-side bilingual presentation remains a separate future decision.

## 8. RBAC and Security
- UI checks are not security.
- Server actions and database policies must enforce permissions.
- Viewer must not mutate data.
- Approval and financial actions require explicit permissions.

## 9. Spec Kit Usage Rule
- Spec Kit is for specification, planning, task breakdown, and review.
- Spec Kit implementation does not bypass G7 guardrails.
- Every major Spec Kit spec must include applicable G7 business constraints and acceptance criteria.
- Small bounded fixes may remain normal controlled prompts instead of Spec Kit specs.

## 10. Deferred Items
- ERP-3B Invoice creation and Payment recording are implemented and the historical Feature 001 planning packet is closed.
- Global Invoice creation is not implemented.
- Invoice void/correction, Payment reversal/refund, and customer credit-note workflows remain deferred to separate features.
- Supplier AP, Vendor Bills, Supplier Credits, Supplier Payments, Company Expenses, direct Event costing, and Event Margin remain unimplemented.
- ZATCA/FATOORA/QR/XML deferred.
- Tax Invoice deferred until VAT registration.
