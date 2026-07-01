


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
        RAISE EXCEPTION 'service_id is immutable';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_supplier_bookings_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_supplier_bookings_immutable_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_supplier_bookings_insert_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_supplier_bookings_insert_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_quotation_with_items"("p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") RETURNS TABLE("quotation_id" "uuid", "quotation_number" "text", "subtotal" numeric, "discount" numeric, "vat_amount" numeric, "grand_total" numeric)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."create_quotation_with_items"("p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_document_number"("doc_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."generate_document_number"("doc_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_date" "date", "p_method" "text", "p_reference" "text", "p_user_id" "text") RETURNS TABLE("payment_id" "uuid", "payment_number" "text", "amount_paid" numeric, "balance_due" numeric, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_invoice_record record;
    v_payment_number text;
    v_payment_id uuid;
    v_new_amount_paid numeric;
    v_new_balance_due numeric;
    v_new_status text;
BEGIN
    -- 1. Fetch and lock the invoice
    SELECT i.id, i.customer_id, i.amount_paid, i.balance_due, i.status, i.is_deleted
    INTO v_invoice_record
    FROM invoices i
    WHERE i.id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF v_invoice_record.is_deleted THEN
        RAISE EXCEPTION 'Invoice is deleted';
    END IF;

    IF v_invoice_record.status NOT IN ('sent', 'partial') THEN
        RAISE EXCEPTION 'Payment is only allowed for sent or partial invoices';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than 0';
    END IF;

    IF p_amount > v_invoice_record.balance_due THEN
        RAISE EXCEPTION 'Payment amount exceeds invoice balance due';
    END IF;

    -- 2. Generate payment number
    v_payment_number := generate_document_number('payment');

    -- 3. Insert payment
    INSERT INTO payments (
        payment_number,
        invoice_id,
        customer_id,
        date,
        amount,
        method,
        reference,
        status,
        created_by,
        updated_by
    ) VALUES (
        v_payment_number,
        p_invoice_id,
        v_invoice_record.customer_id,
        p_date,
        p_amount,
        p_method,
        p_reference,
        'confirmed',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_payment_id;

    -- 4. Calculate new values
    v_new_amount_paid := v_invoice_record.amount_paid + p_amount;
    v_new_balance_due := v_invoice_record.balance_due - p_amount;

    IF v_new_balance_due = 0 THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;

    -- 5. Update invoice
    UPDATE invoices
    SET
        amount_paid = v_new_amount_paid,
        balance_due = v_new_balance_due,
        status = v_new_status,
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- 6. Log audit event
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details
    ) VALUES (
        'payment_recorded',
        'invoice',
        p_invoice_id,
        p_user_id,
        jsonb_build_object(
            'payment_id', v_payment_id,
            'payment_number', v_payment_number,
            'amount', p_amount,
            'method', p_method,
            'new_status', v_new_status
        )
    );

    RETURN QUERY SELECT
        v_payment_id,
        v_payment_number,
        v_new_amount_paid,
        v_new_balance_due,
        v_new_status;
END;
$$;


ALTER FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_date" "date", "p_method" "text", "p_reference" "text", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_quotation_customer_from_service"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."set_quotation_customer_from_service"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quotation_with_items"("p_quotation_id" "uuid", "p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") RETURNS TABLE("quotation_id" "uuid", "quotation_number" "text", "subtotal" numeric, "discount" numeric, "vat_amount" numeric, "grand_total" numeric)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."update_quotation_with_items"("p_quotation_id" "uuid", "p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_user_id" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'sales'::"text", 'operations'::"text", 'accountant'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "text",
    "details" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'restore'::"text", 'status_change'::"text", 'payment_recorded'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."audit_logs"."user_id" IS 'Stores Clerk userId string';



CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" DEFAULT 'default'::"text" NOT NULL,
    "legal_name_en" "text" NOT NULL,
    "official_email" "text" NOT NULL,
    "official_phone" "text" NOT NULL,
    "national_address" "text" NOT NULL,
    "cr_number" "text",
    "vat_number" "text",
    "bank_name" "text" NOT NULL,
    "bank_iban" "text" NOT NULL,
    "bank_account_holder" "text" NOT NULL,
    "currency" "text" DEFAULT 'SAR'::"text" NOT NULL,
    "default_vat_percent" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "default_terms" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_by" "text",
    "legal_name_ar" "text" NOT NULL,
    "tin_number" "text",
    "vat_mode" "text" DEFAULT 'not_registered'::"text" NOT NULL,
    "vat_effective_date" "date",
    CONSTRAINT "chk_company_settings_default_vat_percent" CHECK ((("default_vat_percent" >= (0)::numeric) AND ("default_vat_percent" <= (100)::numeric))),
    CONSTRAINT "chk_company_settings_singleton_key" CHECK (("setting_key" = 'default'::"text")),
    CONSTRAINT "chk_company_settings_vat_consistency" CHECK (((("vat_mode" = 'not_registered'::"text") AND ("default_vat_percent" = (0)::numeric) AND ("vat_number" IS NULL) AND ("vat_effective_date" IS NULL)) OR (("vat_mode" = ANY (ARRAY['vat_registered_phase_1'::"text", 'phase2_integrated'::"text"])) AND ("default_vat_percent" > (0)::numeric) AND ("vat_number" IS NOT NULL)))),
    CONSTRAINT "chk_company_settings_vat_mode" CHECK (("vat_mode" = ANY (ARRAY['not_registered'::"text", 'vat_registered_phase_1'::"text", 'phase2_integrated'::"text"]))),
    CONSTRAINT "company_settings_finance_vat_percent_check" CHECK (("default_vat_percent" >= (0)::numeric))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_settings" IS 'Singleton seller/master-company settings. Defaults for new documents only; existing documents must use snapshots.';



COMMENT ON COLUMN "public"."company_settings"."setting_key" IS 'Stable singleton key. Must be default.';



COMMENT ON COLUMN "public"."company_settings"."legal_name_en" IS 'English legal seller/company name.';



COMMENT ON COLUMN "public"."company_settings"."default_vat_percent" IS 'Default VAT percent for new documents only. Existing quotations/invoices keep their own VAT snapshots.';



COMMENT ON COLUMN "public"."company_settings"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."company_settings"."updated_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."company_settings"."legal_name_ar" IS 'Arabic legal seller/company name.';



COMMENT ON COLUMN "public"."company_settings"."tin_number" IS 'TIN / الرقم المميز.';



COMMENT ON COLUMN "public"."company_settings"."vat_mode" IS 'VAT registration mode. phase2_integrated is reserved for future FATOORA integration and must not be claimed in CS-A UI.';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company" "text" NOT NULL,
    "contact" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "city" "text" NOT NULL,
    "status" "text" NOT NULL,
    "projects_count" integer DEFAULT 0,
    "revenue" numeric(12,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    "customer_type" "text",
    "legal_name" "text",
    "commercial_registration_number" "text",
    "vat_number" "text",
    "national_address_building_number" "text",
    "national_address_street" "text",
    "national_address_district" "text",
    "national_address_city" "text",
    "national_address_postal_code" "text",
    "national_address_additional_number" "text",
    "national_address_country" "text",
    "billing_email" "text",
    "finance_contact_name" "text",
    "finance_contact_phone" "text",
    "payment_terms" "text",
    "po_required" boolean DEFAULT false NOT NULL,
    "customer_number" "text" NOT NULL,
    CONSTRAINT "chk_customers_billing_email_not_empty" CHECK ((("billing_email" IS NULL) OR ("btrim"("billing_email") <> ''::"text"))),
    CONSTRAINT "chk_customers_commercial_registration_number_not_empty" CHECK ((("commercial_registration_number" IS NULL) OR ("btrim"("commercial_registration_number") <> ''::"text"))),
    CONSTRAINT "chk_customers_customer_type" CHECK ((("customer_type" IS NULL) OR ("customer_type" = ANY (ARRAY['individual'::"text", 'company'::"text"])))),
    CONSTRAINT "chk_customers_finance_contact_phone_not_empty" CHECK ((("finance_contact_phone" IS NULL) OR ("btrim"("finance_contact_phone") <> ''::"text"))),
    CONSTRAINT "chk_customers_vat_number_not_empty" CHECK ((("vat_number" IS NULL) OR ("btrim"("vat_number") <> ''::"text"))),
    CONSTRAINT "customers_revenue_check" CHECK (("revenue" >= (0)::numeric)),
    CONSTRAINT "customers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'lead'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."customers"."updated_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."customers"."customer_type" IS 'Optional customer classification for invoice buyer context: individual or company. Nullable for existing/backward-compatible records.';



COMMENT ON COLUMN "public"."customers"."legal_name" IS 'Optional legal/customer billing name for future invoice buyer snapshots.';



COMMENT ON COLUMN "public"."customers"."commercial_registration_number" IS 'Optional Commercial Registration number; not unique or mandatory in this phase.';



COMMENT ON COLUMN "public"."customers"."vat_number" IS 'Optional customer VAT number; storing this does not enable Tax Invoice, ZATCA, QR, XML, clearance, or reporting behavior.';



COMMENT ON COLUMN "public"."customers"."national_address_building_number" IS 'Optional National Address building number.';



COMMENT ON COLUMN "public"."customers"."national_address_street" IS 'Optional National Address street.';



COMMENT ON COLUMN "public"."customers"."national_address_district" IS 'Optional National Address district.';



COMMENT ON COLUMN "public"."customers"."national_address_city" IS 'Optional National Address city.';



COMMENT ON COLUMN "public"."customers"."national_address_postal_code" IS 'Optional National Address postal code.';



COMMENT ON COLUMN "public"."customers"."national_address_additional_number" IS 'Optional National Address secondary/additional number.';



COMMENT ON COLUMN "public"."customers"."national_address_country" IS 'Optional National Address country.';



COMMENT ON COLUMN "public"."customers"."billing_email" IS 'Optional billing email for finance communication.';



COMMENT ON COLUMN "public"."customers"."finance_contact_name" IS 'Optional finance contact name.';



COMMENT ON COLUMN "public"."customers"."finance_contact_phone" IS 'Optional finance contact phone.';



COMMENT ON COLUMN "public"."customers"."payment_terms" IS 'Optional customer-specific payment terms.';



COMMENT ON COLUMN "public"."customers"."po_required" IS 'Whether the customer requires a purchase order before invoicing; default false for backward compatibility.';



COMMENT ON COLUMN "public"."customers"."customer_number" IS 'System-generated unique customer identifier (e.g. CUST-2026-0001)';



CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_number" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "date" "date" NOT NULL,
    "valid_until" "date" NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0.00,
    "discount" numeric(12,2) DEFAULT 0.00,
    "vat_amount" numeric(12,2) DEFAULT 0.00,
    "grand_total" numeric(12,2) DEFAULT 0.00,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    "vat_rate" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "service_id" "uuid" NOT NULL,
    "snapshot_seller" "jsonb" NOT NULL,
    "snapshot_buyer" "jsonb" NOT NULL,
    CONSTRAINT "chk_quotations_snapshot_buyer_type" CHECK (("jsonb_typeof"("snapshot_buyer") = 'object'::"text")),
    CONSTRAINT "chk_quotations_snapshot_seller_type" CHECK (("jsonb_typeof"("snapshot_seller") = 'object'::"text")),
    CONSTRAINT "chk_quotations_vat_rate" CHECK ((("vat_rate" >= (0)::numeric) AND ("vat_rate" <= (100)::numeric))),
    CONSTRAINT "quotations_discount_check" CHECK (("discount" >= (0)::numeric)),
    CONSTRAINT "quotations_grand_total_check" CHECK (("grand_total" >= (0)::numeric)),
    CONSTRAINT "quotations_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "quotations_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "quotations_vat_amount_check" CHECK (("vat_amount" >= (0)::numeric))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quotations"."customer_id" IS 'Derived from services.customer_id for reporting/query convenience. Do not trust browser-submitted customer_id.';



COMMENT ON COLUMN "public"."quotations"."event" IS 'Legacy/deprecated ERP-2 compatibility field. Event context should come from the linked service going forward.';



COMMENT ON COLUMN "public"."quotations"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."quotations"."updated_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."quotations"."vat_rate" IS 'Snapshot of the VAT percentage applied by quotation RPCs. Forced to 0 while company_settings.vat_mode is not_registered; does not imply ZATCA/FATOORA compliance.';



COMMENT ON COLUMN "public"."quotations"."service_id" IS 'ERP-2 primary business link. Quotations belong to Services. One Service may have multiple quotations.';



COMMENT ON COLUMN "public"."quotations"."snapshot_seller" IS 'Document snapshot of G7 BLUE seller details at the time of quotation creation/update. Contains versioned metadata to decouple printed documents from live company_settings changes.';



COMMENT ON COLUMN "public"."quotations"."snapshot_buyer" IS 'Document snapshot of customer/buyer details at the time of quotation creation/update. Contains versioned metadata to decouple printed documents from live customers changes.';



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_number" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "service_title" "text" NOT NULL,
    "event_name" "text",
    "event_type" "text",
    "event_start_date" "date",
    "event_end_date" "date",
    "event_location" "text",
    "description" "text",
    "estimated_budget" numeric(12,2),
    "status" "text" DEFAULT 'Inquiry'::"text" NOT NULL,
    "sales_owner_id" "text",
    "cancellation_reason" "text",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text",
    "updated_by" "text",
    CONSTRAINT "chk_services_cancelled_reason_required" CHECK ((("status" <> 'Cancelled'::"text") OR (("cancellation_reason" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "cancellation_reason")) > 0)))),
    CONSTRAINT "chk_services_estimated_budget_nonnegative" CHECK ((("estimated_budget" IS NULL) OR ("estimated_budget" >= (0)::numeric))),
    CONSTRAINT "chk_services_event_date_range" CHECK ((("event_end_date" IS NULL) OR (("event_start_date" IS NOT NULL) AND ("event_end_date" >= "event_start_date")))),
    CONSTRAINT "chk_services_service_number_format" CHECK (("service_number" ~ '^SVC-[0-9]{4}-[0-9]{4}$'::"text")),
    CONSTRAINT "chk_services_service_title_not_blank" CHECK (("length"(TRIM(BOTH FROM "service_title")) > 0)),
    CONSTRAINT "chk_services_status" CHECK (("status" = ANY (ARRAY['Inquiry'::"text", 'Quoted'::"text", 'Approved'::"text", 'Deposit Paid'::"text", 'In Progress'::"text", 'Completed'::"text", 'Cancelled'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_report_metrics" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "customer_id",
    COALESCE("sc"."services_count", 0) AS "services_count",
    COALESCE("qs"."quotations_count", 0) AS "quotations_count",
    COALESCE("qs"."approved_quotations_count", 0) AS "approved_quotations_count",
    COALESCE("qs"."draft_quotations_count", 0) AS "draft_quotations_count",
    (COALESCE("qs"."total_quoted_amount", (0)::numeric))::numeric(14,2) AS "total_quoted_amount"
   FROM (("public"."customers" "c"
     LEFT JOIN ( SELECT "services"."customer_id",
            ("count"(*))::integer AS "services_count"
           FROM "public"."services"
          WHERE ("services"."deleted_at" IS NULL)
          GROUP BY "services"."customer_id") "sc" ON (("sc"."customer_id" = "c"."id")))
     LEFT JOIN ( SELECT "quotations"."customer_id",
            ("count"(*))::integer AS "quotations_count",
            ("count"(*) FILTER (WHERE ("quotations"."status" = 'approved'::"text")))::integer AS "approved_quotations_count",
            ("count"(*) FILTER (WHERE ("quotations"."status" = 'draft'::"text")))::integer AS "draft_quotations_count",
            (COALESCE("sum"("quotations"."grand_total"), (0)::numeric))::numeric(14,2) AS "total_quoted_amount"
           FROM "public"."quotations"
          WHERE (COALESCE("quotations"."is_deleted", false) = false)
          GROUP BY "quotations"."customer_id") "qs" ON (("qs"."customer_id" = "c"."id")))
  WHERE (COALESCE("c"."is_deleted", false) = false);


ALTER VIEW "public"."customer_report_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "details" "text",
    "qty" numeric(12,2) DEFAULT 1.00 NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "vat" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "total" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoice_items_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "invoice_items_total_check" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "invoice_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "invoice_items_vat_check" CHECK (("vat" >= (0)::numeric))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "approved_quotation_id" "uuid",
    "date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0.00,
    "vat_amount" numeric(12,2) DEFAULT 0.00,
    "grand_total" numeric(12,2) DEFAULT 0.00,
    "status" "text" NOT NULL,
    "invoice_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    "service_id" "uuid",
    "amount_paid" numeric(12,2) DEFAULT 0.00,
    "balance_due" numeric(12,2) DEFAULT 0.00,
    "document_label" "text",
    "vat_mode" "text",
    "vat_rate" numeric(5,2) DEFAULT 0.00,
    "snapshot_seller" "jsonb",
    "snapshot_buyer" "jsonb",
    "snapshot_quotation" "jsonb",
    "snapshot_bank_details" "jsonb",
    "snapshot_document_rules" "jsonb",
    "issued_at" timestamp with time zone,
    "voided_at" timestamp with time zone,
    "void_reason" "text",
    CONSTRAINT "invoices_amount_paid_check" CHECK (("amount_paid" >= (0)::numeric)),
    CONSTRAINT "invoices_balance_due_check" CHECK (("balance_due" >= (0)::numeric)),
    CONSTRAINT "invoices_grand_total_check" CHECK (("grand_total" >= (0)::numeric)),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'paid'::"text", 'partial'::"text", 'overdue'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "invoices_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "invoices_vat_amount_check" CHECK (("vat_amount" >= (0)::numeric)),
    CONSTRAINT "invoices_vat_rate_check" CHECK (("vat_rate" >= (0)::numeric))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."invoices"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."invoices"."updated_by" IS 'Stores Clerk userId string';



CREATE TABLE IF NOT EXISTS "public"."number_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "year" integer NOT NULL,
    "sequence" integer DEFAULT 0 NOT NULL,
    "prefix" "text" NOT NULL,
    "example_format" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "number_sequences_type_check" CHECK (("type" = ANY (ARRAY['quotation'::"text", 'invoice'::"text", 'payment'::"text", 'project'::"text", 'service'::"text", 'customer'::"text", 'supplier_booking'::"text"])))
);


ALTER TABLE "public"."number_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_number" "text" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "method" "text" NOT NULL,
    "reference" "text",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_method_check" CHECK (("method" = ANY (ARRAY['bank_transfer'::"text", 'cash'::"text", 'cheque'::"text", 'online'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."payments"."updated_by" IS 'Stores Clerk userId string';



CREATE TABLE IF NOT EXISTS "public"."project_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_tasks_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'done'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."project_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_number" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "quotation_id" "uuid",
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "budget" numeric(12,2) DEFAULT 0.00,
    "manager" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    CONSTRAINT "projects_budget_check" CHECK (("budget" >= (0)::numeric)),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['planning'::"text", 'active'::"text", 'on_hold'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."projects"."updated_by" IS 'Stores Clerk userId string';



CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "details" "text",
    "category" "text" NOT NULL,
    "qty" numeric(12,2) DEFAULT 1.00 NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "vat" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "total" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quotation_items_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "quotation_items_total_check" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "quotation_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "quotation_items_vat_check" CHECK (("vat" >= (0)::numeric))
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_supplier_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "supplier_rate_card_id" "uuid",
    "approved_quotation_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "currency" character(3) DEFAULT 'SAR'::"bpchar" NOT NULL,
    "estimated_unit_cost" numeric(14,2) NOT NULL,
    "estimated_total_cost" numeric(14,2) GENERATED ALWAYS AS (("quantity" * "estimated_unit_cost")) STORED,
    "cost_source" "text" NOT NULL,
    "rate_card_snapshot" "jsonb",
    "scope_of_work" "text",
    "internal_notes" "text",
    "created_by" "text",
    "updated_by" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "text",
    "cancelled_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_cancelled_reason_required" CHECK ((("status" IS DISTINCT FROM 'cancelled'::"text") OR (("cancelled_reason" IS NOT NULL) AND (TRIM(BOTH FROM "cancelled_reason") <> ''::"text")))),
    CONSTRAINT "chk_category_nonblank" CHECK ((TRIM(BOTH FROM "category") <> ''::"text")),
    CONSTRAINT "chk_cost_source_requirements" CHECK ((("cost_source" = 'manual_estimate'::"text") OR (("cost_source" = 'rate_card'::"text") AND ("supplier_rate_card_id" IS NOT NULL) AND ("rate_card_snapshot" IS NOT NULL)))),
    CONSTRAINT "chk_cost_source_valid" CHECK (("cost_source" = ANY (ARRAY['rate_card'::"text", 'manual_estimate'::"text"]))),
    CONSTRAINT "chk_currency_sar" CHECK (("currency" = 'SAR'::"bpchar")),
    CONSTRAINT "chk_estimated_unit_cost_positive" CHECK (("estimated_unit_cost" >= (0)::numeric)),
    CONSTRAINT "chk_item_name_nonblank" CHECK ((TRIM(BOTH FROM "item_name") <> ''::"text")),
    CONSTRAINT "chk_quantity_positive" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "chk_status_valid" CHECK (("status" = ANY (ARRAY['draft'::"text", 'planned'::"text", 'selected'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "chk_unit_nonblank" CHECK ((TRIM(BOTH FROM "unit") <> ''::"text"))
);


ALTER TABLE "public"."service_supplier_allocations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."service_supplier_allocations"."created_by" IS 'Clerk userId string of the user who created this supplier allocation.';



COMMENT ON COLUMN "public"."service_supplier_allocations"."updated_by" IS 'Clerk userId string of the user who last updated this supplier allocation.';



COMMENT ON COLUMN "public"."service_supplier_allocations"."cancelled_by" IS 'Clerk userId string of the user who cancelled this supplier allocation.';



CREATE TABLE IF NOT EXISTS "public"."supplier_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "source_allocation_id" "uuid" NOT NULL,
    "booking_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "currency" character(3) DEFAULT 'SAR'::"bpchar" NOT NULL,
    "estimated_unit_cost" numeric(14,2) NOT NULL,
    "estimated_total_cost" numeric(14,2) GENERATED ALWAYS AS (("quantity" * "estimated_unit_cost")) STORED,
    "scope_of_work" "text",
    "internal_notes" "text",
    "allocation_snapshot" "jsonb" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "text",
    "cancelled_reason" "text",
    "created_by" "text",
    "updated_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_sb_allocation_snapshot_json_object" CHECK (("jsonb_typeof"("allocation_snapshot") = 'object'::"text")),
    CONSTRAINT "chk_sb_booking_number_nonblank" CHECK ((TRIM(BOTH FROM "booking_number") <> ''::"text")),
    CONSTRAINT "chk_sb_cancelled_reason" CHECK ((("status" IS DISTINCT FROM 'cancelled'::"text") OR (("cancelled_reason" IS NOT NULL) AND (TRIM(BOTH FROM "cancelled_reason") <> ''::"text")))),
    CONSTRAINT "chk_sb_category_nonblank" CHECK ((TRIM(BOTH FROM "category") <> ''::"text")),
    CONSTRAINT "chk_sb_cost_positive" CHECK (("estimated_unit_cost" >= (0)::numeric)),
    CONSTRAINT "chk_sb_currency_sar" CHECK (("currency" = 'SAR'::"bpchar")),
    CONSTRAINT "chk_sb_item_name_nonblank" CHECK ((TRIM(BOTH FROM "item_name") <> ''::"text")),
    CONSTRAINT "chk_sb_quantity_positive" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "chk_sb_status_valid" CHECK (("status" = ANY (ARRAY['draft'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "chk_sb_unit_nonblank" CHECK ((TRIM(BOTH FROM "unit") <> ''::"text"))
);


ALTER TABLE "public"."supplier_bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplier_bookings" IS 'Supplier Booking estimated costs are planning/commitment estimates only. They do not create accounting entries. They must not be treated as actual costs or used in profit/margin calculations until Supplier Invoice exists.';



COMMENT ON COLUMN "public"."supplier_bookings"."cancelled_by" IS 'Clerk userId string of the user who cancelled this supplier booking.';



COMMENT ON COLUMN "public"."supplier_bookings"."created_by" IS 'Clerk userId string of the user who created this supplier booking.';



COMMENT ON COLUMN "public"."supplier_bookings"."updated_by" IS 'Clerk userId string of the user who last updated this supplier booking.';



CREATE TABLE IF NOT EXISTS "public"."supplier_rate_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "category" "text",
    "item_name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "currency" "text" DEFAULT 'SAR'::"text" NOT NULL,
    "base_cost" numeric NOT NULL,
    "valid_from" "date" NOT NULL,
    "valid_to" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "notes" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text",
    "updated_by" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "text",
    CONSTRAINT "chk_supplier_rate_cards_valid_dates" CHECK ((("valid_to" IS NULL) OR ("valid_to" >= "valid_from"))),
    CONSTRAINT "supplier_rate_cards_base_cost_check" CHECK (("base_cost" > (0)::numeric)),
    CONSTRAINT "supplier_rate_cards_currency_check" CHECK (("currency" = 'SAR'::"text")),
    CONSTRAINT "supplier_rate_cards_item_name_check" CHECK ((TRIM(BOTH FROM "item_name") <> ''::"text")),
    CONSTRAINT "supplier_rate_cards_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "supplier_rate_cards_unit_check" CHECK ((TRIM(BOTH FROM "unit") <> ''::"text"))
);


ALTER TABLE "public"."supplier_rate_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "service" "text" NOT NULL,
    "contact" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "rating" numeric(3,1) DEFAULT 0.0,
    "status" "text" NOT NULL,
    "recent_project" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_by" "text",
    "updated_by" "text",
    "supplier_number" "text",
    "supplier_type" "text",
    "category" "text",
    "legal_name" "text",
    "display_name" "text",
    "contact_name" "text",
    "whatsapp_phone" "text",
    "email" "text",
    "city" "text",
    "country" "text",
    "coverage_area" "text",
    "cr_number" "text",
    "vat_registration_status" "text",
    "vat_number" "text",
    "payment_terms" "text",
    "iban" "text",
    "bank_name" "text",
    "bank_account_name" "text",
    "is_preferred" boolean DEFAULT false NOT NULL,
    "blacklisted_reason" "text",
    "blacklisted_at" timestamp with time zone,
    "blacklisted_by" "text",
    "notes" "text",
    "deleted_by" "text"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."suppliers"."created_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."suppliers"."updated_by" IS 'Stores Clerk userId string';



COMMENT ON COLUMN "public"."suppliers"."supplier_number" IS 'Optional supplier code/number for future supplier directory identity. Nullable for existing rows.';



COMMENT ON COLUMN "public"."suppliers"."supplier_type" IS 'Optional supplier type: company or individual. Nullable for existing/backward-compatible rows.';



COMMENT ON COLUMN "public"."suppliers"."category" IS 'Optional controlled supplier service category for directory filtering.';



COMMENT ON COLUMN "public"."suppliers"."legal_name" IS 'Optional legal/commercial supplier name for compliance and future snapshots.';



COMMENT ON COLUMN "public"."suppliers"."display_name" IS 'Optional display name; existing name column remains compatible.';



COMMENT ON COLUMN "public"."suppliers"."contact_name" IS 'Optional primary supplier contact name; existing contact column remains compatible.';



COMMENT ON COLUMN "public"."suppliers"."whatsapp_phone" IS 'Optional WhatsApp phone if separate from phone.';



COMMENT ON COLUMN "public"."suppliers"."email" IS 'Optional supplier email.';



COMMENT ON COLUMN "public"."suppliers"."city" IS 'Optional supplier city.';



COMMENT ON COLUMN "public"."suppliers"."country" IS 'Optional supplier country.';



COMMENT ON COLUMN "public"."suppliers"."coverage_area" IS 'Optional supplier delivery/coverage area.';



COMMENT ON COLUMN "public"."suppliers"."cr_number" IS 'Optional Commercial Registration number; not unique or mandatory in this phase.';



COMMENT ON COLUMN "public"."suppliers"."vat_registration_status" IS 'Optional supplier-side VAT registration fact; does not enable G7 BLUE customer tax invoice behavior.';



COMMENT ON COLUMN "public"."suppliers"."vat_number" IS 'Optional supplier VAT number; does not enable G7 BLUE customer VAT/ZATCA behavior.';



COMMENT ON COLUMN "public"."suppliers"."payment_terms" IS 'Optional supplier payment terms.';



COMMENT ON COLUMN "public"."suppliers"."iban" IS 'Optional supplier IBAN; future application logic must mask by role and require before confirmed outbound supplier payment.';



COMMENT ON COLUMN "public"."suppliers"."bank_name" IS 'Optional supplier bank name; future application logic must mask bank details by role.';



COMMENT ON COLUMN "public"."suppliers"."bank_account_name" IS 'Optional supplier bank account holder name; future application logic must mask bank details by role.';



COMMENT ON COLUMN "public"."suppliers"."is_preferred" IS 'Preferred supplier flag, intentionally separate from lifecycle status.';



COMMENT ON COLUMN "public"."suppliers"."blacklisted_reason" IS 'Internal reason for blacklist status; future application logic must restrict visibility by role.';



COMMENT ON COLUMN "public"."suppliers"."blacklisted_at" IS 'Timestamp when supplier was blacklisted.';



COMMENT ON COLUMN "public"."suppliers"."blacklisted_by" IS 'Clerk userId string for the user who blacklisted the supplier.';



COMMENT ON COLUMN "public"."suppliers"."notes" IS 'Optional internal supplier notes.';



COMMENT ON COLUMN "public"."suppliers"."deleted_by" IS 'Clerk userId string for the user who soft-deleted the supplier, when applicable.';



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_clerk_user_id_key" UNIQUE ("clerk_user_id");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."suppliers"
    ADD CONSTRAINT "chk_suppliers_category" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['transport'::"text", 'cars'::"text", 'cleaning'::"text", 'staff'::"text", 'security'::"text", 'sound'::"text", 'lighting'::"text", 'screens_led'::"text", 'decoration'::"text", 'photo_video'::"text", 'catering'::"text", 'logistics'::"text", 'furniture_tents_stage'::"text", 'printing'::"text", 'permits_support'::"text", 'other'::"text"])))) NOT VALID;



ALTER TABLE "public"."suppliers"
    ADD CONSTRAINT "chk_suppliers_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'on_hold'::"text", 'blacklisted'::"text", 'inactive'::"text"]))) NOT VALID;



ALTER TABLE "public"."suppliers"
    ADD CONSTRAINT "chk_suppliers_supplier_type" CHECK ((("supplier_type" IS NULL) OR ("supplier_type" = ANY (ARRAY['company'::"text", 'individual'::"text"])))) NOT VALID;



ALTER TABLE "public"."suppliers"
    ADD CONSTRAINT "chk_suppliers_vat_registration_status" CHECK ((("vat_registration_status" IS NULL) OR ("vat_registration_status" = ANY (ARRAY['not_registered'::"text", 'registered'::"text", 'unknown'::"text"])))) NOT VALID;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_customer_number_key" UNIQUE ("customer_number");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_type_check" CHECK (("invoice_type" = ANY (ARRAY['deposit'::"text", 'final'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."number_sequences"
    ADD CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."number_sequences"
    ADD CONSTRAINT "number_sequences_type_year_key" UNIQUE ("type", "year");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_number_key" UNIQUE ("payment_number");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_project_number_key" UNIQUE ("project_number");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_id_service_id_key" UNIQUE ("id", "service_id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_quotation_number_key" UNIQUE ("quotation_number");



ALTER TABLE ONLY "public"."service_supplier_allocations"
    ADD CONSTRAINT "service_supplier_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_service_number_key" UNIQUE ("service_number");



ALTER TABLE ONLY "public"."supplier_bookings"
    ADD CONSTRAINT "supplier_bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."supplier_bookings"
    ADD CONSTRAINT "supplier_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_rate_cards"
    ADD CONSTRAINT "supplier_rate_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_app_users_clerk_id" ON "public"."app_users" USING "btree" ("clerk_user_id");



CREATE INDEX "idx_app_users_is_active" ON "public"."app_users" USING "btree" ("is_active");



CREATE INDEX "idx_app_users_role" ON "public"."app_users" USING "btree" ("role");



CREATE INDEX "idx_audit_logs_entity_type_id" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_customers_created_at" ON "public"."customers" USING "btree" ("created_at");



CREATE INDEX "idx_customers_status" ON "public"."customers" USING "btree" ("status");



CREATE INDEX "idx_invoice_items_invoice_id" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_approved_quotation_id" ON "public"."invoices" USING "btree" ("approved_quotation_id");



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at");



CREATE INDEX "idx_invoices_customer_id" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "idx_payments_customer_id" ON "public"."payments" USING "btree" ("customer_id");



CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_project_tasks_project_id" ON "public"."project_tasks" USING "btree" ("project_id");



CREATE INDEX "idx_projects_created_at" ON "public"."projects" USING "btree" ("created_at");



CREATE INDEX "idx_projects_customer_id" ON "public"."projects" USING "btree" ("customer_id");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_quotation_items_quotation_id" ON "public"."quotation_items" USING "btree" ("quotation_id");



CREATE INDEX "idx_quotations_created_at" ON "public"."quotations" USING "btree" ("created_at");



CREATE INDEX "idx_quotations_customer_id" ON "public"."quotations" USING "btree" ("customer_id");



CREATE INDEX "idx_quotations_service_id" ON "public"."quotations" USING "btree" ("service_id");



CREATE INDEX "idx_quotations_status" ON "public"."quotations" USING "btree" ("status");



CREATE INDEX "idx_service_supplier_allocations_approved_quotation_id" ON "public"."service_supplier_allocations" USING "btree" ("approved_quotation_id");



CREATE INDEX "idx_service_supplier_allocations_is_deleted" ON "public"."service_supplier_allocations" USING "btree" ("is_deleted");



CREATE INDEX "idx_service_supplier_allocations_service_id" ON "public"."service_supplier_allocations" USING "btree" ("service_id");



CREATE INDEX "idx_service_supplier_allocations_service_status" ON "public"."service_supplier_allocations" USING "btree" ("service_id", "status");



CREATE INDEX "idx_service_supplier_allocations_status" ON "public"."service_supplier_allocations" USING "btree" ("status");



CREATE INDEX "idx_service_supplier_allocations_supplier_deleted" ON "public"."service_supplier_allocations" USING "btree" ("supplier_id", "is_deleted");



CREATE INDEX "idx_service_supplier_allocations_supplier_id" ON "public"."service_supplier_allocations" USING "btree" ("supplier_id");



CREATE INDEX "idx_service_supplier_allocations_supplier_rate_card_id" ON "public"."service_supplier_allocations" USING "btree" ("supplier_rate_card_id");



CREATE INDEX "idx_services_created_at" ON "public"."services" USING "btree" ("created_at");



CREATE INDEX "idx_services_customer_id" ON "public"."services" USING "btree" ("customer_id");



CREATE INDEX "idx_services_deleted_at" ON "public"."services" USING "btree" ("deleted_at");



CREATE INDEX "idx_services_event_start_date" ON "public"."services" USING "btree" ("event_start_date");



CREATE INDEX "idx_services_sales_owner_id" ON "public"."services" USING "btree" ("sales_owner_id");



CREATE INDEX "idx_services_status" ON "public"."services" USING "btree" ("status");



CREATE INDEX "idx_supplier_bookings_is_deleted" ON "public"."supplier_bookings" USING "btree" ("is_deleted");



CREATE UNIQUE INDEX "idx_supplier_bookings_one_active_per_allocation" ON "public"."supplier_bookings" USING "btree" ("source_allocation_id") WHERE (("is_deleted" = false) AND ("status" <> 'cancelled'::"text"));



CREATE INDEX "idx_supplier_bookings_service_id" ON "public"."supplier_bookings" USING "btree" ("service_id");



CREATE INDEX "idx_supplier_bookings_service_status" ON "public"."supplier_bookings" USING "btree" ("service_id", "status");



CREATE INDEX "idx_supplier_bookings_source_allocation_id" ON "public"."supplier_bookings" USING "btree" ("source_allocation_id");



CREATE INDEX "idx_supplier_bookings_status" ON "public"."supplier_bookings" USING "btree" ("status");



CREATE INDEX "idx_supplier_bookings_supplier_created_at" ON "public"."supplier_bookings" USING "btree" ("supplier_id", "created_at");



CREATE INDEX "idx_supplier_bookings_supplier_id" ON "public"."supplier_bookings" USING "btree" ("supplier_id");



CREATE INDEX "idx_supplier_rate_cards_is_deleted" ON "public"."supplier_rate_cards" USING "btree" ("is_deleted");



CREATE INDEX "idx_supplier_rate_cards_lookup" ON "public"."supplier_rate_cards" USING "btree" ("supplier_id", "item_name", "unit", "valid_from", "valid_to");



CREATE INDEX "idx_supplier_rate_cards_status" ON "public"."supplier_rate_cards" USING "btree" ("status");



CREATE INDEX "idx_supplier_rate_cards_supplier_id" ON "public"."supplier_rate_cards" USING "btree" ("supplier_id");



CREATE INDEX "idx_supplier_rate_cards_supplier_status_deleted" ON "public"."supplier_rate_cards" USING "btree" ("supplier_id", "status", "is_deleted");



CREATE INDEX "idx_supplier_rate_cards_valid_from" ON "public"."supplier_rate_cards" USING "btree" ("valid_from");



CREATE INDEX "idx_supplier_rate_cards_valid_to" ON "public"."supplier_rate_cards" USING "btree" ("valid_to");



CREATE INDEX "idx_suppliers_category" ON "public"."suppliers" USING "btree" ("category");



CREATE INDEX "idx_suppliers_created_at" ON "public"."suppliers" USING "btree" ("created_at");



CREATE INDEX "idx_suppliers_deleted_at" ON "public"."suppliers" USING "btree" ("deleted_at");



CREATE INDEX "idx_suppliers_is_preferred" ON "public"."suppliers" USING "btree" ("is_preferred");



CREATE INDEX "idx_suppliers_status" ON "public"."suppliers" USING "btree" ("status");



CREATE INDEX "idx_suppliers_supplier_type" ON "public"."suppliers" USING "btree" ("supplier_type");



CREATE UNIQUE INDEX "unique_approved_quotation_per_service" ON "public"."quotations" USING "btree" ("service_id") WHERE (("status" = 'approved'::"text") AND ("is_deleted" = false));



CREATE OR REPLACE TRIGGER "check_service_supplier_allocations_immutable_service_id_trg" BEFORE UPDATE ON "public"."service_supplier_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"();



CREATE OR REPLACE TRIGGER "check_supplier_bookings_immutable_fields_trg" BEFORE UPDATE ON "public"."supplier_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."check_supplier_bookings_immutable_fields"();



CREATE OR REPLACE TRIGGER "check_supplier_bookings_insert_consistency_trg" BEFORE INSERT ON "public"."supplier_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."check_supplier_bookings_insert_consistency"();



CREATE OR REPLACE TRIGGER "set_quotation_customer_from_service_trigger" BEFORE INSERT OR UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."set_quotation_customer_from_service"();



CREATE OR REPLACE TRIGGER "update_app_users_updated_at" BEFORE UPDATE ON "public"."app_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_settings_updated_at" BEFORE UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoice_items_updated_at" BEFORE UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_number_sequences_updated_at" BEFORE UPDATE ON "public"."number_sequences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_tasks_updated_at" BEFORE UPDATE ON "public"."project_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotation_items_updated_at" BEFORE UPDATE ON "public"."quotation_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotations_updated_at" BEFORE UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_service_supplier_allocations_updated_at" BEFORE UPDATE ON "public"."service_supplier_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_supplier_bookings_updated_at" BEFORE UPDATE ON "public"."supplier_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "fk_quotations_service_id" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_approved_quotation_id_service_id_fkey" FOREIGN KEY ("approved_quotation_id", "service_id") REFERENCES "public"."quotations"("id", "service_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("approved_quotation_id") REFERENCES "public"."quotations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_supplier_allocations"
    ADD CONSTRAINT "service_supplier_allocations_approved_quotation_id_fkey" FOREIGN KEY ("approved_quotation_id") REFERENCES "public"."quotations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_supplier_allocations"
    ADD CONSTRAINT "service_supplier_allocations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_supplier_allocations"
    ADD CONSTRAINT "service_supplier_allocations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_supplier_allocations"
    ADD CONSTRAINT "service_supplier_allocations_supplier_rate_card_id_fkey" FOREIGN KEY ("supplier_rate_card_id") REFERENCES "public"."supplier_rate_cards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_bookings"
    ADD CONSTRAINT "supplier_bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_bookings"
    ADD CONSTRAINT "supplier_bookings_source_allocation_id_fkey" FOREIGN KEY ("source_allocation_id") REFERENCES "public"."service_supplier_allocations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_bookings"
    ADD CONSTRAINT "supplier_bookings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_rate_cards"
    ADD CONSTRAINT "supplier_rate_cards_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."number_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_supplier_allocations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_rate_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_service_supplier_allocations_immutable_service_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_supplier_bookings_immutable_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_supplier_bookings_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_supplier_bookings_immutable_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_supplier_bookings_insert_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_supplier_bookings_insert_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_supplier_bookings_insert_consistency"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_quotation_with_items"("p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_quotation_with_items"("p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_document_number"("doc_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_document_number"("doc_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_date" "date", "p_method" "text", "p_reference" "text", "p_user_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_date" "date", "p_method" "text", "p_reference" "text", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_quotation_customer_from_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_quotation_customer_from_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_quotation_customer_from_service"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_quotation_with_items"("p_quotation_id" "uuid", "p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_quotation_with_items"("p_quotation_id" "uuid", "p_quotation" "jsonb", "p_items" "jsonb", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."customer_report_metrics" TO "anon";
GRANT ALL ON TABLE "public"."customer_report_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_report_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."number_sequences" TO "anon";
GRANT ALL ON TABLE "public"."number_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."number_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."project_tasks" TO "anon";
GRANT ALL ON TABLE "public"."project_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."project_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON TABLE "public"."service_supplier_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_rate_cards" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































