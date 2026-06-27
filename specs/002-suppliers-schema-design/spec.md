# Feature Specification: Supplier Module Schema Design

**Feature Branch**: `[002-suppliers-schema-design]`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Supplier Module design for G7 BLUE service delivery, supplier costing, supplier bookings/internal POs, supplier invoices, supplier payments, RBAC, RLS direction, and snapshot-safe supplier records."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Supplier Directory (Priority: P1)

Operations and Admin users can maintain a trusted supplier directory for event-service delivery partners such as transportation providers, car providers, cleaning companies, event staff, organizers, security, sound, lighting, screens, decoration, photography/videography, catering, logistics, furniture, tents, stage, printing, and permit/support providers.

**Why this priority**: G7 BLUE delivers through external suppliers/subcontractors. Supplier master data is foundational before costing, booking, supplier invoices, or supplier payments can be safely designed.

**Independent Test**: Can be tested by reviewing the supplier specification and confirming that master data supports service categories, status, contact, compliance, payment terms, soft delete, and audit requirements without implementing code or SQL.

**Acceptance Scenarios**:

1. **Given** the supplier module design is reviewed, **When** Operations checks the supplier master data requirements, **Then** the specification includes supplier code, names, category/type, contact details, status, coverage, notes, compliance, payment terms, bank/IBAN strategy, soft delete, and audit fields.
2. **Given** a supplier is no longer usable, **When** Admin reviews the lifecycle requirements, **Then** the specification supports on-hold, blacklisted, and soft-deleted states without hard deletion of historical records.

---

### User Story 2 - Choose Suppliers by Category, Status, and Contact Details (Priority: P1)

Operations users can choose suitable suppliers by category/type, status, location/coverage area, and reliable contact details for a Service/Booking.

**Why this priority**: The locked G7 BLUE flow remains Customer Profile -> Service/Booking -> Quotation -> Invoice -> Payment, and supplier selection must integrate with Service/Booking rather than replace it.

**Independent Test**: Can be tested by confirming the specification supports filtering and selection criteria for suppliers while preserving Service/Booking as the operational anchor.

**Acceptance Scenarios**:

1. **Given** a Service/Booking needs suppliers, **When** Operations searches by category and status, **Then** only appropriate active or preferred suppliers should be selectable in the future implementation.
2. **Given** a supplier is on_hold or blacklisted, **When** Operations reviews available suppliers, **Then** the future workflow must prevent accidental use or require explicit approval according to policy.

---

### User Story 3 - Review Supplier Costing for a Service/Booking (Priority: P1)

Manager/Admin users can review expected supplier costs for a Service/Booking so that internal margin can be understood before or after customer quotation work.

**Why this priority**: Supplier costs are the delivery engine behind customer revenue. The core financial concept is Customer Revenue - Sum(Supplier Costs) = Gross Profit per Service.

**Independent Test**: Can be tested by confirming the specification defines service supplier allocations, estimated and actual costs, rate card references, currency, allocation statuses, and role-restricted visibility.

**Acceptance Scenarios**:

1. **Given** a Service/Booking has planned supplier work, **When** a Manager reviews internal costing, **Then** the specification supports estimated supplier costs per allocation and service-level Supplier Estimated Cost.
2. **Given** actual supplier costs are later known, **When** a Manager/Admin compares estimate to actual, **Then** the specification supports Supplier Actual Cost and Gross Profit visibility for permitted roles only.
3. **Given** a customer-facing quotation is generated, **When** supplier costing exists internally, **Then** supplier cost and margin must not appear on customer-facing quotation or invoice documents.

---

### User Story 4 - Record Supplier Invoice and Payment Separately (Priority: P2)

An Accountant can later record supplier invoices and supplier payments separately from customer invoices and customer payments.

**Why this priority**: Supplier payables are operational costs, while customer invoices/payments are receivables. Mixing them would risk financial reporting, permissions, and document semantics.

