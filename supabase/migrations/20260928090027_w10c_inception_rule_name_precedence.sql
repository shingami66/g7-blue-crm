-- W10C correction: parenthesize JSON description extraction before concatenation.
BEGIN;

DO $w10c_rule_name_precedence$
DECLARE
  v_function oid;
  v_old_contract jsonb;
  v_new_contract jsonb;
  v_old_source text;
  v_new_source text;
  v_expected_source text;
  v_english_old text;
  v_english_new text;
  v_arabic_old text;
  v_arabic_new text;
BEGIN
  v_function:=to_regprocedure('public.prepare_accounting_inception_journal(uuid,uuid,integer,uuid,text,uuid)');
  SELECT jsonb_build_object(
    'owner',p.proowner::text,'acl',p.proacl::text,'security_definer',p.prosecdef,
    'leakproof',p.proleakproof,'strict',p.proisstrict,'volatility',p.provolatile::text,
    'parallel',p.proparallel::text,'cost',p.procost,'rows',p.prorows,'config',p.proconfig::text,
    'kind',p.prokind::text,'support',p.prosupport::text,'argtypes',p.proargtypes::text,
    'allargtypes',p.proallargtypes::text,'argmodes',p.proargmodes::text,'argnames',p.proargnames::text,
    'variadic',p.provariadic::text,'argdefaults',p.proargdefaults::text,'transform_types',p.protrftypes::text,
    'return_type',p.prorettype::text,'returns_set',p.proretset,'language',p.prolang::text,
    'binary',p.probin,'sql_body',p.prosqlbody::text
  ),p.prosrc INTO v_old_contract,v_old_source
  FROM pg_catalog.pg_proc p
  WHERE p.oid=v_function
    AND p.prosecdef IS TRUE AND p.proleakproof IS FALSE AND p.proisstrict IS FALSE
    AND p.provolatile='v' AND p.proparallel='u' AND p.procost=100 AND p.prorows=1000
    AND p.proconfig=ARRAY['search_path=pg_catalog, public']
    AND p.prokind='f' AND p.prosupport=0::oid AND p.protrftypes IS NULL
    AND p.proretset IS TRUE AND p.prorettype='record'::regtype
    AND p.prolang=(SELECT l.oid FROM pg_catalog.pg_language l WHERE l.lanname='plpgsql')
    AND p.proargtypes::text='2950 2950 23 2950 25 2950';
  IF v_old_source IS NULL OR md5(v_old_source) IS DISTINCT FROM '3c01ce111aec7efe68d1bbe8eba0421e' THEN
    RAISE EXCEPTION 'W10C preflight: inception journal function source or attributes differ';
  END IF;

  v_english_old:=$english_old$left('Inception: '||v_item->'journal'->>'description_en',160)$english_old$;
  v_english_new:=$english_new$left('Inception: '||(v_item->'journal'->>'description_en'),160)$english_new$;
  v_arabic_old:=$arabic_old$left('افتتاح: '||v_item->'journal'->>'description_ar',160)$arabic_old$;
  v_arabic_new:=$arabic_new$left('افتتاح: '||(v_item->'journal'->>'description_ar'),160)$arabic_new$;
  IF (length(v_old_source)-length(replace(v_old_source,v_english_old,'')))/length(v_english_old)<>1
     OR (length(v_old_source)-length(replace(v_old_source,v_arabic_old,'')))/length(v_arabic_old)<>1
     OR position(v_english_new in v_old_source)>0 OR position(v_arabic_new in v_old_source)>0 THEN
    RAISE EXCEPTION 'W10C preflight: expected inception rule-name expressions differ';
  END IF;
  v_expected_source:=replace(v_old_source,v_english_old,v_english_new);
  v_expected_source:=replace(v_expected_source,v_arabic_old,v_arabic_new);

  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_inception_journal(
    p_actor_user_id uuid,p_package_id uuid,p_package_version integer,p_item_id uuid,
    p_reason text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER
    PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_expected_source);

  SELECT jsonb_build_object(
    'owner',p.proowner::text,'acl',p.proacl::text,'security_definer',p.prosecdef,
    'leakproof',p.proleakproof,'strict',p.proisstrict,'volatility',p.provolatile::text,
    'parallel',p.proparallel::text,'cost',p.procost,'rows',p.prorows,'config',p.proconfig::text,
    'kind',p.prokind::text,'support',p.prosupport::text,'argtypes',p.proargtypes::text,
    'allargtypes',p.proallargtypes::text,'argmodes',p.proargmodes::text,'argnames',p.proargnames::text,
    'variadic',p.provariadic::text,'argdefaults',p.proargdefaults::text,'transform_types',p.protrftypes::text,
    'return_type',p.prorettype::text,'returns_set',p.proretset,'language',p.prolang::text,
    'binary',p.probin,'sql_body',p.prosqlbody::text
  ),p.prosrc INTO v_new_contract,v_new_source
  FROM pg_catalog.pg_proc p
  WHERE p.oid=to_regprocedure('public.prepare_accounting_inception_journal(uuid,uuid,integer,uuid,text,uuid)');
  IF v_new_contract IS DISTINCT FROM v_old_contract OR v_new_source IS DISTINCT FROM v_expected_source THEN
    RAISE EXCEPTION 'W10C postflight: corrected function contract differs';
  END IF;
END;
$w10c_rule_name_precedence$;

COMMIT;
