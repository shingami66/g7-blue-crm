import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryFilter = { op: string; args: unknown[] };
type QueryOrder = { column: string; options?: { ascending?: boolean; nullsFirst?: boolean } };
type QueryCall = {
  table: string;
  selectColumns?: string;
  selectOptions?: unknown;
  filters: QueryFilter[];
  orders: QueryOrder[];
  rangeLimits?: [number, number];
  limitCount?: number;
};

type Scenario = {
  calls: QueryCall[];
  tableData: Record<string, unknown[]>;
  permissions: Record<string, boolean>;
  maxRowsPerResponse?: number;
};

let activeScenario: Scenario | null = null;

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

function scenario(): Scenario {
  if (!activeScenario) throw new Error("Scenario not configured");
  return activeScenario;
}

mock.module("@/lib/auth/permissions", {
  namedExports: {
    checkPermission: async (permission: string) => {
      const perms = scenario().permissions;
      return perms[permission] ?? true;
    },
    requirePermission: async () => undefined,
  },
});

function applyFilterLogic(rows: unknown[], filters: QueryFilter[]): unknown[] {
  let result = [...rows] as Array<Record<string, unknown>>;
  for (const filter of filters) {
    if (filter.op === "eq") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => row[col] === val);
    } else if (filter.op === "neq") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => row[col] !== val);
    } else if (filter.op === "is") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => (val === null ? row[col] == null : row[col] === val));
    }
  }
  return result;
}

function applyOrderLogic(rows: unknown[], orders: QueryOrder[]): unknown[] {
  const result = [...rows] as Array<Record<string, unknown>>;
  if (orders.length > 0) {
    result.sort((a, b) => {
      for (const { column, options } of orders) {
        const asc = options?.ascending !== false;
        const va = a[column];
        const vb = b[column];
        if (va === vb) continue;
        if (va == null) return options?.nullsFirst ? -1 : 1;
        if (vb == null) return options?.nullsFirst ? 1 : -1;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
      }
      return 0;
    });
  }
  return result;
}

function applyPaginationLimits(
  rows: unknown[],
  rangeLimits: [number, number] | undefined,
  limitCount: number | undefined,
  maxRowsPerResponse: number | undefined,
): unknown[] {
  const start = rangeLimits ? rangeLimits[0] : 0;
  let end = rangeLimits ? rangeLimits[1] + 1 : rows.length;

  if (limitCount !== undefined) {
    if (start >= limitCount) {
      return [];
    }
    end = Math.min(end, limitCount);
  }

  if (maxRowsPerResponse !== undefined) {
    end = Math.min(end, start + maxRowsPerResponse);
  }

  if (start >= rows.length) {
    return [];
  }

  return rows.slice(start, Math.min(end, rows.length));
}

function createMockQueryBuilder(table: string) {
  const call: QueryCall = { table, filters: [], orders: [] };
  scenario().calls.push(call);

  const builder = {
    select(columns?: string, options?: unknown) {
      call.selectColumns = columns;
      call.selectOptions = options;
      return builder;
    },
    eq(...args: unknown[]) {
      call.filters.push({ op: "eq", args });
      return builder;
    },
    neq(...args: unknown[]) {
      call.filters.push({ op: "neq", args });
      return builder;
    },
    is(...args: unknown[]) {
      call.filters.push({ op: "is", args });
      return builder;
    },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
      call.orders.push({ column, options });
      return builder;
    },
    limit(count: number) {
      call.limitCount = count;
      return builder;
    },
    range(from: number, to: number): Promise<{ data: unknown[]; error: null }> {
      call.rangeLimits = [from, to];
      const source = scenario().tableData[table] ?? [];
      let filtered = applyFilterLogic(source, call.filters);
      filtered = applyOrderLogic(filtered, call.orders);
      const sliced = applyPaginationLimits(filtered, call.rangeLimits, call.limitCount, scenario().maxRowsPerResponse);
      return Promise.resolve({ data: sliced, error: null });
    },
    maybeSingle() {
      const source = scenario().tableData[table] ?? [];
      const filtered = applyFilterLogic(source, call.filters);
      return Promise.resolve({ data: filtered[0] ?? null, error: null });
    },
    then(
      onfulfilled?: ((value: { data: unknown[]; error: null }) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      const source = scenario().tableData[table] ?? [];
      let filtered = applyFilterLogic(source, call.filters);
      filtered = applyOrderLogic(filtered, call.orders);
      const sliced = applyPaginationLimits(filtered, call.rangeLimits, call.limitCount, scenario().maxRowsPerResponse);
      const response = { data: sliced, error: null };
      return Promise.resolve(response).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };

  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: (table: string) => createMockQueryBuilder(table),
    }),
  },
});

const { getCustomer360, fetchAllCustomer360Pages } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    tableData: {},
    permissions: {},
    ...overrides,
  };
  return activeScenario;
}

