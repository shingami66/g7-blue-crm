-- W11 M0 v1. DEV dpddrqjzqohexixgdqiq ONLY, under separate read authority.
-- SELECT-only: no DDL/DML, transaction setting, locks, fixtures, bootstrap, grants or repairs.
-- One statement: all comparable data shares one statement snapshot and recorded-at cutoff.
-- Current mutable tables are current observations; this does not invent historical replay.
-- Read routines are the existing source-verified getters; never substitute mutation RPCs.
-- Monetary sums stay PostgreSQL numeric/bigint and are returned as text.
-- Catalog/data identifiers and aggregate audit metadata only; no protected payloads.
SELECT statement_timestamp()::text AS recorded_at_cutoff,DATE '2026-10-26'::text AS business_as_of_date,
pg_current_snapshot()::text AS snapshot_id,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text AS observation_at,statement_timestamp()::text AS logical_recorded_at_cutoff,current_date::text AS business_as_of_date,(SELECT jsonb_agg(to_jsonb(i) ORDER BY relation) FROM (SELECT 'accounting_account_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_account_versions t
UNION ALL
SELECT 'accounting_accounts' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_accounts t
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_ap_bridge_event_versions x GROUP BY 1) z) AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_ap_bridge_event_versions t
UNION ALL
SELECT 'accounting_ap_bridge_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_ap_bridge_events t
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_ap_bridge_journal_lines t
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_ap_bridge_journal_links t
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_ar_bridge_event_versions x GROUP BY 1) z) AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_ar_bridge_event_versions t
UNION ALL
SELECT 'accounting_ar_bridge_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_ar_bridge_events t
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_ar_bridge_journal_lines t
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_ar_bridge_journal_links t
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_bank_binding_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_binding_reviews t
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_bank_binding_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_binding_versions t
UNION ALL
SELECT 'accounting_bank_bindings' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_bindings t
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_reconciliation_allocations t
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_bank_reconciliation_group_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_reconciliation_group_versions t
UNION ALL
SELECT 'accounting_bank_reconciliation_groups' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_reconciliation_groups t
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_bank_reconciliation_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_reconciliation_reviews t
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_bank_statement_batch_versions x GROUP BY 1) z) AS statuses,jsonb_build_object('closing_balance_halalah',COALESCE(sum(t.closing_balance_halalah),0)::text,'opening_balance_halalah',COALESCE(sum(t.opening_balance_halalah),0)::text) AS raw_column_totals FROM public.accounting_bank_statement_batch_versions t
UNION ALL
SELECT 'accounting_bank_statement_batches' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_statement_batches t
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('signed_amount_halalah',COALESCE(sum(t.signed_amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_bank_statement_line_versions t
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_bank_statement_lines t
UNION ALL
SELECT 'accounting_capability_catalog' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_capability_catalog t
UNION ALL
SELECT 'accounting_capability_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.effect::text,'<NULL>') k,count(*)::text v FROM public.accounting_capability_events x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_capability_events t
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_expense_bridge_event_versions x GROUP BY 1) z) AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_expense_bridge_event_versions t
UNION ALL
SELECT 'accounting_expense_bridge_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_expense_bridge_events t
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_expense_bridge_journal_lines t
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_expense_bridge_journal_links t
UNION ALL
SELECT 'accounting_foundation_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.event_type::text,'<NULL>') k,count(*)::text v FROM public.accounting_foundation_events x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_foundation_events t
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_acceptances t
UNION ALL
SELECT 'accounting_inception_coverage' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_coverage t
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_coverage_versions t
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_journal_links t
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_mapping_authorizations t
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_package_versions t
UNION ALL
SELECT 'accounting_inception_packages' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_packages t
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_inception_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_inception_reviews t
UNION ALL
SELECT 'accounting_journal_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.operation::text,'<NULL>') k,count(*)::text v FROM public.accounting_journal_events x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_journal_events t
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_journal_line_versions t
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_journal_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_journal_versions t
UNION ALL
SELECT 'accounting_journals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_journals t
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_period_close_packages t
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_period_close_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_period_close_reviews t
UNION ALL
SELECT 'accounting_period_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_period_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_period_versions t
UNION ALL
SELECT 'accounting_periods' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_periods t
UNION ALL
SELECT 'accounting_posting_rule_mappings' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_posting_rule_mappings t
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_posting_rule_versions t
UNION ALL
SELECT 'accounting_posting_rules' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_posting_rules t
UNION ALL
SELECT 'accounting_profile_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.activation_state::text,'<NULL>') k,count(*)::text v FROM public.accounting_profile_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_profile_versions t
UNION ALL
SELECT 'accounting_profiles' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_profiles t
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_revenue_arrangement_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_arrangement_reviews t
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_revenue_arrangement_versions x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_arrangement_versions t
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_arrangements t
UNION ALL
SELECT 'accounting_revenue_performance_evidence' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_performance_evidence t
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.accounting_revenue_performance_evidence_reviews x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_performance_evidence_reviews t
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_revenue_performance_evidence_versions x GROUP BY 1) z) AS statuses,jsonb_build_object('correction_amount_halalah',COALESCE(sum(t.correction_amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_revenue_performance_evidence_versions t
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_performance_unit_versions t
UNION ALL
SELECT 'accounting_revenue_performance_units' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_performance_units t
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_recognition_events t
UNION ALL
SELECT 'accounting_revenue_recognition_journal_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_halalah',COALESCE(sum(t.amount_halalah),0)::text) AS raw_column_totals FROM public.accounting_revenue_recognition_journal_lines t
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_revenue_recognition_journal_links t
UNION ALL
SELECT 'accounting_source_effects' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.accounting_source_effects x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_source_effects t
UNION ALL
SELECT 'accounting_statement_mapping_entries' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_statement_mapping_entries t
UNION ALL
SELECT 'accounting_statement_mapping_sets' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_statement_mapping_sets t
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.accounting_statement_mapping_versions t
UNION ALL
SELECT 'app_user_permission_overrides' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.effect::text,'<NULL>') k,count(*)::text v FROM public.app_user_permission_overrides x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.app_user_permission_overrides t
UNION ALL
SELECT 'app_users' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.app_users t
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.decision::text,'<NULL>') k,count(*)::text v FROM public.approved_billing_scope_items x GROUP BY 1) z) AS statuses,jsonb_build_object('source_subtotal',COALESCE(sum(t.source_subtotal),0)::text,'accepted_subtotal',COALESCE(sum(t.accepted_subtotal),0)::text,'source_vat_amount',COALESCE(sum(t.source_vat_amount),0)::text,'source_grand_total',COALESCE(sum(t.source_grand_total),0)::text,'accepted_vat_amount',COALESCE(sum(t.accepted_vat_amount),0)::text,'accepted_grand_total',COALESCE(sum(t.accepted_grand_total),0)::text) AS raw_column_totals FROM public.approved_billing_scope_items t
UNION ALL
SELECT 'approved_billing_scopes' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.approved_billing_scopes x GROUP BY 1) z) AS statuses,jsonb_build_object('accepted_subtotal',COALESCE(sum(t.accepted_subtotal),0)::text,'accepted_vat_amount',COALESCE(sum(t.accepted_vat_amount),0)::text,'accepted_grand_total',COALESCE(sum(t.accepted_grand_total),0)::text,'source_quotation_subtotal',COALESCE(sum(t.source_quotation_subtotal),0)::text,'source_quotation_vat_amount',COALESCE(sum(t.source_quotation_vat_amount),0)::text,'source_quotation_grand_total',COALESCE(sum(t.source_quotation_grand_total),0)::text) AS raw_column_totals FROM public.approved_billing_scopes t
UNION ALL
SELECT 'approved_commitment_amendments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount_delta',COALESCE(sum(t.amount_delta),0)::text,'approved_amount_after',COALESCE(sum(t.approved_amount_after),0)::text) AS raw_column_totals FROM public.approved_commitment_amendments t
UNION ALL
SELECT 'approved_commitment_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.approved_commitment_balances x GROUP BY 1) z) AS statuses,jsonb_build_object('pending_amount',COALESCE(sum(t.pending_amount),0)::text,'accepted_amount',COALESCE(sum(t.accepted_amount),0)::text,'authorized_amount',COALESCE(sum(t.authorized_amount),0)::text,'open_commitment_amount',COALESCE(sum(t.open_commitment_amount),0)::text,'original_approved_amount',COALESCE(sum(t.original_approved_amount),0)::text) AS raw_column_totals FROM public.approved_commitment_balances t
UNION ALL
SELECT 'approved_commitment_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.approved_commitment_documents t
UNION ALL
SELECT 'approved_commitments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.approved_commitments x GROUP BY 1) z) AS statuses,jsonb_build_object('original_approved_amount',COALESCE(sum(t.original_approved_amount),0)::text) AS raw_column_totals FROM public.approved_commitments t
UNION ALL
SELECT 'audit_logs' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.audit_logs t
UNION ALL
SELECT 'business_document_links' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.business_document_links t
UNION ALL
SELECT 'business_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.business_documents t
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.cash_advance_expense_settlements t
UNION ALL
SELECT 'cash_advance_returns' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.cash_advance_returns t
UNION ALL
SELECT 'company_settings' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.company_settings t
UNION ALL
SELECT 'customer_credit_adjustment_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('applied_amount',COALESCE(sum(t.applied_amount),0)::text,'credited_amount',COALESCE(sum(t.credited_amount),0)::text,'refunded_amount',COALESCE(sum(t.refunded_amount),0)::text,'available_amount',COALESCE(sum(t.available_amount),0)::text,'eligible_credit_amount',COALESCE(sum(t.eligible_credit_amount),0)::text) AS raw_column_totals FROM public.customer_credit_adjustment_balances t
UNION ALL
SELECT 'customer_credit_application_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.customer_credit_application_reversals t
UNION ALL
SELECT 'customer_credit_applications' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'customer_credit_balance_after',COALESCE(sum(t.customer_credit_balance_after),0)::text) AS raw_column_totals FROM public.customer_credit_applications t
UNION ALL
SELECT 'customer_credit_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('applied_amount',COALESCE(sum(t.applied_amount),0)::text,'credited_amount',COALESCE(sum(t.credited_amount),0)::text,'refunded_amount',COALESCE(sum(t.refunded_amount),0)::text,'available_credit_amount',COALESCE(sum(t.available_credit_amount),0)::text) AS raw_column_totals FROM public.customer_credit_balances t
UNION ALL
SELECT 'customer_internal_credit_adjustment_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.customer_internal_credit_adjustment_reversals t
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'customer_credit_balance_after',COALESCE(sum(t.customer_credit_balance_after),0)::text) AS raw_column_totals FROM public.customer_internal_credit_adjustments t
UNION ALL
SELECT 'customer_invoice_receivable_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.invoice_status::text,'<NULL>') k,count(*)::text v FROM public.customer_invoice_receivable_balances x GROUP BY 1) z) AS statuses,jsonb_build_object('settled_amount',COALESCE(sum(t.settled_amount),0)::text,'outstanding_amount',COALESCE(sum(t.outstanding_amount),0)::text,'gross_issued_amount',COALESCE(sum(t.gross_issued_amount),0)::text,'invoice_amount_paid',COALESCE(sum(t.invoice_amount_paid),0)::text,'invoice_balance_due',COALESCE(sum(t.invoice_balance_due),0)::text,'net_receivable_amount',COALESCE(sum(t.net_receivable_amount),0)::text,'customer_credit_amount',COALESCE(sum(t.customer_credit_amount),0)::text,'credit_adjustment_amount',COALESCE(sum(t.credit_adjustment_amount),0)::text,'credit_application_amount',COALESCE(sum(t.credit_application_amount),0)::text) AS raw_column_totals FROM public.customer_invoice_receivable_balances t
UNION ALL
SELECT 'customer_invoice_settlement_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.invoice_status::text,'<NULL>') k,count(*)::text v FROM public.customer_invoice_settlement_balances x GROUP BY 1) z) AS statuses,jsonb_build_object('grand_total',COALESCE(sum(t.grand_total),0)::text,'allocated_amount',COALESCE(sum(t.allocated_amount),0)::text,'outstanding_amount',COALESCE(sum(t.outstanding_amount),0)::text,'invoice_amount_paid',COALESCE(sum(t.invoice_amount_paid),0)::text,'invoice_balance_due',COALESCE(sum(t.invoice_balance_due),0)::text) AS raw_column_totals FROM public.customer_invoice_settlement_balances t
UNION ALL
SELECT 'customer_receipt_allocation_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.customer_receipt_allocation_reversals t
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.customer_receipt_allocations t
UNION ALL
SELECT 'customer_receipt_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.receipt_status::text,'<NULL>') k,count(*)::text v FROM public.customer_receipt_balances x GROUP BY 1) z) AS statuses,jsonb_build_object('receipt_amount',COALESCE(sum(t.receipt_amount),0)::text,'allocated_amount',COALESCE(sum(t.allocated_amount),0)::text,'unapplied_amount',COALESCE(sum(t.unapplied_amount),0)::text) AS raw_column_totals FROM public.customer_receipt_balances t
UNION ALL
SELECT 'customer_receipt_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.customer_receipt_reversals t
UNION ALL
SELECT 'customer_refund_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.customer_refund_reversals t
UNION ALL
SELECT 'customer_refunds' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'customer_credit_balance_after',COALESCE(sum(t.customer_credit_balance_after),0)::text) AS raw_column_totals FROM public.customer_refunds t
UNION ALL
SELECT 'customer_report_metrics' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('total_quoted_amount',COALESCE(sum(t.total_quoted_amount),0)::text) AS raw_column_totals FROM public.customer_report_metrics t
UNION ALL
SELECT 'customers' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.customers x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.customers t
UNION ALL
SELECT 'employee_cash_advances' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.employee_cash_advances x GROUP BY 1) z) AS statuses,jsonb_build_object('amount_issued',COALESCE(sum(t.amount_issued),0)::text,'amount_returned',COALESCE(sum(t.amount_returned),0)::text,'remaining_balance',COALESCE(sum(t.remaining_balance),0)::text,'amount_spent_settled',COALESCE(sum(t.amount_spent_settled),0)::text) AS raw_column_totals FROM public.employee_cash_advances t
UNION ALL
SELECT 'event_cost_budgets' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('base_budget_amount',COALESCE(sum(t.base_budget_amount),0)::text,'contingency_amount',COALESCE(sum(t.contingency_amount),0)::text,'approved_budget_cost',COALESCE(sum(t.approved_budget_cost),0)::text) AS raw_column_totals FROM public.event_cost_budgets t
UNION ALL
SELECT 'event_cost_close_reopenings' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.event_cost_close_reopenings t
UNION ALL
SELECT 'event_cost_close_versions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('eac',COALESCE(sum(t.eac),0)::text,'etc',COALESCE(sum(t.etc),0)::text,'paid_cost',COALESCE(sum(t.paid_cost),0)::text,'actual_cost',COALESCE(sum(t.actual_cost),0)::text,'outstanding_cost',COALESCE(sum(t.outstanding_cost),0)::text,'approved_budget_cost',COALESCE(sum(t.approved_budget_cost),0)::text) AS raw_column_totals FROM public.event_cost_close_versions t
UNION ALL
SELECT 'event_cost_etc_forecasts' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('etc_amount',COALESCE(sum(t.etc_amount),0)::text) AS raw_column_totals FROM public.event_cost_etc_forecasts t
UNION ALL
SELECT 'event_milestones' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.event_milestones x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.event_milestones t
UNION ALL
SELECT 'expense_accountability_summaries' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.expense_accountability_summaries x GROUP BY 1) z) AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'reimbursed_amount',COALESCE(sum(t.reimbursed_amount),0)::text,'total_settled_amount',COALESCE(sum(t.total_settled_amount),0)::text,'advance_allocated_amount',COALESCE(sum(t.advance_allocated_amount),0)::text,'remaining_unsettled_amount',COALESCE(sum(t.remaining_unsettled_amount),0)::text,'petty_cash_allocated_amount',COALESCE(sum(t.petty_cash_allocated_amount),0)::text) AS raw_column_totals FROM public.expense_accountability_summaries t
UNION ALL
SELECT 'expense_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.expense_documents t
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.expense_evidence_exceptions t
UNION ALL
SELECT 'expense_reimbursement_settlements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.expense_reimbursement_settlements t
UNION ALL
SELECT 'expenses' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.expenses x GROUP BY 1) z) AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.expenses t
UNION ALL
SELECT 'invoice_draft_update_mutations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('requested_amount',COALESCE(sum(t.requested_amount),0)::text) AS raw_column_totals FROM public.invoice_draft_update_mutations t
UNION ALL
SELECT 'invoice_items' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('total',COALESCE(sum(t.total),0)::text) AS raw_column_totals FROM public.invoice_items t
UNION ALL
SELECT 'invoices' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.invoices x GROUP BY 1) z) AS statuses,jsonb_build_object('subtotal',COALESCE(sum(t.subtotal),0)::text,'vat_amount',COALESCE(sum(t.vat_amount),0)::text,'amount_paid',COALESCE(sum(t.amount_paid),0)::text,'balance_due',COALESCE(sum(t.balance_due),0)::text,'grand_total',COALESCE(sum(t.grand_total),0)::text) AS raw_column_totals FROM public.invoices t
UNION ALL
SELECT 'number_sequences' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.number_sequences t
UNION ALL
SELECT 'payments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.payments x GROUP BY 1) z) AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'invoice_amount_paid_after',COALESCE(sum(t.invoice_amount_paid_after),0)::text,'invoice_balance_due_after',COALESCE(sum(t.invoice_balance_due_after),0)::text) AS raw_column_totals FROM public.payments t
UNION ALL
SELECT 'petty_cash_funds' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.petty_cash_funds x GROUP BY 1) z) AS statuses,jsonb_build_object('current_balance',COALESCE(sum(t.current_balance),0)::text) AS raw_column_totals FROM public.petty_cash_funds t
UNION ALL
SELECT 'petty_cash_transactions' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text,'balance_after',COALESCE(sum(t.balance_after),0)::text,'balance_before',COALESCE(sum(t.balance_before),0)::text) AS raw_column_totals FROM public.petty_cash_transactions t
UNION ALL
SELECT 'project_tasks' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.project_tasks x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.project_tasks t
UNION ALL
SELECT 'projects' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.projects x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.projects t
UNION ALL
SELECT 'quotation_items' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('total',COALESCE(sum(t.total),0)::text) AS raw_column_totals FROM public.quotation_items t
UNION ALL
SELECT 'quotations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.quotations x GROUP BY 1) z) AS statuses,jsonb_build_object('discount',COALESCE(sum(t.discount),0)::text,'subtotal',COALESCE(sum(t.subtotal),0)::text,'vat_amount',COALESCE(sum(t.vat_amount),0)::text,'grand_total',COALESCE(sum(t.grand_total),0)::text) AS raw_column_totals FROM public.quotations t
UNION ALL
SELECT 'service_lifecycle_states' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_lifecycle_states t
UNION ALL
SELECT 'service_procurement_candidate_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_procurement_candidate_documents t
UNION ALL
SELECT 'service_procurement_candidates' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('quoted_amount',COALESCE(sum(t.quoted_amount),0)::text) AS raw_column_totals FROM public.service_procurement_candidates t
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_procurement_package_requirements t
UNION ALL
SELECT 'service_procurement_packages' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.service_procurement_packages x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_procurement_packages t
UNION ALL
SELECT 'service_procurement_requirements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_procurement_requirements t
UNION ALL
SELECT 'service_receipt_corrections' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('prior_received_amount',COALESCE(sum(t.prior_received_amount),0)::text,'corrected_received_amount',COALESCE(sum(t.corrected_received_amount),0)::text) AS raw_column_totals FROM public.service_receipt_corrections t
UNION ALL
SELECT 'service_receipt_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_receipt_documents t
UNION ALL
SELECT 'service_receipts' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.acceptance_status::text,'<NULL>') k,count(*)::text v FROM public.service_receipts x GROUP BY 1) z) AS statuses,jsonb_build_object('received_amount',COALESCE(sum(t.received_amount),0)::text) AS raw_column_totals FROM public.service_receipts t
UNION ALL
SELECT 'service_supplier_allocations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false))::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.service_supplier_allocations x GROUP BY 1) z) AS statuses,jsonb_build_object('estimated_unit_cost',COALESCE(sum(t.estimated_unit_cost),0)::text,'estimated_total_cost',COALESCE(sum(t.estimated_total_cost),0)::text) AS raw_column_totals FROM public.service_supplier_allocations t
UNION ALL
SELECT 'service_tasks' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.service_tasks x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.service_tasks t
UNION ALL
SELECT 'services' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.services x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.services t
UNION ALL
SELECT 'supplier_advance_allocation_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_allocation_reversals t
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.supplier_advance_allocations t
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_authorization_documents t
UNION ALL
SELECT 'supplier_advance_authorization_releases' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_authorization_releases t
UNION ALL
SELECT 'supplier_advance_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.supplier_advance_balances x GROUP BY 1) z) AS statuses,jsonb_build_object('paid_amount',COALESCE(sum(t.paid_amount),0)::text,'refunded_amount',COALESCE(sum(t.refunded_amount),0)::text,'reversed_amount',COALESCE(sum(t.reversed_amount),0)::text,'allocated_amount',COALESCE(sum(t.allocated_amount),0)::text,'authorized_amount',COALESCE(sum(t.authorized_amount),0)::text,'remaining_unallocated_amount',COALESCE(sum(t.remaining_unallocated_amount),0)::text) AS raw_column_totals FROM public.supplier_advance_balances t
UNION ALL
SELECT 'supplier_advance_commitment_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('authorized_amount',COALESCE(sum(t.authorized_amount),0)::text,'open_commitment_amount',COALESCE(sum(t.open_commitment_amount),0)::text,'available_authorization_amount',COALESCE(sum(t.available_authorization_amount),0)::text) AS raw_column_totals FROM public.supplier_advance_commitment_balances t
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_payment_documents t
UNION ALL
SELECT 'supplier_advance_payment_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_payment_reversals t
UNION ALL
SELECT 'supplier_advance_payments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.supplier_advance_payments t
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_advance_refund_documents t
UNION ALL
SELECT 'supplier_advance_refunds' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.supplier_advance_refunds t
UNION ALL
SELECT 'supplier_advances' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('authorized_amount',COALESCE(sum(t.authorized_amount),0)::text) AS raw_column_totals FROM public.supplier_advances t
UNION ALL
SELECT 'supplier_bill_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_bill_documents t
UNION ALL
SELECT 'supplier_bill_payment_balances' AS relation,'view' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('paid_amount',COALESCE(sum(t.paid_amount),0)::text,'payable_amount',COALESCE(sum(t.payable_amount),0)::text,'outstanding_amount',COALESCE(sum(t.outstanding_amount),0)::text,'advance_allocated_amount',COALESCE(sum(t.advance_allocated_amount),0)::text) AS raw_column_totals FROM public.supplier_bill_payment_balances t
UNION ALL
SELECT 'supplier_bills' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.supplier_bills x GROUP BY 1) z) AS statuses,jsonb_build_object('subtotal',COALESCE(sum(t.subtotal),0)::text,'vat_amount',COALESCE(sum(t.vat_amount),0)::text,'total_amount',COALESCE(sum(t.total_amount),0)::text) AS raw_column_totals FROM public.supplier_bills t
UNION ALL
SELECT 'supplier_bookings' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false))::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.supplier_bookings x GROUP BY 1) z) AS statuses,jsonb_build_object('estimated_unit_cost',COALESCE(sum(t.estimated_unit_cost),0)::text,'estimated_total_cost',COALESCE(sum(t.estimated_total_cost),0)::text) AS raw_column_totals FROM public.supplier_bookings t
UNION ALL
SELECT 'supplier_payment_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_payment_documents t
UNION ALL
SELECT 'supplier_payment_reversals' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_payment_reversals t
UNION ALL
SELECT 'supplier_payments' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('amount',COALESCE(sum(t.amount),0)::text) AS raw_column_totals FROM public.supplier_payments t
UNION ALL
SELECT 'supplier_quotation_documents' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,'{}'::jsonb AS raw_column_totals FROM public.supplier_quotation_documents t
UNION ALL
SELECT 'supplier_quotation_lines' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('line_total',COALESCE(sum(t.line_total),0)::text) AS raw_column_totals FROM public.supplier_quotation_lines t
UNION ALL
SELECT 'supplier_quotation_requirements' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('line_amount',COALESCE(sum(t.line_amount),0)::text) AS raw_column_totals FROM public.supplier_quotation_requirements t
UNION ALL
SELECT 'supplier_quotations' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE true)::text AS active_rows,'{}'::jsonb AS statuses,jsonb_build_object('package_total',COALESCE(sum(t.package_total),0)::text) AS raw_column_totals FROM public.supplier_quotations t
UNION ALL
SELECT 'supplier_rate_cards' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.supplier_rate_cards x GROUP BY 1) z) AS statuses,jsonb_build_object('base_cost',COALESCE(sum(t.base_cost),0)::text) AS raw_column_totals FROM public.supplier_rate_cards t
UNION ALL
SELECT 'suppliers' AS relation,'table' AS kind,count(*)::text AS rows,count(*) FILTER (WHERE NOT COALESCE(t.is_deleted,false) AND t.deleted_at IS NULL)::text AS active_rows,(SELECT jsonb_object_agg(k,v) FROM (SELECT COALESCE(x.status::text,'<NULL>') k,count(*)::text v FROM public.suppliers x GROUP BY 1) z) AS statuses,'{}'::jsonb AS raw_column_totals FROM public.suppliers t) i) AS inventory) q) AS inventory,
(SELECT to_jsonb(q) FROM (WITH aq AS (
SELECT q.id,q.service_id,q.customer_id,q.grand_total,q.created_at,q.updated_at
FROM public.quotations q WHERE q.status='approved' AND NOT q.is_deleted AND q.superseded_by_quotation_id IS NULL
), deleted_service_quotes AS (
SELECT q.* FROM aq q JOIN public.services s ON s.id=q.service_id WHERE s.deleted_at IS NOT NULL
), missing_abs AS (
SELECT q.* FROM aq q WHERE NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes b WHERE b.source_quotation_id=q.id AND b.status='approved' AND b.superseded_by_scope_id IS NULL)
), missing_invoices AS (
SELECT a.entity_id,count(*)::text events,min(a.timestamp)::text first_event,max(a.timestamp)::text last_event,array_agg(DISTINCT a.action) actions
FROM public.audit_logs a WHERE lower(a.entity_type) IN ('invoice','invoices') AND NOT EXISTS(SELECT 1 FROM public.invoices i WHERE i.id::text=a.entity_id::text)
GROUP BY a.entity_id
)
SELECT statement_timestamp()::text AS observation_at,
(SELECT jsonb_agg(jsonb_build_object('entity_type',entity_type,'action',action,'count',n) ORDER BY entity_type,action) FROM(SELECT entity_type,action,count(*)::text n FROM public.audit_logs GROUP BY 1,2) a) audit_distribution,
(SELECT jsonb_agg(jsonb_build_object('quotation_id',q.id,'service_id',q.service_id,'amount',q.grand_total::text,'created_at',q.created_at,'updated_at',q.updated_at,'active_abs',(SELECT count(*) FROM public.approved_billing_scopes b WHERE b.source_quotation_id=q.id AND b.status='approved' AND b.superseded_by_scope_id IS NULL),'invoice_count',(SELECT count(*) FROM public.invoices i WHERE i.service_id=q.service_id),'invoice_total',(SELECT COALESCE(sum(i.grand_total),0)::text FROM public.invoices i WHERE i.service_id=q.service_id),'payment_total',(SELECT COALESCE(sum(p.amount),0)::text FROM public.payments p JOIN public.invoices i ON i.id=p.invoice_id WHERE i.service_id=q.service_id),'credit_total',(SELECT COALESCE(sum(c.amount),0)::text FROM public.customer_internal_credit_adjustments c WHERE c.service_id=q.service_id),'quotation_audits',(SELECT count(*) FROM public.audit_logs a WHERE a.entity_id::text=q.id::text),'service_audits',(SELECT count(*) FROM public.audit_logs a WHERE a.entity_id::text=q.service_id::text)) ORDER BY q.id) FROM deleted_service_quotes q) deleted_service_quotes,
(SELECT jsonb_agg(jsonb_build_object('quotation_id',q.id,'service_id',q.service_id,'amount',q.grand_total::text,'created_at',q.created_at,'updated_at',q.updated_at,'audit_count',(SELECT count(*) FROM public.audit_logs a WHERE a.entity_id::text=q.id::text),'invoice_count',(SELECT count(*) FROM public.invoices i WHERE i.service_id=q.service_id),'payments',(SELECT COALESCE(sum(p.amount),0)::text FROM public.payments p JOIN public.invoices i ON i.id=p.invoice_id WHERE i.service_id=q.service_id),'credits',(SELECT COALESCE(sum(c.amount),0)::text FROM public.customer_internal_credit_adjustments c WHERE c.service_id=q.service_id)) ORDER BY q.id) FROM missing_abs q) approved_quotes_without_abs,
(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.entity_id) FROM missing_invoices m) missing_invoice_audit_references,
(SELECT jsonb_agg(jsonb_build_object('customer_id',c.id,'services',(SELECT count(*) FROM public.services s WHERE s.customer_id=c.id),'quotations',(SELECT count(*) FROM public.quotations q WHERE q.customer_id=c.id),'invoices',(SELECT count(*) FROM public.invoices i WHERE i.customer_id=c.id),'payments',(SELECT count(*) FROM public.payments p WHERE p.customer_id=c.id),'credits',(SELECT count(*) FROM public.customer_internal_credit_adjustments a WHERE a.customer_id=c.id))) FROM public.customers c WHERE c.is_deleted AND c.deleted_at IS NULL) deleted_customers_without_timestamp,
(SELECT jsonb_agg(jsonb_build_object('profile_id',p.id,'current_version',p.current_version,'created_at',p.created_at,'activation_state',v.activation_state,'professional_validation_state',v.professional_validation_state,'vat_mode',v.vat_mode,'zatca_state',v.zatca_state,'fatoora_state',v.fatoora_state,'currency',v.functional_currency)) FROM public.accounting_profiles p JOIN public.accounting_profile_versions v ON v.profile_id=p.id AND v.version=p.current_version) current_profiles,
(SELECT jsonb_agg(jsonb_build_object('role',role,'active',is_active,'count',n)) FROM(SELECT role,is_active,count(*)::text n FROM public.app_users GROUP BY 1,2)x) user_roles) q) AS exceptions,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text AS observation_at,
(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT q.status,count(*)::text count,COALESCE(sum(q.grand_total),0)::text grand_total FROM public.quotations q WHERE NOT q.is_deleted AND q.superseded_by_quotation_id IS NULL GROUP BY q.status)x) current_quotations,
(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT (s.deleted_at IS NOT NULL) service_deleted,count(*)::text count,sum(b.accepted_grand_total)::text amount FROM public.approved_billing_scopes b JOIN public.services s ON s.id=b.service_id WHERE b.status='approved' AND b.superseded_by_scope_id IS NULL GROUP BY 1)x) current_abs,
(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT i.status,count(*)::text count,sum(i.grand_total)::text total,sum(i.amount_paid)::text paid_cache,sum(i.balance_due)::text due_cache FROM public.invoices i WHERE NOT i.is_deleted AND i.deleted_at IS NULL GROUP BY i.status)x) invoice_status_totals,
(SELECT jsonb_build_object('issued_gross',COALESCE(sum(b.gross_issued_amount),0)::text,'credit_adjustment',COALESCE(sum(b.credit_adjustment_amount),0)::text,'allocated',COALESCE(sum(b.settled_amount),0)::text,'credit_application',COALESCE(sum(b.credit_application_amount),0)::text,'net_receivable',COALESCE(sum(b.net_receivable_amount),0)::text,'outstanding',COALESCE(sum(b.outstanding_amount),0)::text) FROM public.customer_invoice_receivable_balances b JOIN public.invoices i ON i.id=b.invoice_id WHERE NOT i.is_deleted AND i.deleted_at IS NULL AND i.status IN ('sent','partially_paid','paid')) issued_receivables,
(SELECT jsonb_build_object('confirmed_payments',COALESCE(sum(p.amount),0)::text,'legacy_invoice_bound',COALESCE(sum(p.amount) FILTER(WHERE p.invoice_id IS NOT NULL),0)::text,'unbound_receipts',COALESCE(sum(p.amount) FILTER(WHERE p.invoice_id IS NULL),0)::text) FROM public.payments p WHERE NOT p.is_deleted AND p.status='confirmed' AND NOT EXISTS(SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id=p.id)) customer_cash,
(SELECT jsonb_build_object('effective_allocations',COALESCE(sum(a.amount),0)::text) FROM public.customer_receipt_allocations a WHERE NOT EXISTS(SELECT 1 FROM public.customer_receipt_allocation_reversals r WHERE r.allocation_id=a.id) AND NOT EXISTS(SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id=a.payment_id)) cash_allocations,
(SELECT jsonb_build_object('approved_amount',COALESCE(sum(e.amount) FILTER(WHERE e.status='approved'),0)::text,'submitted_amount',COALESCE(sum(e.amount) FILTER(WHERE e.status='submitted'),0)::text,'approved_remaining_unsettled',COALESCE(sum(e.remaining_unsettled_amount) FILTER(WHERE e.status='approved'),0)::text,'approved_petty_cash_settled',COALESCE(sum(e.petty_cash_allocated_amount) FILTER(WHERE e.status='approved'),0)::text) FROM public.expense_accountability_summaries e) expenses,
(SELECT jsonb_build_object('debit_halalah',COALESCE(sum(l.amount_halalah) FILTER(WHERE l.side='DEBIT'),0)::text,'credit_halalah',COALESCE(sum(l.amount_halalah) FILTER(WHERE l.side='CREDIT'),0)::text,'posted_journals',count(DISTINCT v.journal_id)::text) FROM public.accounting_journals j JOIN public.accounting_journal_versions v ON v.journal_id=j.id AND v.version=j.current_version JOIN public.accounting_journal_line_versions l ON l.journal_id=v.journal_id AND l.journal_version=v.version WHERE v.status='POSTED') posted_ledger,
(SELECT COALESCE(sum(q.grand_total),0)::text FROM public.quotations q JOIN public.services s ON s.id=q.service_id WHERE s.deleted_at IS NOT NULL AND q.status='approved' AND NOT q.is_deleted AND q.superseded_by_quotation_id IS NULL) deleted_service_quote_exposure,
(SELECT COALESCE(sum(q.grand_total),0)::text FROM public.quotations q WHERE q.status='approved' AND NOT q.is_deleted AND q.superseded_by_quotation_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes b WHERE b.source_quotation_id=q.id AND b.status='approved' AND b.superseded_by_scope_id IS NULL)) missing_abs_exposure,
(SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT v.version,v.created_at,v.activation_state FROM public.accounting_profile_versions v ORDER BY v.version)x) profile_history) q) AS money,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text observation_at,(SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT 'active_services_missing_lifecycle' invariant,(SELECT count(*) FROM services s LEFT JOIN service_lifecycle_states l ON l.service_id=s.id WHERE s.deleted_at IS NULL AND l.service_id IS NULL)::text violations
UNION ALL
SELECT 'lifecycle_legacy_status_mismatch' invariant,(SELECT count(*) FROM services s JOIN service_lifecycle_states l ON l.service_id=s.id WHERE s.status<>l.legacy_status)::text violations
UNION ALL
SELECT 'negative_lifecycle_version' invariant,(SELECT count(*) FROM service_lifecycle_states WHERE state_version<0)::text violations
UNION ALL
SELECT 'current_approved_quotation_duplicates' invariant,(SELECT count(*) FROM(SELECT service_id FROM quotations WHERE status='approved' AND NOT is_deleted AND superseded_by_quotation_id IS NULL GROUP BY service_id HAVING count(*)>1)x)::text violations
UNION ALL
SELECT 'current_abs_duplicates' invariant,(SELECT count(*) FROM(SELECT service_id FROM approved_billing_scopes WHERE status='approved' AND superseded_by_scope_id IS NULL GROUP BY service_id HAVING count(*)>1)x)::text violations
UNION ALL
SELECT 'quotation_header_arithmetic' invariant,(SELECT count(*) FROM quotations WHERE grand_total<>round(subtotal-discount+vat_amount,2))::text violations
UNION ALL
SELECT 'abs_header_line_total' invariant,(SELECT count(*) FROM approved_billing_scopes b WHERE b.accepted_grand_total<>(SELECT COALESCE(sum(i.accepted_grand_total),0) FROM approved_billing_scope_items i WHERE i.approved_billing_scope_id=b.id))::text violations
UNION ALL
SELECT 'abs_source_quotation_snapshot_total' invariant,(SELECT count(*) FROM approved_billing_scopes b JOIN quotations q ON q.id=b.source_quotation_id WHERE b.source_quotation_grand_total<>q.grand_total)::text violations
UNION ALL
SELECT 'quotation_service_customer_mismatch' invariant,(SELECT count(*) FROM quotations q JOIN services s ON s.id=q.service_id WHERE q.customer_id<>s.customer_id)::text violations
UNION ALL
SELECT 'invoice_service_customer_mismatch' invariant,(SELECT count(*) FROM invoices i JOIN services s ON s.id=i.service_id WHERE i.customer_id<>s.customer_id)::text violations
UNION ALL
SELECT 'invoice_abs_service_mismatch' invariant,(SELECT count(*) FROM invoices i JOIN approved_billing_scopes b ON b.id=i.approved_billing_scope_id WHERE i.service_id<>b.service_id)::text violations
UNION ALL
SELECT 'invoice_header_arithmetic' invariant,(SELECT count(*) FROM invoices WHERE grand_total<>round(subtotal+vat_amount,2) OR balance_due<>grand_total-amount_paid)::text violations
UNION ALL
SELECT 'invoice_paid_cache_vs_effective_allocation' invariant,(SELECT count(*) FROM customer_invoice_settlement_balances WHERE invoice_amount_paid<>allocated_amount)::text violations
UNION ALL
SELECT 'receipt_commitment_party_mismatch' invariant,(SELECT count(*) FROM service_receipts r JOIN approved_commitments c ON c.id=r.commitment_id WHERE r.service_id<>c.service_id OR r.supplier_id<>c.supplier_id)::text violations
UNION ALL
SELECT 'bill_receipt_party_mismatch' invariant,(SELECT count(*) FROM supplier_bills b JOIN service_receipts r ON r.id=b.service_receipt_id WHERE b.service_id<>r.service_id OR b.supplier_id<>r.supplier_id)::text violations
UNION ALL
SELECT 'customer_allocation_party_mismatch' invariant,(SELECT count(*) FROM customer_receipt_allocations a JOIN payments p ON p.id=a.payment_id JOIN invoices i ON i.id=a.invoice_id WHERE a.customer_id<>p.customer_id OR a.customer_id<>i.customer_id)::text violations
UNION ALL
SELECT 'advance_balance_equation' invariant,(SELECT count(*) FROM employee_cash_advances WHERE remaining_balance<>amount_issued-amount_returned-amount_spent_settled)::text violations
UNION ALL
SELECT 'active_deposit_duplicates' invariant,(SELECT count(*) FROM(SELECT service_id FROM invoices WHERE invoice_type='deposit' AND status NOT IN('draft','void') AND NOT is_deleted GROUP BY service_id HAVING count(*)>1)x)::text violations
UNION ALL
SELECT 'service_deleted_time_missing' invariant,(SELECT count(*) FROM services WHERE deleted_at IS NOT NULL AND status IS NULL)::text violations)x) checks,(SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT 'customers' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='customer' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.customers t
UNION ALL
SELECT 'services' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='service' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.services t
UNION ALL
SELECT 'quotations' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='quotation' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.quotations t
UNION ALL
SELECT 'approved_billing_scopes' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='approved_billing_scope' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.approved_billing_scopes t
UNION ALL
SELECT 'invoices' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='invoice' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.invoices t
UNION ALL
SELECT 'approved_commitments' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='approved_commitment' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.approved_commitments t
UNION ALL
SELECT 'service_receipts' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='service_receipt' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.service_receipts t
UNION ALL
SELECT 'expenses' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='expense' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.expenses t
UNION ALL
SELECT 'employee_cash_advances' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='employee_cash_advance' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.employee_cash_advances t
UNION ALL
SELECT 'supplier_bills' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='supplier_bill' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.supplier_bills t
UNION ALL
SELECT 'supplier_payments' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='supplier_payment' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.supplier_payments t
UNION ALL
SELECT 'supplier_advances' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='supplier_advance' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.supplier_advances t
UNION ALL
SELECT 'customer_internal_credit_adjustments' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='customer_internal_credit_adjustment' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.customer_internal_credit_adjustments t
UNION ALL
SELECT 'customer_refunds' relation,count(*)::text rows,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_type='customer_refund' AND a.entity_id::text=t.id::text))::text with_any_entity_audit FROM public.customer_refunds t)x) audit_coverage,(SELECT jsonb_agg(jsonb_build_object('type',transaction_type,'amount',amount::text,'before',balance_before::text,'after',balance_after::text)) FROM petty_cash_transactions) petty_cash_movements) q) AS domain_checks,
(SELECT to_jsonb(q) FROM (WITH f AS(SELECT 'accounting_account_versions' AS relation,'accounting_account_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_account_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_account_versions' AS relation,'accounting_account_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_account_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_account_versions' AS relation,'accounting_account_versions_identity_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_account_versions c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts p WHERE c.profile_id=p.profile_id AND c.account_id=p.id)
UNION ALL
SELECT 'accounting_account_versions' AS relation,'accounting_account_versions_parent_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_account_versions c WHERE c.profile_id IS NOT NULL AND c.parent_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts p WHERE c.profile_id=p.profile_id AND c.parent_account_id=p.id)
UNION ALL
SELECT 'accounting_account_versions' AS relation,'accounting_account_versions_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_account_versions c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_accounts' AS relation,'accounting_accounts_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_accounts c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.id=p.account_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_accounts' AS relation,'accounting_accounts_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_accounts c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_ve_profile_id_cash_account_id_c_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.cash_account_id IS NOT NULL AND c.cash_account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.cash_account_id=p.account_id AND c.cash_account_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_ve_profile_id_event_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.bill_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_profile_id_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_events p WHERE c.profile_id=p.profile_id AND c.event_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_receipt_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.receipt_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,'accounting_ap_bridge_event_versions_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_events' AS relation,'accounting_ap_bridge_events_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_events c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.id=p.event_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_events' AS relation,'accounting_ap_bridge_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal__profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal__profile_id_journal_id_journa_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.journal_version IS NOT NULL AND c.line_number IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_line_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.journal_version=p.journal_version AND c.line_number=p.line_number)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_lines_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_lines_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.bill_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_lines_receipt_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.receipt_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_lines_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_lines_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,'accounting_ap_bridge_journal_profile_id_event_id_event_ve_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal__profile_id_event_id_event_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal__profile_id_journal_id_prepar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.prepared_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.prepared_version=p.version)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.bill_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_receipt_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.receipt_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_source_effect_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.source_effect_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects p WHERE c.source_effect_id=p.id)
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,'accounting_ap_bridge_journal_links_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_ve_profile_id_event_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_profile_id_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_events p WHERE c.profile_id=p.profile_id AND c.event_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,'accounting_ar_bridge_event_versions_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_events' AS relation,'accounting_ar_bridge_events_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_events c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.id=p.event_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_events' AS relation,'accounting_ar_bridge_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal__profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal__profile_id_journal_id_journa_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.journal_version IS NOT NULL AND c.line_number IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_line_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.journal_version=p.journal_version AND c.line_number=p.line_number)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal_lines_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal_lines_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal_lines_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,'accounting_ar_bridge_journal_profile_id_event_id_event_ve_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal__profile_id_event_id_event_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal__profile_id_journal_id_prepar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.prepared_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.prepared_version=p.version)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal_links_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal_links_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal_links_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,'accounting_ar_bridge_journal_links_source_effect_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links c WHERE c.source_effect_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects p WHERE c.source_effect_id=p.id)
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,'accounting_bank_binding_revie_profile_id_binding_id_bindin_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_reviews c WHERE c.profile_id IS NOT NULL AND c.binding_id IS NOT NULL AND c.binding_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions p WHERE c.profile_id=p.profile_id AND c.binding_id=p.binding_id AND c.binding_version=p.version)
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,'accounting_bank_binding_reviews_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_reviews c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,'accounting_bank_binding_reviews_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versi_profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versi_profile_id_binding_id_previo_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.profile_id IS NOT NULL AND c.binding_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions p WHERE c.profile_id=p.profile_id AND c.binding_id=p.binding_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versions_prepared_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.prepared_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.prepared_by=p.id)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versions_profile_id_binding_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.profile_id IS NOT NULL AND c.binding_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_bindings p WHERE c.profile_id=p.profile_id AND c.binding_id=p.id)
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,'accounting_bank_binding_versions_reviewed_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_binding_versions c WHERE c.reviewed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewed_by=p.id)
UNION ALL
SELECT 'accounting_bank_bindings' AS relation,'accounting_bank_bindings_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_bindings c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions p WHERE c.profile_id=p.profile_id AND c.id=p.binding_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_bank_bindings' AS relation,'accounting_bank_bindings_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_bindings c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,'accounting_bank_reconciliatio_profile_id_group_id_group_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_allocations c WHERE c.profile_id IS NOT NULL AND c.group_id IS NOT NULL AND c.group_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_group_versions p WHERE c.profile_id=p.profile_id AND c.group_id=p.group_id AND c.group_version=p.version)
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,'accounting_bank_reconciliatio_profile_id_ledger_journal_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_allocations c WHERE c.profile_id IS NOT NULL AND c.ledger_journal_id IS NOT NULL AND c.ledger_journal_version IS NOT NULL AND c.ledger_line_number IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_line_versions p WHERE c.profile_id=p.profile_id AND c.ledger_journal_id=p.journal_id AND c.ledger_journal_version=p.journal_version AND c.ledger_line_number=p.line_number)
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,'accounting_bank_reconciliatio_profile_id_statement_line_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_allocations c WHERE c.profile_id IS NOT NULL AND c.statement_line_id IS NOT NULL AND c.statement_line_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_line_versions p WHERE c.profile_id=p.profile_id AND c.statement_line_id=p.line_id AND c.statement_line_version=p.version)
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'accounting_bank_reconciliatio_profile_id_binding_id_bindin_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions c WHERE c.profile_id IS NOT NULL AND c.binding_id IS NOT NULL AND c.binding_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions p WHERE c.profile_id=p.profile_id AND c.binding_id=p.binding_id AND c.binding_version=p.version)
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'accounting_bank_reconciliatio_profile_id_group_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions c WHERE c.profile_id IS NOT NULL AND c.group_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_group_versions p WHERE c.profile_id=p.profile_id AND c.group_id=p.group_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'accounting_bank_reconciliation_group_v_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'accounting_bank_reconciliation_group_v_profile_id_group_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions c WHERE c.profile_id IS NOT NULL AND c.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_groups p WHERE c.profile_id=p.profile_id AND c.group_id=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,'accounting_bank_reconciliation_group_versions_prepared_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions c WHERE c.prepared_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.prepared_by=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_groups' AS relation,'accounting_bank_reconciliation_groups_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_groups c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,'accounting_bank_reconciliati_profile_id_group_id_group_ve_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_reviews c WHERE c.profile_id IS NOT NULL AND c.group_id IS NOT NULL AND c.group_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_group_versions p WHERE c.profile_id=p.profile_id AND c.group_id=p.group_id AND c.group_version=p.version)
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,'accounting_bank_reconciliation_reviews_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_reviews c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,'accounting_bank_reconciliation_reviews_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_reconciliation_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'accounting_bank_statement_bat_profile_id_batch_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions c WHERE c.profile_id IS NOT NULL AND c.batch_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions p WHERE c.profile_id=p.profile_id AND c.batch_id=p.batch_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'accounting_bank_statement_bat_profile_id_binding_id_bindin_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions c WHERE c.profile_id IS NOT NULL AND c.binding_id IS NOT NULL AND c.binding_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions p WHERE c.profile_id=p.profile_id AND c.binding_id=p.binding_id AND c.binding_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'accounting_bank_statement_batch_versio_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'accounting_bank_statement_batch_versio_profile_id_batch_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions c WHERE c.profile_id IS NOT NULL AND c.batch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batches p WHERE c.profile_id=p.profile_id AND c.batch_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,'accounting_bank_statement_batch_versions_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'accounting_bank_statement_batches' AS relation,'accounting_bank_statement_batches_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batches c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions p WHERE c.profile_id=p.profile_id AND c.id=p.batch_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_batches' AS relation,'accounting_bank_statement_batches_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_batches c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'accounting_bank_statement_lin_profile_id_batch_id_batch_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions c WHERE c.profile_id IS NOT NULL AND c.batch_id IS NOT NULL AND c.batch_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions p WHERE c.profile_id=p.profile_id AND c.batch_id=p.batch_id AND c.batch_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'accounting_bank_statement_lin_profile_id_line_id_previous__fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions c WHERE c.profile_id IS NOT NULL AND c.line_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_line_versions p WHERE c.profile_id=p.profile_id AND c.line_id=p.line_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'accounting_bank_statement_line_version_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'accounting_bank_statement_line_versions_profile_id_line_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions c WHERE c.profile_id IS NOT NULL AND c.line_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_lines p WHERE c.profile_id=p.profile_id AND c.line_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,'accounting_bank_statement_line_versions_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,'accounting_bank_statement_lines_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_lines c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_line_versions p WHERE c.profile_id=p.profile_id AND c.id=p.line_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,'accounting_bank_statement_lines_profile_id_batch_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_lines c WHERE c.profile_id IS NOT NULL AND c.batch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batches p WHERE c.profile_id=p.profile_id AND c.batch_id=p.id)
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,'accounting_bank_statement_lines_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_bank_statement_lines c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_capability_events' AS relation,'accounting_capability_events_actor_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_capability_events c WHERE c.actor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.actor_user_id=p.id)
UNION ALL
SELECT 'accounting_capability_events' AS relation,'accounting_capability_events_capability_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_capability_events c WHERE c.capability IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog p WHERE c.capability=p.capability)
UNION ALL
SELECT 'accounting_capability_events' AS relation,'accounting_capability_events_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_capability_events c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_capability_events' AS relation,'accounting_capability_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_capability_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_capability_events' AS relation,'accounting_capability_events_target_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_capability_events c WHERE c.target_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.target_user_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_eve_profile_id_advance_account_i_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.advance_account_id IS NOT NULL AND c.advance_account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.advance_account_id=p.account_id AND c.advance_account_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_eve_profile_id_cash_account_id_c_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.cash_account_id IS NOT NULL AND c.cash_account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.cash_account_id=p.account_id AND c.cash_account_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_eve_profile_id_control_account_i_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.control_account_id IS NOT NULL AND c.control_account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.control_account_id=p.account_id AND c.control_account_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_eve_profile_id_event_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_eve_profile_id_expense_account_i_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.expense_account_id IS NOT NULL AND c.expense_account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.expense_account_id=p.account_id AND c.expense_account_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versio_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versio_profile_id_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_events p WHERE c.profile_id=p.profile_id AND c.event_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_version_related_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.related_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.related_advance_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_employee_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.employee_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_fund_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.fund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds p WHERE c.fund_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,'accounting_expense_bridge_event_versions_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_events' AS relation,'accounting_expense_bridge_events_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_events c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.id=p.event_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_events' AS relation,'accounting_expense_bridge_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_jo_profile_id_event_id_event_ve_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_jou_profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_jou_profile_id_journal_id_journa_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.journal_version IS NOT NULL AND c.line_number IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_line_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.journal_version=p.journal_version AND c.line_number=p.line_number)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_journal_lines_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_journal_lines_employee_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.employee_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_journal_lines_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_journal_lines_fund_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.fund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds p WHERE c.fund_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,'accounting_expense_bridge_journal_lines_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_jou_profile_id_event_id_event_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.event_id IS NOT NULL AND c.event_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions p WHERE c.profile_id=p.profile_id AND c.event_id=p.event_id AND c.event_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_jou_profile_id_journal_id_prepar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.prepared_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.prepared_version=p.version)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.advance_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_employee_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.employee_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_fund_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.fund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds p WHERE c.fund_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,'accounting_expense_bridge_journal_links_source_effect_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links c WHERE c.source_effect_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects p WHERE c.source_effect_id=p.id)
UNION ALL
SELECT 'accounting_foundation_events' AS relation,'accounting_foundation_events_actor_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_foundation_events c WHERE c.actor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.actor_user_id=p.id)
UNION ALL
SELECT 'accounting_foundation_events' AS relation,'accounting_foundation_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_foundation_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,'accounting_inception_acceptan_profile_id_package_id_packag_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_acceptances c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.package_version=p.version)
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,'accounting_inception_acceptances_accepted_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_acceptances c WHERE c.accepted_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.accepted_by=p.id)
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,'accounting_inception_acceptances_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_acceptances c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_inception_coverage' AS relation,'accounting_inception_coverage_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions p WHERE c.profile_id=p.profile_id AND c.id=p.coverage_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_inception_coverage' AS relation,'accounting_inception_coverage_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'accounting_inception_coverage_profile_id_coverage_id_previ_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage_versions c WHERE c.profile_id IS NOT NULL AND c.coverage_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions p WHERE c.profile_id=p.profile_id AND c.coverage_id=p.coverage_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'accounting_inception_coverage_profile_id_package_id_packag_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage_versions c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.package_version=p.version)
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'accounting_inception_coverage_versi_profile_id_coverage_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage_versions c WHERE c.profile_id IS NOT NULL AND c.coverage_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_coverage p WHERE c.profile_id=p.profile_id AND c.coverage_id=p.id)
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'accounting_inception_coverage_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,'accounting_inception_coverage_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_coverage_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,'accounting_inception_journal__profile_id_journal_id_prepar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_journal_links c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.prepared_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.prepared_version=p.version)
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,'accounting_inception_journal__profile_id_package_id_packag_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_journal_links c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.package_version=p.version)
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,'accounting_inception_journal_links_prepared_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_journal_links c WHERE c.prepared_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.prepared_by=p.id)
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,'accounting_inception_mapping__profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,'accounting_inception_mapping__profile_id_package_id_packag_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.package_version=p.version)
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,'accounting_inception_mapping_authorizatio_preparer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations c WHERE c.preparer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.preparer_user_id=p.id)
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,'accounting_inception_mapping_authorizatio_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,'accounting_inception_package__profile_id_package_id_previo_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_package_versions c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,'accounting_inception_package_version_profile_id_package_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_package_versions c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_packages p WHERE c.profile_id=p.profile_id AND c.package_id=p.id)
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,'accounting_inception_package_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_package_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,'accounting_inception_package_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_package_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_inception_packages' AS relation,'accounting_inception_packages_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_packages c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.id=p.package_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_inception_packages' AS relation,'accounting_inception_packages_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_packages c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,'accounting_inception_reviews_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_reviews c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,'accounting_inception_reviews_profile_id_package_id_package_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_reviews c WHERE c.profile_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions p WHERE c.profile_id=p.profile_id AND c.package_id=p.package_id AND c.package_version=p.version)
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,'accounting_inception_reviews_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_inception_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_actor_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.actor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.actor_user_id=p.id)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_profile_id_journal_id_entity_ver_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.entity_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.entity_version=p.version)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_profile_id_journal_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.journal_id=p.id)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_profile_id_posting_rule_id_entit_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND c.entity_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.posting_rule_id AND c.entity_version=p.version)
UNION ALL
SELECT 'accounting_journal_events' AS relation,'accounting_journal_events_profile_id_posting_rule_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_events c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rules p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.id)
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,'accounting_journal_line_versi_profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_line_versions c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,'accounting_journal_line_versi_profile_id_journal_id_journa_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_line_versions c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.journal_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.journal_version=p.version)
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,'accounting_journal_line_versi_profile_id_posting_rule_id_r_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_line_versions c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND c.rule_version IS NOT NULL AND c.mapping_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_mappings p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.posting_rule_id AND c.rule_version=p.rule_version AND c.mapping_key=p.mapping_key)
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,'accounting_journal_line_versions_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_line_versions c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_posted_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.posted_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.posted_by=p.id)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_prepared_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.prepared_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.prepared_by=p.id)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_profile_id_journal_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.journal_id=p.id)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_profile_id_journal_id_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_profile_id_period_id_period_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND c.period_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_period_versions p WHERE c.profile_id=p.profile_id AND c.period_id=p.period_id AND c.period_version=p.version)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_profile_id_posting_rule_id_rul_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND c.rule_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.posting_rule_id AND c.rule_version=p.version)
UNION ALL
SELECT 'accounting_journal_versions' AS relation,'accounting_journal_versions_profile_id_reversal_of_journal_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journal_versions c WHERE c.profile_id IS NOT NULL AND c.reversal_of_journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.reversal_of_journal_id=p.id)
UNION ALL
SELECT 'accounting_journals' AS relation,'accounting_journals_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journals c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.id=p.journal_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_journals' AS relation,'accounting_journals_profile_id_correction_group_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journals c WHERE c.profile_id IS NOT NULL AND c.correction_group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.correction_group_id=p.id)
UNION ALL
SELECT 'accounting_journals' AS relation,'accounting_journals_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journals c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_journals' AS relation,'accounting_journals_profile_id_reversal_of_journal_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_journals c WHERE c.profile_id IS NOT NULL AND c.reversal_of_journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.reversal_of_journal_id=p.id)
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,'accounting_period_close_packages_identity_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_packages c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_periods p WHERE c.profile_id=p.profile_id AND c.period_id=p.id)
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,'accounting_period_close_packages_preparer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_packages c WHERE c.preparer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.preparer_user_id=p.id)
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,'accounting_period_close_packages_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_packages c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND c.previous_package_id IS NOT NULL AND c.previous_package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_period_close_packages p WHERE c.profile_id=p.profile_id AND c.period_id=p.period_id AND c.previous_package_id=p.id AND c.previous_package_version=p.package_version)
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,'accounting_period_close_packages_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_packages c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,'accounting_period_close_reviews_package_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_reviews c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND c.package_id IS NOT NULL AND c.package_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_period_close_packages p WHERE c.profile_id=p.profile_id AND c.period_id=p.period_id AND c.package_id=p.id AND c.package_version=p.package_version)
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,'accounting_period_close_reviews_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_reviews c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,'accounting_period_close_reviews_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_close_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_period_versions' AS relation,'accounting_period_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_period_versions' AS relation,'accounting_period_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_period_versions' AS relation,'accounting_period_versions_identity_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_versions c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_periods p WHERE c.profile_id=p.profile_id AND c.period_id=p.id)
UNION ALL
SELECT 'accounting_period_versions' AS relation,'accounting_period_versions_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_period_versions c WHERE c.profile_id IS NOT NULL AND c.period_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_period_versions p WHERE c.profile_id=p.profile_id AND c.period_id=p.period_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_periods' AS relation,'accounting_periods_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_periods c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_period_versions p WHERE c.profile_id=p.profile_id AND c.id=p.period_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_periods' AS relation,'accounting_periods_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_periods c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_posting_rule_mappings' AS relation,'accounting_posting_rule_mappi_profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_mappings c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_posting_rule_mappings' AS relation,'accounting_posting_rule_mappi_profile_id_posting_rule_id_r_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_mappings c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND c.rule_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.posting_rule_id AND c.rule_version=p.version)
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,'accounting_posting_rule_versi_profile_id_posting_rule_id_p_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_versions c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.posting_rule_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,'accounting_posting_rule_version_profile_id_posting_rule_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_versions c WHERE c.profile_id IS NOT NULL AND c.posting_rule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rules p WHERE c.profile_id=p.profile_id AND c.posting_rule_id=p.id)
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,'accounting_posting_rule_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,'accounting_posting_rule_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rule_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_posting_rules' AS relation,'accounting_posting_rules_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rules c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions p WHERE c.profile_id=p.profile_id AND c.id=p.posting_rule_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_posting_rules' AS relation,'accounting_posting_rules_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_posting_rules c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_profile_versions' AS relation,'accounting_profile_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profile_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_profile_versions' AS relation,'accounting_profile_versions_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profile_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_profile_versions' AS relation,'accounting_profile_versions_previous_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profile_versions c WHERE c.profile_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profile_versions p WHERE c.profile_id=p.profile_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_profile_versions' AS relation,'accounting_profile_versions_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profile_versions c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_profiles' AS relation,'accounting_profiles_company_settings_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profiles c WHERE c.company_settings_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.company_settings p WHERE c.company_settings_id=p.id)
UNION ALL
SELECT 'accounting_profiles' AS relation,'accounting_profiles_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_profiles c WHERE c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profile_versions p WHERE c.id=p.profile_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,'accounting_revenue_arrangemen_profile_id_arrangement_id_ar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_reviews c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND c.arrangement_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_versions p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.arrangement_id AND c.arrangement_version=p.version)
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,'accounting_revenue_arrangement_reviews_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_reviews c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,'accounting_revenue_arrangement_reviews_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'accounting_revenue_arrangemen_profile_id_arrangement_id_pr_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_versions p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.arrangement_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'accounting_revenue_arrangemen_profile_id_supersedes_arrang_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions c WHERE c.profile_id IS NOT NULL AND c.supersedes_arrangement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangements p WHERE c.profile_id=p.profile_id AND c.supersedes_arrangement_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'accounting_revenue_arrangement_v_profile_id_arrangement_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangements p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'accounting_revenue_arrangement_version_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,'accounting_revenue_arrangement_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,'accounting_revenue_arrangements_approved_billing_scope_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangements c WHERE c.approved_billing_scope_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.approved_billing_scope_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,'accounting_revenue_arrangements_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangements c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,'accounting_revenue_arrangements_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangements c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,'accounting_revenue_arrangements_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_arrangements c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence' AS relation,'accounting_revenue_performance_e_profile_id_arrangement_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangements p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence' AS relation,'accounting_revenue_performance_evidence_profile_id_unit_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence c WHERE c.profile_id IS NOT NULL AND c.unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_units p WHERE c.profile_id=p.profile_id AND c.unit_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,'accounting_revenue_performanc_profile_id_evidence_id_evide_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_reviews c WHERE c.profile_id IS NOT NULL AND c.evidence_id IS NOT NULL AND c.evidence_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence_versions p WHERE c.profile_id=p.profile_id AND c.evidence_id=p.evidence_id AND c.evidence_version=p.version)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,'accounting_revenue_performance_eviden_foundation_event_id_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_reviews c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,'accounting_revenue_performance_evidence_r_reviewer_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_reviews c WHERE c.reviewer_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reviewer_user_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performan_profile_id_arrangement_id_ar_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND c.arrangement_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_versions p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.arrangement_id AND c.arrangement_version=p.version)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performanc_profile_id_evidence_id_previ_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.profile_id IS NOT NULL AND c.evidence_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence_versions p WHERE c.profile_id=p.profile_id AND c.evidence_id=p.evidence_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performance_evid_profile_id_evidence_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.profile_id IS NOT NULL AND c.evidence_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence p WHERE c.profile_id=p.profile_id AND c.evidence_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performance_evidenc_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performance_evidenc_profile_id_unit_id_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.profile_id IS NOT NULL AND c.unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_units p WHERE c.profile_id=p.profile_id AND c.unit_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,'accounting_revenue_performance_evidence_version_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,'accounting_revenue_performanc_profile_id_arrangement_id_ar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND c.arrangement_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_versions p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.arrangement_id AND c.arrangement_version=p.version)
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,'accounting_revenue_performance_unit_ve_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,'accounting_revenue_performance_unit_ver_profile_id_unit_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions c WHERE c.profile_id IS NOT NULL AND c.unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_units p WHERE c.profile_id=p.profile_id AND c.unit_id=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,'accounting_revenue_performance_unit_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'accounting_revenue_performance_units' AS relation,'accounting_revenue_performance_u_profile_id_arrangement_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_performance_units c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangements p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognitio_profile_id_arrangement_id_ar_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.profile_id IS NOT NULL AND c.arrangement_id IS NOT NULL AND c.arrangement_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_versions p WHERE c.profile_id=p.profile_id AND c.arrangement_id=p.arrangement_id AND c.arrangement_version=p.version)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognitio_profile_id_correction_of_rec_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.profile_id IS NOT NULL AND c.correction_of_recognition_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events p WHERE c.profile_id=p.profile_id AND c.correction_of_recognition_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognitio_profile_id_evidence_id_evide_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.profile_id IS NOT NULL AND c.evidence_id IS NOT NULL AND c.evidence_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence_versions p WHERE c.profile_id=p.profile_id AND c.evidence_id=p.evidence_id AND c.evidence_version=p.version)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognition_events_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognition_events_foundation_event_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.foundation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events p WHERE c.foundation_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognition_events_prepared_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.prepared_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.prepared_by=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognition_events_profile_id_unit_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.profile_id IS NOT NULL AND c.unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_units p WHERE c.profile_id=p.profile_id AND c.unit_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,'accounting_revenue_recognition_events_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_events c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_journal_lines' AS relation,'accounting_revenue_recogniti_profile_id_recognition_event_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_lines c WHERE c.profile_id IS NOT NULL AND c.recognition_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events p WHERE c.profile_id=p.profile_id AND c.recognition_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_journal_lines' AS relation,'accounting_revenue_recognition_jour_profile_id_journal_id_fkey1' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_lines c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.journal_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,'accounting_revenue_recognitio_profile_id_recognition_event_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_links c WHERE c.profile_id IS NOT NULL AND c.recognition_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events p WHERE c.profile_id=p.profile_id AND c.recognition_event_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,'accounting_revenue_recognition_journ_profile_id_journal_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_links c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journals p WHERE c.profile_id=p.profile_id AND c.journal_id=p.id)
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,'accounting_revenue_recognition_journal_li_source_effect_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_links c WHERE c.source_effect_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects p WHERE c.source_effect_id=p.id)
UNION ALL
SELECT 'accounting_source_effects' AS relation,'accounting_source_effects_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_source_effects c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_source_effects' AS relation,'accounting_source_effects_profile_id_journal_id_journal_ve_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_source_effects c WHERE c.profile_id IS NOT NULL AND c.journal_id IS NOT NULL AND c.journal_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions p WHERE c.profile_id=p.profile_id AND c.journal_id=p.journal_id AND c.journal_version=p.version)
UNION ALL
SELECT 'accounting_statement_mapping_entries' AS relation,'accounting_statement_mapping__profile_id_account_id_accoun_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_entries c WHERE c.profile_id IS NOT NULL AND c.account_id IS NOT NULL AND c.account_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions p WHERE c.profile_id=p.profile_id AND c.account_id=p.account_id AND c.account_version=p.version)
UNION ALL
SELECT 'accounting_statement_mapping_entries' AS relation,'accounting_statement_mapping__profile_id_mapping_set_id_ma_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_entries c WHERE c.profile_id IS NOT NULL AND c.mapping_set_id IS NOT NULL AND c.mapping_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_statement_mapping_versions p WHERE c.profile_id=p.profile_id AND c.mapping_set_id=p.mapping_set_id AND c.mapping_version=p.version)
UNION ALL
SELECT 'accounting_statement_mapping_sets' AS relation,'accounting_statement_mapping_sets_current_version_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_sets c WHERE c.profile_id IS NOT NULL AND c.id IS NOT NULL AND c.current_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_statement_mapping_versions p WHERE c.profile_id=p.profile_id AND c.id=p.mapping_set_id AND c.current_version=p.version)
UNION ALL
SELECT 'accounting_statement_mapping_sets' AS relation,'accounting_statement_mapping_sets_profile_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_sets c WHERE c.profile_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE c.profile_id=p.id)
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,'accounting_statement_mapping__profile_id_mapping_set_id_pr_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_versions c WHERE c.profile_id IS NOT NULL AND c.mapping_set_id IS NOT NULL AND c.previous_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_statement_mapping_versions p WHERE c.profile_id=p.profile_id AND c.mapping_set_id=p.mapping_set_id AND c.previous_version=p.version)
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,'accounting_statement_mapping_ver_profile_id_mapping_set_id_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_versions c WHERE c.profile_id IS NOT NULL AND c.mapping_set_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounting_statement_mapping_sets p WHERE c.profile_id=p.profile_id AND c.mapping_set_id=p.id)
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,'accounting_statement_mapping_versions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.accounting_statement_mapping_versions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'app_user_permission_overrides' AS relation,'app_user_permission_overrides_user_fkey' AS invariant,count(*)::text AS violations FROM public.app_user_permission_overrides c WHERE c.user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.user_id=p.id)
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,'approved_billing_scope_items_approved_billing_scope_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scope_items c WHERE c.approved_billing_scope_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.approved_billing_scope_id=p.id)
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,'approved_billing_scope_items_parent_source_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scope_items c WHERE c.approved_billing_scope_id IS NOT NULL AND c.source_quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.approved_billing_scope_id=p.id AND c.source_quotation_id=p.source_quotation_id)
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,'approved_billing_scope_items_source_item_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scope_items c WHERE c.source_quotation_item_id IS NOT NULL AND c.source_quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotation_items p WHERE c.source_quotation_item_id=p.id AND c.source_quotation_id=p.quotation_id)
UNION ALL
SELECT 'approved_billing_scopes' AS relation,'approved_billing_scopes_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scopes c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'approved_billing_scopes' AS relation,'approved_billing_scopes_source_quotation_service_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scopes c WHERE c.source_quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.source_quotation_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'approved_billing_scopes' AS relation,'approved_billing_scopes_superseded_by_scope_service_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scopes c WHERE c.superseded_by_scope_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.superseded_by_scope_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'approved_billing_scopes' AS relation,'approved_billing_scopes_supersedes_scope_service_fkey' AS invariant,count(*)::text AS violations FROM public.approved_billing_scopes c WHERE c.supersedes_scope_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.supersedes_scope_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'approved_commitment_amendments' AS relation,'approved_commitment_amendments_commitment_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitment_amendments c WHERE c.commitment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id)
UNION ALL
SELECT 'approved_commitment_documents' AS relation,'approved_commitment_documents_commitment_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitment_documents c WHERE c.commitment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id)
UNION ALL
SELECT 'approved_commitment_documents' AS relation,'approved_commitment_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitment_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'approved_commitments' AS relation,'approved_commitments_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitments c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'approved_commitments' AS relation,'approved_commitments_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitments c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'approved_commitments' AS relation,'approved_commitments_supplier_quotation_fkey' AS invariant,count(*)::text AS violations FROM public.approved_commitments c WHERE c.supplier_quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_quotations p WHERE c.supplier_quotation_id=p.id AND c.service_id=p.service_id AND c.supplier_id=p.supplier_id)
UNION ALL
SELECT 'business_document_links' AS relation,'business_document_links_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.business_document_links c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'business_document_links' AS relation,'business_document_links_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.business_document_links c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,'cash_advance_expense_settlements_cash_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.cash_advance_expense_settlements c WHERE c.cash_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.cash_advance_id=p.id)
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,'cash_advance_expense_settlements_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.cash_advance_expense_settlements c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,'cash_advance_expense_settlements_settled_by_fkey' AS invariant,count(*)::text AS violations FROM public.cash_advance_expense_settlements c WHERE c.settled_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.settled_by=p.id)
UNION ALL
SELECT 'cash_advance_returns' AS relation,'cash_advance_returns_cash_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.cash_advance_returns c WHERE c.cash_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.cash_advance_id=p.id)
UNION ALL
SELECT 'cash_advance_returns' AS relation,'cash_advance_returns_returned_by_fkey' AS invariant,count(*)::text AS violations FROM public.cash_advance_returns c WHERE c.returned_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.returned_by=p.id)
UNION ALL
SELECT 'customer_credit_application_reversals' AS relation,'customer_credit_application_reversal_source_application_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_credit_application_reversals c WHERE c.source_application_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_credit_applications p WHERE c.source_application_id=p.id)
UNION ALL
SELECT 'customer_credit_application_reversals' AS relation,'customer_credit_application_reversals_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_credit_application_reversals c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_credit_applications' AS relation,'customer_credit_applications_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_credit_applications c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_credit_applications' AS relation,'customer_credit_applications_source_credit_adjustment_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_credit_applications c WHERE c.source_credit_adjustment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_internal_credit_adjustments p WHERE c.source_credit_adjustment_id=p.id)
UNION ALL
SELECT 'customer_credit_applications' AS relation,'customer_credit_applications_target_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_credit_applications c WHERE c.target_invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.target_invoice_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustment_reversals' AS relation,'customer_internal_credit_adjus_source_credit_adjustment_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustment_reversals c WHERE c.source_credit_adjustment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_internal_credit_adjustments p WHERE c.source_credit_adjustment_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustment_reversals' AS relation,'customer_internal_credit_adjustment_reversals_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustment_reversals c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'customer_internal_credit_adjustments_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustments c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'customer_internal_credit_adjustments_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustments c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'customer_internal_credit_adjustments_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustments c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'customer_internal_credit_adjustments_source_scope_service_fkey' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustments c WHERE c.source_approved_billing_scope_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.source_approved_billing_scope_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,'customer_internal_credit_adjustments_successor_scope_service_fk' AS invariant,count(*)::text AS violations FROM public.customer_internal_credit_adjustments c WHERE c.successor_approved_billing_scope_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.successor_approved_billing_scope_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'customer_receipt_allocation_reversals' AS relation,'customer_receipt_allocation_reversals_allocation_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_receipt_allocation_reversals c WHERE c.allocation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_receipt_allocations p WHERE c.allocation_id=p.id)
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,'customer_receipt_allocations_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_receipt_allocations c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,'customer_receipt_allocations_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_receipt_allocations c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,'customer_receipt_allocations_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_receipt_allocations c WHERE c.payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE c.payment_id=p.id)
UNION ALL
SELECT 'customer_receipt_reversals' AS relation,'customer_receipt_reversals_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_receipt_reversals c WHERE c.payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE c.payment_id=p.id)
UNION ALL
SELECT 'customer_refund_reversals' AS relation,'customer_refund_reversals_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_refund_reversals c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_refund_reversals' AS relation,'customer_refund_reversals_source_refund_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_refund_reversals c WHERE c.source_refund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_refunds p WHERE c.source_refund_id=p.id)
UNION ALL
SELECT 'customer_refunds' AS relation,'customer_refunds_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_refunds c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'customer_refunds' AS relation,'customer_refunds_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_refunds c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'customer_refunds' AS relation,'customer_refunds_source_credit_adjustment_id_fkey' AS invariant,count(*)::text AS violations FROM public.customer_refunds c WHERE c.source_credit_adjustment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_internal_credit_adjustments p WHERE c.source_credit_adjustment_id=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_approved_by_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.approved_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.approved_by=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_cancelled_by_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.cancelled_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.cancelled_by=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_issued_by_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.issued_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.issued_by=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_recipient_id_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.recipient_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recipient_id=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_rejected_by_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.rejected_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.rejected_by=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_requested_by_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.requested_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.requested_by=p.id)
UNION ALL
SELECT 'employee_cash_advances' AS relation,'employee_cash_advances_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.employee_cash_advances c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'event_cost_budgets' AS relation,'event_cost_budgets_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_budgets c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'event_cost_close_reopenings' AS relation,'event_cost_close_reopenings_event_cost_close_version_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_close_reopenings c WHERE c.event_cost_close_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.event_cost_close_versions p WHERE c.event_cost_close_version_id=p.id)
UNION ALL
SELECT 'event_cost_close_reopenings' AS relation,'event_cost_close_reopenings_reopened_by_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_close_reopenings c WHERE c.reopened_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reopened_by=p.id)
UNION ALL
SELECT 'event_cost_close_versions' AS relation,'event_cost_close_versions_closed_by_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_close_versions c WHERE c.closed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.closed_by=p.id)
UNION ALL
SELECT 'event_cost_close_versions' AS relation,'event_cost_close_versions_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_close_versions c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'event_cost_etc_forecasts' AS relation,'event_cost_etc_forecasts_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_cost_etc_forecasts c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'event_milestones' AS relation,'event_milestones_owner_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_milestones c WHERE c.owner_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.owner_user_id=p.id)
UNION ALL
SELECT 'event_milestones' AS relation,'event_milestones_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.event_milestones c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'expense_documents' AS relation,'expense_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.expense_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'expense_documents' AS relation,'expense_documents_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.expense_documents c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,'expense_evidence_exceptions_accountable_owner_id_fkey' AS invariant,count(*)::text AS violations FROM public.expense_evidence_exceptions c WHERE c.accountable_owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.accountable_owner_id=p.id)
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,'expense_evidence_exceptions_created_by_fkey' AS invariant,count(*)::text AS violations FROM public.expense_evidence_exceptions c WHERE c.created_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.created_by=p.id)
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,'expense_evidence_exceptions_disposed_by_fkey' AS invariant,count(*)::text AS violations FROM public.expense_evidence_exceptions c WHERE c.disposed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.disposed_by=p.id)
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,'expense_evidence_exceptions_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.expense_evidence_exceptions c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'expense_reimbursement_settlements' AS relation,'expense_reimbursement_settlements_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.expense_reimbursement_settlements c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'expense_reimbursement_settlements' AS relation,'expense_reimbursement_settlements_settled_by_fkey' AS invariant,count(*)::text AS violations FROM public.expense_reimbursement_settlements c WHERE c.settled_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.settled_by=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_approved_by_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.approved_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.approved_by=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_cancelled_by_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.cancelled_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.cancelled_by=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_cash_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.cash_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances p WHERE c.cash_advance_id=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_claimant_id_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.claimant_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.claimant_id=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_finance_reviewed_by_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.finance_reviewed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.finance_reviewed_by=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_petty_cash_fund_id_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.petty_cash_fund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds p WHERE c.petty_cash_fund_id=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_rejected_by_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.rejected_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.rejected_by=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'expenses' AS relation,'expenses_submitted_by_fkey' AS invariant,count(*)::text AS violations FROM public.expenses c WHERE c.submitted_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.submitted_by=p.id)
UNION ALL
SELECT 'invoice_draft_update_mutations' AS relation,'invoice_draft_update_mutations_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoice_draft_update_mutations c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'invoice_items' AS relation,'invoice_items_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoice_items c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'invoices' AS relation,'invoices_approved_billing_scope_id_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoices c WHERE c.approved_billing_scope_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_billing_scopes p WHERE c.approved_billing_scope_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'invoices' AS relation,'invoices_approved_quotation_id_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoices c WHERE c.approved_quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.approved_quotation_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'invoices' AS relation,'invoices_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoices c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'invoices' AS relation,'invoices_quotation_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoices c WHERE c.approved_quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.approved_quotation_id=p.id)
UNION ALL
SELECT 'invoices' AS relation,'invoices_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.invoices c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'payments' AS relation,'payments_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.payments c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'payments' AS relation,'payments_invoice_id_fkey' AS invariant,count(*)::text AS violations FROM public.payments c WHERE c.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices p WHERE c.invoice_id=p.id)
UNION ALL
SELECT 'petty_cash_funds' AS relation,'petty_cash_funds_custodian_id_fkey' AS invariant,count(*)::text AS violations FROM public.petty_cash_funds c WHERE c.custodian_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.custodian_id=p.id)
UNION ALL
SELECT 'petty_cash_transactions' AS relation,'petty_cash_transactions_expense_id_fkey' AS invariant,count(*)::text AS violations FROM public.petty_cash_transactions c WHERE c.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expenses p WHERE c.expense_id=p.id)
UNION ALL
SELECT 'petty_cash_transactions' AS relation,'petty_cash_transactions_fund_id_fkey' AS invariant,count(*)::text AS violations FROM public.petty_cash_transactions c WHERE c.fund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds p WHERE c.fund_id=p.id)
UNION ALL
SELECT 'petty_cash_transactions' AS relation,'petty_cash_transactions_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.petty_cash_transactions c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'project_tasks' AS relation,'project_tasks_project_id_fkey' AS invariant,count(*)::text AS violations FROM public.project_tasks c WHERE c.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects p WHERE c.project_id=p.id)
UNION ALL
SELECT 'projects' AS relation,'projects_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.projects c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'projects' AS relation,'projects_quotation_id_fkey' AS invariant,count(*)::text AS violations FROM public.projects c WHERE c.quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.quotation_id=p.id)
UNION ALL
SELECT 'quotation_items' AS relation,'quotation_items_parent_authority_line_fkey' AS invariant,count(*)::text AS violations FROM public.quotation_items c WHERE c.parent_authority_line_id IS NOT NULL AND c.quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotation_items p WHERE c.parent_authority_line_id=p.id AND c.quotation_id=p.quotation_id)
UNION ALL
SELECT 'quotation_items' AS relation,'quotation_items_quotation_id_fkey' AS invariant,count(*)::text AS violations FROM public.quotation_items c WHERE c.quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.quotation_id=p.id)
UNION ALL
SELECT 'quotations' AS relation,'fk_quotations_service_id' AS invariant,count(*)::text AS violations FROM public.quotations c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'quotations' AS relation,'quotations_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.quotations c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'quotations' AS relation,'quotations_revision_source_family_fkey' AS invariant,count(*)::text AS violations FROM public.quotations c WHERE c.revision_of_quotation_id IS NOT NULL AND c.quotation_family_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.revision_of_quotation_id=p.id AND c.quotation_family_id=p.quotation_family_id)
UNION ALL
SELECT 'quotations' AS relation,'quotations_superseded_by_service_fkey' AS invariant,count(*)::text AS violations FROM public.quotations c WHERE c.superseded_by_quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.superseded_by_quotation_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'service_lifecycle_states' AS relation,'service_lifecycle_states_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_lifecycle_states c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'service_procurement_candidate_documents' AS relation,'service_procurement_candidate_documents_candidate_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_candidate_documents c WHERE c.requirement_id IS NOT NULL AND c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_candidates p WHERE c.requirement_id=p.requirement_id AND c.supplier_id=p.supplier_id)
UNION ALL
SELECT 'service_procurement_candidate_documents' AS relation,'service_procurement_candidate_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_candidate_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'service_procurement_candidates' AS relation,'service_procurement_candidates_requirement_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_candidates c WHERE c.requirement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_requirements p WHERE c.requirement_id=p.id)
UNION ALL
SELECT 'service_procurement_candidates' AS relation,'service_procurement_candidates_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_candidates c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,'service_procurement_package_requirem_legacy_requirement_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_package_requirements c WHERE c.legacy_requirement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_requirements p WHERE c.legacy_requirement_id=p.id)
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,'service_procurement_package_requirements_package_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_package_requirements c WHERE c.package_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_packages p WHERE c.package_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,'service_procurement_package_requirements_service_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_package_requirements c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'service_procurement_packages' AS relation,'service_procurement_packages_quotation_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_packages c WHERE c.selected_supplier_quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND c.selected_supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_quotations p WHERE c.selected_supplier_quotation_id=p.id AND c.service_id=p.service_id AND c.selected_supplier_id=p.supplier_id)
UNION ALL
SELECT 'service_procurement_packages' AS relation,'service_procurement_packages_selected_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_packages c WHERE c.selected_supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.selected_supplier_id=p.id)
UNION ALL
SELECT 'service_procurement_packages' AS relation,'service_procurement_packages_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_packages c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'service_procurement_requirements' AS relation,'service_procurement_requirements_selected_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_requirements c WHERE c.selected_supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.selected_supplier_id=p.id)
UNION ALL
SELECT 'service_procurement_requirements' AS relation,'service_procurement_requirements_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_procurement_requirements c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'service_receipt_corrections' AS relation,'service_receipt_corrections_receipt_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_receipt_corrections c WHERE c.receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.receipt_id=p.id)
UNION ALL
SELECT 'service_receipt_documents' AS relation,'service_receipt_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_receipt_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'service_receipt_documents' AS relation,'service_receipt_documents_receipt_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_receipt_documents c WHERE c.receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.receipt_id=p.id)
UNION ALL
SELECT 'service_receipts' AS relation,'service_receipts_commitment_fkey' AS invariant,count(*)::text AS violations FROM public.service_receipts c WHERE c.commitment_id IS NOT NULL AND c.service_id IS NOT NULL AND c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id AND c.service_id=p.service_id AND c.supplier_id=p.supplier_id)
UNION ALL
SELECT 'service_supplier_allocations' AS relation,'service_supplier_allocations_approved_quotation_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_supplier_allocations c WHERE c.approved_quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotations p WHERE c.approved_quotation_id=p.id)
UNION ALL
SELECT 'service_supplier_allocations' AS relation,'service_supplier_allocations_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_supplier_allocations c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'service_supplier_allocations' AS relation,'service_supplier_allocations_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_supplier_allocations c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'service_supplier_allocations' AS relation,'service_supplier_allocations_supplier_rate_card_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_supplier_allocations c WHERE c.supplier_rate_card_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_rate_cards p WHERE c.supplier_rate_card_id=p.id)
UNION ALL
SELECT 'service_tasks' AS relation,'service_tasks_assignee_user_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_tasks c WHERE c.assignee_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.assignee_user_id=p.id)
UNION ALL
SELECT 'service_tasks' AS relation,'service_tasks_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.service_tasks c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'services' AS relation,'services_customer_id_fkey' AS invariant,count(*)::text AS violations FROM public.services c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers p WHERE c.customer_id=p.id)
UNION ALL
SELECT 'supplier_advance_allocation_reversals' AS relation,'supplier_advance_allocation_r_supplier_advance_allocation__fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_allocation_reversals c WHERE c.supplier_advance_allocation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advance_allocations p WHERE c.supplier_advance_allocation_id=p.id)
UNION ALL
SELECT 'supplier_advance_allocation_reversals' AS relation,'supplier_advance_allocation_reversals_corrected_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_allocation_reversals c WHERE c.corrected_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.corrected_by=p.id)
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,'supplier_advance_allocations_allocated_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_allocations c WHERE c.allocated_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.allocated_by=p.id)
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,'supplier_advance_allocations_supplier_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_allocations c WHERE c.supplier_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.supplier_advance_id=p.id)
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,'supplier_advance_allocations_supplier_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_allocations c WHERE c.supplier_bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.supplier_bill_id=p.id)
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,'supplier_advance_authorization_documen_supplier_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_authorization_documents c WHERE c.supplier_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.supplier_advance_id=p.id)
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,'supplier_advance_authorization_documents_attached_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_authorization_documents c WHERE c.attached_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.attached_by=p.id)
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,'supplier_advance_authorization_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_authorization_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_advance_authorization_releases' AS relation,'supplier_advance_authorization_release_supplier_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_authorization_releases c WHERE c.supplier_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.supplier_advance_id=p.id)
UNION ALL
SELECT 'supplier_advance_authorization_releases' AS relation,'supplier_advance_authorization_releases_released_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_authorization_releases c WHERE c.released_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.released_by=p.id)
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,'supplier_advance_payment_docum_supplier_advance_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payment_documents c WHERE c.supplier_advance_payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advance_payments p WHERE c.supplier_advance_payment_id=p.id)
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,'supplier_advance_payment_documents_attached_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payment_documents c WHERE c.attached_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.attached_by=p.id)
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,'supplier_advance_payment_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payment_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_advance_payment_reversals' AS relation,'supplier_advance_payment_rever_supplier_advance_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payment_reversals c WHERE c.supplier_advance_payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advance_payments p WHERE c.supplier_advance_payment_id=p.id)
UNION ALL
SELECT 'supplier_advance_payment_reversals' AS relation,'supplier_advance_payment_reversals_reversed_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payment_reversals c WHERE c.reversed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reversed_by=p.id)
UNION ALL
SELECT 'supplier_advance_payments' AS relation,'supplier_advance_payments_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payments c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'supplier_advance_payments' AS relation,'supplier_advance_payments_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payments c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'supplier_advance_payments' AS relation,'supplier_advance_payments_supplier_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payments c WHERE c.supplier_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.supplier_advance_id=p.id)
UNION ALL
SELECT 'supplier_advance_payments' AS relation,'supplier_advance_payments_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_payments c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,'supplier_advance_refund_documen_supplier_advance_refund_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_refund_documents c WHERE c.supplier_advance_refund_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advance_refunds p WHERE c.supplier_advance_refund_id=p.id)
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,'supplier_advance_refund_documents_attached_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_refund_documents c WHERE c.attached_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.attached_by=p.id)
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,'supplier_advance_refund_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_refund_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_advance_refunds' AS relation,'supplier_advance_refunds_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_refunds c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'supplier_advance_refunds' AS relation,'supplier_advance_refunds_supplier_advance_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advance_refunds c WHERE c.supplier_advance_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_advances p WHERE c.supplier_advance_id=p.id)
UNION ALL
SELECT 'supplier_advances' AS relation,'supplier_advances_authorized_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advances c WHERE c.authorized_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.authorized_by=p.id)
UNION ALL
SELECT 'supplier_advances' AS relation,'supplier_advances_commitment_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advances c WHERE c.commitment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id)
UNION ALL
SELECT 'supplier_advances' AS relation,'supplier_advances_commitment_lineage_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_advances c WHERE c.commitment_id IS NOT NULL AND c.service_id IS NOT NULL AND c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id AND c.service_id=p.service_id AND c.supplier_id=p.supplier_id)
UNION ALL
SELECT 'supplier_bill_documents' AS relation,'supplier_bill_documents_attached_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bill_documents c WHERE c.attached_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.attached_by=p.id)
UNION ALL
SELECT 'supplier_bill_documents' AS relation,'supplier_bill_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bill_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_bill_documents' AS relation,'supplier_bill_documents_supplier_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bill_documents c WHERE c.supplier_bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.supplier_bill_id=p.id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_approved_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.approved_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.approved_by=p.id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_commitment_scope_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.commitment_id IS NOT NULL AND c.service_id IS NOT NULL AND c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.approved_commitments p WHERE c.commitment_id=p.id AND c.service_id=p.service_id AND c.supplier_id=p.supplier_id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_receipt_scope_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.service_receipt_id IS NOT NULL AND c.service_id IS NOT NULL AND c.supplier_id IS NOT NULL AND c.commitment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_receipts p WHERE c.service_receipt_id=p.id AND c.service_id=p.service_id AND c.supplier_id=p.supplier_id AND c.commitment_id=p.commitment_id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'supplier_bills' AS relation,'supplier_bills_updated_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bills c WHERE c.updated_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.updated_by=p.id)
UNION ALL
SELECT 'supplier_bookings' AS relation,'supplier_bookings_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bookings c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'supplier_bookings' AS relation,'supplier_bookings_source_allocation_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bookings c WHERE c.source_allocation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_supplier_allocations p WHERE c.source_allocation_id=p.id)
UNION ALL
SELECT 'supplier_bookings' AS relation,'supplier_bookings_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_bookings c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'supplier_payment_documents' AS relation,'supplier_payment_documents_attached_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payment_documents c WHERE c.attached_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.attached_by=p.id)
UNION ALL
SELECT 'supplier_payment_documents' AS relation,'supplier_payment_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payment_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_payment_documents' AS relation,'supplier_payment_documents_supplier_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payment_documents c WHERE c.supplier_payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_payments p WHERE c.supplier_payment_id=p.id)
UNION ALL
SELECT 'supplier_payment_reversals' AS relation,'supplier_payment_reversals_reversed_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payment_reversals c WHERE c.reversed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.reversed_by=p.id)
UNION ALL
SELECT 'supplier_payment_reversals' AS relation,'supplier_payment_reversals_supplier_payment_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payment_reversals c WHERE c.supplier_payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_payments p WHERE c.supplier_payment_id=p.id)
UNION ALL
SELECT 'supplier_payments' AS relation,'supplier_payments_recorded_by_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payments c WHERE c.recorded_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.app_users p WHERE c.recorded_by=p.id)
UNION ALL
SELECT 'supplier_payments' AS relation,'supplier_payments_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payments c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'supplier_payments' AS relation,'supplier_payments_supplier_bill_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payments c WHERE c.supplier_bill_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_bills p WHERE c.supplier_bill_id=p.id)
UNION ALL
SELECT 'supplier_payments' AS relation,'supplier_payments_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_payments c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'supplier_quotation_documents' AS relation,'supplier_quotation_documents_document_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_documents c WHERE c.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_documents p WHERE c.document_id=p.id)
UNION ALL
SELECT 'supplier_quotation_documents' AS relation,'supplier_quotation_documents_quotation_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_documents c WHERE c.quotation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_quotations p WHERE c.quotation_id=p.id)
UNION ALL
SELECT 'supplier_quotation_lines' AS relation,'supplier_quotation_lines_pkg_req_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_lines c WHERE c.package_requirement_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_package_requirements p WHERE c.package_requirement_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'supplier_quotation_lines' AS relation,'supplier_quotation_lines_quotation_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_lines c WHERE c.quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_quotations p WHERE c.quotation_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'supplier_quotation_requirements' AS relation,'supplier_quotation_requirements_quotation_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_requirements c WHERE c.quotation_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.supplier_quotations p WHERE c.quotation_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'supplier_quotation_requirements' AS relation,'supplier_quotation_requirements_requirement_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotation_requirements c WHERE c.requirement_id IS NOT NULL AND c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_requirements p WHERE c.requirement_id=p.id AND c.service_id=p.service_id)
UNION ALL
SELECT 'supplier_quotations' AS relation,'supplier_quotations_service_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotations c WHERE c.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services p WHERE c.service_id=p.id)
UNION ALL
SELECT 'supplier_quotations' AS relation,'supplier_quotations_source_candidate_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotations c WHERE c.source_candidate_requirement_id IS NOT NULL AND c.source_candidate_supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service_procurement_candidates p WHERE c.source_candidate_requirement_id=p.requirement_id AND c.source_candidate_supplier_id=p.supplier_id)
UNION ALL
SELECT 'supplier_quotations' AS relation,'supplier_quotations_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_quotations c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)
UNION ALL
SELECT 'supplier_rate_cards' AS relation,'supplier_rate_cards_supplier_id_fkey' AS invariant,count(*)::text AS violations FROM public.supplier_rate_cards c WHERE c.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers p WHERE c.supplier_id=p.id)) SELECT statement_timestamp()::text observation_at,count(*)::text constraints_checked,jsonb_agg(to_jsonb(f)) FILTER(WHERE f.violations<>'0') violations FROM f) q) AS foreign_keys,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text observation_at,(SELECT count(*) FROM (SELECT 'accounting_account_versions' AS relation,count(*)::text AS violations FROM public.accounting_account_versions WHERE account_code IS NULL OR account_id IS NULL OR account_kind IS NULL OR account_type IS NULL OR category IS NULL OR control_classification IS NULL OR created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR foundation_event_id IS NULL OR is_active IS NULL OR is_protected IS NULL OR name_ar IS NULL OR name_en IS NULL OR normal_balance IS NULL OR profile_id IS NULL OR reason IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_accounts' AS relation,count(*)::text AS violations FROM public.accounting_accounts WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR matched_receipt_halalah IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR supplier_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links WHERE created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR customer_id IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links WHERE created_at IS NULL OR customer_id IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,count(*)::text AS violations FROM public.accounting_bank_binding_reviews WHERE binding_id IS NULL OR binding_version IS NULL OR decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_binding_versions WHERE account_id IS NULL OR account_version IS NULL OR bank_identity_ref IS NULL OR bank_identity_sha256 IS NULL OR binding_id IS NULL OR created_at IS NULL OR currency IS NULL OR effective_from IS NULL OR evidence_ref IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR masked_display_identity IS NULL OR payload_fingerprint IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_bindings' AS relation,count(*)::text AS violations FROM public.accounting_bank_bindings WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_allocations WHERE allocation_number IS NULL OR created_at IS NULL OR group_id IS NULL OR group_version IS NULL OR ledger_allocated_halalah IS NULL OR ledger_journal_id IS NULL OR ledger_journal_version IS NULL OR ledger_line_number IS NULL OR profile_id IS NULL OR rationale IS NULL OR statement_allocated_halalah IS NULL OR statement_line_id IS NULL OR statement_line_version IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions WHERE as_of_date IS NULL OR binding_id IS NULL OR binding_version IS NULL OR created_at IS NULL OR foundation_event_id IS NULL OR group_id IS NULL OR payload_fingerprint IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR rationale IS NULL OR recorded_at_cutoff IS NULL OR request_id IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_groups' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_groups WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_reviews WHERE decision IS NULL OR foundation_event_id IS NULL OR group_id IS NULL OR group_version IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions WHERE batch_id IS NULL OR binding_id IS NULL OR binding_version IS NULL OR closing_balance_halalah IS NULL OR coverage_end IS NULL OR coverage_start IS NULL OR created_at IS NULL OR currency IS NULL OR evidence_identity IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR opening_balance_halalah IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR source_document_ref IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_statement_batches' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_batches WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions WHERE batch_id IS NULL OR batch_version IS NULL OR created_at IS NULL OR direction IS NULL OR duplicate_candidate IS NULL OR duplicate_fingerprint IS NULL OR foundation_event_id IS NULL OR line_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR signed_amount_halalah IS NULL OR source_row_identity IS NULL OR stable_line_identity IS NULL OR transaction_date IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_lines WHERE batch_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_capability_catalog' AS relation,count(*)::text AS violations FROM public.accounting_capability_catalog WHERE capability IS NULL OR enabled IS NULL OR owner_slice IS NULL OR runtime_allow_grantable IS NULL
UNION ALL
SELECT 'accounting_capability_events' AS relation,count(*)::text AS violations FROM public.accounting_capability_events WHERE actor_user_id IS NULL OR capability IS NULL OR created_at IS NULL OR effect IS NULL OR foundation_event_id IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR revision IS NULL OR target_user_id IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR service_attribution IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links WHERE created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_foundation_events' AS relation,count(*)::text AS violations FROM public.accounting_foundation_events WHERE actor_user_id IS NULL OR entity_id IS NULL OR entity_type IS NULL OR entity_version IS NULL OR event_type IS NULL OR id IS NULL OR occurred_at IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR result_reference IS NULL
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,count(*)::text AS violations FROM public.accounting_inception_acceptances WHERE accepted_at IS NULL OR accepted_by IS NULL OR as_of_date IS NULL OR foundation_event_id IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR recorded_at_cutoff IS NULL OR trial_balance IS NULL
UNION ALL
SELECT 'accounting_inception_coverage' AS relation,count(*)::text AS violations FROM public.accounting_inception_coverage WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_domain IS NULL OR source_record_key IS NULL
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,count(*)::text AS violations FROM public.accounting_inception_coverage_versions WHERE classification IS NULL OR coverage_id IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_count IS NULL OR foundation_event_id IS NULL OR is_material IS NULL OR item_id IS NULL OR package_id IS NULL OR package_version IS NULL OR party_type IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reconciliation_category IS NULL OR resolution_state IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_inception_journal_links WHERE created_at IS NULL OR item_id IS NULL OR journal_id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR prepared_by IS NULL OR prepared_version IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations WHERE account_id IS NULL OR account_version IS NULL OR created_at IS NULL OR item_id IS NULL OR mapping_key IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR preparer_user_id IS NULL OR profile_id IS NULL OR reviewer_user_id IS NULL OR rule_id IS NULL OR rule_version IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,count(*)::text AS violations FROM public.accounting_inception_package_versions WHERE accounting_start_date IS NULL OR created_at IS NULL OR created_by IS NULL OR cutover_boundary_date IS NULL OR foundation_event_id IS NULL OR package_id IS NULL OR payload IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_inception_packages' AS relation,count(*)::text AS violations FROM public.accounting_inception_packages WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,count(*)::text AS violations FROM public.accounting_inception_reviews WHERE decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR reviewed_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_journal_events' AS relation,count(*)::text AS violations FROM public.accounting_journal_events WHERE actor_user_id IS NULL OR created_at IS NULL OR entity_version IS NULL OR event_type IS NULL OR id IS NULL OR idempotent_replay IS NULL OR operation IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,count(*)::text AS violations FROM public.accounting_journal_line_versions WHERE account_code_snapshot IS NULL OR account_id IS NULL OR account_name_ar_snapshot IS NULL OR account_name_en_snapshot IS NULL OR account_type_snapshot IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR description_ar IS NULL OR description_en IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR mapping_key IS NULL OR normal_balance_snapshot IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR rule_version IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_journal_versions' AS relation,count(*)::text AS violations FROM public.accounting_journal_versions WHERE accounting_date IS NULL OR created_at IS NULL OR currency IS NULL OR description_ar IS NULL OR description_en IS NULL OR economic_event_key IS NULL OR foundation_event_id IS NULL OR journal_id IS NULL OR payload_fingerprint IS NULL OR period_id IS NULL OR period_version IS NULL OR posting_purpose IS NULL OR posting_rule_id IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR profile_version IS NULL OR reason IS NULL OR rule_version IS NULL OR source_domain IS NULL OR source_record_key IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_journals' AS relation,count(*)::text AS violations FROM public.accounting_journals WHERE correction_group_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,count(*)::text AS violations FROM public.accounting_period_close_packages WHERE accounting_cutoff IS NULL OR evidence_fingerprint IS NULL OR evidence_ref IS NULL OR evidence_snapshot IS NULL OR exception_codes IS NULL OR id IS NULL OR ledger_fingerprint IS NULL OR package_kind IS NULL OR package_state IS NULL OR package_version IS NULL OR period_end_date IS NULL OR period_id IS NULL OR period_start_date IS NULL OR prepared_at IS NULL OR preparer_user_id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at_cutoff IS NULL OR request_fingerprint IS NULL OR request_id IS NULL OR starting_period_version IS NULL
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,count(*)::text AS violations FROM public.accounting_period_close_reviews WHERE decision IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR period_id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_fingerprint IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_period_versions' AS relation,count(*)::text AS violations FROM public.accounting_period_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR end_date IS NULL OR foundation_event_id IS NULL OR period_id IS NULL OR profile_id IS NULL OR reason IS NULL OR start_date IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_periods' AS relation,count(*)::text AS violations FROM public.accounting_periods WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_posting_rule_mappings' AS relation,count(*)::text AS violations FROM public.accounting_posting_rule_mappings WHERE account_id IS NULL OR account_version IS NULL OR allowed_side IS NULL OR mapping_key IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR rule_version IS NULL OR service_requirement IS NULL
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,count(*)::text AS violations FROM public.accounting_posting_rule_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR foundation_event_id IS NULL OR is_active IS NULL OR name_ar IS NULL OR name_en IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR reason IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_posting_rules' AS relation,count(*)::text AS violations FROM public.accounting_posting_rules WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL OR rule_code IS NULL
UNION ALL
SELECT 'accounting_profile_versions' AS relation,count(*)::text AS violations FROM public.accounting_profile_versions WHERE activation_state IS NULL OR created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR endorsement_context IS NULL OR fatoora_state IS NULL OR fiscal_end_day IS NULL OR fiscal_end_month IS NULL OR fiscal_start_day IS NULL OR fiscal_start_month IS NULL OR fiscal_timezone IS NULL OR foundation_event_id IS NULL OR framework_edition IS NULL OR framework_key IS NULL OR functional_currency IS NULL OR legal_fiscal_evidence_pending IS NULL OR policy_version IS NULL OR professional_validation_state IS NULL OR profile_id IS NULL OR reason IS NULL OR vat_mode IS NULL OR version IS NULL OR zatca_state IS NULL
UNION ALL
SELECT 'accounting_profiles' AS relation,count(*)::text AS violations FROM public.accounting_profiles WHERE company_settings_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR singleton_key IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangement_reviews WHERE arrangement_id IS NULL OR arrangement_version IS NULL OR decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions WHERE arrangement_id IS NULL OR consideration_halalah IS NULL OR created_at IS NULL OR created_by IS NULL OR currency IS NULL OR foundation_event_id IS NULL OR policy_version IS NULL OR principal_agent_basis IS NULL OR profile_id IS NULL OR reason IS NULL OR source_approved_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR units_snapshot IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangements WHERE approved_billing_scope_id IS NULL OR created_at IS NULL OR current_version IS NULL OR customer_id IS NULL OR id IS NULL OR profile_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence WHERE arrangement_id IS NULL OR created_at IS NULL OR current_version IS NULL OR evidence_key IS NULL OR id IS NULL OR profile_id IS NULL OR unit_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_reviews WHERE decision IS NULL OR evidence_id IS NULL OR evidence_version IS NULL OR foundation_event_id IS NULL OR id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions WHERE arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_basis IS NULL OR evidence_id IS NULL OR evidence_ref IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR performance_from IS NULL OR performance_through IS NULL OR profile_id IS NULL OR rationale IS NULL OR status IS NULL OR unit_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions WHERE allocated_halalah IS NULL OR arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR created_by IS NULL OR foundation_event_id IS NULL OR profile_id IS NULL OR promised_output IS NULL OR required_evidence_basis IS NULL OR satisfaction_method IS NULL OR source_allocations IS NULL OR unit_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_units' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_units WHERE arrangement_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL OR unit_key IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_events WHERE accounting_date IS NULL OR arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR customer_id IS NULL OR economic_event_key IS NULL OR evidence_id IS NULL OR evidence_version IS NULL OR expected_lines IS NULL OR foundation_event_id IS NULL OR id IS NULL OR performance_from IS NULL OR performance_through IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR reason IS NULL OR service_id IS NULL OR signed_delta_halalah IS NULL OR source_record_key IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR unit_id IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR customer_id IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR mapping_key IS NULL OR party_role IS NULL OR profile_id IS NULL OR recognition_event_id IS NULL OR service_id IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_links WHERE created_at IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR recognition_event_id IS NULL OR source_effect_id IS NULL
UNION ALL
SELECT 'accounting_source_effects' AS relation,count(*)::text AS violations FROM public.accounting_source_effects WHERE created_at IS NULL OR economic_event_key IS NULL OR id IS NULL OR journal_id IS NULL OR journal_version IS NULL OR payload_fingerprint IS NULL OR posting_purpose IS NULL OR profile_id IS NULL OR source_domain IS NULL OR source_record_key IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_entries' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_entries WHERE account_id IS NULL OR account_version IS NULL OR display_order IS NULL OR label_ar IS NULL OR label_en IS NULL OR line_key IS NULL OR mapping_set_id IS NULL OR mapping_version IS NULL OR profile_id IS NULL OR section_key IS NULL OR statement_type IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_sets' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_sets WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR evidence_ref IS NULL OR mapping_set_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR version IS NULL
UNION ALL
SELECT 'app_user_permission_overrides' AS relation,count(*)::text AS violations FROM public.app_user_permission_overrides WHERE created_at IS NULL OR created_by IS NULL OR effect IS NULL OR id IS NULL OR permission IS NULL OR updated_at IS NULL OR updated_by IS NULL OR user_id IS NULL
UNION ALL
SELECT 'app_users' AS relation,count(*)::text AS violations FROM public.app_users WHERE clerk_user_id IS NULL OR id IS NULL OR locale IS NULL OR role IS NULL
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,count(*)::text AS violations FROM public.approved_billing_scope_items WHERE accepted_grand_total IS NULL OR accepted_qty IS NULL OR accepted_subtotal IS NULL OR accepted_unit_price IS NULL OR accepted_vat_amount IS NULL OR approved_billing_scope_id IS NULL OR created_at IS NULL OR decision IS NULL OR display_order IS NULL OR id IS NULL OR source_commercial_role IS NULL OR source_description IS NULL OR source_discount_allocated IS NULL OR source_grand_total IS NULL OR source_is_selected IS NULL OR source_qty IS NULL OR source_quotation_id IS NULL OR source_quotation_item_id IS NULL OR source_subtotal IS NULL OR source_unit IS NULL OR source_unit_price IS NULL OR source_vat_amount IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'approved_billing_scopes' AS relation,count(*)::text AS violations FROM public.approved_billing_scopes WHERE accepted_grand_total IS NULL OR accepted_subtotal IS NULL OR accepted_vat_amount IS NULL OR created_at IS NULL OR id IS NULL OR line_safety_status IS NULL OR scope_version IS NULL OR service_id IS NULL OR source_currency IS NULL OR source_discount IS NULL OR source_pricing_context IS NULL OR source_quotation_grand_total IS NULL OR source_quotation_id IS NULL OR source_quotation_subtotal IS NULL OR source_quotation_vat_amount IS NULL OR source_vat_rate IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'approved_commitment_amendments' AS relation,count(*)::text AS violations FROM public.approved_commitment_amendments WHERE amendment_number IS NULL OR amendment_type IS NULL OR amount_delta IS NULL OR approved_amount_after IS NULL OR approved_at IS NULL OR approved_by IS NULL OR commitment_id IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_ref IS NULL OR id IS NULL OR reason IS NULL
UNION ALL
SELECT 'approved_commitment_documents' AS relation,count(*)::text AS violations FROM public.approved_commitment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR commitment_id IS NULL OR document_id IS NULL
UNION ALL
SELECT 'approved_commitments' AS relation,count(*)::text AS violations FROM public.approved_commitments WHERE approved_at IS NULL OR approved_by IS NULL OR commitment_source IS NULL OR created_at IS NULL OR created_by IS NULL OR currency IS NULL OR id IS NULL OR original_approved_amount IS NULL OR service_id IS NULL OR status IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'audit_logs' AS relation,count(*)::text AS violations FROM public.audit_logs WHERE action IS NULL OR entity_id IS NULL OR entity_type IS NULL OR id IS NULL
UNION ALL
SELECT 'business_document_links' AS relation,count(*)::text AS violations FROM public.business_document_links WHERE created_at IS NULL OR document_id IS NULL OR link_purpose IS NULL OR linked_by IS NULL OR service_id IS NULL
UNION ALL
SELECT 'business_documents' AS relation,count(*)::text AS violations FROM public.business_documents WHERE bucket_id IS NULL OR created_at IS NULL OR document_type IS NULL OR file_size IS NULL OR id IS NULL OR mime_type IS NULL OR object_path IS NULL OR original_filename IS NULL OR purpose IS NULL OR updated_at IS NULL OR uploaded_by IS NULL
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,count(*)::text AS violations FROM public.cash_advance_expense_settlements WHERE amount IS NULL OR cash_advance_id IS NULL OR expense_id IS NULL OR id IS NULL OR request_id IS NULL OR settled_at IS NULL OR settled_by IS NULL
UNION ALL
SELECT 'cash_advance_returns' AS relation,count(*)::text AS violations FROM public.cash_advance_returns WHERE amount IS NULL OR cash_advance_id IS NULL OR id IS NULL OR request_id IS NULL OR returned_at IS NULL OR returned_by IS NULL
UNION ALL
SELECT 'company_settings' AS relation,count(*)::text AS violations FROM public.company_settings WHERE bank_account_holder IS NULL OR bank_iban IS NULL OR bank_name IS NULL OR currency IS NULL OR default_vat_percent IS NULL OR id IS NULL OR legal_name_ar IS NULL OR legal_name_en IS NULL OR national_address IS NULL OR official_email IS NULL OR official_phone IS NULL OR setting_key IS NULL OR vat_mode IS NULL
UNION ALL
SELECT 'customer_credit_application_reversals' AS relation,count(*)::text AS violations FROM public.customer_credit_application_reversals WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_application_id IS NULL
UNION ALL
SELECT 'customer_credit_applications' AS relation,count(*)::text AS violations FROM public.customer_credit_applications WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR remaining_source_credit_after IS NULL OR request_id IS NULL OR source_credit_adjustment_id IS NULL OR target_invoice_id IS NULL OR target_outstanding_after IS NULL
UNION ALL
SELECT 'customer_internal_credit_adjustment_reversals' AS relation,count(*)::text AS violations FROM public.customer_internal_credit_adjustment_reversals WHERE amount IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR effective_date IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_credit_adjustment_id IS NULL
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,count(*)::text AS violations FROM public.customer_internal_credit_adjustments WHERE amount IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR effective_date IS NULL OR id IS NULL OR invoice_id IS NULL OR net_receivable_after IS NULL OR reason IS NULL OR reason_code IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'customer_receipt_allocation_reversals' AS relation,count(*)::text AS violations FROM public.customer_receipt_allocation_reversals WHERE allocation_id IS NULL OR created_at IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,count(*)::text AS violations FROM public.customer_receipt_allocations WHERE allocated_at IS NULL OR allocated_by IS NULL OR amount IS NULL OR created_at IS NULL OR customer_id IS NULL OR id IS NULL OR invoice_id IS NULL OR payment_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'customer_receipt_reversals' AS relation,count(*)::text AS violations FROM public.customer_receipt_reversals WHERE created_at IS NULL OR id IS NULL OR payment_id IS NULL OR reason IS NULL OR request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL
UNION ALL
SELECT 'customer_refund_reversals' AS relation,count(*)::text AS violations FROM public.customer_refund_reversals WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_refund_id IS NULL
UNION ALL
SELECT 'customer_refunds' AS relation,count(*)::text AS violations FROM public.customer_refunds WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR refund_method IS NULL OR remaining_source_credit_after IS NULL OR request_id IS NULL OR service_id IS NULL OR source_credit_adjustment_id IS NULL
UNION ALL
SELECT 'customers' AS relation,count(*)::text AS violations FROM public.customers WHERE city IS NULL OR company IS NULL OR contact IS NULL OR customer_number IS NULL OR email IS NULL OR id IS NULL OR phone IS NULL OR po_required IS NULL OR status IS NULL
UNION ALL
SELECT 'employee_cash_advances' AS relation,count(*)::text AS violations FROM public.employee_cash_advances WHERE advance_number IS NULL OR amount_issued IS NULL OR amount_returned IS NULL OR amount_spent_settled IS NULL OR context_type IS NULL OR created_at IS NULL OR id IS NULL OR purpose IS NULL OR recipient_id IS NULL OR requested_at IS NULL OR requested_by IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'event_cost_budgets' AS relation,count(*)::text AS violations FROM public.event_cost_budgets WHERE approved_at IS NULL OR approved_by IS NULL OR base_budget_amount IS NULL OR budget_version IS NULL OR contingency_amount IS NULL OR created_at IS NULL OR currency IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'event_cost_close_reopenings' AS relation,count(*)::text AS violations FROM public.event_cost_close_reopenings WHERE event_cost_close_version_id IS NULL OR id IS NULL OR reason IS NULL OR reopen_request_id IS NULL OR reopened_at IS NULL OR reopened_by IS NULL
UNION ALL
SELECT 'event_cost_close_versions' AS relation,count(*)::text AS violations FROM public.event_cost_close_versions WHERE accepted_commitment IS NULL OR actual_cost IS NULL OR approved_commitment IS NULL OR close_request_id IS NULL OR close_version IS NULL OR closed_at IS NULL OR closed_by IS NULL OR completeness_status IS NULL OR costing_snapshot IS NULL OR eac IS NULL OR effective_date IS NULL OR etc IS NULL OR final_managerial_event_margin IS NULL OR id IS NULL OR net_approved_commercial_value IS NULL OR open_commitment IS NULL OR outstanding_cost IS NULL OR paid_cost IS NULL OR pending_commitment IS NULL OR readiness_evidence IS NULL OR reason IS NULL OR service_id IS NULL OR source_counts IS NULL
UNION ALL
SELECT 'event_cost_etc_forecasts' AS relation,count(*)::text AS violations FROM public.event_cost_etc_forecasts WHERE created_at IS NULL OR etc_amount IS NULL OR forecast_date IS NULL OR forecast_version IS NULL OR id IS NULL OR reason IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'event_milestones' AS relation,count(*)::text AS violations FROM public.event_milestones WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR service_id IS NULL OR status IS NULL OR target_date IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'expense_documents' AS relation,count(*)::text AS violations FROM public.expense_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR expense_id IS NULL
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,count(*)::text AS violations FROM public.expense_evidence_exceptions WHERE accountable_owner_id IS NULL OR created_at IS NULL OR created_by IS NULL OR disposition IS NULL OR expense_id IS NULL OR id IS NULL OR reason IS NULL OR review_before IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'expense_reimbursement_settlements' AS relation,count(*)::text AS violations FROM public.expense_reimbursement_settlements WHERE amount IS NULL OR expense_id IS NULL OR id IS NULL OR request_id IS NULL OR settled_at IS NULL OR settled_by IS NULL OR settlement_method IS NULL OR settlement_number IS NULL
UNION ALL
SELECT 'expenses' AS relation,count(*)::text AS violations FROM public.expenses WHERE amount IS NULL OR context_type IS NULL OR created_at IS NULL OR currency IS NULL OR description IS NULL OR expense_category IS NULL OR expense_date IS NULL OR expense_number IS NULL OR id IS NULL OR origin_type IS NULL OR payment_method IS NULL OR status IS NULL OR submitted_at IS NULL OR submitted_by IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'invoice_draft_update_mutations' AS relation,count(*)::text AS violations FROM public.invoice_draft_update_mutations WHERE created_at IS NULL OR created_by IS NULL OR due_date IS NULL OR id IS NULL OR invoice_id IS NULL OR invoice_number IS NULL OR mutation_key IS NULL OR requested_amount IS NULL
UNION ALL
SELECT 'invoice_items' AS relation,count(*)::text AS violations FROM public.invoice_items WHERE description IS NULL OR id IS NULL OR invoice_id IS NULL OR qty IS NULL OR total IS NULL OR unit_price IS NULL OR vat IS NULL
UNION ALL
SELECT 'invoices' AS relation,count(*)::text AS violations FROM public.invoices WHERE customer_id IS NULL OR date IS NULL OR due_date IS NULL OR id IS NULL OR invoice_number IS NULL OR invoice_type IS NULL OR status IS NULL
UNION ALL
SELECT 'number_sequences' AS relation,count(*)::text AS violations FROM public.number_sequences WHERE example_format IS NULL OR id IS NULL OR prefix IS NULL OR sequence IS NULL OR type IS NULL OR year IS NULL
UNION ALL
SELECT 'payments' AS relation,count(*)::text AS violations FROM public.payments WHERE amount IS NULL OR customer_id IS NULL OR date IS NULL OR id IS NULL OR method IS NULL OR payment_number IS NULL OR status IS NULL
UNION ALL
SELECT 'petty_cash_funds' AS relation,count(*)::text AS violations FROM public.petty_cash_funds WHERE created_at IS NULL OR current_balance IS NULL OR custodian_id IS NULL OR float_limit IS NULL OR fund_name IS NULL OR id IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'petty_cash_transactions' AS relation,count(*)::text AS violations FROM public.petty_cash_transactions WHERE amount IS NULL OR balance_after IS NULL OR balance_before IS NULL OR fund_id IS NULL OR id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR transaction_type IS NULL
UNION ALL
SELECT 'project_tasks' AS relation,count(*)::text AS violations FROM public.project_tasks WHERE id IS NULL OR project_id IS NULL OR status IS NULL OR title IS NULL
UNION ALL
SELECT 'projects' AS relation,count(*)::text AS violations FROM public.projects WHERE customer_id IS NULL OR end_date IS NULL OR id IS NULL OR name IS NULL OR project_number IS NULL OR start_date IS NULL OR status IS NULL
UNION ALL
SELECT 'quotation_items' AS relation,count(*)::text AS violations FROM public.quotation_items WHERE category IS NULL OR commercial_role IS NULL OR description IS NULL OR discount_allocated IS NULL OR id IS NULL OR is_selected IS NULL OR qty IS NULL OR quotation_id IS NULL OR total IS NULL OR unit IS NULL OR unit_price IS NULL OR vat IS NULL
UNION ALL
SELECT 'quotations' AS relation,count(*)::text AS violations FROM public.quotations WHERE customer_id IS NULL OR date IS NULL OR discount_type IS NULL OR event IS NULL OR id IS NULL OR quotation_family_id IS NULL OR quotation_number IS NULL OR revision_number IS NULL OR service_id IS NULL OR snapshot_buyer IS NULL OR snapshot_seller IS NULL OR status IS NULL OR valid_until IS NULL OR vat_rate IS NULL
UNION ALL
SELECT 'service_lifecycle_states' AS relation,count(*)::text AS violations FROM public.service_lifecycle_states WHERE close_state IS NULL OR commercial_state IS NULL OR completion_state IS NULL OR created_at IS NULL OR execution_state IS NULL OR legacy_status IS NULL OR mapping_version IS NULL OR payment_state IS NULL OR readiness_state IS NULL OR service_id IS NULL OR state_version IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'service_procurement_candidate_documents' AS relation,count(*)::text AS violations FROM public.service_procurement_candidate_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR requirement_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'service_procurement_candidates' AS relation,count(*)::text AS violations FROM public.service_procurement_candidates WHERE created_at IS NULL OR created_by IS NULL OR currency IS NULL OR evidence_ref IS NULL OR offer_summary IS NULL OR requirement_id IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,count(*)::text AS violations FROM public.service_procurement_package_requirements WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR package_id IS NULL OR service_id IS NULL OR sort_order IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_packages' AS relation,count(*)::text AS violations FROM public.service_procurement_packages WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR name IS NULL OR service_id IS NULL OR status IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_requirements' AS relation,count(*)::text AS violations FROM public.service_procurement_requirements WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR requirement IS NULL OR selection_status IS NULL OR service_id IS NULL OR sourcing_evidence IS NULL OR sourcing_path IS NULL OR sourcing_reason IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_receipt_corrections' AS relation,count(*)::text AS violations FROM public.service_receipt_corrections WHERE corrected_acceptance_status IS NULL OR corrected_at IS NULL OR corrected_by IS NULL OR correction_number IS NULL OR correction_reason IS NULL OR created_at IS NULL OR created_by IS NULL OR id IS NULL OR prior_acceptance_status IS NULL OR prior_decision_at IS NULL OR prior_decision_by IS NULL OR receipt_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'service_receipt_documents' AS relation,count(*)::text AS violations FROM public.service_receipt_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR receipt_id IS NULL
UNION ALL
SELECT 'service_receipts' AS relation,count(*)::text AS violations FROM public.service_receipts WHERE acceptance_status IS NULL OR commitment_id IS NULL OR created_at IS NULL OR created_by IS NULL OR delivered_scope IS NULL OR id IS NULL OR performance_date IS NULL OR service_id IS NULL OR submitted_at IS NULL OR submitted_by IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_supplier_allocations' AS relation,count(*)::text AS violations FROM public.service_supplier_allocations WHERE category IS NULL OR cost_source IS NULL OR created_at IS NULL OR currency IS NULL OR estimated_unit_cost IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR quantity IS NULL OR service_id IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'service_tasks' AS relation,count(*)::text AS violations FROM public.service_tasks WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR service_id IS NULL OR status IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'services' AS relation,count(*)::text AS violations FROM public.services WHERE created_at IS NULL OR customer_id IS NULL OR id IS NULL OR service_number IS NULL OR service_title IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'supplier_advance_allocation_reversals' AS relation,count(*)::text AS violations FROM public.supplier_advance_allocation_reversals WHERE corrected_at IS NULL OR corrected_by IS NULL OR correction_request_id IS NULL OR id IS NULL OR reason IS NULL OR supplier_advance_allocation_id IS NULL
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,count(*)::text AS violations FROM public.supplier_advance_allocations WHERE allocated_at IS NULL OR allocated_by IS NULL OR allocation_number IS NULL OR allocation_request_id IS NULL OR amount IS NULL OR id IS NULL OR supplier_advance_id IS NULL OR supplier_bill_id IS NULL
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_authorization_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advance_authorization_releases' AS relation,count(*)::text AS violations FROM public.supplier_advance_authorization_releases WHERE id IS NULL OR reason IS NULL OR release_request_id IS NULL OR released_at IS NULL OR released_by IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_payment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_payment_id IS NULL
UNION ALL
SELECT 'supplier_advance_payment_reversals' AS relation,count(*)::text AS violations FROM public.supplier_advance_payment_reversals WHERE id IS NULL OR reason IS NULL OR reversal_request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL OR supplier_advance_payment_id IS NULL
UNION ALL
SELECT 'supplier_advance_payments' AS relation,count(*)::text AS violations FROM public.supplier_advance_payments WHERE amount IS NULL OR id IS NULL OR method IS NULL OR payment_date IS NULL OR payment_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_advance_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_refund_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_refund_id IS NULL
UNION ALL
SELECT 'supplier_advance_refunds' AS relation,count(*)::text AS violations FROM public.supplier_advance_refunds WHERE amount IS NULL OR business_date IS NULL OR evidence_sha256 IS NULL OR id IS NULL OR reason IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR refund_number IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advances' AS relation,count(*)::text AS violations FROM public.supplier_advances WHERE advance_number IS NULL OR authorization_request_id IS NULL OR authorized_amount IS NULL OR authorized_at IS NULL OR authorized_by IS NULL OR commitment_id IS NULL OR created_at IS NULL OR currency IS NULL OR evidence_sha256 IS NULL OR id IS NULL OR reason IS NULL OR service_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_bill_documents' AS relation,count(*)::text AS violations FROM public.supplier_bill_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR supplier_bill_id IS NULL
UNION ALL
SELECT 'supplier_bills' AS relation,count(*)::text AS violations FROM public.supplier_bills WHERE bill_number IS NULL OR commitment_id IS NULL OR currency IS NULL OR id IS NULL OR invoice_date IS NULL OR invoice_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR service_receipt_id IS NULL OR status IS NULL OR subtotal IS NULL OR supplier_id IS NULL OR supplier_legal_name_snapshot IS NULL OR supplier_name_snapshot IS NULL OR total_amount IS NULL OR updated_at IS NULL OR updated_by IS NULL OR vat_amount IS NULL
UNION ALL
SELECT 'supplier_bookings' AS relation,count(*)::text AS violations FROM public.supplier_bookings WHERE allocation_snapshot IS NULL OR booking_number IS NULL OR category IS NULL OR created_at IS NULL OR currency IS NULL OR estimated_unit_cost IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR quantity IS NULL OR service_id IS NULL OR source_allocation_id IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'supplier_payment_documents' AS relation,count(*)::text AS violations FROM public.supplier_payment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR supplier_payment_id IS NULL
UNION ALL
SELECT 'supplier_payment_reversals' AS relation,count(*)::text AS violations FROM public.supplier_payment_reversals WHERE id IS NULL OR reason IS NULL OR reversal_request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL OR supplier_payment_id IS NULL
UNION ALL
SELECT 'supplier_payments' AS relation,count(*)::text AS violations FROM public.supplier_payments WHERE amount IS NULL OR id IS NULL OR method IS NULL OR payment_date IS NULL OR payment_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_bill_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_quotation_documents' AS relation,count(*)::text AS violations FROM public.supplier_quotation_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR quotation_id IS NULL
UNION ALL
SELECT 'supplier_quotation_lines' AS relation,count(*)::text AS violations FROM public.supplier_quotation_lines WHERE created_at IS NULL OR created_by IS NULL OR description IS NULL OR id IS NULL OR line_total IS NULL OR quotation_id IS NULL OR service_id IS NULL OR sort_order IS NULL
UNION ALL
SELECT 'supplier_quotation_requirements' AS relation,count(*)::text AS violations FROM public.supplier_quotation_requirements WHERE created_at IS NULL OR created_by IS NULL OR line_summary IS NULL OR quotation_id IS NULL OR requirement_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'supplier_quotations' AS relation,count(*)::text AS violations FROM public.supplier_quotations WHERE currency IS NULL OR id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'supplier_rate_cards' AS relation,count(*)::text AS violations FROM public.supplier_rate_cards WHERE base_cost IS NULL OR created_at IS NULL OR currency IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL OR valid_from IS NULL
UNION ALL
SELECT 'suppliers' AS relation,count(*)::text AS violations FROM public.suppliers WHERE contact IS NULL OR id IS NULL OR is_preferred IS NULL OR name IS NULL OR phone IS NULL OR service IS NULL OR status IS NULL) n)::text AS tables_checked,(SELECT jsonb_agg(to_jsonb(n)) FROM (SELECT 'accounting_account_versions' AS relation,count(*)::text AS violations FROM public.accounting_account_versions WHERE account_code IS NULL OR account_id IS NULL OR account_kind IS NULL OR account_type IS NULL OR category IS NULL OR control_classification IS NULL OR created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR foundation_event_id IS NULL OR is_active IS NULL OR is_protected IS NULL OR name_ar IS NULL OR name_en IS NULL OR normal_balance IS NULL OR profile_id IS NULL OR reason IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_accounts' AS relation,count(*)::text AS violations FROM public.accounting_accounts WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR matched_receipt_halalah IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR supplier_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'accounting_ap_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_ap_bridge_journal_links WHERE created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR customer_id IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_ar_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_ar_bridge_journal_links WHERE created_at IS NULL OR customer_id IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_bank_binding_reviews' AS relation,count(*)::text AS violations FROM public.accounting_bank_binding_reviews WHERE binding_id IS NULL OR binding_version IS NULL OR decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_bank_binding_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_binding_versions WHERE account_id IS NULL OR account_version IS NULL OR bank_identity_ref IS NULL OR bank_identity_sha256 IS NULL OR binding_id IS NULL OR created_at IS NULL OR currency IS NULL OR effective_from IS NULL OR evidence_ref IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR masked_display_identity IS NULL OR payload_fingerprint IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_bindings' AS relation,count(*)::text AS violations FROM public.accounting_bank_bindings WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_allocations' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_allocations WHERE allocation_number IS NULL OR created_at IS NULL OR group_id IS NULL OR group_version IS NULL OR ledger_allocated_halalah IS NULL OR ledger_journal_id IS NULL OR ledger_journal_version IS NULL OR ledger_line_number IS NULL OR profile_id IS NULL OR rationale IS NULL OR statement_allocated_halalah IS NULL OR statement_line_id IS NULL OR statement_line_version IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_group_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_group_versions WHERE as_of_date IS NULL OR binding_id IS NULL OR binding_version IS NULL OR created_at IS NULL OR foundation_event_id IS NULL OR group_id IS NULL OR payload_fingerprint IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR rationale IS NULL OR recorded_at_cutoff IS NULL OR request_id IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_groups' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_groups WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_reconciliation_reviews' AS relation,count(*)::text AS violations FROM public.accounting_bank_reconciliation_reviews WHERE decision IS NULL OR foundation_event_id IS NULL OR group_id IS NULL OR group_version IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_bank_statement_batch_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_batch_versions WHERE batch_id IS NULL OR binding_id IS NULL OR binding_version IS NULL OR closing_balance_halalah IS NULL OR coverage_end IS NULL OR coverage_start IS NULL OR created_at IS NULL OR currency IS NULL OR evidence_identity IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR opening_balance_halalah IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR source_document_ref IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_statement_batches' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_batches WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_bank_statement_line_versions' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_line_versions WHERE batch_id IS NULL OR batch_version IS NULL OR created_at IS NULL OR direction IS NULL OR duplicate_candidate IS NULL OR duplicate_fingerprint IS NULL OR foundation_event_id IS NULL OR line_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR signed_amount_halalah IS NULL OR source_row_identity IS NULL OR stable_line_identity IS NULL OR transaction_date IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_bank_statement_lines' AS relation,count(*)::text AS violations FROM public.accounting_bank_statement_lines WHERE batch_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_capability_catalog' AS relation,count(*)::text AS violations FROM public.accounting_capability_catalog WHERE capability IS NULL OR enabled IS NULL OR owner_slice IS NULL OR runtime_allow_grantable IS NULL
UNION ALL
SELECT 'accounting_capability_events' AS relation,count(*)::text AS violations FROM public.accounting_capability_events WHERE actor_user_id IS NULL OR capability IS NULL OR created_at IS NULL OR effect IS NULL OR foundation_event_id IS NULL OR id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR revision IS NULL OR target_user_id IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_event_versions' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_event_versions WHERE amount_halalah IS NULL OR classification IS NULL OR created_at IS NULL OR created_by IS NULL OR event_id IS NULL OR foundation_event_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR service_attribution IS NULL OR source_recorded_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_events' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_events WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_record_id IS NULL OR source_record_key IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR party_role IS NULL OR profile_id IS NULL OR side IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_expense_bridge_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_expense_bridge_journal_links WHERE created_at IS NULL OR event_id IS NULL OR event_version IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR source_effect_id IS NULL OR source_record_id IS NULL OR source_type IS NULL
UNION ALL
SELECT 'accounting_foundation_events' AS relation,count(*)::text AS violations FROM public.accounting_foundation_events WHERE actor_user_id IS NULL OR entity_id IS NULL OR entity_type IS NULL OR entity_version IS NULL OR event_type IS NULL OR id IS NULL OR occurred_at IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR result_reference IS NULL
UNION ALL
SELECT 'accounting_inception_acceptances' AS relation,count(*)::text AS violations FROM public.accounting_inception_acceptances WHERE accepted_at IS NULL OR accepted_by IS NULL OR as_of_date IS NULL OR foundation_event_id IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR recorded_at_cutoff IS NULL OR trial_balance IS NULL
UNION ALL
SELECT 'accounting_inception_coverage' AS relation,count(*)::text AS violations FROM public.accounting_inception_coverage WHERE created_at IS NULL OR current_version IS NULL OR economic_event_key IS NULL OR id IS NULL OR profile_id IS NULL OR source_domain IS NULL OR source_record_key IS NULL
UNION ALL
SELECT 'accounting_inception_coverage_versions' AS relation,count(*)::text AS violations FROM public.accounting_inception_coverage_versions WHERE classification IS NULL OR coverage_id IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_count IS NULL OR foundation_event_id IS NULL OR is_material IS NULL OR item_id IS NULL OR package_id IS NULL OR package_version IS NULL OR party_type IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reconciliation_category IS NULL OR resolution_state IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_inception_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_inception_journal_links WHERE created_at IS NULL OR item_id IS NULL OR journal_id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR prepared_by IS NULL OR prepared_version IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_inception_mapping_authorizations' AS relation,count(*)::text AS violations FROM public.accounting_inception_mapping_authorizations WHERE account_id IS NULL OR account_version IS NULL OR created_at IS NULL OR item_id IS NULL OR mapping_key IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR preparer_user_id IS NULL OR profile_id IS NULL OR reviewer_user_id IS NULL OR rule_id IS NULL OR rule_version IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_inception_package_versions' AS relation,count(*)::text AS violations FROM public.accounting_inception_package_versions WHERE accounting_start_date IS NULL OR created_at IS NULL OR created_by IS NULL OR cutover_boundary_date IS NULL OR foundation_event_id IS NULL OR package_id IS NULL OR payload IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_inception_packages' AS relation,count(*)::text AS violations FROM public.accounting_inception_packages WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_inception_reviews' AS relation,count(*)::text AS violations FROM public.accounting_inception_reviews WHERE decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR reviewed_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_journal_events' AS relation,count(*)::text AS violations FROM public.accounting_journal_events WHERE actor_user_id IS NULL OR created_at IS NULL OR entity_version IS NULL OR event_type IS NULL OR id IS NULL OR idempotent_replay IS NULL OR operation IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'accounting_journal_line_versions' AS relation,count(*)::text AS violations FROM public.accounting_journal_line_versions WHERE account_code_snapshot IS NULL OR account_id IS NULL OR account_name_ar_snapshot IS NULL OR account_name_en_snapshot IS NULL OR account_type_snapshot IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR description_ar IS NULL OR description_en IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR mapping_key IS NULL OR normal_balance_snapshot IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR rule_version IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_journal_versions' AS relation,count(*)::text AS violations FROM public.accounting_journal_versions WHERE accounting_date IS NULL OR created_at IS NULL OR currency IS NULL OR description_ar IS NULL OR description_en IS NULL OR economic_event_key IS NULL OR foundation_event_id IS NULL OR journal_id IS NULL OR payload_fingerprint IS NULL OR period_id IS NULL OR period_version IS NULL OR posting_purpose IS NULL OR posting_rule_id IS NULL OR prepared_at IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR profile_version IS NULL OR reason IS NULL OR rule_version IS NULL OR source_domain IS NULL OR source_record_key IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_journals' AS relation,count(*)::text AS violations FROM public.accounting_journals WHERE correction_group_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_period_close_packages' AS relation,count(*)::text AS violations FROM public.accounting_period_close_packages WHERE accounting_cutoff IS NULL OR evidence_fingerprint IS NULL OR evidence_ref IS NULL OR evidence_snapshot IS NULL OR exception_codes IS NULL OR id IS NULL OR ledger_fingerprint IS NULL OR package_kind IS NULL OR package_state IS NULL OR package_version IS NULL OR period_end_date IS NULL OR period_id IS NULL OR period_start_date IS NULL OR prepared_at IS NULL OR preparer_user_id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at_cutoff IS NULL OR request_fingerprint IS NULL OR request_id IS NULL OR starting_period_version IS NULL
UNION ALL
SELECT 'accounting_period_close_reviews' AS relation,count(*)::text AS violations FROM public.accounting_period_close_reviews WHERE decision IS NULL OR id IS NULL OR package_id IS NULL OR package_version IS NULL OR period_id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR request_fingerprint IS NULL OR request_id IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_period_versions' AS relation,count(*)::text AS violations FROM public.accounting_period_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR end_date IS NULL OR foundation_event_id IS NULL OR period_id IS NULL OR profile_id IS NULL OR reason IS NULL OR start_date IS NULL OR status IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_periods' AS relation,count(*)::text AS violations FROM public.accounting_periods WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_posting_rule_mappings' AS relation,count(*)::text AS violations FROM public.accounting_posting_rule_mappings WHERE account_id IS NULL OR account_version IS NULL OR allowed_side IS NULL OR mapping_key IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR rule_version IS NULL OR service_requirement IS NULL
UNION ALL
SELECT 'accounting_posting_rule_versions' AS relation,count(*)::text AS violations FROM public.accounting_posting_rule_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR foundation_event_id IS NULL OR is_active IS NULL OR name_ar IS NULL OR name_en IS NULL OR posting_rule_id IS NULL OR profile_id IS NULL OR reason IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_posting_rules' AS relation,count(*)::text AS violations FROM public.accounting_posting_rules WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL OR rule_code IS NULL
UNION ALL
SELECT 'accounting_profile_versions' AS relation,count(*)::text AS violations FROM public.accounting_profile_versions WHERE activation_state IS NULL OR created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR endorsement_context IS NULL OR fatoora_state IS NULL OR fiscal_end_day IS NULL OR fiscal_end_month IS NULL OR fiscal_start_day IS NULL OR fiscal_start_month IS NULL OR fiscal_timezone IS NULL OR foundation_event_id IS NULL OR framework_edition IS NULL OR framework_key IS NULL OR functional_currency IS NULL OR legal_fiscal_evidence_pending IS NULL OR policy_version IS NULL OR professional_validation_state IS NULL OR profile_id IS NULL OR reason IS NULL OR vat_mode IS NULL OR version IS NULL OR zatca_state IS NULL
UNION ALL
SELECT 'accounting_profiles' AS relation,count(*)::text AS violations FROM public.accounting_profiles WHERE company_settings_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR singleton_key IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangement_reviews' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangement_reviews WHERE arrangement_id IS NULL OR arrangement_version IS NULL OR decision IS NULL OR foundation_event_id IS NULL OR id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangement_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangement_versions WHERE arrangement_id IS NULL OR consideration_halalah IS NULL OR created_at IS NULL OR created_by IS NULL OR currency IS NULL OR foundation_event_id IS NULL OR policy_version IS NULL OR principal_agent_basis IS NULL OR profile_id IS NULL OR reason IS NULL OR source_approved_at IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR status IS NULL OR units_snapshot IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_arrangements' AS relation,count(*)::text AS violations FROM public.accounting_revenue_arrangements WHERE approved_billing_scope_id IS NULL OR created_at IS NULL OR current_version IS NULL OR customer_id IS NULL OR id IS NULL OR profile_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence WHERE arrangement_id IS NULL OR created_at IS NULL OR current_version IS NULL OR evidence_key IS NULL OR id IS NULL OR profile_id IS NULL OR unit_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence_reviews' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_reviews WHERE decision IS NULL OR evidence_id IS NULL OR evidence_version IS NULL OR foundation_event_id IS NULL OR id IS NULL OR profile_id IS NULL OR reason IS NULL OR recorded_at IS NULL OR reviewer_user_id IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_evidence_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_evidence_versions WHERE arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_basis IS NULL OR evidence_id IS NULL OR evidence_ref IS NULL OR evidence_sha256 IS NULL OR foundation_event_id IS NULL OR performance_from IS NULL OR performance_through IS NULL OR profile_id IS NULL OR rationale IS NULL OR status IS NULL OR unit_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_unit_versions' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_unit_versions WHERE allocated_halalah IS NULL OR arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR created_by IS NULL OR foundation_event_id IS NULL OR profile_id IS NULL OR promised_output IS NULL OR required_evidence_basis IS NULL OR satisfaction_method IS NULL OR source_allocations IS NULL OR unit_id IS NULL OR version IS NULL
UNION ALL
SELECT 'accounting_revenue_performance_units' AS relation,count(*)::text AS violations FROM public.accounting_revenue_performance_units WHERE arrangement_id IS NULL OR created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL OR unit_key IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_events' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_events WHERE accounting_date IS NULL OR arrangement_id IS NULL OR arrangement_version IS NULL OR created_at IS NULL OR customer_id IS NULL OR economic_event_key IS NULL OR evidence_id IS NULL OR evidence_version IS NULL OR expected_lines IS NULL OR foundation_event_id IS NULL OR id IS NULL OR performance_from IS NULL OR performance_through IS NULL OR prepared_by IS NULL OR profile_id IS NULL OR reason IS NULL OR service_id IS NULL OR signed_delta_halalah IS NULL OR source_record_key IS NULL OR source_snapshot IS NULL OR source_snapshot_sha256 IS NULL OR unit_id IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_journal_lines' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_lines WHERE account_id IS NULL OR account_version IS NULL OR amount_halalah IS NULL OR created_at IS NULL OR customer_id IS NULL OR journal_id IS NULL OR journal_version IS NULL OR line_number IS NULL OR mapping_key IS NULL OR party_role IS NULL OR profile_id IS NULL OR recognition_event_id IS NULL OR service_id IS NULL OR side IS NULL
UNION ALL
SELECT 'accounting_revenue_recognition_journal_links' AS relation,count(*)::text AS violations FROM public.accounting_revenue_recognition_journal_links WHERE created_at IS NULL OR journal_id IS NULL OR prepared_version IS NULL OR profile_id IS NULL OR recognition_event_id IS NULL OR source_effect_id IS NULL
UNION ALL
SELECT 'accounting_source_effects' AS relation,count(*)::text AS violations FROM public.accounting_source_effects WHERE created_at IS NULL OR economic_event_key IS NULL OR id IS NULL OR journal_id IS NULL OR journal_version IS NULL OR payload_fingerprint IS NULL OR posting_purpose IS NULL OR profile_id IS NULL OR source_domain IS NULL OR source_record_key IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_entries' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_entries WHERE account_id IS NULL OR account_version IS NULL OR display_order IS NULL OR label_ar IS NULL OR label_en IS NULL OR line_key IS NULL OR mapping_set_id IS NULL OR mapping_version IS NULL OR profile_id IS NULL OR section_key IS NULL OR statement_type IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_sets' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_sets WHERE created_at IS NULL OR current_version IS NULL OR id IS NULL OR profile_id IS NULL
UNION ALL
SELECT 'accounting_statement_mapping_versions' AS relation,count(*)::text AS violations FROM public.accounting_statement_mapping_versions WHERE created_at IS NULL OR created_by IS NULL OR effective_from IS NULL OR evidence_ref IS NULL OR mapping_set_id IS NULL OR payload_fingerprint IS NULL OR profile_id IS NULL OR reason IS NULL OR request_id IS NULL OR version IS NULL
UNION ALL
SELECT 'app_user_permission_overrides' AS relation,count(*)::text AS violations FROM public.app_user_permission_overrides WHERE created_at IS NULL OR created_by IS NULL OR effect IS NULL OR id IS NULL OR permission IS NULL OR updated_at IS NULL OR updated_by IS NULL OR user_id IS NULL
UNION ALL
SELECT 'app_users' AS relation,count(*)::text AS violations FROM public.app_users WHERE clerk_user_id IS NULL OR id IS NULL OR locale IS NULL OR role IS NULL
UNION ALL
SELECT 'approved_billing_scope_items' AS relation,count(*)::text AS violations FROM public.approved_billing_scope_items WHERE accepted_grand_total IS NULL OR accepted_qty IS NULL OR accepted_subtotal IS NULL OR accepted_unit_price IS NULL OR accepted_vat_amount IS NULL OR approved_billing_scope_id IS NULL OR created_at IS NULL OR decision IS NULL OR display_order IS NULL OR id IS NULL OR source_commercial_role IS NULL OR source_description IS NULL OR source_discount_allocated IS NULL OR source_grand_total IS NULL OR source_is_selected IS NULL OR source_qty IS NULL OR source_quotation_id IS NULL OR source_quotation_item_id IS NULL OR source_subtotal IS NULL OR source_unit IS NULL OR source_unit_price IS NULL OR source_vat_amount IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'approved_billing_scopes' AS relation,count(*)::text AS violations FROM public.approved_billing_scopes WHERE accepted_grand_total IS NULL OR accepted_subtotal IS NULL OR accepted_vat_amount IS NULL OR created_at IS NULL OR id IS NULL OR line_safety_status IS NULL OR scope_version IS NULL OR service_id IS NULL OR source_currency IS NULL OR source_discount IS NULL OR source_pricing_context IS NULL OR source_quotation_grand_total IS NULL OR source_quotation_id IS NULL OR source_quotation_subtotal IS NULL OR source_quotation_vat_amount IS NULL OR source_vat_rate IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'approved_commitment_amendments' AS relation,count(*)::text AS violations FROM public.approved_commitment_amendments WHERE amendment_number IS NULL OR amendment_type IS NULL OR amount_delta IS NULL OR approved_amount_after IS NULL OR approved_at IS NULL OR approved_by IS NULL OR commitment_id IS NULL OR created_at IS NULL OR created_by IS NULL OR evidence_ref IS NULL OR id IS NULL OR reason IS NULL
UNION ALL
SELECT 'approved_commitment_documents' AS relation,count(*)::text AS violations FROM public.approved_commitment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR commitment_id IS NULL OR document_id IS NULL
UNION ALL
SELECT 'approved_commitments' AS relation,count(*)::text AS violations FROM public.approved_commitments WHERE approved_at IS NULL OR approved_by IS NULL OR commitment_source IS NULL OR created_at IS NULL OR created_by IS NULL OR currency IS NULL OR id IS NULL OR original_approved_amount IS NULL OR service_id IS NULL OR status IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'audit_logs' AS relation,count(*)::text AS violations FROM public.audit_logs WHERE action IS NULL OR entity_id IS NULL OR entity_type IS NULL OR id IS NULL
UNION ALL
SELECT 'business_document_links' AS relation,count(*)::text AS violations FROM public.business_document_links WHERE created_at IS NULL OR document_id IS NULL OR link_purpose IS NULL OR linked_by IS NULL OR service_id IS NULL
UNION ALL
SELECT 'business_documents' AS relation,count(*)::text AS violations FROM public.business_documents WHERE bucket_id IS NULL OR created_at IS NULL OR document_type IS NULL OR file_size IS NULL OR id IS NULL OR mime_type IS NULL OR object_path IS NULL OR original_filename IS NULL OR purpose IS NULL OR updated_at IS NULL OR uploaded_by IS NULL
UNION ALL
SELECT 'cash_advance_expense_settlements' AS relation,count(*)::text AS violations FROM public.cash_advance_expense_settlements WHERE amount IS NULL OR cash_advance_id IS NULL OR expense_id IS NULL OR id IS NULL OR request_id IS NULL OR settled_at IS NULL OR settled_by IS NULL
UNION ALL
SELECT 'cash_advance_returns' AS relation,count(*)::text AS violations FROM public.cash_advance_returns WHERE amount IS NULL OR cash_advance_id IS NULL OR id IS NULL OR request_id IS NULL OR returned_at IS NULL OR returned_by IS NULL
UNION ALL
SELECT 'company_settings' AS relation,count(*)::text AS violations FROM public.company_settings WHERE bank_account_holder IS NULL OR bank_iban IS NULL OR bank_name IS NULL OR currency IS NULL OR default_vat_percent IS NULL OR id IS NULL OR legal_name_ar IS NULL OR legal_name_en IS NULL OR national_address IS NULL OR official_email IS NULL OR official_phone IS NULL OR setting_key IS NULL OR vat_mode IS NULL
UNION ALL
SELECT 'customer_credit_application_reversals' AS relation,count(*)::text AS violations FROM public.customer_credit_application_reversals WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_application_id IS NULL
UNION ALL
SELECT 'customer_credit_applications' AS relation,count(*)::text AS violations FROM public.customer_credit_applications WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR remaining_source_credit_after IS NULL OR request_id IS NULL OR source_credit_adjustment_id IS NULL OR target_invoice_id IS NULL OR target_outstanding_after IS NULL
UNION ALL
SELECT 'customer_internal_credit_adjustment_reversals' AS relation,count(*)::text AS violations FROM public.customer_internal_credit_adjustment_reversals WHERE amount IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR effective_date IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_credit_adjustment_id IS NULL
UNION ALL
SELECT 'customer_internal_credit_adjustments' AS relation,count(*)::text AS violations FROM public.customer_internal_credit_adjustments WHERE amount IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR effective_date IS NULL OR id IS NULL OR invoice_id IS NULL OR net_receivable_after IS NULL OR reason IS NULL OR reason_code IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'customer_receipt_allocation_reversals' AS relation,count(*)::text AS violations FROM public.customer_receipt_allocation_reversals WHERE allocation_id IS NULL OR created_at IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL
UNION ALL
SELECT 'customer_receipt_allocations' AS relation,count(*)::text AS violations FROM public.customer_receipt_allocations WHERE allocated_at IS NULL OR allocated_by IS NULL OR amount IS NULL OR created_at IS NULL OR customer_id IS NULL OR id IS NULL OR invoice_id IS NULL OR payment_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'customer_receipt_reversals' AS relation,count(*)::text AS violations FROM public.customer_receipt_reversals WHERE created_at IS NULL OR id IS NULL OR payment_id IS NULL OR reason IS NULL OR request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL
UNION ALL
SELECT 'customer_refund_reversals' AS relation,count(*)::text AS violations FROM public.customer_refund_reversals WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR source_refund_id IS NULL
UNION ALL
SELECT 'customer_refunds' AS relation,count(*)::text AS violations FROM public.customer_refunds WHERE amount IS NULL OR business_date IS NULL OR created_at IS NULL OR created_by IS NULL OR customer_credit_balance_after IS NULL OR customer_id IS NULL OR id IS NULL OR reason IS NULL OR refund_method IS NULL OR remaining_source_credit_after IS NULL OR request_id IS NULL OR service_id IS NULL OR source_credit_adjustment_id IS NULL
UNION ALL
SELECT 'customers' AS relation,count(*)::text AS violations FROM public.customers WHERE city IS NULL OR company IS NULL OR contact IS NULL OR customer_number IS NULL OR email IS NULL OR id IS NULL OR phone IS NULL OR po_required IS NULL OR status IS NULL
UNION ALL
SELECT 'employee_cash_advances' AS relation,count(*)::text AS violations FROM public.employee_cash_advances WHERE advance_number IS NULL OR amount_issued IS NULL OR amount_returned IS NULL OR amount_spent_settled IS NULL OR context_type IS NULL OR created_at IS NULL OR id IS NULL OR purpose IS NULL OR recipient_id IS NULL OR requested_at IS NULL OR requested_by IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'event_cost_budgets' AS relation,count(*)::text AS violations FROM public.event_cost_budgets WHERE approved_at IS NULL OR approved_by IS NULL OR base_budget_amount IS NULL OR budget_version IS NULL OR contingency_amount IS NULL OR created_at IS NULL OR currency IS NULL OR id IS NULL OR reason IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'event_cost_close_reopenings' AS relation,count(*)::text AS violations FROM public.event_cost_close_reopenings WHERE event_cost_close_version_id IS NULL OR id IS NULL OR reason IS NULL OR reopen_request_id IS NULL OR reopened_at IS NULL OR reopened_by IS NULL
UNION ALL
SELECT 'event_cost_close_versions' AS relation,count(*)::text AS violations FROM public.event_cost_close_versions WHERE accepted_commitment IS NULL OR actual_cost IS NULL OR approved_commitment IS NULL OR close_request_id IS NULL OR close_version IS NULL OR closed_at IS NULL OR closed_by IS NULL OR completeness_status IS NULL OR costing_snapshot IS NULL OR eac IS NULL OR effective_date IS NULL OR etc IS NULL OR final_managerial_event_margin IS NULL OR id IS NULL OR net_approved_commercial_value IS NULL OR open_commitment IS NULL OR outstanding_cost IS NULL OR paid_cost IS NULL OR pending_commitment IS NULL OR readiness_evidence IS NULL OR reason IS NULL OR service_id IS NULL OR source_counts IS NULL
UNION ALL
SELECT 'event_cost_etc_forecasts' AS relation,count(*)::text AS violations FROM public.event_cost_etc_forecasts WHERE created_at IS NULL OR etc_amount IS NULL OR forecast_date IS NULL OR forecast_version IS NULL OR id IS NULL OR reason IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'event_milestones' AS relation,count(*)::text AS violations FROM public.event_milestones WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR service_id IS NULL OR status IS NULL OR target_date IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'expense_documents' AS relation,count(*)::text AS violations FROM public.expense_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR expense_id IS NULL
UNION ALL
SELECT 'expense_evidence_exceptions' AS relation,count(*)::text AS violations FROM public.expense_evidence_exceptions WHERE accountable_owner_id IS NULL OR created_at IS NULL OR created_by IS NULL OR disposition IS NULL OR expense_id IS NULL OR id IS NULL OR reason IS NULL OR review_before IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'expense_reimbursement_settlements' AS relation,count(*)::text AS violations FROM public.expense_reimbursement_settlements WHERE amount IS NULL OR expense_id IS NULL OR id IS NULL OR request_id IS NULL OR settled_at IS NULL OR settled_by IS NULL OR settlement_method IS NULL OR settlement_number IS NULL
UNION ALL
SELECT 'expenses' AS relation,count(*)::text AS violations FROM public.expenses WHERE amount IS NULL OR context_type IS NULL OR created_at IS NULL OR currency IS NULL OR description IS NULL OR expense_category IS NULL OR expense_date IS NULL OR expense_number IS NULL OR id IS NULL OR origin_type IS NULL OR payment_method IS NULL OR status IS NULL OR submitted_at IS NULL OR submitted_by IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'invoice_draft_update_mutations' AS relation,count(*)::text AS violations FROM public.invoice_draft_update_mutations WHERE created_at IS NULL OR created_by IS NULL OR due_date IS NULL OR id IS NULL OR invoice_id IS NULL OR invoice_number IS NULL OR mutation_key IS NULL OR requested_amount IS NULL
UNION ALL
SELECT 'invoice_items' AS relation,count(*)::text AS violations FROM public.invoice_items WHERE description IS NULL OR id IS NULL OR invoice_id IS NULL OR qty IS NULL OR total IS NULL OR unit_price IS NULL OR vat IS NULL
UNION ALL
SELECT 'invoices' AS relation,count(*)::text AS violations FROM public.invoices WHERE customer_id IS NULL OR date IS NULL OR due_date IS NULL OR id IS NULL OR invoice_number IS NULL OR invoice_type IS NULL OR status IS NULL
UNION ALL
SELECT 'number_sequences' AS relation,count(*)::text AS violations FROM public.number_sequences WHERE example_format IS NULL OR id IS NULL OR prefix IS NULL OR sequence IS NULL OR type IS NULL OR year IS NULL
UNION ALL
SELECT 'payments' AS relation,count(*)::text AS violations FROM public.payments WHERE amount IS NULL OR customer_id IS NULL OR date IS NULL OR id IS NULL OR method IS NULL OR payment_number IS NULL OR status IS NULL
UNION ALL
SELECT 'petty_cash_funds' AS relation,count(*)::text AS violations FROM public.petty_cash_funds WHERE created_at IS NULL OR current_balance IS NULL OR custodian_id IS NULL OR float_limit IS NULL OR fund_name IS NULL OR id IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'petty_cash_transactions' AS relation,count(*)::text AS violations FROM public.petty_cash_transactions WHERE amount IS NULL OR balance_after IS NULL OR balance_before IS NULL OR fund_id IS NULL OR id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR request_id IS NULL OR transaction_type IS NULL
UNION ALL
SELECT 'project_tasks' AS relation,count(*)::text AS violations FROM public.project_tasks WHERE id IS NULL OR project_id IS NULL OR status IS NULL OR title IS NULL
UNION ALL
SELECT 'projects' AS relation,count(*)::text AS violations FROM public.projects WHERE customer_id IS NULL OR end_date IS NULL OR id IS NULL OR name IS NULL OR project_number IS NULL OR start_date IS NULL OR status IS NULL
UNION ALL
SELECT 'quotation_items' AS relation,count(*)::text AS violations FROM public.quotation_items WHERE category IS NULL OR commercial_role IS NULL OR description IS NULL OR discount_allocated IS NULL OR id IS NULL OR is_selected IS NULL OR qty IS NULL OR quotation_id IS NULL OR total IS NULL OR unit IS NULL OR unit_price IS NULL OR vat IS NULL
UNION ALL
SELECT 'quotations' AS relation,count(*)::text AS violations FROM public.quotations WHERE customer_id IS NULL OR date IS NULL OR discount_type IS NULL OR event IS NULL OR id IS NULL OR quotation_family_id IS NULL OR quotation_number IS NULL OR revision_number IS NULL OR service_id IS NULL OR snapshot_buyer IS NULL OR snapshot_seller IS NULL OR status IS NULL OR valid_until IS NULL OR vat_rate IS NULL
UNION ALL
SELECT 'service_lifecycle_states' AS relation,count(*)::text AS violations FROM public.service_lifecycle_states WHERE close_state IS NULL OR commercial_state IS NULL OR completion_state IS NULL OR created_at IS NULL OR execution_state IS NULL OR legacy_status IS NULL OR mapping_version IS NULL OR payment_state IS NULL OR readiness_state IS NULL OR service_id IS NULL OR state_version IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'service_procurement_candidate_documents' AS relation,count(*)::text AS violations FROM public.service_procurement_candidate_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR requirement_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'service_procurement_candidates' AS relation,count(*)::text AS violations FROM public.service_procurement_candidates WHERE created_at IS NULL OR created_by IS NULL OR currency IS NULL OR evidence_ref IS NULL OR offer_summary IS NULL OR requirement_id IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_package_requirements' AS relation,count(*)::text AS violations FROM public.service_procurement_package_requirements WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR package_id IS NULL OR service_id IS NULL OR sort_order IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_packages' AS relation,count(*)::text AS violations FROM public.service_procurement_packages WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR name IS NULL OR service_id IS NULL OR status IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_procurement_requirements' AS relation,count(*)::text AS violations FROM public.service_procurement_requirements WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR requirement IS NULL OR selection_status IS NULL OR service_id IS NULL OR sourcing_evidence IS NULL OR sourcing_path IS NULL OR sourcing_reason IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_receipt_corrections' AS relation,count(*)::text AS violations FROM public.service_receipt_corrections WHERE corrected_acceptance_status IS NULL OR corrected_at IS NULL OR corrected_by IS NULL OR correction_number IS NULL OR correction_reason IS NULL OR created_at IS NULL OR created_by IS NULL OR id IS NULL OR prior_acceptance_status IS NULL OR prior_decision_at IS NULL OR prior_decision_by IS NULL OR receipt_id IS NULL OR request_id IS NULL
UNION ALL
SELECT 'service_receipt_documents' AS relation,count(*)::text AS violations FROM public.service_receipt_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR receipt_id IS NULL
UNION ALL
SELECT 'service_receipts' AS relation,count(*)::text AS violations FROM public.service_receipts WHERE acceptance_status IS NULL OR commitment_id IS NULL OR created_at IS NULL OR created_by IS NULL OR delivered_scope IS NULL OR id IS NULL OR performance_date IS NULL OR service_id IS NULL OR submitted_at IS NULL OR submitted_by IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'service_supplier_allocations' AS relation,count(*)::text AS violations FROM public.service_supplier_allocations WHERE category IS NULL OR cost_source IS NULL OR created_at IS NULL OR currency IS NULL OR estimated_unit_cost IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR quantity IS NULL OR service_id IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'service_tasks' AS relation,count(*)::text AS violations FROM public.service_tasks WHERE created_at IS NULL OR created_by IS NULL OR id IS NULL OR service_id IS NULL OR status IS NULL OR title IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'services' AS relation,count(*)::text AS violations FROM public.services WHERE created_at IS NULL OR customer_id IS NULL OR id IS NULL OR service_number IS NULL OR service_title IS NULL OR status IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'supplier_advance_allocation_reversals' AS relation,count(*)::text AS violations FROM public.supplier_advance_allocation_reversals WHERE corrected_at IS NULL OR corrected_by IS NULL OR correction_request_id IS NULL OR id IS NULL OR reason IS NULL OR supplier_advance_allocation_id IS NULL
UNION ALL
SELECT 'supplier_advance_allocations' AS relation,count(*)::text AS violations FROM public.supplier_advance_allocations WHERE allocated_at IS NULL OR allocated_by IS NULL OR allocation_number IS NULL OR allocation_request_id IS NULL OR amount IS NULL OR id IS NULL OR supplier_advance_id IS NULL OR supplier_bill_id IS NULL
UNION ALL
SELECT 'supplier_advance_authorization_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_authorization_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advance_authorization_releases' AS relation,count(*)::text AS violations FROM public.supplier_advance_authorization_releases WHERE id IS NULL OR reason IS NULL OR release_request_id IS NULL OR released_at IS NULL OR released_by IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advance_payment_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_payment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_payment_id IS NULL
UNION ALL
SELECT 'supplier_advance_payment_reversals' AS relation,count(*)::text AS violations FROM public.supplier_advance_payment_reversals WHERE id IS NULL OR reason IS NULL OR reversal_request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL OR supplier_advance_payment_id IS NULL
UNION ALL
SELECT 'supplier_advance_payments' AS relation,count(*)::text AS violations FROM public.supplier_advance_payments WHERE amount IS NULL OR id IS NULL OR method IS NULL OR payment_date IS NULL OR payment_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_advance_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_advance_refund_documents' AS relation,count(*)::text AS violations FROM public.supplier_advance_refund_documents WHERE attached_at IS NULL OR attached_by IS NULL OR content_sha256 IS NULL OR document_id IS NULL OR supplier_advance_refund_id IS NULL
UNION ALL
SELECT 'supplier_advance_refunds' AS relation,count(*)::text AS violations FROM public.supplier_advance_refunds WHERE amount IS NULL OR business_date IS NULL OR evidence_sha256 IS NULL OR id IS NULL OR reason IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR refund_number IS NULL OR supplier_advance_id IS NULL
UNION ALL
SELECT 'supplier_advances' AS relation,count(*)::text AS violations FROM public.supplier_advances WHERE advance_number IS NULL OR authorization_request_id IS NULL OR authorized_amount IS NULL OR authorized_at IS NULL OR authorized_by IS NULL OR commitment_id IS NULL OR created_at IS NULL OR currency IS NULL OR evidence_sha256 IS NULL OR id IS NULL OR reason IS NULL OR service_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_bill_documents' AS relation,count(*)::text AS violations FROM public.supplier_bill_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR supplier_bill_id IS NULL
UNION ALL
SELECT 'supplier_bills' AS relation,count(*)::text AS violations FROM public.supplier_bills WHERE bill_number IS NULL OR commitment_id IS NULL OR currency IS NULL OR id IS NULL OR invoice_date IS NULL OR invoice_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR service_receipt_id IS NULL OR status IS NULL OR subtotal IS NULL OR supplier_id IS NULL OR supplier_legal_name_snapshot IS NULL OR supplier_name_snapshot IS NULL OR total_amount IS NULL OR updated_at IS NULL OR updated_by IS NULL OR vat_amount IS NULL
UNION ALL
SELECT 'supplier_bookings' AS relation,count(*)::text AS violations FROM public.supplier_bookings WHERE allocation_snapshot IS NULL OR booking_number IS NULL OR category IS NULL OR created_at IS NULL OR currency IS NULL OR estimated_unit_cost IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR quantity IS NULL OR service_id IS NULL OR source_allocation_id IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL
UNION ALL
SELECT 'supplier_payment_documents' AS relation,count(*)::text AS violations FROM public.supplier_payment_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR supplier_payment_id IS NULL
UNION ALL
SELECT 'supplier_payment_reversals' AS relation,count(*)::text AS violations FROM public.supplier_payment_reversals WHERE id IS NULL OR reason IS NULL OR reversal_request_id IS NULL OR reversed_at IS NULL OR reversed_by IS NULL OR supplier_payment_id IS NULL
UNION ALL
SELECT 'supplier_payments' AS relation,count(*)::text AS violations FROM public.supplier_payments WHERE amount IS NULL OR id IS NULL OR method IS NULL OR payment_date IS NULL OR payment_number IS NULL OR record_request_id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_bill_id IS NULL OR supplier_id IS NULL
UNION ALL
SELECT 'supplier_quotation_documents' AS relation,count(*)::text AS violations FROM public.supplier_quotation_documents WHERE attached_at IS NULL OR attached_by IS NULL OR document_id IS NULL OR quotation_id IS NULL
UNION ALL
SELECT 'supplier_quotation_lines' AS relation,count(*)::text AS violations FROM public.supplier_quotation_lines WHERE created_at IS NULL OR created_by IS NULL OR description IS NULL OR id IS NULL OR line_total IS NULL OR quotation_id IS NULL OR service_id IS NULL OR sort_order IS NULL
UNION ALL
SELECT 'supplier_quotation_requirements' AS relation,count(*)::text AS violations FROM public.supplier_quotation_requirements WHERE created_at IS NULL OR created_by IS NULL OR line_summary IS NULL OR quotation_id IS NULL OR requirement_id IS NULL OR service_id IS NULL
UNION ALL
SELECT 'supplier_quotations' AS relation,count(*)::text AS violations FROM public.supplier_quotations WHERE currency IS NULL OR id IS NULL OR recorded_at IS NULL OR recorded_by IS NULL OR service_id IS NULL OR supplier_id IS NULL OR updated_at IS NULL OR updated_by IS NULL
UNION ALL
SELECT 'supplier_rate_cards' AS relation,count(*)::text AS violations FROM public.supplier_rate_cards WHERE base_cost IS NULL OR created_at IS NULL OR currency IS NULL OR id IS NULL OR is_deleted IS NULL OR item_name IS NULL OR status IS NULL OR supplier_id IS NULL OR unit IS NULL OR updated_at IS NULL OR valid_from IS NULL
UNION ALL
SELECT 'suppliers' AS relation,count(*)::text AS violations FROM public.suppliers WHERE contact IS NULL OR id IS NULL OR is_preferred IS NULL OR name IS NULL OR phone IS NULL OR service IS NULL OR status IS NULL) n WHERE violations<>'0') required_null_violations) q) AS required_nulls,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text AS observation_at,
(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v')) relations,
(SELECT jsonb_build_object('count',count(*)::text,'terminal_version',max(version),'identities_md5',md5(string_agg(version||'/'||name,E'\\n' ORDER BY version))) FROM supabase_migrations.schema_migrations) migration_baseline,
(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'column',a.attname) ORDER BY c.relname,a.attname) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull) required_columns,
(SELECT jsonb_agg(jsonb_build_object('table',t.relname,'index',i.relname,'valid',x.indisvalid,'ready',x.indisready,'unique',x.indisunique,'definition',pg_get_indexdef(x.indexrelid)) ORDER BY t.relname,i.relname) FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public') indexes,
(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'trigger',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) triggers,
(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definer',p.prosecdef,'volatility',p.provolatile,'settings',p.proconfig,'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'source_md5',md5(p.prosrc)) ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') functions,
(SELECT jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'roles',roles,'command',cmd,'qual',qual,'check',with_check) ORDER BY tablename,policyname) FROM pg_policies WHERE schemaname='public') policies,
(SELECT jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type) ORDER BY table_name,grantee,privilege_type) FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('PUBLIC','anon','authenticated','service_role')) grants) q) AS security,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text observation_at,
(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definer',p.prosecdef,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE'),'public_execute',EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),'owner',pg_get_userbyid(p.proowner),'settings',p.proconfig) ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.prorettype<>'trigger'::regtype) definer_rpc_acl,
(SELECT jsonb_agg(jsonb_build_object('view',c.relname,'options',c.reloptions) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v') view_options,
(SELECT jsonb_agg(jsonb_build_object('role',r.role,'capability',r.capability,'effect',r.effect)) FROM(SELECT DISTINCT ON(e.target_user_id,e.capability) u.role,e.capability,e.effect FROM accounting_capability_events e JOIN app_users u ON u.id=e.target_user_id ORDER BY e.target_user_id,e.capability,e.revision DESC)r) current_capability_event_effects,
(SELECT count(*)::text FROM pg_policies WHERE schemaname='public') policy_count) q) AS acl,
(SELECT to_jsonb(q) FROM (SELECT statement_timestamp()::text observation_at,(SELECT jsonb_agg(jsonb_build_object('event_at',timestamp,'operation',details->>'operation','activation_state',details->>'activation_state')) FROM audit_logs WHERE entity_type='accounting_profile' AND action='create') bootstrap_audit,
(SELECT jsonb_agg(jsonb_build_object('profile_version',v.version,'created_at',v.created_at,'foundation_event_type',f.event_type,'foundation_occurred_at',f.occurred_at,'audit_create_count',(SELECT count(*) FROM audit_logs a WHERE a.entity_type='accounting_profile' AND a.action='create' AND a.entity_id::text=v.profile_id::text))) FROM accounting_profile_versions v LEFT JOIN accounting_foundation_events f ON f.id=v.foundation_event_id) profile_provenance,
(SELECT jsonb_agg(jsonb_build_object('setting',setting_key,'vat_mode',vat_mode,'currency',currency,'vat_rate',default_vat_percent::text)) FROM company_settings) tax_configuration,
(SELECT count(*)::text FROM accounting_posting_rules WHERE rule_code LIKE '%INCEPTION%') inception_rule_count) q) AS profile,
(SELECT to_jsonb(q) FROM (WITH missing AS (SELECT DISTINCT a.entity_id::text id FROM audit_logs a WHERE a.entity_type='invoice' AND NOT EXISTS(SELECT 1 FROM invoices i WHERE i.id::text=a.entity_id::text)) SELECT statement_timestamp()::text observation_at,(SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT 'accounting_ap_bridge_events' relation,count(*)::text matched_rows FROM public.accounting_ap_bridge_events t WHERE t.source_record_id::text IN (SELECT id FROM missing) OR t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ap_bridge_journal_lines' relation,count(*)::text matched_rows FROM public.accounting_ap_bridge_journal_lines t WHERE t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ap_bridge_journal_links' relation,count(*)::text matched_rows FROM public.accounting_ap_bridge_journal_links t WHERE t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ar_bridge_event_versions' relation,count(*)::text matched_rows FROM public.accounting_ar_bridge_event_versions t WHERE t.invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ar_bridge_events' relation,count(*)::text matched_rows FROM public.accounting_ar_bridge_events t WHERE t.source_record_id::text IN (SELECT id FROM missing) OR t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ar_bridge_journal_lines' relation,count(*)::text matched_rows FROM public.accounting_ar_bridge_journal_lines t WHERE t.invoice_id::text IN (SELECT id FROM missing) OR t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_ar_bridge_journal_links' relation,count(*)::text matched_rows FROM public.accounting_ar_bridge_journal_links t WHERE t.invoice_id::text IN (SELECT id FROM missing) OR t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_expense_bridge_events' relation,count(*)::text matched_rows FROM public.accounting_expense_bridge_events t WHERE t.source_record_id::text IN (SELECT id FROM missing) OR t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_expense_bridge_journal_lines' relation,count(*)::text matched_rows FROM public.accounting_expense_bridge_journal_lines t WHERE t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_expense_bridge_journal_links' relation,count(*)::text matched_rows FROM public.accounting_expense_bridge_journal_links t WHERE t.source_record_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_inception_coverage' relation,count(*)::text matched_rows FROM public.accounting_inception_coverage t WHERE t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_journal_versions' relation,count(*)::text matched_rows FROM public.accounting_journal_versions t WHERE t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_revenue_recognition_events' relation,count(*)::text matched_rows FROM public.accounting_revenue_recognition_events t WHERE t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'accounting_source_effects' relation,count(*)::text matched_rows FROM public.accounting_source_effects t WHERE t.source_record_key::text IN (SELECT id FROM missing) UNION ALL SELECT 'customer_credit_applications' relation,count(*)::text matched_rows FROM public.customer_credit_applications t WHERE t.target_invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'customer_internal_credit_adjustments' relation,count(*)::text matched_rows FROM public.customer_internal_credit_adjustments t WHERE t.invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'customer_receipt_allocations' relation,count(*)::text matched_rows FROM public.customer_receipt_allocations t WHERE t.invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'invoice_draft_update_mutations' relation,count(*)::text matched_rows FROM public.invoice_draft_update_mutations t WHERE t.invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'invoice_items' relation,count(*)::text matched_rows FROM public.invoice_items t WHERE t.invoice_id::text IN (SELECT id FROM missing) UNION ALL SELECT 'invoices' relation,count(*)::text matched_rows FROM public.invoices t WHERE t.id::text IN (SELECT id FROM missing) UNION ALL SELECT 'payments' relation,count(*)::text matched_rows FROM public.payments t WHERE t.invoice_id::text IN (SELECT id FROM missing)) x) matches) q) AS missing_invoice_links,
(SELECT jsonb_agg(to_jsonb(q)) FROM (SELECT 'invoices' relation,'invoices_invoice_type_check' invariant,count(*)::text violations FROM public.invoices WHERE ((invoice_type = ANY (ARRAY['deposit'::text, 'progress'::text, 'final'::text]))) IS FALSE UNION ALL SELECT 'payments' relation,'payments_amount_positive_check' invariant,count(*)::text violations FROM public.payments WHERE ((amount > (0)::numeric)) IS FALSE UNION ALL SELECT 'payments' relation,'payments_snapshot_completeness_check' invariant,count(*)::text violations FROM public.payments WHERE (((request_id IS NULL) OR (invoice_id IS NULL) OR ((invoice_amount_paid_after IS NOT NULL) AND (invoice_balance_due_after IS NOT NULL) AND (invoice_status_after IS NOT NULL)))) IS FALSE UNION ALL SELECT 'petty_cash_transactions' relation,'chk_petty_cash_expense_linkage' invariant,count(*)::text violations FROM public.petty_cash_transactions WHERE ((((transaction_type = 'disbursement'::text) AND (expense_id IS NOT NULL)) OR ((transaction_type = ANY (ARRAY['replenishment'::text, 'return'::text, 'treasury_withdrawal'::text])) AND (expense_id IS NULL)))) IS FALSE UNION ALL SELECT 'petty_cash_transactions' relation,'chk_petty_cash_withdrawal_reference' invariant,count(*)::text violations FROM public.petty_cash_transactions WHERE (((transaction_type <> 'treasury_withdrawal'::text) OR (NULLIF(btrim(reference), ''::text) IS NOT NULL))) IS FALSE UNION ALL SELECT 'suppliers' relation,'chk_suppliers_category' invariant,count(*)::text violations FROM public.suppliers WHERE (((category IS NULL) OR (category = ANY (ARRAY['transport'::text, 'cars'::text, 'cleaning'::text, 'staff'::text, 'security'::text, 'sound'::text, 'lighting'::text, 'screens_led'::text, 'decoration'::text, 'photo_video'::text, 'catering'::text, 'logistics'::text, 'furniture_tents_stage'::text, 'printing'::text, 'permits_support'::text, 'other'::text])))) IS FALSE UNION ALL SELECT 'suppliers' relation,'chk_suppliers_status' invariant,count(*)::text violations FROM public.suppliers WHERE ((status = ANY (ARRAY['active'::text, 'on_hold'::text, 'blacklisted'::text, 'inactive'::text]))) IS FALSE UNION ALL SELECT 'suppliers' relation,'chk_suppliers_supplier_type' invariant,count(*)::text violations FROM public.suppliers WHERE (((supplier_type IS NULL) OR (supplier_type = ANY (ARRAY['company'::text, 'individual'::text])))) IS FALSE UNION ALL SELECT 'suppliers' relation,'chk_suppliers_vat_registration_status' invariant,count(*)::text violations FROM public.suppliers WHERE (((vat_registration_status IS NULL) OR (vat_registration_status = ANY (ARRAY['not_registered'::text, 'registered'::text, 'unknown'::text])))) IS FALSE) q) AS legacy_checks,
(SELECT jsonb_agg(to_jsonb(q)) FROM (WITH actor AS (SELECT id FROM public.app_users WHERE is_active AND role='admin' AND public.get_accounting_capability(id,'accounting:view')), reads AS (
SELECT 'AR' domain,public.get_accounting_ar_bridge_reconciliation_with_evidence(id,DATE '2026-10-26',statement_timestamp(),500) r FROM actor
UNION ALL SELECT 'AP',public.get_accounting_ap_bridge_reconciliation(id,DATE '2026-10-26',statement_timestamp(),500) FROM actor
UNION ALL SELECT 'EXPENSE',public.get_accounting_expense_bridge_reconciliation(id,DATE '2026-10-26',statement_timestamp(),500) FROM actor
UNION ALL SELECT 'REVENUE',public.get_accounting_revenue_recognition_reconciliation(id,DATE '2026-10-26',statement_timestamp(),500) FROM actor
) SELECT statement_timestamp()::text observation_at,domain,(SELECT jsonb_object_agg(k,r->k) FROM unnest(ARRAY['state','as_of_date','recorded_at_cutoff','source_event_count','posted_effect_count','held_count','missing_effect_count','inception_conflict_count','expected_effect_count','duplicate_conflict_count','control_difference_count','supplier_difference_count','service_difference_count','employee_difference_count','truncated','accrued_unbilled_halalah','accounts_payable_halalah','supplier_advance_halalah','evidence_integrity','total_arrangement_halalah','recognized_revenue_halalah','control_balances','arrangement_count','held_evidence_count','recognition_event_count','revenue_posted_halalah','recognized_to_date_halalah','authoritative_consideration_halalah','contract_balance_difference_count']) k) summary FROM reads) q) AS accounting_reads,
(SELECT to_jsonb(q) FROM (WITH costs AS MATERIALIZED(SELECT s.id,public.get_event_costing(s.id,DATE '2026-10-26') c FROM public.services s WHERE s.deleted_at IS NULL)
SELECT statement_timestamp()::text observation_at,count(*)::text active_services,
COALESCE(sum((c->>'approved_commitment')::numeric),0)::text approved_commitment,
COALESCE(sum((c->>'accepted_commitment')::numeric),0)::text accepted_commitment,
COALESCE(sum((c->>'open_commitment')::numeric),0)::text open_commitment,
COALESCE(sum((c->>'actual_cost')::numeric),0)::text actual_cost,
COALESCE(sum((c->>'paid_cost')::numeric),0)::text paid_cost,
COALESCE(sum((c->>'outstanding_cost')::numeric),0)::text outstanding_cost,
count(*) FILTER(WHERE c->>'status'='COMPLETE')::text complete,
count(*) FILTER(WHERE c->>'status'='PARTIAL')::text partial,
(SELECT jsonb_agg(jsonb_build_object('service_id',id,'status',c->>'status','actual_cost',c->>'actual_cost','paid_cost',c->>'paid_cost','reasons',c->'completeness'->'reason_codes') ORDER BY id) FROM costs) details FROM costs) q) AS costing
;
