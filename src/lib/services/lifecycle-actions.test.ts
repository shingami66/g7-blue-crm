import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { mock } from "node:test";

const ROOT = new URL("../../", import.meta.url);
const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, ROOT), "utf8");

function withoutSqlComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

function executableSqlSection(
  source: string,
  startMarker: string,
  endMarker: string,
) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing executable SQL marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing executable SQL marker: ${endMarker}`);
  return source.slice(start, end);
}

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";

type LifecycleScenario = {
  denyPermission: boolean;
  clientCalls: number;
  permissionCalls: string[];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcData: unknown;
  rpcError: { message: string } | null;
};

let lifecycleScenario: LifecycleScenario | null = null;

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

function scenario(): LifecycleScenario {
  if (!lifecycleScenario) throw new Error("Lifecycle scenario was not configured");
  return lifecycleScenario;
}

function startScenario(overrides: Partial<LifecycleScenario> = {}) {
  lifecycleScenario = {
    denyPermission: false,
    clientCalls: 0,
    permissionCalls: [],
    rpcCalls: [],
    rpcData: [{ error_code: null, service_id: SERVICE_ID, service_status: "In Progress", idempotent_replay: false }],
    rpcError: null,
    ...overrides,
  };
  return lifecycleScenario;
}

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("@/lib/auth/errors", {
  namedExports: { ForbiddenError: TestForbiddenError, UnauthorizedError: TestUnauthorizedError },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      const active = scenario();
      active.permissionCalls.push(permission);
      if (active.denyPermission) throw new TestForbiddenError("Denied by test scenario");
      return { clerk_user_id: "server-derived-actor", role: "manager" };
    },
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      const active = scenario();
      active.clientCalls += 1;
      return {
        rpc: async (name: string, args: Record<string, unknown>) => {
          active.rpcCalls.push({ name, args });
          return { data: active.rpcData, error: active.rpcError };
        },
      };
    },
  },
});
mock.module("./queries.ts", { namedExports: { getServiceById: async () => null } });

const { startServiceExecution, completeService, cancelService } = await import("./actions.ts");

test("lifecycle actions derive the actor server-side and validate an exact Start result", async () => {
  const active = startScenario();
  const result = await startServiceExecution(SERVICE_ID);

  assert.deepEqual(result, { success: true, data: { id: SERVICE_ID, status: "In Progress", idempotent: false } });
  assert.deepEqual(active.permissionCalls, ["services:update_status"]);
  assert.equal(active.clientCalls, 1);
  assert.deepEqual(active.rpcCalls, [{
    name: "start_service_execution",
    args: { p_service_id: SERVICE_ID, p_actor_id: "server-derived-actor", p_actor_role: "manager" },
  }]);
});

test("lifecycle actions reject invalid input and permission denial before an RPC", async () => {
  const invalid = startScenario();
  assert.equal((await completeService("not-a-uuid")).code, "INVALID_INPUT");
  assert.equal(invalid.clientCalls, 0);
  assert.equal(invalid.rpcCalls.length, 0);

  const denied = startScenario({ denyPermission: true });
  assert.equal((await startServiceExecution(SERVICE_ID)).code, "FORBIDDEN");
  assert.equal(denied.clientCalls, 0);
  assert.equal(denied.rpcCalls.length, 0);
});

test("lifecycle actions reject malformed and multi-row result responses", async () => {
  const malformed = startScenario({ rpcData: [] });
  assert.equal((await completeService(SERVICE_ID)).code, "SERVICE_TRANSITION_FAILED");
  assert.equal(malformed.rpcCalls.length, 1);

  const extraField = startScenario({
    rpcData: [{ error_code: null, service_id: SERVICE_ID, service_status: "Completed", idempotent_replay: false, leaked: true }],
  });
  assert.equal((await completeService(SERVICE_ID)).code, "SERVICE_TRANSITION_FAILED");
  assert.equal(extraField.rpcCalls.length, 1);

  const multiRow = startScenario({
    rpcData: [
      { error_code: null, service_id: SERVICE_ID, service_status: "Completed", idempotent_replay: false },
      { error_code: null, service_id: SERVICE_ID, service_status: "Completed", idempotent_replay: false },
    ],
  });
  assert.equal((await completeService(SERVICE_ID)).code, "SERVICE_TRANSITION_FAILED");
  assert.equal(multiRow.rpcCalls.length, 1);

  const unsupportedStatus = startScenario({
    rpcData: [{ error_code: null, service_id: SERVICE_ID, service_status: "Unknown", idempotent_replay: false }],
  });
  assert.equal((await completeService(SERVICE_ID)).code, "SERVICE_TRANSITION_FAILED");
  assert.equal(unsupportedStatus.rpcCalls.length, 1);
});

test("Start maps canonical deposit and payment evidence blocks without database details", async () => {
  for (const error_code of [
    "service_deposit_invoice_missing",
    "service_deposit_invoice_ambiguous",
    "service_deposit_invoice_invalid",
    "service_deposit_invoice_not_paid",
    "service_deposit_payment_missing",
    "service_deposit_payment_inconsistent",
  ]) {
    const active = startScenario({
      rpcData: [{ error_code, service_id: SERVICE_ID, service_status: "Deposit Paid", idempotent_replay: false }],
    });
    const result = await startServiceExecution(SERVICE_ID);
    assert.equal(result.code, "SERVICE_FINANCIAL_EXECUTION_BLOCKED");
    assert.equal(active.rpcCalls.length, 1);
    assert.doesNotMatch(result.error ?? "", /database|payment|invoice/i);
  }
});

test("Complete is an operational transition and does not apply financial completion rules", async () => {
  const active = startScenario({
    rpcData: [{ error_code: null, service_id: SERVICE_ID, service_status: "Completed", idempotent_replay: false }],
  });
  const result = await completeService(SERVICE_ID);
  assert.deepEqual(result, {
    success: true,
    data: { id: SERVICE_ID, status: "Completed", idempotent: false },
  });
  assert.equal(active.rpcCalls[0]?.name, "complete_service");
});

test("cancellation trims its reason, rejects blank input, and sends no client actor fields", async () => {
  const blank = startScenario();
  assert.equal((await cancelService(SERVICE_ID, "   ")).code, "INVALID_INPUT");
  assert.equal(blank.rpcCalls.length, 0);

  const active = startScenario({
    rpcData: [{ error_code: null, service_id: SERVICE_ID, service_status: "Cancelled", idempotent_replay: false }],
  });
  assert.equal((await cancelService(SERVICE_ID, "  customer withdrew  ")).success, true);
  assert.deepEqual(active.rpcCalls[0], {
    name: "cancel_service",
    args: { p_service_id: SERVICE_ID, p_reason: "customer withdrew", p_actor_id: "server-derived-actor", p_actor_role: "manager" },
  });
});

test("Service lifecycle actions expose fixed operational RPCs only", () => {
  const source = read("lib/services/actions.ts");
  assert.match(source, /requirePermission\("services:update_status"\)/);
  assert.match(source, /start_service_execution/);
  assert.match(source, /complete_service/);
  assert.match(source, /user\.clerk_user_id/);
  assert.match(source, /user\.role/);
  assert.doesNotMatch(source, /updateServiceStatusAction/);
  assert.match(source, /serviceLifecycleRpcResponseSchema/);
  assert.match(source, /\.length\(1\)/);
});

test("quotation approval correction preserves the public contract and closes the lifecycle gap", () => {
  const source = read("../supabase/migrations/20260803100000_quotation_approval_service_status_transition_fix.sql");
  assert.match(source, /ALTER FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)\s+RENAME TO/);
  assert.match(source, /RETURNS TABLE\([\s\S]*idempotent_replay boolean/);
  assert.match(source, /SET status = 'Approved'/);
  assert.match(source, /v_service_status NOT IN \('Inquiry', 'Quoted', 'Approved'\)/);
  assert.match(source, /v_service_status IN \('Inquiry', 'Quoted'\) AND v_quotation_status = 'approved'/);
  assert.match(source, /INSERT INTO public\.audit_logs/);
  assert.match(source, /SECURITY DEFINER/);
  assert.match(source, /SET search_path = pg_catalog, public/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)\s+TO service_role/);
});

test("explicit Service lifecycle RPCs guard states, finance, reasons, and audit", () => {
  const source = read("../supabase/migrations/20260803110000_service_execution_lifecycle_actions.sql");
  assert.match(source, /CREATE FUNCTION public\.start_service_execution/);
  assert.match(source, /v_status <> 'Deposit Paid'/);
  assert.match(source, /service_deposit_invoice_not_paid/);
  assert.match(source, /service_deposit_payment_inconsistent/);
  assert.match(source, /p\.status <> 'confirmed'/);
  assert.match(source, /v_payment_total <> v_invoice_paid/);
  assert.match(source, /COALESCE\(i\.is_deleted, false\) = false/);
  assert.match(source, /i\.voided_at IS NULL/);
  assert.match(source, /i\.status NOT IN \('voided', 'cancelled'\)/);
  assert.match(source, /v_payment_count = 0/);
  assert.match(source, /v_invoice_balance <> 0/);
  assert.match(source, /CREATE FUNCTION public\.complete_service/);
  assert.doesNotMatch(source, /approved_billing_scopes|service_financial_completion_blocked|service_final_billing_incomplete/);
  assert.match(source, /SET status = 'Completed'/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.start_service_execution/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.complete_service/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.complete_service/);
});

test("Start executable SQL enforces the complete Deposit settlement invariant", () => {
  const migration = withoutSqlComments(
    read("../supabase/migrations/20260803110000_service_execution_lifecycle_actions.sql"),
  );
  const startSql = executableSqlSection(
    migration,
    "CREATE FUNCTION public.start_service_execution",
    "CREATE FUNCTION public.complete_service",
  );

  for (const requiredSchemaCheck of [
    /\('invoices','grand_total','numeric'\)/,
    /\('invoices','amount_paid','numeric'\)/,
    /\('invoices','balance_due','numeric'\)/,
    /\('payments','amount','numeric'\)/,
  ]) {
    assert.match(migration, requiredSchemaCheck);
  }

  for (const requiredPredicate of [
    /i\.grand_total IS NULL/,
    /i\.amount_paid IS NULL/,
    /i\.balance_due IS NULL/,
    /i\.grand_total < 0/,
    /i\.amount_paid < 0/,
    /i\.balance_due < 0/,
    /i\.amount_paid \+ i\.balance_due <> i\.grand_total/,
    /v_invoice_status <> 'paid'/,
    /p\.amount IS NULL/,
    /p\.amount < 0/,
    /p\.status <> 'confirmed'/,
    /v_payment_total <> v_invoice_paid/,
    /v_invoice_total <> v_invoice_paid/,
    /v_invoice_balance <> 0/,
  ]) {
    assert.match(startSql, requiredPredicate);
  }

  const contradictionCases = [
    {
      name: "confirmed payments equal amount_paid but the invoice equation contradicts grand_total",
      predicates: [
        /v_payment_total <> v_invoice_paid/,
        /i\.amount_paid \+ i\.balance_due <> i\.grand_total/,
      ],
    },
    {
      name: "zero balance but amount_paid differs from grand_total",
      predicates: [/v_invoice_balance <> 0/, /v_invoice_total <> v_invoice_paid/],
    },
    {
      name: "confirmed payment total exceeds amount_paid",
      predicates: [/v_payment_total <> v_invoice_paid/],
    },
    {
      name: "amount_paid exceeds grand_total",
      predicates: [
        /i\.amount_paid \+ i\.balance_due <> i\.grand_total/,
        /v_invoice_total <> v_invoice_paid/,
      ],
    },
    { name: "grand_total is null", predicates: [/i\.grand_total IS NULL/] },
    { name: "amount_paid is null", predicates: [/i\.amount_paid IS NULL/] },
    { name: "balance_due is null", predicates: [/i\.balance_due IS NULL/] },
  ] as const;

  for (const contradiction of contradictionCases) {
    for (const predicate of contradiction.predicates) {
      assert.match(startSql, predicate, contradiction.name);
    }
  }
});

test("Start executable SQL excludes inactive Deposits and rejects multiple current Deposits", () => {
  const migration = withoutSqlComments(
    read("../supabase/migrations/20260803110000_service_execution_lifecycle_actions.sql"),
  );
  const startSql = executableSqlSection(
    migration,
    "CREATE FUNCTION public.start_service_execution",
    "CREATE FUNCTION public.complete_service",
  );

  for (const currentDepositPredicate of [
    /i\.invoice_type = 'deposit'/,
    /COALESCE\(i\.is_deleted, false\) = false/,
    /i\.voided_at IS NULL/,
    /i\.status NOT IN \('voided', 'cancelled'\)/,
    /v_deposit_count <> 1/,
  ]) {
    assert.match(startSql, currentDepositPredicate);
  }
});

test("cancellation remains conservative, atomic, and free of implicit ABS Void", () => {
  const source = read("../supabase/migrations/20260803120000_service_cancellation_guarded_action.sql");
  assert.match(source, /unexpected lifecycle overload exists/);
  assert.match(source, /v_status NOT IN \('Inquiry','Quoted','Approved'\)/);
  assert.match(source, /char_length\(v_reason\)>1000/);
  assert.match(source, /FROM public\.invoices i WHERE i\.service_id=p_service_id/);
  assert.match(source, /FROM public\.payments p JOIN public\.invoices i ON i\.id=p\.invoice_id/);
  assert.match(source, /approved_billing_scopes a WHERE a\.service_id=p_service_id/);
  assert.match(source, /UPDATE public\.services/);
  assert.match(source, /INSERT INTO public\.audit_logs/);
  assert.doesNotMatch(source, /void_approved_billing_scope/);
  assert.match(source, /SET search_path=pg_catalog,public/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.cancel_service/);
});

test("cancellation executable preflight validates every mutated Service metadata column", () => {
  const migration = withoutSqlComments(
    read("../supabase/migrations/20260803120000_service_cancellation_guarded_action.sql"),
  );
  const preflightSql = executableSqlSection(
    migration,
    "DO $$",
    "CREATE FUNCTION public.cancel_service",
  );

  assert.match(preflightSql, /\('services','updated_by','text'\)/);
  assert.match(
    preflightSql,
    /\('services','updated_at','timestamp with time zone'\)/,
  );
  assert.match(
    preflightSql,
    /format_type\(a\.atttypid,a\.atttypmod\) LIKE required_columns\.type_name\|\|'%'/,
  );
});

test("normal Service UX hides technical ABS workflow and uses evidence-backed activity", () => {
  const page = read("app/(dashboard)/services/[id]/page.tsx");
  const billing = read("app/(dashboard)/services/[id]/ServiceBillingSummaryCard.tsx");
  const activity = read("app/(dashboard)/services/[id]/ServiceActivityHistory.tsx");
  const query = read("lib/services/activity-queries.ts");
  assert.match(page, /ServiceLifecycleActions/);
  assert.match(page, /ServiceActivityHistory/);
  assert.doesNotMatch(page, /ServiceStatusControl|ServiceStatusTimeline|<ApprovedBillingScopesCard/);
  assert.doesNotMatch(billing, /billingAuthorityAbs|Approved Billing Scope/);
  assert.match(activity, /<details/);
  assert.match(activity, /No inferred timeline|serviceActivity\.updated/);
  assert.match(query, /from\("audit_logs"\)/);
  assert.match(query, /\.eq\("entity_type", "service"\)/);
  assert.match(query, /from\("app_users"\)/);
  assert.match(query, /\.in\("clerk_user_id", actorIds\)/);
  assert.doesNotMatch(activity, /event\.userId/);
  assert.match(activity, /serviceActivity\.depositPaymentConfirmed/);
  assert.match(activity, /serviceActivity\.systemActor/);
  assert.match(activity, /serviceActivity\.unknownActor/);
});

test("Activity History uses a full divider instead of a directional side stripe", () => {
  const activity = read("app/(dashboard)/services/[id]/ServiceActivityHistory.tsx");

  assert.doesNotMatch(activity, /border-s-2|border-e-2|border-l-2|border-r-2/);
  assert.match(activity, /border-b border-surface-variant/);
  assert.match(activity, /<ol className="space-y-4">/);
  assert.match(activity, /<li key=\{event\.id\}/);
  assert.match(activity, /<details className=/);
});

test("cancellation uses progressive disclosure and preserves backend authority", () => {
  const component = read("app/(dashboard)/services/[id]/ServiceLifecycleActions.tsx");

  assert.match(component, /const \[isCancellationOpen, setIsCancellationOpen\] = useState\(false\)/);
  assert.match(component, /!isCancellationOpen \? \(/);
  assert.match(component, /aria-controls="service-cancellation-disclosure"/);
  assert.match(component, /id="service-cancellation-disclosure"/);
  assert.match(component, /autoFocus/);
  assert.match(component, /type="submit"/);
  assert.match(component, /reason\.trim\(\)\.length === 0/);
  assert.match(component, /onClick=\{closeCancellation\}/);
  assert.match(component, /cancelService\(serviceId, reason\)/);
  assert.match(component, /disabled=\{isPending/);
  assert.doesNotMatch(component, /window\.confirm|confirmCancellation/);
});