**Independent Test**: Can be tested by confirming the specification requires separate supplier_invoices and supplier_payments entities and does not reuse customer invoices or customer payments.

**Acceptance Scenarios**:

1. **Given** a supplier sends an invoice, **When** Accountant records it in a future phase, **Then** it must use a supplier invoice flow separate from customer invoices.
2. **Given** G7 BLUE pays a supplier, **When** Accountant records payment in a future phase, **Then** it must use a supplier payment flow separate from customer payments.
3. **Given** G7 BLUE is currently not VAT registered, **When** supplier invoice fields include VAT status/amount concepts, **Then** this must not add Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior to G7 BLUE customer invoices.

---

### User Story 5 - Blacklist Supplier with Audit Reason (Priority: P2)

Admin/Manager users can blacklist a supplier with an audit reason and actor/time tracking.

**Why this priority**: Supplier reliability and safety affect event delivery. Blacklisting must be deliberate, auditable, and protected from casual reversal.

**Independent Test**: Can be tested by confirming the specification includes blacklisted_reason, blacklisted_at, blacklisted_by, optional unblacklist reason/history, and permission restrictions.

**Acceptance Scenarios**:

1. **Given** a supplier must be blocked, **When** an authorized user blacklists the supplier, **Then** the future system must capture blacklisted_reason, blacklisted_at, and blacklisted_by.
2. **Given** a supplier was blacklisted, **When** another user reviews the supplier, **Then** the future system must show the internal audit reason only to permitted roles.

---

### User Story 6 - Preserve Supplier Snapshot for Booking/Internal PO (Priority: P2)

Operations/Admin users can later create supplier bookings or internal purchase orders that preserve supplier details as they were at booking time.

**Why this priority**: Supplier names, contacts, payment terms, bank details, and status can change. Historical supplier bookings/internal POs must remain snapshot-safe.

**Independent Test**: Can be tested by confirming supplier_bookings include supplier snapshot fields and terms/notes snapshot fields.

**Acceptance Scenarios**:

1. **Given** a supplier booking/internal PO is created in a future phase, **When** supplier master data changes later, **Then** the historical booking/internal PO must still show the original supplier snapshot.
2. **Given** a supplier booking/internal PO is cancelled, **When** its history is reviewed, **Then** cancellation fields and audit data must preserve the decision trail.

---

### User Story 7 - Review Expected vs Actual Supplier Costs (Priority: P3)

Manager/Admin users can review expected versus actual supplier costs for service profitability.

**Why this priority**: G7 BLUE needs margin visibility, but this must be restricted and phased after core supplier master data, allocation, booking, invoice, and payment design.

**Independent Test**: Can be tested by confirming the specification defines Service P&L concepts without implementing automatic margin reports.

**Acceptance Scenarios**:

1. **Given** a Service/Booking has customer revenue and supplier costs, **When** a permitted Manager/Admin reviews profitability, **Then** the specification supports Customer Revenue, Supplier Estimated Cost, Supplier Actual Cost, and Gross Profit.
2. **Given** a user lacks costing permission, **When** they view supplier directory or customer-facing documents, **Then** internal cost and margin data must not be visible by default.

### Edge Cases

- What happens when a supplier is blacklisted after existing bookings exist? Historical supplier bookings/internal POs and supplier invoices must remain snapshot-safe while new usage is blocked or approval-gated.
- How does the system handle supplier data changes after a supplier invoice is received? Supplier invoice records must preserve supplier snapshot fields so historical payable documents do not mutate.
- What happens when a supplier is soft-deleted? Active selection should exclude soft-deleted suppliers, but historical allocations, bookings, invoices, and payments must remain readable to permitted users.
- How should supplier VAT registration be stored while G7 BLUE is not VAT registered? Supplier VAT status and supplier invoice VAT amount may be tracked as supplier-side facts, but must not create Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, or customer e-invoicing behavior for G7 BLUE.
- What happens when actual cost differs from rate card cost? The allocation must preserve estimated cost and allow actual cost separately so variance and Gross Profit can be reviewed by permitted roles.

