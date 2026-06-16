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
    type text NOT NULL CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service')),
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
    cr_number text NOT NULL,
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
    updated_by text
);
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN customers.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN customers.updated_by IS 'Stores Clerk userId string';

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
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    event text NOT NULL,
    date date NOT NULL,
    valid_until date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 CHECK (subtotal >= 0),
    discount numeric(12,2) DEFAULT 0.00 CHECK (discount >= 0),
    vat_rate numeric(5,2) NOT NULL DEFAULT 15.00,
    vat_amount numeric(12,2) DEFAULT 0.00 CHECK (vat_amount >= 0),
    grand_total numeric(12,2) DEFAULT 0.00 CHECK (grand_total >= 0),
    status text NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text,
    CONSTRAINT chk_quotations_vat_rate CHECK (vat_rate >= 0 AND vat_rate <= 100)
);
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON COLUMN quotations.vat_rate IS 'Snapshot of the VAT percentage applied at creation time. Does not change if company settings change later.';
COMMENT ON COLUMN quotations.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN quotations.updated_by IS 'Stores Clerk userId string';

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
    quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT,
    date date NOT NULL,
    due_date date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 CHECK (subtotal >= 0),
    vat_amount numeric(12,2) DEFAULT 0.00 CHECK (vat_amount >= 0),
    grand_total numeric(12,2) DEFAULT 0.00 CHECK (grand_total >= 0),
    status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    type text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_by text,
    updated_by text
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
    IF doc_type IS NULL OR doc_type NOT IN ('quotation', 'invoice', 'payment', 'project', 'service') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project, service', doc_type;
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
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice'   THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment'   THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project'   THEN 'PRJ-YYYY-0001'
            WHEN doc_type = 'service'   THEN 'SVC-YYYY-0001'
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
    v_customer_id uuid;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_rate numeric(5,2);
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

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    v_customer_id := NULLIF(trim(p_quotation ->> 'customer_id'), '')::uuid;
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'customer_id is required';
    END IF;
    v_event       := NULLIF(trim(p_quotation ->> 'event'), '');
    v_date        := NULLIF(trim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    v_discount    := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
    v_vat_rate    := COALESCE(NULLIF(trim(p_quotation ->> 'vat_rate'), '')::numeric(5,2), 15.00);

    IF v_event IS NULL THEN
        RAISE EXCEPTION 'event is required';
    END IF;

    IF v_date IS NULL THEN
        RAISE EXCEPTION 'date is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = v_customer_id AND is_deleted = false) THEN
        RAISE EXCEPTION 'Customer not found or deleted: %', v_customer_id;
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'vat_rate must be between 0 and 100. Got: %', v_vat_rate;
    END IF;

    v_quotation_number := generate_document_number('quotation');
    v_quotation_id := gen_random_uuid();

    INSERT INTO quotations (
        id, quotation_number, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total,
        status, created_by, updated_by
    )
    VALUES (
        v_quotation_id, v_quotation_number, v_customer_id, v_event, v_date, v_valid_until,
        0, v_discount, v_vat_rate, 0, 0,
        'draft', p_user_id, p_user_id
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

    v_taxable     := v_subtotal - v_discount;
    v_vat_amount  := v_taxable * (v_vat_rate / 100);
    v_grand_total := v_taxable + v_vat_amount;

    IF v_subtotal > 0 THEN
        UPDATE quotation_items
        SET vat = ROUND((total - (v_discount * (total / v_subtotal))) * (v_vat_rate / 100), 2)
        WHERE quotation_id = v_quotation_id;

        SELECT v_vat_amount - COALESCE(SUM(vat), 0)
        INTO v_residual
        FROM quotation_items
        WHERE quotation_id = v_quotation_id;

        IF v_residual <> 0 THEN
            SELECT id INTO v_max_item_id
            FROM quotation_items
            WHERE quotation_id = v_quotation_id
            ORDER BY total DESC, id
            LIMIT 1;

            UPDATE quotation_items
            SET vat = vat + v_residual
            WHERE id = v_max_item_id;
        END IF;
    END IF;

    UPDATE quotations
    SET subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total
    WHERE id = v_quotation_id;

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
    v_customer_id uuid;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_rate numeric(5,2);
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

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    SELECT * INTO v_existing
    FROM quotations
    WHERE id = p_quotation_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found or deleted: %', p_quotation_id;
    END IF;

    IF v_existing.status <> 'draft' THEN
        RAISE EXCEPTION 'Cannot edit quotation with status "%". Only draft quotations can be edited.', v_existing.status;
    END IF;

    IF p_quotation ? 'customer_id' THEN
        v_customer_id := NULLIF(trim(p_quotation ->> 'customer_id'), '')::uuid;
        IF v_customer_id IS NULL THEN
            RAISE EXCEPTION 'customer_id cannot be empty if provided';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM customers WHERE id = v_customer_id AND is_deleted = false) THEN
            RAISE EXCEPTION 'Customer not found or deleted: %', v_customer_id;
        END IF;
    ELSE
        v_customer_id := v_existing.customer_id;
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

    IF p_quotation ? 'discount' THEN
        v_discount := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
    ELSE
        v_discount := v_existing.discount;
    END IF;

    IF p_quotation ? 'vat_rate' THEN
        v_vat_rate := NULLIF(trim(p_quotation ->> 'vat_rate'), '')::numeric(5,2);
        IF v_vat_rate IS NULL THEN
            RAISE EXCEPTION 'vat_rate cannot be empty if provided';
        END IF;
    ELSE
        v_vat_rate := v_existing.vat_rate;
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'vat_rate must be between 0 and 100. Got: %', v_vat_rate;
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

    v_taxable     := v_subtotal - v_discount;
    v_vat_amount  := v_taxable * (v_vat_rate / 100);
    v_grand_total := v_taxable + v_vat_amount;

    IF v_subtotal > 0 THEN
        UPDATE quotation_items
        SET vat = ROUND((total - (v_discount * (total / v_subtotal))) * (v_vat_rate / 100), 2)
        WHERE quotation_id = p_quotation_id;

        SELECT v_vat_amount - COALESCE(SUM(vat), 0)
        INTO v_residual
        FROM quotation_items
        WHERE quotation_id = p_quotation_id;

        IF v_residual <> 0 THEN
            SELECT id INTO v_max_item_id
            FROM quotation_items
            WHERE quotation_id = p_quotation_id
            ORDER BY total DESC, id
            LIMIT 1;

            UPDATE quotation_items
            SET vat = vat + v_residual
            WHERE id = v_max_item_id;
        END IF;
    END IF;

    UPDATE quotations
    SET customer_id = v_customer_id,
        event       = v_event,
        date        = v_date,
        valid_until = v_valid_until,
        discount    = v_discount,
        vat_rate    = v_vat_rate,
        subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total,
        updated_by  = p_user_id
    WHERE id = p_quotation_id;

    RETURN QUERY
    SELECT
        p_quotation_id              AS quotation_id,
        v_existing.quotation_number AS quotation_number,
        v_subtotal                  AS subtotal,
        v_discount                  AS discount,
        v_vat_amount                AS vat_amount,
        v_grand_total               AS grand_total;
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
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id);
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

-- app_users intentionally has no broad DEV_ONLY policy. It should be accessed
-- server-side through service role / protected server logic only.

-- WARNING: DEV ONLY POLICIES
-- These policies allow any authenticated user full access during development
-- and fake-data demos. They are not production-safe and must be replaced
-- before real or semi-real company/client data is used.
CREATE POLICY "DEV_ONLY_number_sequences" ON number_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_company_settings" ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- DEV/fake-data only. This policy is not production-safe for services.
CREATE POLICY "DEV_ONLY_services" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_quotations" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_quotation_items" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_invoice_items" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_project_tasks" ON project_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
