-- G7 BLUE CRM schema reference snapshot.
--
-- This file reflects the verified live Supabase DB shape after manually
-- applied SQL through the Core Security, Quotations RPC, Company Settings
-- CS-A, and ERP-1 Services work. It is a reference snapshot, not migration
-- tracking and not an
-- instruction to auto-apply SQL. SQL has been applied manually through the
-- Supabase SQL Editor, so supabase_migrations.schema_migrations may not exist.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. App Users
CREATE TABLE app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id text UNIQUE NOT NULL,
    email text,
    name text,
    role text NOT NULL CHECK (role IN ('admin', 'manager', 'sales', 'operations', 'accountant', 'viewer')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Number Sequences
CREATE TABLE number_sequences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer')),
    year integer NOT NULL,
    sequence integer NOT NULL DEFAULT 0,
    prefix text NOT NULL,
    example_format text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(type, year)
);
CREATE TRIGGER update_number_sequences_updated_at BEFORE UPDATE ON number_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Company Settings
CREATE TABLE company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text NOT NULL DEFAULT 'default' UNIQUE,
    legal_name_en text NOT NULL,
    legal_name_ar text NOT NULL,
    official_email text NOT NULL,
    official_phone text NOT NULL,
    national_address text NOT NULL,
    cr_number text,
    tin_number text,
    vat_mode text NOT NULL DEFAULT 'not_registered',
    vat_effective_date date,
    vat_number text,
    bank_name text NOT NULL,
    bank_iban text NOT NULL,
    bank_account_holder text NOT NULL,
    currency text NOT NULL DEFAULT 'SAR',
    default_vat_percent numeric(5,2) NOT NULL DEFAULT 0.00,
    default_terms text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text,
    CONSTRAINT chk_company_settings_singleton_key CHECK (setting_key = 'default'),
    CONSTRAINT chk_company_settings_vat_mode CHECK (vat_mode IN ('not_registered', 'vat_registered_phase_1', 'phase2_integrated')),
    CONSTRAINT chk_company_settings_default_vat_percent CHECK (default_vat_percent >= 0 AND default_vat_percent <= 100),
    CONSTRAINT chk_company_settings_vat_consistency CHECK (
        (
            vat_mode = 'not_registered'
            AND default_vat_percent = 0
            AND vat_number IS NULL
            AND vat_effective_date IS NULL
        )
        OR
        (
            vat_mode IN ('vat_registered_phase_1', 'phase2_integrated')
            AND default_vat_percent > 0
            AND vat_number IS NOT NULL
        )
    )
);
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_settings IS 'Singleton seller/master-company settings. Defaults for new documents only; existing documents must use snapshots.';
COMMENT ON COLUMN company_settings.setting_key IS 'Stable singleton key. Must be default.';
COMMENT ON COLUMN company_settings.legal_name_en IS 'English legal seller/company name.';
COMMENT ON COLUMN company_settings.legal_name_ar IS 'Arabic legal seller/company name.';
COMMENT ON COLUMN company_settings.tin_number IS 'TIN.';
COMMENT ON COLUMN company_settings.vat_mode IS 'VAT registration mode. phase2_integrated is reserved for future FATOORA integration and must not be claimed in CS-A UI.';
COMMENT ON COLUMN company_settings.default_vat_percent IS 'Default VAT percent for new documents only. Existing quotations/invoices keep their own VAT snapshots.';

