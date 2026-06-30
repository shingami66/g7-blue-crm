-- 1. Extend number_sequences
ALTER TABLE number_sequences DROP CONSTRAINT IF EXISTS number_sequences_type_check;

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

ALTER TABLE number_sequences ADD CONSTRAINT number_sequences_type_check CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking'));

CREATE OR REPLACE FUNCTION generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year integer;
    seq_record record;
    formatted_number text;
BEGIN
    IF doc_type IS NULL OR doc_type NOT IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project, service, customer, supplier_booking', doc_type;
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
            WHEN doc_type = 'supplier_booking' THEN 'SBK'
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice'   THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment'   THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project'   THEN 'PRJ-YYYY-0001'
            WHEN doc_type = 'service'   THEN 'SVC-YYYY-0001'
            WHEN doc_type = 'customer'  THEN 'CUST-YYYY-0001'
            WHEN doc_type = 'supplier_booking' THEN 'SBK-YYYY-0001'
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

CREATE TABLE public.supplier_bookings (
    id uuid primary key default gen_random_uuid(),

    service_id uuid not null references public.services(id) on delete restrict,
    supplier_id uuid not null references public.suppliers(id) on delete restrict,
    source_allocation_id uuid not null references public.service_supplier_allocations(id) on delete restrict,

    booking_number text not null unique,
    status text not null default 'draft',

    category text not null,
    item_name text not null,
    unit text not null,
    quantity numeric(10,3) not null,
    currency char(3) not null default 'SAR',
    estimated_unit_cost numeric(14,2) not null,
    estimated_total_cost numeric(14,2) generated always as (quantity * estimated_unit_cost) stored,

    scope_of_work text null,
    internal_notes text null,

    allocation_snapshot jsonb not null,

    cancelled_at timestamptz null,
    cancelled_by uuid null,
    cancelled_reason text null,

    created_by uuid null,
    updated_by uuid null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    is_deleted boolean not null default false,

    CONSTRAINT chk_sb_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_sb_cost_positive CHECK (estimated_unit_cost >= 0),
    CONSTRAINT chk_sb_currency_sar CHECK (currency = 'SAR'),
    CONSTRAINT chk_sb_status_valid CHECK (status IN ('draft', 'cancelled')),
    CONSTRAINT chk_sb_booking_number_nonblank CHECK (trim(booking_number) != ''),
    CONSTRAINT chk_sb_category_nonblank CHECK (trim(category) != ''),
    CONSTRAINT chk_sb_item_name_nonblank CHECK (trim(item_name) != ''),
    CONSTRAINT chk_sb_unit_nonblank CHECK (trim(unit) != ''),
    CONSTRAINT chk_sb_cancelled_reason CHECK (
        status IS DISTINCT FROM 'cancelled' OR (cancelled_reason IS NOT NULL AND trim(cancelled_reason) != '')
    ),
    CONSTRAINT chk_sb_allocation_snapshot_json_object CHECK (jsonb_typeof(allocation_snapshot) = 'object')
);

COMMENT ON TABLE public.supplier_bookings IS 'Supplier Booking estimated costs are planning/commitment estimates only. They do not create accounting entries. They must not be treated as actual costs or used in profit/margin calculations until Supplier Invoice exists.';

CREATE INDEX idx_supplier_bookings_service_id ON public.supplier_bookings(service_id);
CREATE INDEX idx_supplier_bookings_supplier_id ON public.supplier_bookings(supplier_id);
CREATE INDEX idx_supplier_bookings_source_allocation_id ON public.supplier_bookings(source_allocation_id);
CREATE INDEX idx_supplier_bookings_status ON public.supplier_bookings(status);
CREATE INDEX idx_supplier_bookings_is_deleted ON public.supplier_bookings(is_deleted);
CREATE INDEX idx_supplier_bookings_service_status ON public.supplier_bookings(service_id, status);
CREATE INDEX idx_supplier_bookings_supplier_created_at ON public.supplier_bookings(supplier_id, created_at);

CREATE UNIQUE INDEX idx_supplier_bookings_one_active_per_allocation 
ON public.supplier_bookings(source_allocation_id) 
WHERE is_deleted = false AND status <> 'cancelled';

CREATE TRIGGER update_supplier_bookings_updated_at
BEFORE UPDATE ON public.supplier_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_supplier_bookings_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source_allocation_id IS DISTINCT FROM NEW.source_allocation_id THEN
        RAISE EXCEPTION 'source_allocation_id is immutable';
    END IF;
    IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
        RAISE EXCEPTION 'service_id is immutable';
    END IF;
    IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
        RAISE EXCEPTION 'supplier_id is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_supplier_bookings_immutable_fields_trg
BEFORE UPDATE ON public.supplier_bookings
FOR EACH ROW EXECUTE FUNCTION public.check_supplier_bookings_immutable_fields();

CREATE OR REPLACE FUNCTION public.check_supplier_bookings_insert_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_allocation_service_id uuid;
    v_allocation_supplier_id uuid;
    v_allocation_status text;
    v_allocation_is_deleted boolean;
    v_service_status text;
BEGIN
    SELECT service_id, supplier_id, status, is_deleted
    INTO v_allocation_service_id, v_allocation_supplier_id, v_allocation_status, v_allocation_is_deleted
    FROM public.service_supplier_allocations
    WHERE id = NEW.source_allocation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source allocation not found';
    END IF;

    IF v_allocation_is_deleted THEN
        RAISE EXCEPTION 'Cannot create booking from a deleted allocation';
    END IF;

    IF v_allocation_status <> 'selected' THEN
        RAISE EXCEPTION 'Source allocation must be in selected status';
    END IF;

    IF NEW.service_id <> v_allocation_service_id THEN
        RAISE EXCEPTION 'service_id must match the source allocation';
    END IF;

    IF NEW.supplier_id <> v_allocation_supplier_id THEN
        RAISE EXCEPTION 'supplier_id must match the source allocation';
    END IF;

    SELECT status INTO v_service_status
    FROM public.services
    WHERE id = NEW.service_id;

    IF v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION 'Cannot create booking for a % service', v_service_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_supplier_bookings_insert_consistency_trg
BEFORE INSERT ON public.supplier_bookings
FOR EACH ROW EXECUTE FUNCTION public.check_supplier_bookings_insert_consistency();

ALTER TABLE public.supplier_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supplier_bookings FROM anon, authenticated;
