-- G1 corrective migration: preserve approved service scope on partial final
-- Invoice snapshots while keeping deposit summary behavior unchanged.
--
-- The final settlement amount and prior exposure remain separate metadata on
-- snapshot_quotation.final_invoice_settlement, and invoice snapshots remain
-- immutable after the INSERT. No existing migration is edited or reapplied.

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.build_active_abs_invoice_snapshot(uuid,uuid,uuid,text,numeric)') IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'g1_final_invoice_scope_snapshot_correction_required_schema_missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.build_active_abs_invoice_snapshot(
    p_scope_id uuid,
    p_quotation_id uuid,
    p_service_id uuid,
    p_invoice_type text,
    p_invoice_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_quotation public.quotations%ROWTYPE;
    v_items jsonb;
    v_partial boolean;
BEGIN
    IF p_scope_id IS NULL
        OR p_quotation_id IS NULL
        OR p_service_id IS NULL
        OR p_invoice_type NOT IN ('deposit', 'final')
        OR p_invoice_amount IS NULL
        OR p_invoice_amount < 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    SELECT s.*
    INTO v_scope
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = p_service_id
      AND s.status = 'approved'
      AND s.voided_at IS NULL
      AND s.superseded_at IS NULL
    FOR UPDATE;

    IF NOT FOUND
        OR v_scope.source_quotation_id IS DISTINCT FROM p_quotation_id
        OR v_scope.accepted_subtotal IS NULL
        OR v_scope.accepted_vat_amount IS NULL
        OR v_scope.accepted_grand_total IS NULL
        OR v_scope.accepted_subtotal < 0
        OR v_scope.accepted_vat_amount < 0
        OR v_scope.accepted_grand_total < 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    SELECT q.*
    INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND q.service_id = p_service_id
      AND q.status = 'approved'
      AND COALESCE(q.is_deleted, false) = false
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    v_partial := p_invoice_amount < v_scope.accepted_grand_total;

    IF v_partial AND p_invoice_type = 'deposit' THEN
        v_items := jsonb_build_array(
            jsonb_build_object(
                'description', 'Deposit Payment',
                'details', format(
                    'For services related to Quotation %s',
                    v_quotation.quotation_number
                ),
                'qty', 1,
                'unit_price', p_invoice_amount,
                'vat', 0,
                'total', p_invoice_amount
            )
        );
    ELSE
        IF EXISTS (
            SELECT 1
            FROM public.approved_billing_scope_items i
            WHERE i.approved_billing_scope_id = v_scope.id
              AND i.decision IN ('accepted', 'adjusted')
              AND (
                  i.accepted_qty IS NULL
                  OR i.accepted_qty <= 0
                  OR i.accepted_unit_price IS NULL
                  OR i.accepted_unit_price < 0
                  OR i.accepted_subtotal IS NULL
                  OR i.accepted_vat_amount IS NULL
                  OR i.accepted_grand_total IS NULL
              )
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
        END IF;

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'description', i.source_description,
                    'details', i.source_details,
                    'qty', i.accepted_qty,
                    'unit_price', i.accepted_unit_price,
                    'vat', i.accepted_vat_amount,
                    'total', i.accepted_grand_total
                )
                ORDER BY i.display_order, i.id
            ) FILTER (WHERE i.decision IN ('accepted', 'adjusted')),
            '[]'::jsonb
        )
        INTO v_items
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = v_scope.id;

        IF jsonb_array_length(v_items) = 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'quotation_id', v_quotation.id,
        'quotation_number', v_quotation.quotation_number,
        'service_id', v_quotation.service_id,
        'customer_id', v_quotation.customer_id,
        'items', v_items,
        'subtotal', CASE
            WHEN v_partial AND p_invoice_type = 'deposit' THEN p_invoice_amount
            ELSE v_scope.accepted_subtotal
        END,
        'discount', COALESCE(v_scope.source_discount, 0),
        'vat_rate', COALESCE(v_scope.source_vat_rate, 0),
        'vat_amount', CASE
            WHEN v_partial AND p_invoice_type = 'deposit' THEN 0
            ELSE v_scope.accepted_vat_amount
        END,
        'grand_total', CASE
            WHEN v_partial AND p_invoice_type = 'deposit' THEN p_invoice_amount
            ELSE v_scope.accepted_grand_total
        END,
        'currency', COALESCE(v_scope.source_currency, 'SAR'),
        'status', v_quotation.status,
        'created_at', v_quotation.created_at,
        'updated_at', v_quotation.updated_at,
        'approvedBillingScopeId', v_scope.id,
        'approvedBillingScopeAcceptedGrandTotal', v_scope.accepted_grand_total,
        'sourceQuotationId', v_scope.source_quotation_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric)
    TO service_role;

COMMENT ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric) IS
'Builds immutable active ABS invoice snapshots. Deposits may use a bounded payment summary; final invoices retain accepted service scope lines while settlement metadata remains separate. DEV/DEMO contract only; not production-ready.';

COMMIT;
