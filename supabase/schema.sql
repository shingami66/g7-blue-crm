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
$$ language 'plpgsql';

-- 1. Number Sequences
CREATE TABLE number_sequences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('quotation', 'invoice', 'payment', 'project')),
    year integer NOT NULL,
    sequence integer NOT NULL DEFAULT 0,
    prefix text NOT NULL,
    example_format text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(type, year)
);
CREATE TRIGGER update_number_sequences_updated_at BEFORE UPDATE ON number_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Company Settings
CREATE TABLE company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text NOT NULL DEFAULT 'default' UNIQUE,
    company_name text NOT NULL,
    company_email text NOT NULL,
    company_phone text NOT NULL,
    company_address text NOT NULL,
    legal_cr text NOT NULL,
    legal_vat text NOT NULL,
    bank_name text NOT NULL,
    bank_iban text NOT NULL,
    bank_account_name text NOT NULL,
    finance_currency text NOT NULL DEFAULT 'SAR',
    finance_vat_percent numeric(5,2) NOT NULL DEFAULT 15.00 CHECK (finance_vat_percent >= 0),
    finance_terms text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Customers
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
    deleted_at timestamptz
);
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Suppliers
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
    deleted_at timestamptz
);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Quotations
CREATE TABLE quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number text UNIQUE NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    event text NOT NULL,
    date date NOT NULL,
    valid_until date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 CHECK (subtotal >= 0),
    discount numeric(12,2) DEFAULT 0.00 CHECK (discount >= 0),
    vat_amount numeric(12,2) DEFAULT 0.00 CHECK (vat_amount >= 0),
    grand_total numeric(12,2) DEFAULT 0.00 CHECK (grand_total >= 0),
    status text NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz
);
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Quotation Items
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

-- 7. Invoices
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
    deleted_at timestamptz
);
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Invoice Items
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

-- 9. Payments
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
    deleted_at timestamptz
);
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Projects
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
    deleted_at timestamptz
);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Project Tasks
CREATE TABLE project_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Audit Logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'status_change', 'payment_recorded')),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid, -- would reference auth.users in full impl
    details jsonb,
    timestamp timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);

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

-- Enable RLS on all tables
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- WARNING: DEV ONLY POLICIES
-- These policies allow any authenticated user full access during development.
-- MUST BE REPLACED BEFORE PRODUCTION!
CREATE POLICY "DEV_ONLY_number_sequences" ON number_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_company_settings" ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_quotations" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_quotation_items" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_invoice_items" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_project_tasks" ON project_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "DEV_ONLY_audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