## Resolved Clarifications

- **OQ-001**: Suppliers can be both `company` and `individual` supplier types.
- **OQ-002**: CR/commercial registration is optional at supplier creation. CR is required for official company suppliers when available or when formal supplier documents/audit require it. CR is not required for individual suppliers by default.
- **OQ-003**: IBAN/bank details are optional at supplier creation, required before confirmed supplier payment, and must be masked by role.
- **OQ-004**: Normal supplier invoices must link to a Service/Booking for service-level profitability. `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs that are clearly classified so they do not distort Service P&L.
- **OQ-005**: Blacklisting is controlled by Admin/Manager only and requires a reason.
- **OQ-006**: Blacklist audit must record `blacklisted_reason`, `blacklisted_at`, and `blacklisted_by`. Unblacklisting requires a reason/history entry and is Admin-only by default, or Manager with explicit approval later. If a supplier is blacklisted after previous bookings/invoices exist, historical records and snapshots remain preserved, and new allocations/bookings are blocked by default unless a later Admin/Manager override is approved.
- **OQ-007**: Expected margin is visible to Admin/Manager only by default. Operations can view supplier directory and operational booking details, but not internal margin by default.
- **OQ-008**: Actual margin is visible to Admin/Manager only by default. Accountant can view supplier invoices and supplier payments, but not gross margin unless explicitly approved later. Customer-facing documents must never expose supplier cost or margin.
- **OQ-009**: Supplier rating is manual and optional for MVP. Automatic rating is deferred until enough delivery, payment, and incident data exists.
- **OQ-010**: MVP supplier categories use a controlled list plus `other`: `transport`, `cars`, `cleaning`, `staff`, `security`, `sound`, `lighting`, `screens_led`, `decoration`, `photo_video`, `catering`, `logistics`, `furniture_tents_stage`, `printing`, `permits_support`, `other`.
- **OQ-011**: Minimum required supplier creation fields are display/legal name, supplier type, category, contact person or primary contact name, phone, city, country, and status. Other fields can be optional at creation and completed later.
- **OQ-012**: Supplier bank details must be masked by role. Admin and Accountant can see full bank details by default. Manager/Operations may see masked bank details only if needed. Viewer cannot see bank details.
- **OQ-013**: Service supplier allocation statuses are manual for MVP, with guarded transitions deferred. Statuses are `draft`, `requested`, `quoted`, `confirmed`, `cancelled`, and `completed`.
- **OQ-014**: `supplier_invoices.service_id` is normally linked to a Service/Booking and may be nullable only for Admin-only overhead/non-service supplier invoices. Non-service invoices must be clearly classified.
- **OQ-015**: Preferred supplier is a separate boolean flag, `is_preferred`. Do not model preferred only as a lifecycle status. Supplier lifecycle statuses are `active`, `on_hold`, `blacklisted`, and `inactive`.
- **OQ-016**: On-hold suppliers are blocked by default from new allocations/bookings. Admin/Manager override may be added later if business requires it.
- **OQ-017**: Supplier cost estimates can attach to a Service/Booking before quotation when known. Actual supplier costs attach later after supplier invoice/confirmation. Estimated and actual costs must be stored separately, actual cost must not overwrite estimated cost, and variance must be preserved for later permitted Admin/Manager reporting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define supplier master data with a supplier number/code, supplier type (`company` or `individual`), legal/commercial name, display name, category/type, contact person or primary contact name, phone, WhatsApp phone if separate, email, city, country, coverage area, lifecycle status, `is_preferred`, manual optional rating for MVP, notes, commercial registration / CR number, VAT registration status, VAT number if VAT registered, payment terms, bank/IBAN strategy, soft delete fields, and created/updated audit fields.
- **FR-002**: Supplier lifecycle status MUST support `active`, `on_hold`, `blacklisted`, and `inactive`. Preferred supplier selection MUST be represented by separate boolean flag `is_preferred`, not only by lifecycle status.
- **FR-003**: Supplier soft delete MUST include `deleted_at` and SHOULD include optional `deleted_by`; historical supplier-related records MUST remain readable to permitted users.
- **FR-004**: Supplier blacklist audit MUST include `blacklisted_reason`, `blacklisted_at`, `blacklisted_by`, and unblacklist reason/history. Blacklisting is Admin/Manager-only, requires a reason, preserves existing bookings/invoices/snapshots, and blocks new allocations/bookings by default.
- **FR-005**: Supplier rate cards MUST support `supplier_id`, item/service name, category, unit, `base_cost`, currency, `valid_from`, `valid_to`, notes, active/inactive state, and audit fields.
- **FR-006**: Supplier rate cards MUST be effective-date/versioned defaults for internal estimates only. Future price changes must not rewrite historical estimates or bookings, and rate cards must not automatically drive customer quotation pricing in MVP.
- **FR-007**: Service supplier allocations/costing MUST support `service_id`, `supplier_id`, nullable `rate_card_id`, item description, quantity, unit, estimated unit cost, estimated total cost, nullable actual unit cost, nullable actual total cost, currency, allocation status, internal notes, and role-restricted visibility. Estimated costs may attach to a Service/Booking before quotation when known; actual costs attach later after supplier invoice/confirmation.
- **FR-008**: Service supplier allocation status MUST support manual MVP statuses `draft`, `requested`, `quoted`, `confirmed`, `cancelled`, and `completed`; guarded transitions are deferred.
- **FR-009**: Supplier cost, supplier margin, and Service P&L data MUST be hidden from customer-facing users and customer-facing quotation/invoice documents by default. Cost/margin visibility is Admin/Manager only by default.
- **FR-010**: Supplier booking/internal PO design MUST support booking number/sequence, `service_id`, `supplier_id`, nullable allocation_id, booking status, booked date/time, service delivery date/time, location, agreed amount, currency, supplier snapshot fields, terms/notes snapshot, created/approved_by, approved_at, and cancellation fields.
- **FR-011**: Supplier booking/internal PO records and future documents MUST be snapshot-safe and must not mutate when supplier master data, terms, contact details, or bank details change later. Supplier booking record, Supplier PO PDF, WhatsApp sending, and email sending remain separate deferred phases.
- **FR-012**: Supplier invoices MUST use a separate `supplier_invoices` entity and MUST NOT reuse customer `invoices`.
- **FR-013**: Supplier invoices MUST support internal supplier invoice number, `supplier_id`, `service_id`, nullable `supplier_booking_id`, external supplier invoice reference, issue_date, due_date, subtotal, vat_amount, grand_total, currency, status, supplier snapshot fields, approval fields, notes, and audit fields. Normal event/service supplier invoices MUST link to Service/Booking; `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs that are clearly classified so they do not distort Service P&L.
- **FR-014**: Supplier invoice status MUST support `received`, `approved`, `partially_paid`, `paid`, `disputed`, and `cancelled`.
- **FR-015**: Supplier payments MUST use a separate `supplier_payments` entity and MUST NOT reuse customer payments.
- **FR-016**: Supplier payments MUST support `supplier_invoice_id`, `supplier_id`, nullable `service_id`, amount, payment_method, payment_date, reference, status, created_by, confirmed_by, confirmed_at, and notes. Supplier payments are outbound/payable flows and must remain separate from customer receivable payment flows.
- **FR-017**: Supplier payment status MUST support `draft`, `confirmed`, and `cancelled`.
- **FR-018**: Service P&L concepts MUST include Customer Revenue, Supplier Estimated Cost, Supplier Actual Cost, and Gross Profit. Estimated and actual supplier costs MUST be stored separately; actual cost must not overwrite estimated cost, and actual cost variance MUST be preserved for later permitted Admin/Manager reporting.
- **FR-019**: Service P&L, supplier costs, supplier invoices, and supplier payments MUST require stricter permissions than basic supplier directory read access.
- **FR-020**: Supplier module design MUST preserve the locked flow Customer Profile -> Service/Booking -> Quotation -> Invoice -> Payment and must integrate suppliers later through Service/Booking.
- **FR-021**: Customer quotation documents MUST never expose supplier cost, supplier rate card data, supplier actual cost, or profit/margin.
- **FR-022**: Supplier invoices and supplier payments MUST be designed separately from customer invoices and customer payments.
- **FR-023**: Supplier PO/PDF/WhatsApp/email sending MUST remain deferred.
- **FR-024**: Supplier invoice/payment implementation MUST remain deferred until explicitly approved.
- **FR-025**: Event costing/profit margin reports MUST remain deferred until explicitly approved.
- **FR-026**: While G7 BLUE is not VAT registered, supplier module design MUST NOT add Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, or official Saudi e-invoicing behavior to customer invoices, quotations, or documents.
- **FR-027**: Supplier bank/IBAN details MUST be optional at supplier creation, required before confirmed supplier payment, and role-masked. Full bank details are visible only to Admin and Accountant by default; Manager/Operations may see masked bank details if needed; Viewer must not see bank details.
- **FR-028**: Supplier directory visibility MAY be broader than financial visibility, but supplier costs, margins, invoices, payments, and bank details MUST be restricted.
- **FR-029**: The current static `/suppliers` rows from `suppliersData` are not the target future state; the supplier module design MUST support replacement with live supplier records in a later approved implementation.
- **FR-030**: Commercial registration / CR MUST be optional at supplier creation, required for official company suppliers when available or when formal supplier documents/audit require it, and not required for individual suppliers by default.
- **FR-031**: MVP supplier categories MUST use a controlled list plus `other`: `transport`, `cars`, `cleaning`, `staff`, `security`, `sound`, `lighting`, `screens_led`, `decoration`, `photo_video`, `catering`, `logistics`, `furniture_tents_stage`, `printing`, `permits_support`, `other`.
- **FR-032**: MVP supplier creation MUST require display/legal name, supplier type, category, contact person or primary contact name, phone, city, country, and status. Other fields can be optional at creation and completed later.
- **FR-033**: Supplier rating MUST be manual and optional for MVP. Automatic supplier rating is deferred until enough delivery, payment, and incident data exists.

