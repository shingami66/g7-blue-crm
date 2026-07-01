ALTER TABLE public.supplier_bookings
ALTER COLUMN booking_number SET DEFAULT public.generate_document_number('supplier_booking'::text);
