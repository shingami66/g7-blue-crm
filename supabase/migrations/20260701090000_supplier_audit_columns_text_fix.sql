BEGIN;

ALTER TABLE public.service_supplier_allocations
  ALTER COLUMN created_by TYPE text USING created_by::text,
  ALTER COLUMN updated_by TYPE text USING updated_by::text,
  ALTER COLUMN cancelled_by TYPE text USING cancelled_by::text;

ALTER TABLE public.supplier_bookings
  ALTER COLUMN created_by TYPE text USING created_by::text,
  ALTER COLUMN updated_by TYPE text USING updated_by::text,
  ALTER COLUMN cancelled_by TYPE text USING cancelled_by::text;

COMMENT ON COLUMN public.service_supplier_allocations.created_by IS 'Clerk userId string of the user who created this supplier allocation.';
COMMENT ON COLUMN public.service_supplier_allocations.updated_by IS 'Clerk userId string of the user who last updated this supplier allocation.';
COMMENT ON COLUMN public.service_supplier_allocations.cancelled_by IS 'Clerk userId string of the user who cancelled this supplier allocation.';

COMMENT ON COLUMN public.supplier_bookings.created_by IS 'Clerk userId string of the user who created this supplier booking.';
COMMENT ON COLUMN public.supplier_bookings.updated_by IS 'Clerk userId string of the user who last updated this supplier booking.';
COMMENT ON COLUMN public.supplier_bookings.cancelled_by IS 'Clerk userId string of the user who cancelled this supplier booking.';

COMMIT;