### Non-Goals and Deferred Items

- No implementation in this phase.
- No SQL or migrations in this phase.
- No UI changes in this phase.
- No supplier create/edit/delete implementation in this phase.
- Supplier PO PDF generation is Deferred.
- WhatsApp/email sending is Deferred.
- Supplier portal is Deferred.
- Supplier invoice attachment upload is Deferred.
- Supplier payment approval workflow implementation is Deferred.
- Rate-card-driven quotation automation is Deferred.
- Automatic margin reports are Deferred.
- ZATCA/FATOORA/QR/XML behavior is Deferred.
- Tax Invoice/VAT 15% behavior for G7 BLUE customer invoices is Deferred.
- Chamber/PO attestation workflow is Deferred.

### Key Architectural Decisions

- **AD-001**: Use a separate `supplier_invoices` table/entity instead of reusing customer `invoices`.
- **AD-002**: Use a separate `supplier_payments` table/entity instead of reusing customer payments.
- **AD-003**: Keep internal supplier cost and margin data separate from customer-facing quotation and invoice documents.
- **AD-004**: Use snapshot fields for supplier bookings/internal POs and supplier invoices so historical records remain stable after supplier master data changes.
- **AD-005**: Use effective-date/versioned `supplier_rate_cards` with `valid_from` and `valid_to`.
- **AD-006**: Use soft delete for suppliers so historical allocations, supplier_bookings, supplier_invoices, and supplier_payments remain intact.
- **AD-007**: Keep supplier module integration anchored to Service/Booking, not legacy Project, while preserving historical project references only as existing technical debt.
- **AD-008**: Treat supplier invoices/payments as outbound/payable flows and customer invoices/payments as receivable flows; do not reuse customer financial tables for supplier payables.

