import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const sql = read("supabase/migrations/20260906120000_w4_architecture_remediation.sql");
const executable = (text: string) => text.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
function body(source: string, name: string) {
  const start = source.indexOf(`FUNCTION public.${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf("$$;", start);
  assert.ok(end > start, name);
  return executable(source.slice(start, end + 3));
}

// These are SQL/source contract checks, not database integration results.
// Real persistence regression cases are supplied in supabase/verification and
// require separate authorization before executing against an applied database.
test("forward requirement contract retains identity and historical quotation links", () => {
  const setter = body(sql, "set_procurement_package_requirements");
  assert.doesNotMatch(setter, /DELETE FROM|UPDATE public\.supplier_quotation/);
  assert.match(setter, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(setter, /v_id := COALESCE\(v_id, gen_random_uuid\(\)\)/);
  assert.match(setter, /SET retired_at = v_now, retired_by = p_actor_id/);
  assert.match(setter, /r\.id = v_id AND r\.package_id = p_package_id AND r\.service_id = p_service_id AND r\.retired_at IS NULL/);
  assert.match(setter, /'from', v_before, 'to', v_after/);
  assert.match(setter, /EXCEPTION WHEN invalid_text_representation/);
  assert.match(executable(sql), /supplier_quotation_lines_pkg_req_fkey FOREIGN KEY \(package_requirement_id, service_id\) REFERENCES public\.service_procurement_package_requirements\(id, service_id\) ON DELETE RESTRICT/);
});

test("current requirement selectors exclude retirement while quotation history remains readable", () => {
  assert.match(read("src/lib/procurement/package-queries.ts"), /\.in\("package_id", packageIds\)\s*\.is\("retired_at", null\)/);
  const queries = read("src/lib/procurement/queries.ts");
  const start = queries.indexOf("export async function getPackageRequirementsForQuotation");
  const end = queries.indexOf("export async function", start + 30);
  assert.match(queries.slice(start, end), /\.is\("retired_at", null\)/);
  assert.equal((queries.match(/\.is\("retired_at", null\)/g) ?? []).length, 1);
  assert.match(body(sql, "check_supplier_quotation_requirement_current"), /r\.retired_at IS NULL/);
});

test("both receipt decision boundaries enforce separation before replay or writes", () => {
  for (const name of ["review_service_receipt", "correct_service_receipt"]) {
    const code = body(sql, name);
    const guard = code.indexOf("IF v_submitter = p_actor_id");
    assert.ok(guard > code.indexOf("FOR UPDATE;"));
    assert.ok(guard < code.indexOf("IF FOUND THEN"));
    assert.ok(guard < code.indexOf("UPDATE public.service_receipts"));
    assert.match(code, /p_actor_role NOT IN \('admin', 'manager'\)/);
    assert.match(code, /'service_receipt_self_review_forbidden'/);
    assert.match(code, /'ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED'/);
  }
});

test("cancellation preserves the entire existing guard and audit body plus one open-obligation check", () => {
  const previous = body(read("supabase/migrations/20260803120000_service_cancellation_guarded_action.sql"), "cancel_service");
  const current = body(sql, "cancel_service");
  const addition = "IF EXISTS (SELECT 1 FROM public.approved_commitments c WHERE c.service_id = p_service_id AND c.status = 'open') THEN RETURN QUERY SELECT 'service_supplier_commitment_unresolved', p_service_id, v_status, false; RETURN; END IF; ";
  assert.ok(current.includes(addition));
  assert.equal(current.replace(addition, ""), previous);
  assert.ok(current.indexOf("FOR UPDATE") < current.indexOf(addition));
  assert.ok(current.indexOf(addition) < current.indexOf("UPDATE public.services"));
});

test("reopen preserves closed evidence, lifecycle authority, replay and correction arithmetic", () => {
  const transition = body(sql, "transition_approved_commitment");
  assert.match(transition, /p_action = 'reopen' AND v_status <> 'closed'/);
  assert.match(transition, /v_reason IS NULL/);
  assert.match(transition, /p_actor_role NOT IN \('admin', 'manager'\)/);
  assert.match(transition, /v_parent_status = 'Cancelled' OR v_parent_deleted IS NOT NULL/);
  assert.ok(transition.indexOf("FOR UPDATE OF s") < transition.indexOf("FOR UPDATE;"));
  assert.ok(transition.indexOf("INTO v_close_evidence") < transition.indexOf("closed_at = NULL"));
  assert.match(transition, /'approved_commitment_reopened'/);
  assert.match(transition, /'close_evidence', v_close_evidence/);
  assert.match(transition, /v_audit_payload IS DISTINCT FROM v_payload/);
  assert.match(transition, /v_authorized_amount - v_reserved_amount/);
  const correction = body(sql, "correct_service_receipt");
  assert.match(correction, /v_commitment_status <> 'open'/);
  assert.match(correction, /INSERT INTO public\.service_receipt_corrections/);
  assert.match(correction, /v_reserved_amount \+ COALESCE\(p_corrected_received_amount, 0\) > v_authorized_amount/);
});

test("all replaced RPCs keep fixed search paths and service-role-only execution", () => {
  for (const name of ["set_procurement_package_requirements", "review_service_receipt", "cancel_service", "transition_approved_commitment", "correct_service_receipt"]) {
    assert.match(body(sql, name), /SECURITY DEFINER SET search_path\s*=\s*pg_catalog,\s*public/);
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+FROM PUBLIC, anon, authenticated;`));
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]+TO service_role;`));
  }
});

test("current docs use the implemented Admin Users route and preserve wave gates", () => {
  assert.ok(existsSync(join(root, "src/app/(dashboard)/admin/users/page.tsx")));
  for (const path of ["docs/project-status.md", "docs/design/G7-ERP-DESIGN-CONTRACT.md"]) {
    assert.match(read(path), /\/admin\/users/);
    assert.doesNotMatch(read(path), /\/settings\/users/);
  }
  for (const path of ["docs/project-status.md", "docs/project-roadmap.md", "docs/product/g7-layer1-technical-master-plan.md", "docs/deferred-decisions.md", "docs/product/event-erp-decision-register.md"]) {
    const doc = read(path);
    assert.match(doc, /CLOSED \/ COMPLETED/); assert.match(doc, /LOCKED \/ UNSTARTED/);
  }
  const master = read("docs/product/g7-layer1-technical-master-plan.md");
  const residual = master.slice(master.indexOf("### 15.1"), master.indexOf("## 16."));
  for (let id = 1; id <= 8; id++) assert.match(residual, new RegExp(`L1-R0${id}`));
  for (const item of ["Percentage discount", "Change Orders", "ABS supersession", "Event Brief", "Tasks", "Milestones", "Issues", "Team / Resources"]) assert.ok(residual.includes(item), item);
  assert.match(residual, /Product Truth closed\?/);
  assert.match(residual, /W11 cannot claim complete Layer 1 proof/);
  const register = read("docs/product/event-erp-decision-register.md");
  assert.doesNotMatch(register, /supplier comparison where useful|sourcing\/quote\/comparison|document form, comparison layout/);
  assert.match(register, /PROC-01[^\n]+legacy compatibility only, not current workflow authority/);
  assert.match(register, /PROC-05[^\n]+historical candidate comparison evidence[^\n]+legacy compatibility evidence only/);
  assert.match(register, /PROC-06[^\n]+Comparison layout is superseded as current planning scope by G7-OD-18/);
  assert.match(master.slice(master.indexOf("## 30."), master.indexOf("## 31.")), /W4 final engineering closeout completed/);
  assert.doesNotMatch(master.slice(0, master.indexOf("## 1.")), /next bounded W2.*W2C.*preflight/);
});
