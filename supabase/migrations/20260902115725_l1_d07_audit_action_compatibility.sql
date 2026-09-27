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
                'correction'::text
            ]
        )
    );

COMMIT;