-- 4. Customers
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number text NOT NULL UNIQUE,
    company text NOT NULL,
    contact text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    city text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'inactive', 'lead')),
    projects_count integer DEFAULT 0,
    revenue numeric(12,2) DEFAULT 0.00 CHECK (revenue >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text,
    customer_type text,
    legal_name text,
    commercial_registration_number text,
    vat_number text,
    national_address_building_number text,
    national_address_street text,
    national_address_district text,
    national_address_city text,
    national_address_postal_code text,
    national_address_additional_number text,
    national_address_country text,
    billing_email text,
    finance_contact_name text,
    finance_contact_phone text,
    payment_terms text,
    po_required boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_customers_customer_type CHECK (
        customer_type IS NULL
        OR customer_type IN ('individual', 'company')
    ),
    CONSTRAINT chk_customers_commercial_registration_number_not_empty CHECK (
        commercial_registration_number IS NULL
        OR btrim(commercial_registration_number) <> ''
    ),
    CONSTRAINT chk_customers_vat_number_not_empty CHECK (
        vat_number IS NULL
        OR btrim(vat_number) <> ''
    ),
    CONSTRAINT chk_customers_billing_email_not_empty CHECK (
        billing_email IS NULL
        OR btrim(billing_email) <> ''
    ),
    CONSTRAINT chk_customers_finance_contact_phone_not_empty CHECK (
        finance_contact_phone IS NULL
        OR btrim(finance_contact_phone) <> ''
    )
);
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN customers.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN customers.updated_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN customers.customer_type IS 'Optional customer classification for invoice buyer context: individual or company. Nullable for existing/backward-compatible records.';
COMMENT ON COLUMN customers.legal_name IS 'Optional legal/customer billing name for future invoice buyer snapshots.';
COMMENT ON COLUMN customers.commercial_registration_number IS 'Optional Commercial Registration number; not unique or mandatory in this phase.';
COMMENT ON COLUMN customers.vat_number IS 'Optional customer VAT number; storing this does not enable Tax Invoice, ZATCA, QR, XML, clearance, or reporting behavior.';
COMMENT ON COLUMN customers.national_address_building_number IS 'Optional National Address building number.';
COMMENT ON COLUMN customers.national_address_street IS 'Optional National Address street.';
COMMENT ON COLUMN customers.national_address_district IS 'Optional National Address district.';
COMMENT ON COLUMN customers.national_address_city IS 'Optional National Address city.';
COMMENT ON COLUMN customers.national_address_postal_code IS 'Optional National Address postal code.';
COMMENT ON COLUMN customers.national_address_additional_number IS 'Optional National Address secondary/additional number.';
COMMENT ON COLUMN customers.national_address_country IS 'Optional National Address country.';
COMMENT ON COLUMN customers.billing_email IS 'Optional billing email for finance communication.';
COMMENT ON COLUMN customers.finance_contact_name IS 'Optional finance contact name.';
COMMENT ON COLUMN customers.finance_contact_phone IS 'Optional finance contact phone.';
COMMENT ON COLUMN customers.payment_terms IS 'Optional customer-specific payment terms.';
COMMENT ON COLUMN customers.po_required IS 'Whether the customer requires a purchase order before invoicing; default false for backward compatibility.';

-- 5. Services
CREATE TABLE services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number text NOT NULL UNIQUE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    service_title text NOT NULL,
    event_name text,
    event_type text,
    event_start_date date,
    event_end_date date,
    event_location text,
    description text,
    estimated_budget numeric(12,2),
    status text NOT NULL DEFAULT 'Inquiry',
    sales_owner_id text,
    cancellation_reason text,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by text,
    updated_by text,
    CONSTRAINT chk_services_service_title_not_blank CHECK (length(trim(service_title)) > 0),
    CONSTRAINT chk_services_service_number_format CHECK (service_number ~ '^SVC-[0-9]{4}-[0-9]{4}$'),
    CONSTRAINT chk_services_estimated_budget_nonnegative CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
    CONSTRAINT chk_services_status CHECK (
        status IN ('Inquiry', 'Quoted', 'Approved', 'Deposit Paid', 'In Progress', 'Completed', 'Cancelled')
    ),
    CONSTRAINT chk_services_event_date_range CHECK (
        event_end_date IS NULL
        OR (event_start_date IS NOT NULL AND event_end_date >= event_start_date)
    ),
    CONSTRAINT chk_services_cancelled_reason_required CHECK (
        status <> 'Cancelled'
        OR (cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) > 0)
    )
);
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Suppliers
CREATE TABLE suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    service text NOT NULL,
    contact text NOT NULL,
    phone text NOT NULL,
    rating numeric(3,1) DEFAULT 0.0,
    status text NOT NULL CHECK (status IN ('active', 'inactive', 'blacklisted')),
    recent_project text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text
);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN suppliers.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN suppliers.updated_by IS 'Stores Clerk userId string';

