-- Add customer_number column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number text;

-- Drop explicitly known constraint name first
ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_type_check;

-- Drop any remaining CHECK constraint that references the type column and the known old values safely
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'number_sequences'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
          AND pg_get_constraintdef(oid) LIKE '%quotation%'
    LOOP
        EXECUTE 'ALTER TABLE number_sequences DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add updated CHECK constraint with explicitly known name
ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_type_check CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer'));

-- Update generate_document_number RPC to support 'customer'
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

-- Preserve existing grants
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(text) TO service_role;

-- Backfill existing customers deterministically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id FROM customers
        WHERE customer_number IS NULL
        ORDER BY created_at ASC, id ASC
    LOOP
        UPDATE customers
        SET customer_number = generate_document_number('customer')
        WHERE id = r.id;
    END LOOP;
END $$;

-- Set customer_number NOT NULL and make it UNIQUE
ALTER TABLE customers ALTER COLUMN customer_number SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'customers'::regclass
          AND conname = 'customers_customer_number_key'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_customer_number_key UNIQUE (customer_number);
    END IF;
END $$;

COMMENT ON COLUMN customers.customer_number IS 'System-generated unique customer identifier (e.g. CUST-2026-0001)';
