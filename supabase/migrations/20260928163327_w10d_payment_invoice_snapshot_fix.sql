-- W10D corrective: use the payment's invoice FK in its immutable source snapshot.
-- The deployed body and execution contract are pinned and rechecked before commit.
BEGIN;

DO $w10d_payment_snapshot_fix$
DECLARE
  v_function oid;
  v_source text;
  v_fixed_source text;
  v_old text;
  v_new text;
  v_before_owner oid;
  v_before_acl aclitem[];
  v_before_config text[];
  v_before_volatility "char";
  v_before_parallel "char";
  v_before_cost real;
  v_before_rows real;
  v_before_strict boolean;
  v_before_leakproof boolean;
  v_before_security boolean;
  v_after_source text;
  v_after_owner oid;
  v_after_acl aclitem[];
  v_after_config text[];
  v_after_volatility "char";
  v_after_parallel "char";
  v_after_cost real;
  v_after_rows real;
  v_after_strict boolean;
  v_after_leakproof boolean;
  v_after_security boolean;
BEGIN
  v_function:=to_regprocedure('public.accounting_ar_bridge_source_snapshot(text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
  INTO v_source,v_before_owner,v_before_acl,v_before_config,v_before_volatility,v_before_parallel,
    v_before_cost,v_before_rows,v_before_strict,v_before_leakproof,v_before_security
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;

  IF v_function IS NULL OR v_source IS NULL
     OR md5(v_source) IS DISTINCT FROM '54913518430ebe040422e71e5924bf2e'
     OR v_before_owner IS DISTINCT FROM (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname='postgres')
     OR v_before_acl IS DISTINCT FROM '{postgres=X/postgres}'::aclitem[]
     OR v_before_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR v_before_volatility<>'s' OR v_before_parallel<>'u' OR v_before_cost<>100 OR v_before_rows<>0
     OR v_before_strict OR v_before_leakproof OR NOT v_before_security THEN
    RAISE EXCEPTION 'W10D payment snapshot correction preflight: deployed function contract differs';
  END IF;

  v_old:='SELECT p.customer_id,i.service_id,i.invoice_id,p.amount,p.date,p.created_at,p.created_at,';
  v_new:='SELECT p.customer_id,i.service_id,p.invoice_id,p.amount,p.date,p.created_at,p.created_at,';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D payment snapshot correction preflight: payment query anchor differs';
  END IF;
  v_fixed_source:=replace(v_source,v_old,v_new);
  IF md5(v_fixed_source) IS DISTINCT FROM '5a76e26417a0a4e1d90c9830271649d5'
     OR position(v_old IN v_fixed_source)>0 THEN
    RAISE EXCEPTION 'W10D payment snapshot correction preflight: repaired body differs';
  END IF;

  EXECUTE format($ddl$
    CREATE OR REPLACE FUNCTION public.accounting_ar_bridge_source_snapshot(
      p_source_type text,p_source_record_id uuid
    ) RETURNS jsonb
      LANGUAGE plpgsql STABLE CALLED ON NULL INPUT SECURITY DEFINER PARALLEL UNSAFE COST 100
      SET search_path=pg_catalog, public AS %L
  $ddl$,v_fixed_source);

  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
  INTO v_after_source,v_after_owner,v_after_acl,v_after_config,v_after_volatility,v_after_parallel,
    v_after_cost,v_after_rows,v_after_strict,v_after_leakproof,v_after_security
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_source IS DISTINCT FROM v_fixed_source
     OR md5(v_after_source) IS DISTINCT FROM '5a76e26417a0a4e1d90c9830271649d5'
     OR v_after_owner IS DISTINCT FROM v_before_owner OR v_after_acl IS DISTINCT FROM v_before_acl
     OR v_after_config IS DISTINCT FROM v_before_config OR v_after_volatility IS DISTINCT FROM v_before_volatility
     OR v_after_parallel IS DISTINCT FROM v_before_parallel OR v_after_cost IS DISTINCT FROM v_before_cost
     OR v_after_rows IS DISTINCT FROM v_before_rows OR v_after_strict IS DISTINCT FROM v_before_strict
     OR v_after_leakproof IS DISTINCT FROM v_before_leakproof OR v_after_security IS DISTINCT FROM v_before_security THEN
    RAISE EXCEPTION 'W10D payment snapshot correction postflight: function contract changed';
  END IF;
END;
$w10d_payment_snapshot_fix$;

COMMIT;