### RBAC Requirements

- **RBAC-001**: `suppliers:read` SHOULD allow basic supplier directory visibility for operational lookup.
- **RBAC-002**: `suppliers:write` SHOULD allow permitted Operations, Manager, and Admin users to maintain supplier master data according to final role policy.
- **RBAC-003**: `supplier_costing:read` MUST be required to view supplier costs, service supplier allocations, expected cost, actual cost, variance, and margin-impacting fields.
- **RBAC-004**: `supplier_costing:write` MUST be required to create or update supplier costing allocations and actual cost fields.
- **RBAC-005**: `supplier_bookings:read` MUST be required to view supplier bookings/internal POs where operational details or agreed amounts are included.
- **RBAC-006**: `supplier_bookings:write` MUST be required to create, approve, cancel, or update supplier bookings/internal POs.
- **RBAC-007**: `supplier_invoices:read` MUST be required to view supplier payable invoices.
- **RBAC-008**: `supplier_invoices:write` MUST be required to receive, approve, dispute, cancel, or update supplier payable invoices.
- **RBAC-009**: `supplier_payments:read` MUST be required to view supplier payment records.
- **RBAC-010**: `supplier_payments:write` MUST be required to create, confirm, or cancel supplier payment records.
- **RBAC-011**: Admin has full supplier, costing, payment, bank, and management visibility by default.
- **RBAC-012**: Manager has supplier/costing/margin visibility subject to business role, but may see only masked bank details unless explicitly needed.
- **RBAC-013**: Accountant can view supplier invoices, supplier payments, and full bank details, but must not see gross margin unless explicitly approved later.
- **RBAC-014**: Operations can view supplier directory and operational booking details, and may see masked bank details if needed, but must not see internal margin by default.
- **RBAC-015**: Viewer can read only permitted non-sensitive supplier directory information and must not see sensitive bank, cost, or margin data.
- **RBAC-016**: Cost/margin visibility is Admin/Manager only by default for expected margin, actual margin, Gross Profit, and Service P&L.
- **RBAC-017**: Customer-facing users and broad read-only users MUST NOT see internal supplier cost/margin data by default.

