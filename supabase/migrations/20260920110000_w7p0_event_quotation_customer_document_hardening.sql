-- W7-P0: preserve Service event context at Quotation creation time.
-- This migration adds document-only event snapshot support. It does not alter
-- quotation pricing, W2A/W2C authority, ABS, invoices, payments, or receipts.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.services') IS NULL
    THEN
        RAISE EXCEPTION 'w7p0_event_quotation_customer_document_hardening preflight: required table missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'public.quotations'::regclass
          AND attname = 'event_snapshot'
          AND attnum > 0
          AND NOT attisdropped
    ) THEN
        RAISE EXCEPTION 'w7p0_event_quotation_customer_document_hardening preflight: event_snapshot already exists';
    END IF;
END;
$$;

ALTER TABLE public.quotations
    ADD COLUMN event_snapshot jsonb NULL;

COMMENT ON COLUMN public.quotations.event_snapshot IS
    'W7-P0 immutable customer-document event context captured from Service truth at Quotation creation or successor creation. Legacy compatibility rows are explicitly marked and are not original capture evidence.';

CREATE FUNCTION public.capture_quotation_event_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service public.services%ROWTYPE;
    v_source_snapshot jsonb;
BEGIN
    IF NEW.revision_of_quotation_id IS NOT NULL THEN
        SELECT q.event_snapshot
        INTO v_source_snapshot
        FROM public.quotations q
        WHERE q.id = NEW.revision_of_quotation_id;

        IF v_source_snapshot IS NOT NULL THEN
            NEW.event_snapshot := v_source_snapshot;
            RETURN NEW;
        END IF;
    END IF;

    SELECT s.*
    INTO v_service
    FROM public.services s
    WHERE s.id = NEW.service_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    NEW.event_snapshot := jsonb_build_object(
        'snapshotVersion', 1,
        'snapshotSource', 'service_at_quotation_creation',
        'snapshotCapturedAt', transaction_timestamp(),
        'snapshotNote', NULL,
        'eventName', COALESCE(NULLIF(btrim(v_service.event_name), ''), NULLIF(btrim(NEW.event), '')),
        'eventType', v_service.event_type,
        'eventStartDate', v_service.event_start_date,
        'eventEndDate', v_service.event_end_date,
        'eventLocation', v_service.event_location
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER quotations_capture_event_snapshot_trg
BEFORE INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.capture_quotation_event_snapshot();

-- Preexisting rows receive a bounded, explicitly labelled compatibility value.
-- This is current Service data captured during rollout, not a claim that the
-- historical quotation originally captured these fields.
UPDATE public.quotations q
SET event_snapshot = jsonb_build_object(
    'snapshotVersion', 1,
    'snapshotSource', 'legacy_service_compatibility',
    'snapshotCapturedAt', transaction_timestamp(),
    'snapshotNote', 'Derived from current Service data during event snapshot rollout; not original capture evidence.',
    'eventName', COALESCE(NULLIF(btrim(s.event_name), ''), NULLIF(btrim(q.event), '')),
    'eventType', s.event_type,
    'eventStartDate', s.event_start_date,
    'eventEndDate', s.event_end_date,
    'eventLocation', s.event_location
)
FROM public.services s
WHERE s.id = q.service_id
  AND q.event_snapshot IS NULL
  AND q.status IS DISTINCT FROM 'approved';

CREATE FUNCTION public.prevent_quotation_event_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF OLD.event_snapshot IS DISTINCT FROM NEW.event_snapshot THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_event_snapshot_immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_quotation_event_snapshot_mutation_trg
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_quotation_event_snapshot_mutation();

REVOKE ALL ON FUNCTION public.capture_quotation_event_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_quotation_event_snapshot() TO service_role;
REVOKE ALL ON FUNCTION public.prevent_quotation_event_snapshot_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_quotation_event_snapshot_mutation() TO service_role;

COMMENT ON FUNCTION public.capture_quotation_event_snapshot() IS
    'W7-P0 captures immutable Service event metadata for each newly inserted Quotation or successor.';
COMMENT ON FUNCTION public.prevent_quotation_event_snapshot_mutation() IS
    'W7-P0 prevents any later mutation of the Quotation event document snapshot.';

COMMIT;
