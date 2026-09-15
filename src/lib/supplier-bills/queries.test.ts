import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryCall = {
  table: string;
  columns?: string;
  selectOptions?: Record<string, unknown>;
  filters: Array<{ op: string; args: unknown[] }>;
  orders: Array<{ column: string; options: { ascending: boolean } }>;
  range?: [number, number];
};

type QueryResponse = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type Scenario = {
  calls: QueryCall[];
  total: number;
  bills: Array<Record<string, unknown>>;
  countError?: unknown;
  dataError?: unknown;
};

let activeScenario: Scenario | null = null;

function scenario(): Scenario {
  if (!activeScenario) throw new Error("scenario not configured");
  return activeScenario;
}

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return {
      url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href,
      shortCircuit: true,
    };
  }
  if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
    return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("server-only", { namedExports: {} });
mock.module("@/lib/auth/permissions", {
  namedExports: { requirePermission: async () => undefined },
});
mock.module("@/lib/auth/role-permissions", {
  namedExports: { SUPPLIER_BILL_PERMISSIONS: { read: "supplier_bills:read" } },
});

function createQueryBuilder(table: string) {
  const call: QueryCall = { table, filters: [], orders: [] };
  scenario().calls.push(call);
  const builder = {
    select(columns: string, options?: Record<string, unknown>) {
      call.columns = columns;
      call.selectOptions = options;
      return builder;
    },
    eq(...args: unknown[]) {
      call.filters.push({ op: "eq", args });
      return builder;
    },
    in(...args: unknown[]) {
      call.filters.push({ op: "in", args });
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      call.orders.push({ column, options });
      return builder;
    },
    range(start: number, end: number) {
      call.range = [start, end];
      return builder;
    },
    then(
      onfulfilled?: ((value: QueryResponse) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      const current = scenario();
      let response: QueryResponse;
      if (table === "supplier_bills" && call.selectOptions?.head) {
        response = { data: null, error: current.countError ?? null, count: current.total };
      } else if (table === "supplier_bills") {
        const [start, end] = call.range ?? [0, Number.MAX_SAFE_INTEGER];
        response = {
          data: current.dataError
            ? null
            : current.bills.slice(start, end + 1),
          error: current.dataError ?? null,
        };
      } else {
        const ids = call.filters.find((filter) => filter.op === "in")?.args[1] as string[] | undefined;
        const contextRows = table === "suppliers" ? supplierRows : serviceRows;
        response = {
          data: ids ? contextRows.filter((row) => ids.includes(String(row.id))) : [],
          error: null,
        };
      }
      return Promise.resolve(response).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };
  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: { createAdminClient: () => ({ from: (table: string) => createQueryBuilder(table) }) },
});
mock.module("@/lib/supplier-payments/queries", {
  namedExports: {
    getSupplierBillPaymentHistory: async () => [],
    getSupplierBillPaymentSummary: async () => null,
  },
});
mock.module("@/lib/supplier-advances/queries", {
  namedExports: { getSupplierBillAdvanceAllocationHistory: async () => [] },
});

const supplierRows = Array.from({ length: 13 }, (_, index) => ({
  id: `supplier-${index % 2}`,
  name: `Supplier ${index % 2}`,
  display_name: `Supplier ${index % 2}`,
}));
const serviceRows = Array.from({ length: 13 }, (_, index) => ({
  id: `service-${index % 3}`,
  service_number: `SVC-2026-${index % 3}`,
  service_title: `Service ${index % 3}`,
  event_name: `Event ${index % 3}`,
}));

const { getSupplierBillsList } = await import("./queries.ts");

function makeBill(index: number): Record<string, unknown> {
  return {
    id: `bill-${index}`,
    bill_number: `BILL-2026-${String(index + 1).padStart(4, "0")}`,
    supplier_id: `supplier-${index % 2}`,
    service_id: `service-${index % 3}`,
    invoice_number: `SUP-${index + 1}`,
    invoice_date: "2026-09-01",
    total_amount: 1250 + index,
    status: index % 2 === 0 ? "approved" : "pending",
    supplier_name_snapshot: `Snapshot ${index}`,
    commitment_id: "must-not-cross-list-boundary",
    record_request_id: "must-not-cross-list-boundary",
  };
}

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    total: 13,
    bills: Array.from({ length: 13 }, (_, index) => makeBill(index)),
    ...overrides,
  };
  return activeScenario;
}