-- 7. Quotations
CREATE TABLE quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number text UNIQUE NOT NULL,
    service_id uuid NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    event text NOT NULL,
    date date NOT NULL,
    valid_until date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 CHECK (subtotal >= 0),
    discount numeric(12,2) DEFAULT 0.00 CHECK (discount >= 0),
    vat_rate numeric(5,2) NOT NULL DEFAULT 0.00,
    vat_amount numeric(12,2) DEFAULT 0.00 CHECK (vat_amount >= 0),
    grand_total numeric(12,2) DEFAULT 0.00 CHECK (grand_total >= 0),
    status text NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text,
    snapshot_seller jsonb NOT NULL,
    snapshot_buyer jsonb NOT NULL,
    CONSTRAINT chk_quotations_snapshot_buyer_type CHECK (jsonb_typeof(snapshot_buyer) = 'object'),
    CONSTRAINT chk_quotations_snapshot_seller_type CHECK (jsonb_typeof(snapshot_seller) = 'object'),
    CONSTRAINT chk_quotations_vat_rate CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT fk_quotations_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    CONSTRAINT quotations_id_service_id_key UNIQUE (id, service_id)
);
CREATE OR REPLACE FUNCTION set_quotation_customer_from_service()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_service_customer_id uuid;
BEGIN
    IF NEW.service_id IS NULL THEN
        RAISE EXCEPTION 'service_id is required';
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.service_id IS NOT NULL
        AND NEW.service_id IS DISTINCT FROM OLD.service_id THEN
        RAISE EXCEPTION 'service_id cannot be changed after quotation creation';
    END IF;

    SELECT s.customer_id
    INTO v_service_customer_id
    FROM services AS s
    WHERE s.id = NEW.service_id
      AND s.deleted_at IS NULL;

    IF v_service_customer_id IS NULL THEN
        RAISE EXCEPTION 'Service not found or deleted: %', NEW.service_id;
    END IF;

    NEW.customer_id := v_service_customer_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_quotation_customer_from_service_trigger BEFORE INSERT OR UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_quotation_customer_from_service();
COMMENT ON COLUMN quotations.vat_rate IS 'Snapshot of the VAT percentage applied by quotation RPCs. Forced to 0 while company_settings.vat_mode is not_registered; does not imply ZATCA/FATOORA compliance.';
COMMENT ON COLUMN quotations.service_id IS 'ERP-2 primary business link. Quotations belong to Services. One Service may have multiple quotations.';
COMMENT ON COLUMN quotations.customer_id IS 'Derived from services.customer_id for reporting/query convenience. Do not trust browser-submitted customer_id.';
COMMENT ON COLUMN quotations.event IS 'Legacy/deprecated ERP-2 compatibility field. Event context should come from the linked service going forward.';
COMMENT ON COLUMN quotations.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN quotations.updated_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN quotations.snapshot_seller IS 'JSONB snapshot of Company Settings at issue time. Contains document config, bank details, and legal data.';
COMMENT ON COLUMN quotations.snapshot_buyer IS 'JSONB snapshot of Customer official details at issue time. Separates quotation identity from live customer record.';

-- 8. Quotation Items
CREATE TABLE quotation_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
    description text NOT NULL,
    details text,
    category text NOT NULL,
    qty numeric(12,2) NOT NULL DEFAULT 1.00 CHECK (qty > 0),
    unit_price numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    vat numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (vat >= 0),
    total numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_quotation_items_updated_at BEFORE UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Invoices
CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number text UNIQUE NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    approved_quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT,
    service_id uuid REFERENCES services(id) ON DELETE RESTRICT,
    date date NOT NULL,
    due_date date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 CHECK (subtotal >= 0),
    vat_amount numeric(12,2) DEFAULT 0.00 CHECK (vat_amount >= 0),
    grand_total numeric(12,2) DEFAULT 0.00 CHECK (grand_total >= 0),
    amount_paid numeric(12,2) DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due numeric(12,2) DEFAULT 0.00 CHECK (balance_due >= 0),
    status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    invoice_type text NOT NULL,
    document_label text, -- staged NOT NULL after ERP-3B invoice creation logic
    vat_mode text, -- staged NOT NULL after ERP-3B invoice creation logic
    vat_rate numeric(5,2) DEFAULT 0.00 CHECK (vat_rate >= 0),
    snapshot_seller jsonb, -- staged NOT NULL after ERP-3B
    snapshot_buyer jsonb, -- staged NOT NULL after ERP-3B
    snapshot_quotation jsonb, -- staged NOT NULL after ERP-3B
    snapshot_bank_details jsonb, -- staged NOT NULL after ERP-3B
    snapshot_document_rules jsonb, -- staged NOT NULL after ERP-3B
    issued_at timestamptz,
    voided_at timestamptz,
    void_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text,
    CONSTRAINT invoices_invoice_type_check CHECK (invoice_type IN ('deposit', 'final')),
    CONSTRAINT invoices_approved_quotation_id_service_id_fkey FOREIGN KEY (approved_quotation_id, service_id) REFERENCES quotations(id, service_id) ON DELETE RESTRICT
);
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN invoices.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN invoices.updated_by IS 'Stores Clerk userId string';