### RLS Policy Direction

No SQL is included in this specification. Future RLS policy design should follow these directions:

- Supplier directory read access should allow permitted authenticated roles to read non-deleted basic supplier profile fields.
- Supplier master write access should be restricted to roles with `suppliers:write`.
- Costing read/write access should require `supplier_costing:read` and `supplier_costing:write` equivalents at the server/action and database policy layers.
- Supplier booking approval/cancellation should be restricted to explicitly permitted Manager/Admin or approved Operations roles.
- Supplier invoice approval, dispute, cancellation, and payment confirmation should be restricted to Accountant/Admin and any explicitly approved Manager permissions.
- Audit/history fields should be protected from ordinary updates; created_by, updated_by, blacklisted_by, approved_by, confirmed_by, deleted_by, and timestamp fields should be controlled by trusted server/database logic.
- Supplier bank details and IBAN should be masked or excluded for roles that do not need payment execution visibility.
- Admin-only overhead/non-service supplier invoices should be policy-gated and clearly classified before they bypass normal Service/Booking linkage.

### Key Entities *(include if feature involves data)*

- **suppliers**: Supplier master profile. Represents an external delivery partner/subcontractor. Key attributes include supplier number/code, supplier type (`company` or `individual`), legal/commercial name, display name, category/type, contact person, phone, WhatsApp phone, email, city, country, coverage area, lifecycle status (`active`, `on_hold`, `blacklisted`, `inactive`), `is_preferred`, manual optional rating, notes, CR number, VAT registration status, VAT number if VAT registered, payment terms, bank/IBAN strategy, soft delete, blacklist audit, and created/updated audit fields.
- **supplier_rate_cards**: Effective-dated supplier pricing catalog. Belongs to a supplier and contains item/service name, category, unit, base_cost, currency, valid_from, valid_to, notes, active/inactive flag, and audit fields. Rate cards are estimates/defaults only and must not automatically drive customer quotation pricing in MVP.
- **service_supplier_allocations**: Internal costing allocation that connects a Service/Booking to supplier work. Belongs to a service and supplier, may reference a supplier_rate_card, and stores estimated cost, actual cost, variance, currency, allocation status, and internal notes.
- **supplier_bookings**: Internal supplier booking or future internal PO. Belongs to a service and supplier, may reference an allocation, and stores booking number, dates, location, agreed amount, currency, supplier snapshot fields, terms/notes snapshot, approval data, and cancellation data.
- **supplier_invoices**: Supplier payable invoice record, separate from customer invoices. Belongs to a supplier and normally links to a Service/Booking and may link to supplier_booking. `supplier_invoices.service_id` may be nullable only for Admin-only overhead/non-service costs that are clearly classified. Stores supplier snapshot fields, invoice dates, totals, VAT amount as supplier-side data, external supplier reference, status, approval fields, notes, and audit fields.
- **supplier_payments**: Supplier payment record, separate from customer payments. Belongs to a supplier_invoice and supplier, may link to a service, and stores amount, method, date, reference, status, confirmation fields, notes, and audit fields.

