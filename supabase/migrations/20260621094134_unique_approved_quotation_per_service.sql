CREATE UNIQUE INDEX IF NOT EXISTS unique_approved_quotation_per_service
ON quotations (service_id)
WHERE status = 'approved' AND is_deleted = false;