-- 10. Invoice Items
CREATE TABLE invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description text NOT NULL,
    details text,
    qty numeric(12,2) NOT NULL DEFAULT 1.00 CHECK (qty > 0),
    unit_price numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    vat numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (vat >= 0),
    total numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Payments
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number text UNIQUE NOT NULL,
    invoice_id uuid REFERENCES invoices(id) ON DELETE RESTRICT NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    date date NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    method text NOT NULL CHECK (method IN ('bank_transfer', 'cash', 'cheque', 'online')),
    reference text,
    status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text
);
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN payments.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN payments.updated_by IS 'Stores Clerk userId string';

-- 12. Projects
CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number text UNIQUE NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    budget numeric(12,2) DEFAULT 0.00 CHECK (budget >= 0),
    manager text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text
);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN projects.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN projects.updated_by IS 'Stores Clerk userId string';

-- 13. Project Tasks
CREATE TABLE project_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Audit Logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'status_change', 'payment_recorded')),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    user_id text,
    details jsonb,
    timestamp timestamptz DEFAULT now()
);
COMMENT ON COLUMN audit_logs.user_id IS 'Stores Clerk userId string';

-- Document Number Function
CREATE OR REPLACE FUNCTION generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year integer;
    seq_record record;
    formatted_number text;
BEGIN
    IF doc_type IS NULL OR doc_type NOT IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project, service, customer', doc_type;
    END IF;

    current_year := extract(year from current_date);

    INSERT INTO number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type,
        current_year,
        1,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT'
            WHEN doc_type = 'invoice'   THEN 'INV'
            WHEN doc_type = 'payment'   THEN 'PAY'
            WHEN doc_type = 'project'   THEN 'PRJ'
            WHEN doc_type = 'service'   THEN 'SVC'
            WHEN doc_type = 'customer'  THEN 'CUST'
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice'   THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment'   THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project'   THEN 'PRJ-YYYY-0001'
            WHEN doc_type = 'service'   THEN 'SVC-YYYY-0001'
            WHEN doc_type = 'customer'  THEN 'CUST-YYYY-0001'
        END
    )
    ON CONFLICT (type, year) DO UPDATE
    SET sequence = number_sequences.sequence + 1
    RETURNING * INTO seq_record;

    formatted_number := seq_record.prefix || '-' || current_year || '-' || lpad(seq_record.sequence::text, 4, '0');

    RETURN formatted_number;
END;
$$;