test("1. fetchAllCustomer360Pages exhausts all 450 records under 200-row response ceiling with page sizes 200, 200, 50, 0", async () => {
  const totalRows = 450;
  const mockRows = Array.from({ length: totalRows }, (_, index) => ({
    id: `inv-${String(index + 1).padStart(5, "0")}`,
    invoice_number: `INV-${index + 1}`,
    customer_id: "c-1",
    invoice_type: "deposit",
    status: "paid",
    grand_total: 100,
    amount_paid: 100,
    balance_due: 0,
    issued_at: "2026-08-01T10:00:00+03:00",
    created_at: "2026-08-01T10:00:00+03:00",
    is_deleted: false,
  }));

  const scenarioState = resetScenario({
    tableData: {
      invoices: mockRows,
    },
    maxRowsPerResponse: 200,
  });

  const result = await fetchAllCustomer360Pages<Record<string, unknown>>(() => {
    return createMockQueryBuilder("invoices");
  }, 500);

  // Assert exactly 450 unique rows are returned (no 50-row or ceiling truncation)
  assert.equal(result.length, 450);
  const uniqueIds = new Set(result.map((r) => r.id));
  assert.equal(uniqueIds.size, 450);

  // Verifies 4 page calls with ranges: [0, 499], [200, 699], [400, 899], [450, 949]
  const invoiceCalls = scenarioState.calls.filter((call) => call.table === "invoices");
  assert.equal(invoiceCalls.length, 4);
  assert.deepEqual(invoiceCalls[0].rangeLimits, [0, 499]);
  assert.deepEqual(invoiceCalls[1].rangeLimits, [200, 699]);
  assert.deepEqual(invoiceCalls[2].rangeLimits, [400, 899]);
  assert.deepEqual(invoiceCalls[3].rangeLimits, [450, 949]);
});

test("2. getCustomer360 returns null financial summary metrics when invoices permission is forbidden", async () => {
  resetScenario({
    permissions: {
      "customers:read": true,
      "services:read": true,
      "quotations:read": true,
      "invoices:read": false,
      "payments:read": true,
    },
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
      invoices: [
        { id: "inv-1", customer_id: "c-1", invoice_number: "INV-1", grand_total: 1000, amount_paid: 1000, balance_due: 0, status: "paid", issued_at: "2026-08-01T10:00:00+03:00", is_deleted: false },
      ],
    },
  });

  const result = await getCustomer360("c-1");

  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    // Invoices section is forbidden
    assert.equal(result.data.invoices.status, "forbidden");
    assert.deepEqual(result.data.invoices.items, []);
    // Summary metrics must evaluate to null, NEVER genuine 0
    assert.equal(result.data.summary.totalInvoiced, null);
    assert.equal(result.data.summary.totalCollected, null);
    assert.equal(result.data.summary.outstandingBalance, null);
  }
});

test("3. getCustomer360 computes truthful live financial summary from all customer invoices, excluding draft and soft-deleted records", async () => {
  const mockRows = [
    // 60 live active invoices (grandTotal 100, amountPaid 40, balanceDue 60)
    ...Array.from({ length: 60 }, (_, index) => ({
      id: `inv-live-${String(index + 1).padStart(3, "0")}`,
      invoice_number: `INV-${index + 1}`,
      customer_id: "c-1",
      invoice_type: "final",
      status: "partial",
      grand_total: 100,
      amount_paid: 40,
      balance_due: 60,
      issued_at: "2026-08-01T10:00:00+03:00",
      created_at: "2026-08-01T10:00:00+03:00",
      is_deleted: false,
    })),
    // 20 draft active invoices (grandTotal 100, amountPaid 0, balanceDue 100)
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `inv-draft-${String(index + 1).padStart(3, "0")}`,
      invoice_number: `INV-DRAFT-${index + 1}`,
      customer_id: "c-1",
      invoice_type: "final",
      status: "draft",
      grand_total: 100,
      amount_paid: 0,
      balance_due: 100,
      issued_at: null,
      created_at: "2026-08-01T10:00:00+03:00",
      is_deleted: false,
    })),
    // 5 soft-deleted invoices (must be filtered at query level and never appear in items or summary)
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `inv-deleted-${String(index + 1).padStart(3, "0")}`,
      invoice_number: `INV-DEL-${index + 1}`,
      customer_id: "c-1",
      invoice_type: "final",
      status: "paid",
      grand_total: 500,
      amount_paid: 500,
      balance_due: 0,
      issued_at: "2026-08-01T10:00:00+03:00",
      created_at: "2026-08-01T10:00:00+03:00",
      is_deleted: true,
    })),
  ];

  resetScenario({
    permissions: {
      "customers:read": true,
      "services:read": true,
      "quotations:read": true,
      "invoices:read": true,
      "payments:read": true,
    },
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
      invoices: mockRows,
      services: [],
      quotations: [],
      payments: [],
    },
  });

  const result = await getCustomer360("c-1");

  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    // 80 active non-deleted invoices are in the invoices section for audit/history
    assert.equal(result.data.invoices.items.length, 80);

    // Soft-deleted invoices are completely excluded
    assert.equal(result.data.invoices.items.some((inv) => inv.id.startsWith("inv-deleted")), false);

    // Only the 60 live invoices contribute to financial summary (60 * 100 = 6000 invoiced, 60 * 40 = 2400 collected, 60 * 60 = 3600 balance)
    assert.equal(result.data.summary.totalInvoiced, 6000);
    assert.equal(result.data.summary.totalCollected, 2400);
    assert.equal(result.data.summary.outstandingBalance, 3600);
  }
});

test("4. Query mock enforces limit() alongside range() so a reintroduced .limit(50) triggers undercounting", async () => {
  const totalRows = 450;
  const mockRows = Array.from({ length: totalRows }, (_, index) => ({
    id: `inv-${String(index + 1).padStart(5, "0")}`,
    invoice_number: `INV-${index + 1}`,
    customer_id: "c-1",
    invoice_type: "deposit",
    status: "paid",
    grand_total: 100,
    amount_paid: 100,
    balance_due: 0,
    issued_at: "2026-08-01T10:00:00+03:00",
    created_at: "2026-08-01T10:00:00+03:00",
    is_deleted: false,
  }));

  resetScenario({
    tableData: {
      invoices: mockRows,
    },
  });

  // Query with limit(50) attached to simulate regression
  const result = await fetchAllCustomer360Pages<Record<string, unknown>>(() => {
    return createMockQueryBuilder("invoices").limit(50);
  }, 500);

  // Exactly 50 rows returned because .limit(50) restricts the query
  assert.equal(result.length, 50);
});
