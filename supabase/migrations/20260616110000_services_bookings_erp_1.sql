-- =============================================================================
-- Migration: ERP-1 Services / Bookings Foundation
-- Date: 2026-06-16
-- Purpose:
--   1. Create services as the operational unit between Customer and Quotation.
--   2. Add service status, date, cancellation, and budget constraints.
--   3. Add service indexes and updated_at trigger.
--   4. Enable DEV_ONLY RLS for fake/dev data only.
--   5. Extend document numbering for SVC-YYYY-0001 service numbers.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.
-- =============================================================================

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

CREATE INDEX idx_services_customer_id ON services(customer_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_deleted_at ON services(deleted_at);
CREATE INDEX idx_services_event_start_date ON services(event_start_date);
CREATE INDEX idx_services_sales_owner_id ON services(sales_owner_id);
CREATE INDEX idx_services_created_at ON services(created_at);

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- DEV/Fake-data only. This is not production-safe and must be replaced before
-- real or semi-real company/client data is stored in services.
CREATE POLICY "DEV_ONLY_services"
ON services
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE number_sequences
    DROP CONSTRAINT IF EXISTS number_sequences_type_check;

ALTER TABLE number_sequences
    ADD CONSTRAINT number_sequences_type_check
    CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service'));

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

REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(text) TO service_role;