function callsFor(state: Scenario, table: string) {
  return state.calls.filter((call) => call.table === table);
}

function idsIn(call: QueryCall): string[] {
  return call.filters.find((filter) => filter.op === "in")?.args[1] as string[];
}

test("Supplier Bills pages use deterministic bounded windows and enrich only each returned page", async () => {
  const state = resetScenario();
  const first = await getSupplierBillsList({ page: 1, pageSize: 10 });
  const firstCalls = [...state.calls];
  state.calls.length = 0;
  const second = await getSupplierBillsList({ page: 2, pageSize: 10 });

  assert.deepEqual(first.bills.map((bill) => bill.id), Array.from({ length: 10 }, (_, index) => `bill-${index}`));
  assert.deepEqual(second.bills.map((bill) => bill.id), ["bill-10", "bill-11", "bill-12"]);
  assert.deepEqual(first.pagination, { page: 1, pageSize: 10, total: 13, totalPages: 2 });
  assert.deepEqual(second.pagination, { page: 2, pageSize: 10, total: 13, totalPages: 2 });

  for (const calls of [firstCalls, state.calls]) {
    const count = calls.find((call) => call.table === "supplier_bills" && call.selectOptions?.head);
    const data = calls.find((call) => call.table === "supplier_bills" && !call.selectOptions?.head);
    assert.ok(count);
    assert.ok(data);
    assert.deepEqual(data.range, calls === firstCalls ? [0, 9] : [10, 19]);
    assert.deepEqual(count.filters, data.filters);
    assert.equal(count.selectOptions?.count, "exact");
    assert.equal(data.columns, "id,bill_number,supplier_id,service_id,invoice_number,invoice_date,total_amount,status,supplier_name_snapshot");
    assert.doesNotMatch(data.columns ?? "", /\*/);
    assert.deepEqual(data.orders, [
      { column: "invoice_date", options: { ascending: false } },
      { column: "bill_number", options: { ascending: true } },
      { column: "id", options: { ascending: true } },
    ]);
    assert.equal(calls.filter((call) => call.table === "suppliers").length, 1);
    assert.equal(calls.filter((call) => call.table === "services").length, 1);
  }

  const firstRows = state.bills.slice(0, 10);
  const secondRows = state.bills.slice(10);
  for (const [calls, pageRows] of [[firstCalls, firstRows], [state.calls, secondRows]] as const) {
    assert.deepEqual(idsIn(callsFor({ ...state, calls }, "suppliers")[0]), [...new Set(pageRows.map((row) => row.supplier_id))]);
    assert.deepEqual(idsIn(callsFor({ ...state, calls }, "services")[0]), [...new Set(pageRows.map((row) => row.service_id))]);
  }
  assert.equal("commitment_id" in first.bills[0], false);
  assert.equal("record_request_id" in first.bills[0], false);
  assert.equal(first.bills[0].supplier_name, "Supplier 0");
  assert.equal(first.bills[0].event_name, "Event 0");
});

test("Supplier Bills normalize page inputs and clamp pages to the counted result", async () => {
  const state = resetScenario({
    total: 11,
    bills: Array.from({ length: 11 }, (_, index) => makeBill(index)),
  });
  const invalid = await getSupplierBillsList({ page: -1, pageSize: 25 as never });
  assert.equal(invalid.pagination.page, 1);
  assert.equal(invalid.pagination.pageSize, 10);
  assert.deepEqual(state.calls.find((call) => call.table === "supplier_bills" && !call.selectOptions?.head)?.range, [0, 9]);

  state.calls.length = 0;
  const outOfRange = await getSupplierBillsList({ page: 99, pageSize: 10 });
  assert.equal(outOfRange.pagination.page, 2);
  assert.equal(outOfRange.pagination.totalPages, 2);
  assert.deepEqual(outOfRange.bills.map((bill) => bill.id), ["bill-10"]);
  assert.deepEqual(state.calls.find((call) => call.table === "supplier_bills" && !call.selectOptions?.head)?.range, [10, 19]);
});

test("Supplier Bills distinguish a failed count query from an empty list", async () => {
  const state = resetScenario({ countError: new Error("unavailable") });
  const result = await getSupplierBillsList();
  assert.equal(result.error, "supplier_bills_load_failed");
  assert.deepEqual(result.bills, []);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].table, "supplier_bills");
});
