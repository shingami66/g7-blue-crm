import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const normalize = (source: string) =>
  source.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim().toLowerCase();

const repairPath =
  "supabase/migrations/20261003084600_db_001_procurement_package_rpc_execute_acl_repair.sql";
const repair = normalize(read(repairPath));
const requirementsAcl = normalize(
  read("supabase/migrations/20260907085656_w4_architecture_remediation.sql"),
);

const packageMutationRpcs = [
  {
    name: "upsert_procurement_package",
    signature: "uuid,uuid,text,text,text,uuid,text,text",
    source: repair,
    revoke: "execute",
  },
  {
    name: "select_procurement_package_supplier",
    signature: "uuid,uuid,uuid,uuid,text,text,uuid,text,text",
    source: repair,
    revoke: "execute",
  },
  {
    name: "clear_procurement_package_supplier",
    signature: "uuid,uuid,uuid,text,text",
    source: repair,
    revoke: "execute",
  },
  {
    name: "set_procurement_package_requirements",
    signature: "uuid,uuid,jsonb,uuid,text,text",
    source: requirementsAcl,
    revoke: "all",
  },
] as const;

test("DB-001 migration changes only the three authorized RPC EXECUTE ACLs", () => {
  const statements = repair.split(";").map((statement) => statement.trim()).filter(Boolean);
  assert.deepEqual(statements, [
    "begin",
    "revoke execute on function public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text) from public, anon, authenticated",
    "grant execute on function public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text) to service_role",
    "revoke execute on function public.select_procurement_package_supplier(uuid,uuid,uuid,uuid,text,text,uuid,text,text) from public, anon, authenticated",
    "grant execute on function public.select_procurement_package_supplier(uuid,uuid,uuid,uuid,text,text,uuid,text,text) to service_role",
    "revoke execute on function public.clear_procurement_package_supplier(uuid,uuid,uuid,text,text) from public, anon, authenticated",
    "grant execute on function public.clear_procurement_package_supplier(uuid,uuid,uuid,text,text) to service_role",
    "commit",
  ]);
});

test("all four Procurement Package mutation RPCs are service-role-only for application roles", () => {
  for (const rpc of packageMutationRpcs) {
    assert.ok(
      rpc.source.includes(
        `revoke ${rpc.revoke} on function public.${rpc.name}(${rpc.signature}) from public, anon, authenticated`,
      ),
      `${rpc.name} must revoke PUBLIC, anon, and authenticated`,
    );
    assert.ok(
      rpc.source.includes(
        `grant execute on function public.${rpc.name}(${rpc.signature}) to service_role`,
      ),
      `${rpc.name} must preserve service_role execution`,
    );
  }
});