-- RPC: create_quotation_with_items
CREATE OR REPLACE FUNCTION create_quotation_with_items(
    p_quotation jsonb,
    p_items jsonb,
    p_user_id text
)
RETURNS TABLE(
    quotation_id uuid,
    quotation_number text,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_quotation_id uuid;
    v_quotation_number text;
    v_service_id uuid;
    v_customer_id uuid;
    v_service_event_start_date date;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_mode text := 'not_registered';
    v_settings_vat_rate numeric(5,2) := 0;
    v_vat_rate numeric(5,2) := 0;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2);
    v_vat_amount numeric(12,2);
    v_grand_total numeric(12,2);
    v_item jsonb;
    v_item_qty numeric(12,2);
    v_item_unit_price numeric(12,2);
    v_item_total numeric(12,2);
    v_items_count integer;
    v_residual numeric(12,2);
    v_max_item_id uuid;
    v_snapshot_seller jsonb;
    v_snapshot_buyer jsonb;
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;

    IF p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object' THEN
        RAISE EXCEPTION 'p_quotation must be a JSON object';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items must be a JSON array';
    END IF;

    IF p_quotation ? 'customer_id' THEN
        RAISE EXCEPTION 'customer_id is derived from service_id and must not be provided';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    v_service_id  := NULLIF(trim(p_quotation ->> 'service_id'), '')::uuid;
    v_event       := NULLIF(trim(p_quotation ->> 'event'), '');
    v_date        := NULLIF(trim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    v_discount    := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);

    IF v_service_id IS NULL THEN
        RAISE EXCEPTION 'service_id is required';
    END IF;

    IF v_event IS NULL THEN
        RAISE EXCEPTION 'event is required';
    END IF;

    IF v_date IS NULL THEN
        RAISE EXCEPTION 'date is required';
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    SELECT s.customer_id, s.event_start_date
    INTO v_customer_id, v_service_event_start_date
    FROM services AS s
    WHERE s.id = v_service_id
      AND s.deleted_at IS NULL;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Service not found or deleted: %', v_service_id;
    END IF;

    IF v_service_event_start_date IS NOT NULL THEN
        IF v_service_event_start_date < v_date THEN
            RAISE EXCEPTION 'Service Start Date (%) cannot be before Issue Date (%)', v_service_event_start_date, v_date;
        END IF;

        IF v_valid_until IS NOT NULL AND v_valid_until > v_service_event_start_date THEN
            RAISE EXCEPTION 'valid_until (%) must be <= Service Start Date (%)', v_valid_until, v_service_event_start_date;
        END IF;
    END IF;

    SELECT
        CASE
            WHEN cs.vat_mode IN ('vat_registered_phase_1', 'phase2_integrated') THEN cs.vat_mode
            ELSE 'not_registered'
        END,
        COALESCE(cs.default_vat_percent, 0)::numeric(5,2),
        jsonb_build_object(
            'snapshotVersion', 1,
            'snapshotSource', 'live_creation',
            'snapshotCapturedAt', now(),
            'snapshotNote', null,
            'legalNameEn', cs.legal_name_en,
            'legalNameAr', cs.legal_name_ar,
            'brandName', 'G7 BLUE',
            'tin', cs.tin_number,
            'entityUnifiedNumber', '7053901414',
            'crNumber', null,
            'vatMode', cs.vat_mode,
            'vatNumber', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_number END,
            'vatEffectiveDate', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_effective_date END,
            'vatRate', cs.default_vat_percent,
            'officialEmail', cs.official_email,
            'officialPhone', cs.official_phone,
            'website', null,
            'address', jsonb_build_object(
                'shortAddress', null,
                'buildingNo', null,
                'street', null,
                'district', null,
                'secondaryNo', null,
                'postalCode', null,
                'city', null,
                'country', null,
                'display', cs.national_address
            ),
            'bank', jsonb_build_object(
                'bankName', cs.bank_name,
                'accountName', cs.bank_account_holder,
                'accountNo', '68207417001000',
                'iban', cs.bank_iban
            ),
            'logoPath', '/brand/G7_BLUE_Events_Icon_White_BG.png',
            'currency', cs.currency,
            'terms', cs.default_terms
        )
    INTO v_vat_mode, v_settings_vat_rate, v_snapshot_seller
    FROM company_settings AS cs
    WHERE cs.setting_key = 'default'
    LIMIT 1;

    IF v_snapshot_seller IS NULL THEN
        RAISE EXCEPTION 'Company settings missing, cannot capture seller snapshot.';
    END IF;

    v_vat_mode := COALESCE(v_vat_mode, 'not_registered');
    v_settings_vat_rate := COALESCE(v_settings_vat_rate, 0);

    IF v_vat_mode = 'not_registered' THEN
        v_vat_rate := 0;
    ELSE
        v_vat_rate := v_settings_vat_rate;
    END IF;

    SELECT jsonb_build_object(
        'snapshotVersion', 1,
        'snapshotSource', 'live_creation',
        'snapshotCapturedAt', now(),
        'snapshotNote', null,
        'customerId', c.id,
        'customerType', c.customer_type,
        'name', c.company,
        'legalName', c.legal_name,
        'contactName', c.contact,
        'email', c.email,
        'phone', c.phone,
        'crNumber', c.commercial_registration_number,
        'vatNumber', c.vat_number,
        'billingEmail', c.billing_email,
        'financeContact', c.finance_contact_name,
        'paymentTerms', c.payment_terms,
        'poRequired', c.po_required,
        'address', jsonb_build_object(
            'shortAddress', null,
            'buildingNo', c.national_address_building_number,
            'street', c.national_address_street,
            'district', c.national_address_district,
            'secondaryNo', c.national_address_additional_number,
            'postalCode', c.national_address_postal_code,
            'city', c.national_address_city,
            'country', c.national_address_country,
            'display', c.city
        )
    )
    INTO v_snapshot_buyer
    FROM customers AS c
    WHERE c.id = v_customer_id;

    IF v_snapshot_buyer IS NULL THEN
        RAISE EXCEPTION 'Customer not found, cannot capture buyer snapshot.';
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'Company Settings default_vat_percent must be between 0 and 100. Got: %', v_vat_rate;
    END IF;

    v_quotation_number := generate_document_number('quotation');
    v_quotation_id := gen_random_uuid();

    INSERT INTO quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total,
        status, created_by, updated_by, snapshot_seller, snapshot_buyer
    )
    VALUES (
        v_quotation_id, v_quotation_number, v_service_id, v_customer_id, v_event, v_date, v_valid_until,
        0, v_discount, v_vat_rate, 0, 0,
        'draft', p_user_id, p_user_id, v_snapshot_seller, v_snapshot_buyer
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Item qty must be > 0. Got: %', v_item ->> 'qty';
        END IF;

        IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
            RAISE EXCEPTION 'Item unit_price must be >= 0. Got: %', v_item ->> 'unit_price';
        END IF;

        v_item_total := v_item_qty * v_item_unit_price;

        INSERT INTO quotation_items (
            quotation_id, description, details, category,
            qty, unit_price, vat, total
        )
        VALUES (
            v_quotation_id,
            COALESCE(v_item ->> 'description', ''),
            v_item ->> 'details',
            COALESCE(v_item ->> 'category', ''),
            v_item_qty,
            v_item_unit_price,
            0,
            v_item_total
        );

        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', v_discount, v_subtotal;
    END IF;

    v_taxable := v_subtotal - v_discount;

    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := ROUND(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE quotation_items AS qi
            SET vat = ROUND((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2)
            WHERE qi.quotation_id = v_quotation_id;

            SELECT v_vat_amount - COALESCE(SUM(qi.vat), 0)
            INTO v_residual
            FROM quotation_items AS qi
            WHERE qi.quotation_id = v_quotation_id;

            IF v_residual <> 0 THEN
                SELECT qi.id INTO v_max_item_id
                FROM quotation_items AS qi
                WHERE qi.quotation_id = v_quotation_id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE quotation_items AS qi
                SET vat = qi.vat + v_residual
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE quotations AS q
    SET subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total
    WHERE q.id = v_quotation_id;

    RETURN QUERY
    SELECT
        v_quotation_id     AS quotation_id,
        v_quotation_number AS quotation_number,
        v_subtotal         AS subtotal,
        v_discount         AS discount,
        v_vat_amount       AS vat_amount,
        v_grand_total      AS grand_total;
END;
$$;

-- RPC: update_quotation_with_items
CREATE OR REPLACE FUNCTION update_quotation_with_items(
    p_quotation_id uuid,
    p_quotation jsonb,
    p_items jsonb,
    p_user_id text
)
RETURNS TABLE(
    quotation_id uuid,
    quotation_number text,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing record;
    v_service_event_start_date date;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_mode text := 'not_registered';
    v_settings_vat_rate numeric(5,2) := 0;
    v_vat_rate numeric(5,2) := 0;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2);
    v_vat_amount numeric(12,2);
    v_grand_total numeric(12,2);
    v_item jsonb;
    v_item_qty numeric(12,2);
    v_item_unit_price numeric(12,2);
    v_item_total numeric(12,2);
    v_items_count integer;
    v_residual numeric(12,2);
    v_max_item_id uuid;
    v_snapshot_seller jsonb;
    v_snapshot_buyer jsonb;
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;

    IF p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object' THEN
        RAISE EXCEPTION 'p_quotation must be a JSON object';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items must be a JSON array';
    END IF;

    IF p_quotation ? 'service_id' THEN
        RAISE EXCEPTION 'service_id cannot be changed after quotation creation';
    END IF;

    IF p_quotation ? 'customer_id' THEN
        RAISE EXCEPTION 'customer_id is derived from service_id and cannot be changed directly';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    SELECT q.* INTO v_existing
    FROM quotations AS q
    WHERE q.id = p_quotation_id
      AND q.is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found or deleted: %', p_quotation_id;
    END IF;

    IF v_existing.status <> 'draft' THEN
        RAISE EXCEPTION 'Cannot edit quotation with status "%". Only draft quotations can be edited.', v_existing.status;
    END IF;

    IF p_quotation ? 'event' THEN
        v_event := NULLIF(trim(p_quotation ->> 'event'), '');
        IF v_event IS NULL THEN
            RAISE EXCEPTION 'event cannot be empty if provided';
        END IF;
    ELSE
        v_event := v_existing.event;
    END IF;

    IF p_quotation ? 'date' THEN
        v_date := NULLIF(trim(p_quotation ->> 'date'), '')::date;
        IF v_date IS NULL THEN
            RAISE EXCEPTION 'date cannot be empty if provided';
        END IF;
    ELSE
        v_date := v_existing.date;
    END IF;

    IF p_quotation ? 'valid_until' THEN
        v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    ELSE
        v_valid_until := v_existing.valid_until;
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    SELECT s.event_start_date
    INTO v_service_event_start_date
    FROM services AS s
    WHERE s.id = v_existing.service_id
      AND s.deleted_at IS NULL;

    IF v_service_event_start_date IS NOT NULL THEN
        IF v_service_event_start_date < v_date THEN
            RAISE EXCEPTION 'Service Start Date (%) cannot be before Issue Date (%)', v_service_event_start_date, v_date;
        END IF;

        IF v_valid_until IS NOT NULL AND v_valid_until > v_service_event_start_date THEN
            RAISE EXCEPTION 'valid_until (%) must be <= Service Start Date (%)', v_valid_until, v_service_event_start_date;
        END IF;
    END IF;

    SELECT
        CASE
            WHEN cs.vat_mode IN ('vat_registered_phase_1', 'phase2_integrated') THEN cs.vat_mode
            ELSE 'not_registered'
        END,
        COALESCE(cs.default_vat_percent, 0)::numeric(5,2),
        jsonb_build_object(
            'snapshotVersion', 1,
            'snapshotSource', 'live_creation',
            'snapshotCapturedAt', now(),
            'snapshotNote', null,
            'legalNameEn', cs.legal_name_en,
            'legalNameAr', cs.legal_name_ar,
            'brandName', 'G7 BLUE',
            'tin', cs.tin_number,
            'entityUnifiedNumber', '7053901414',
            'crNumber', null,
            'vatMode', cs.vat_mode,
            'vatNumber', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_number END,
            'vatEffectiveDate', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_effective_date END,
            'vatRate', cs.default_vat_percent,
            'officialEmail', cs.official_email,
            'officialPhone', cs.official_phone,
            'website', null,
            'address', jsonb_build_object(
                'shortAddress', null,
                'buildingNo', null,
                'street', null,
                'district', null,
                'secondaryNo', null,
                'postalCode', null,
                'city', null,
                'country', null,
                'display', cs.national_address
            ),
            'bank', jsonb_build_object(
                'bankName', cs.bank_name,
                'accountName', cs.bank_account_holder,
                'accountNo', '68207417001000',
                'iban', cs.bank_iban
            ),
            'logoPath', '/brand/G7_BLUE_Events_Icon_White_BG.png',
            'currency', cs.currency,
            'terms', cs.default_terms
        )
    INTO v_vat_mode, v_settings_vat_rate, v_snapshot_seller
    FROM company_settings AS cs
    WHERE cs.setting_key = 'default'
    LIMIT 1;

    IF v_snapshot_seller IS NULL THEN
        RAISE EXCEPTION 'Company settings missing, cannot capture seller snapshot.';
    END IF;

    v_vat_mode := COALESCE(v_vat_mode, 'not_registered');
    v_settings_vat_rate := COALESCE(v_settings_vat_rate, 0);

    IF v_vat_mode = 'not_registered' THEN
        v_vat_rate := 0;
    ELSE
        v_vat_rate := v_settings_vat_rate;
    END IF;

    SELECT jsonb_build_object(
        'snapshotVersion', 1,
        'snapshotSource', 'live_creation',
        'snapshotCapturedAt', now(),
        'snapshotNote', null,
        'customerId', c.id,
        'customerType', c.customer_type,
        'name', c.company,
        'legalName', c.legal_name,
        'contactName', c.contact,
        'email', c.email,
        'phone', c.phone,
        'crNumber', c.commercial_registration_number,
        'vatNumber', c.vat_number,
        'billingEmail', c.billing_email,
        'financeContact', c.finance_contact_name,
        'paymentTerms', c.payment_terms,
        'poRequired', c.po_required,
        'address', jsonb_build_object(
            'shortAddress', null,
            'buildingNo', c.national_address_building_number,
            'street', c.national_address_street,
            'district', c.national_address_district,
            'secondaryNo', c.national_address_additional_number,
            'postalCode', c.national_address_postal_code,
            'city', c.national_address_city,
            'country', c.national_address_country,
            'display', c.city
        )
    )
    INTO v_snapshot_buyer
    FROM customers AS c
    WHERE c.id = v_existing.customer_id;

    IF v_snapshot_buyer IS NULL THEN
        RAISE EXCEPTION 'Customer not found, cannot capture buyer snapshot.';
    END IF;

    IF p_quotation ? 'discount' THEN
        v_discount := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
        IF v_discount < 0 THEN
            RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
        END IF;
    ELSE
        v_discount := v_existing.discount;
    END IF;

    DELETE FROM quotation_items WHERE quotation_id = p_quotation_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Item qty must be > 0. Got: %', v_item ->> 'qty';
        END IF;

        IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
            RAISE EXCEPTION 'Item unit_price must be >= 0. Got: %', v_item ->> 'unit_price';
        END IF;

        v_item_total := v_item_qty * v_item_unit_price;

        INSERT INTO quotation_items (
            quotation_id, description, details, category,
            qty, unit_price, vat, total
        )
        VALUES (
            p_quotation_id,
            COALESCE(v_item ->> 'description', ''),
            v_item ->> 'details',
            COALESCE(v_item ->> 'category', ''),
            v_item_qty,
            v_item_unit_price,
            0,
            v_item_total
        );

        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', v_discount, v_subtotal;
    END IF;

    v_taxable := v_subtotal - v_discount;

    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := ROUND(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE quotation_items AS qi
            SET vat = ROUND((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2)
            WHERE qi.quotation_id = p_quotation_id;

            SELECT v_vat_amount - COALESCE(SUM(qi.vat), 0)
            INTO v_residual
            FROM quotation_items AS qi
            WHERE qi.quotation_id = p_quotation_id;

            IF v_residual <> 0 THEN
                SELECT qi.id INTO v_max_item_id
                FROM quotation_items AS qi
                WHERE qi.quotation_id = p_quotation_id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE quotation_items AS qi
                SET vat = qi.vat + v_residual
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE quotations AS q
    SET subtotal    = v_subtotal,
        discount    = v_discount,
        vat_rate    = v_vat_rate,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total,
        event       = v_event,
        date        = v_date,
        valid_until = v_valid_until,
        updated_by  = p_user_id,
        updated_at  = now(),
        snapshot_seller = v_snapshot_seller,
        snapshot_buyer = v_snapshot_buyer
    WHERE q.id = p_quotation_id;

    RETURN QUERY
    SELECT
        p_quotation_id     AS quotation_id,
        v_existing.quotation_number AS quotation_number,
        v_subtotal         AS subtotal,
        v_discount         AS discount,
        v_vat_amount       AS vat_amount,
        v_grand_total      AS grand_total;
END;
$$;

-- Indexes
CREATE INDEX idx_app_users_clerk_id ON app_users(clerk_user_id);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_is_active ON app_users(is_active);

CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);

CREATE INDEX idx_services_customer_id ON services(customer_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_deleted_at ON services(deleted_at);
CREATE INDEX idx_services_event_start_date ON services(event_start_date);
CREATE INDEX idx_services_sales_owner_id ON services(sales_owner_id);
CREATE INDEX idx_services_created_at ON services(created_at);

CREATE INDEX idx_suppliers_created_at ON suppliers(created_at);

CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_service_id ON quotations(service_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);
CREATE UNIQUE INDEX unique_approved_quotation_per_service ON public.quotations USING btree (service_id) WHERE ((status = 'approved'::text) AND (is_deleted = false));

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_approved_quotation_id ON invoices(approved_quotation_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);

CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Routine privileges
-- Functions are SECURITY INVOKER by default. Execute is restricted to postgres
-- as owner and service_role for server-side calls.
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(text) TO service_role;

REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) TO service_role;

REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) TO service_role;

-- 15. Views
CREATE OR REPLACE VIEW public.customer_report_metrics
WITH (security_invoker = true)
AS
SELECT
  c.id AS customer_id,
  COALESCE(sc.services_count, 0)::integer AS services_count,
  COALESCE(qs.quotations_count, 0)::integer AS quotations_count,
  COALESCE(qs.approved_quotations_count, 0)::integer AS approved_quotations_count,
  COALESCE(qs.draft_quotations_count, 0)::integer AS draft_quotations_count,
  COALESCE(qs.total_quoted_amount, 0)::numeric(14, 2) AS total_quoted_amount
FROM public.customers c
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*)::integer AS services_count
  FROM public.services
  WHERE deleted_at IS NULL
  GROUP BY customer_id
) sc ON sc.customer_id = c.id
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*)::integer AS quotations_count,
    COUNT(*) FILTER (WHERE status = 'approved')::integer AS approved_quotations_count,
    COUNT(*) FILTER (WHERE status = 'draft')::integer AS draft_quotations_count,
    COALESCE(SUM(grand_total), 0)::numeric(14, 2) AS total_quoted_amount
  FROM public.quotations
  WHERE COALESCE(is_deleted, false) = false
  GROUP BY customer_id
) qs ON qs.customer_id = c.id
WHERE COALESCE(c.is_deleted, false) = false;

GRANT SELECT ON public.customer_report_metrics TO authenticated;
GRANT SELECT ON public.customer_report_metrics TO service_role;
