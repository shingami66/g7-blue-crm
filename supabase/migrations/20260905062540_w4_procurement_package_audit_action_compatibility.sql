-- W4 corrective migration: expand audit_logs_action_check to permit procurement package actions.
-- The original audit logs action check is replaced additively to preserve all existing actions.
BEGIN;

ALTER TABLE public.audit_logs
    DROP CONSTRAINT audit_logs_action_check;

ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_check
    CHECK (
        action = ANY (
            ARRAY[
                'create'::text,
                'update'::text,
                'delete'::text,
                'restore'::text,
                'status_change'::text,
                'payment_recorded'::text,
                'correction'::text,
                'procurement_package_created'::text,
                'procurement_package_updated'::text,
                'procurement_package_requirements_set'::text,
                'procurement_package_supplier_selected'::text,
                'procurement_package_supplier_cleared'::text
            ]
        )
    );

COMMIT;
