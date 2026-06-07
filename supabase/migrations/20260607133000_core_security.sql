-- 1. Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id text UNIQUE NOT NULL,
    email text,
    name text,
    role text NOT NULL CHECK (role IN ('admin', 'manager', 'sales', 'operations', 'accountant', 'viewer')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for app_users
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- No broad public policies. App users should be accessed server-side only via Supabase admin client for now.

DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at 
BEFORE UPDATE ON app_users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_app_users_clerk_id ON app_users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_is_active ON app_users(is_active);

-- 2. Add created_by / updated_by columns to business tables
-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN customers.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN customers.updated_by IS 'Stores Clerk userId string';

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN suppliers.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN suppliers.updated_by IS 'Stores Clerk userId string';

-- Quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN quotations.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN quotations.updated_by IS 'Stores Clerk userId string';

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN invoices.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN invoices.updated_by IS 'Stores Clerk userId string';

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN payments.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN payments.updated_by IS 'Stores Clerk userId string';

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN projects.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN projects.updated_by IS 'Stores Clerk userId string';

-- Company Settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS updated_by text;
COMMENT ON COLUMN company_settings.created_by IS 'Stores Clerk userId string';
COMMENT ON COLUMN company_settings.updated_by IS 'Stores Clerk userId string';

-- 3. Fix audit_logs.user_id
-- We know audit_logs is empty (0 rows), so we can just alter the type safely.
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE text USING user_id::text;
COMMENT ON COLUMN audit_logs.user_id IS 'Stores Clerk userId string';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
-- Note: idx_audit_logs_entity_type_id already exists on (entity_type, entity_id) per schema.sql
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 4. Atomic document number generation function
CREATE OR REPLACE FUNCTION generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year integer;
    seq_record record;
    formatted_number text;
BEGIN
    -- Validate doc_type
    IF doc_type NOT IN ('quotation', 'invoice', 'payment', 'project') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project', doc_type;
    END IF;

    current_year := extract(year from current_date);
    
    INSERT INTO number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type, 
        current_year, 
        1, 
        CASE 
            WHEN doc_type = 'quotation' THEN 'QUO'
            WHEN doc_type = 'invoice' THEN 'INV'
            WHEN doc_type = 'payment' THEN 'PAY'
            WHEN doc_type = 'project' THEN 'PRJ'
        END,
        CASE 
            WHEN doc_type = 'quotation' THEN 'QUO-YYYY-0001'
            WHEN doc_type = 'invoice' THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment' THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project' THEN 'PRJ-YYYY-0001'
        END
    )
    ON CONFLICT (type, year) DO UPDATE 
    SET sequence = number_sequences.sequence + 1
    RETURNING * INTO seq_record;

    formatted_number := seq_record.prefix || '-' || current_year || '-' || lpad(seq_record.sequence::text, 4, '0');
    
    RETURN formatted_number;
END;
$$;