Relationships in prose: A supplier can have many supplier_rate_cards. A Service/Booking can have many service_supplier_allocations. Each allocation belongs to one supplier and may use one supplier_rate_card. A supplier_booking belongs to a service and supplier and may come from an allocation. A supplier_invoice belongs to a supplier and may relate to a service and supplier_booking. A supplier_payment belongs to a supplier_invoice and supplier and may also reference the service for reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The specification defines a future supplier model that replaces static supplier rows as the target state; `suppliersData` remains only current-state context, not the desired architecture.
- **SC-002**: Supplier master data requirements support event-service categories, status, contact details, compliance fields, payment terms, soft delete, blacklist audit, and created/updated audit fields.
- **SC-003**: Supplier financial flows are architecturally separated from customer financial flows through separate supplier_invoices and supplier_payments concepts.
- **SC-004**: Supplier cost, supplier margin, supplier invoice, supplier payment, supplier bank detail, and Service P&L visibility are explicitly role-restricted.
- **SC-005**: Supplier booking/internal PO and supplier invoice concepts include snapshot-safe fields so historical records do not mutate when supplier master data changes.
- **SC-006**: The design can be safely phased into future plan/tasks work after approval without implementing SQL, migrations, UI, supplier invoice/payment workflows, supplier PO PDFs, WhatsApp/email sending, or automatic margin reports in this phase.

## Assumptions

- G7 BLUE is a pure-service events/production company and suppliers/subcontractors are core to delivery.
- The supplier module will integrate through Service/Booking and will not replace the locked Customer Profile -> Service/Booking -> Quotation -> Invoice -> Payment flow.
- Basic supplier directory access may be useful to Operations, Manager, Admin, and Viewer roles depending on final policy, but costing and financial data require stricter access.
- Supplier VAT registration facts may need to be stored for supplier-side records, but G7 BLUE customer documents remain constrained by current `company_settings.vat_mode = not_registered`.
- Supplier PO/PDF generation, WhatsApp/email sending, supplier invoice attachment upload, supplier payment approval workflow, and automatic margin reporting are deferred.

## Open Questions

- No remaining open questions for OQ-001 through OQ-017. Future planning may still define detailed approval UX, exact RLS SQL, and final document formats in separate approved tasks.
