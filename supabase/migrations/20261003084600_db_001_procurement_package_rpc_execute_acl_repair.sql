-- DB-001: restrict Procurement Package mutation RPCs to the server role.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.select_procurement_package_supplier(uuid,uuid,uuid,uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_procurement_package_supplier(uuid,uuid,uuid,uuid,text,text,uuid,text,text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.clear_procurement_package_supplier(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_procurement_package_supplier(uuid,uuid,uuid,text,text) TO service_role;

COMMIT;
