import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";
import type { ReportFilters } from "./types.ts";

type QueryFilter = { op: string; args: unknown[] };
type QueryOrder = { column: string; options?: { ascending?: boolean; nullsFirst?: boolean } };
type QueryCall = {
  table: string;
  selectColumns?: string;
  selectOptions?: unknown;
  filters: QueryFilter[];
  orders: QueryOrder[];
  rangeLimits?: [number, number];
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
    } else if (filter.op === "not") {
      const [col, operator, val] = filter.args as [string, string, unknown];
      if (operator === "is" && val === null) {
        result = result.filter((row) => row[col] != null);
      } else if (operator === "in") {
        const raw = String(val).replace(/^\(|\)$/g, "");
        const excluded = raw.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
        result = result.filter((row) => !excluded.includes(String(row[col])));
      }
    } else if (filter.op === "gte") {
      const [col, val] = filter.args as [string, string];
      result = result.filter((row) => row[col] != null && String(row[col]) >= val);
    } else if (filter.op === "lte") {
      const [col, val] = filter.args as [string, string];
      result = result.filter((row) => row[col] != null && String(row[col]) <= val);
    } else if (filter.op === "lt") {
      const [col, val] = filter.args as [string, string];
      result = result.filter((row) => row[col] != null && String(row[col]) < val);
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
    not(...args: unknown[]) {
      call.filters.push({ op: "not", args });
      return builder;
    },
    gte(...args: unknown[]) {
      call.filters.push({ op: "gte", args });
      return builder;
    },
    lte(...args: unknown[]) {
      call.filters.push({ op: "lte", args });
      return builder;
    },
    lt(...args: unknown[]) {
      call.filters.push({ op: "lt", args });
      return builder;
    },
    is(...args: unknown[]) {
      call.filters.push({ op: "is", args });
      return builder;
    },
    or(...args: unknown[]) {
      call.filters.push({ op: "or", args });
      return builder;
    },
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
      call.orders.push({ column, options });
      return builder;
    },
    range(from: number, to: number) {
      call.rangeLimits = [from, to];
      return builder;
    },
    then(
      onfulfilled?: ((value: { data: unknown[]; error: null }) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      const source = scenario().tableData[table] ?? [];
      let filtered = applyFilterLogic(source, call.filters);
      filtered = applyOrderLogic(filtered, call.orders);
      if (call.rangeLimits) {
        const start = call.rangeLimits[0];
        let end = call.rangeLimits[1] + 1;
        if (scenario().maxRowsPerResponse !== undefined) {
          end = Math.min(end, start + scenario().maxRowsPerResponse!);
        }
        filtered = filtered.slice(start, end);
      }
      const response = { data: filtered, error: null };
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

const {
  formatRiyadhTimestampBoundary,
  getNextCalendarDay,
  dateFilter,
  readInvoices,
  readCustomers,
  readQuotations,
  readServices,
  readPayments,
  getReportsCenterData,
  RIYADH_OFFSET,
} = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    tableData: {},
    permissions: {},
    ...overrides,
  };
  return activeScenario;
}

test("1. Riyadh timestamp boundaries use Asia/Riyadh offset (+03:00) and getNextCalendarDay computes exact UTC dates", () => {
  assert.equal(RIYADH_OFFSET, "+03:00");
  assert.equal(formatRiyadhTimestampBoundary("2026-01-01", "start"), "2026-01-01T00:00:00+03:00");
  assert.equal(formatRiyadhTimestampBoundary("2026-12-31", "start"), "2026-12-31T00:00:00+03:00");
  assert.equal(getNextCalendarDay("2026-03-31"), "2026-04-01");
  assert.equal(getNextCalendarDay("2026-12-31"), "2027-01-01");
  assert.equal(getNextCalendarDay("2024-02-28"), "2024-02-29");
  assert.equal(getNextCalendarDay("2024-02-29"), "2024-03-01");
});

test("2. dateFilter applies exclusive next-day boundary for timestamp columns and inclusive boundary for date columns", () => {
  const filters: ReportFilters = { year: 2026, from: "2026-03-01", to: "2026-03-31" };

  const tsMock = {
    gteCalls: [] as Array<[string, string]>,
    lteCalls: [] as Array<[string, string]>,
    ltCalls: [] as Array<[string, string]>,
    gte(col: string, val: string) { this.gteCalls.push([col, val]); return this; },
    lte(col: string, val: string) { this.lteCalls.push([col, val]); return this; },
    lt(col: string, val: string) { this.ltCalls.push([col, val]); return this; },
  };

  dateFilter(tsMock, filters, "issued_at");
  assert.deepEqual(tsMock.gteCalls, [
    ["issued_at", "2026-01-01T00:00:00+03:00"],
    ["issued_at", "2026-03-01T00:00:00+03:00"],
  ]);
  // Next-day exclusive boundary: lt 2026-04-01T00:00:00+03:00 protects sub-millisecond timestamps
  assert.deepEqual(tsMock.ltCalls, [
    ["issued_at", "2027-01-01T00:00:00+03:00"],
    ["issued_at", "2026-04-01T00:00:00+03:00"],
  ]);
  assert.deepEqual(tsMock.lteCalls, []);

  const dateMock = {
    gteCalls: [] as Array<[string, string]>,
    lteCalls: [] as Array<[string, string]>,
    ltCalls: [] as Array<[string, string]>,
    gte(col: string, val: string) { this.gteCalls.push([col, val]); return this; },
    lte(col: string, val: string) { this.lteCalls.push([col, val]); return this; },
    lt(col: string, val: string) { this.ltCalls.push([col, val]); return this; },
  };

  dateFilter(dateMock, filters, "date");
  assert.deepEqual(dateMock.gteCalls, [
    ["date", "2026-01-01"],
    ["date", "2026-03-01"],
  ]);
  assert.deepEqual(dateMock.ltCalls, [
    ["date", "2027-01-01"],
  ]);
  assert.deepEqual(dateMock.lteCalls, [
    ["date", "2026-03-31"],
  ]);
});

test("3. Production filter execution on mixed live, invalid, and out-of-period invoice dataset", async () => {
  resetScenario({
    tableData: {
      invoices: [
        // 1. Valid live invoice in range -> MUST BE INCLUDED
        {
          id: "inv-valid-1",
          invoice_number: "INV-001",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 1000,
          amount_paid: 1000,
          balance_due: 0,
          issued_at: "2026-03-15T14:30:00+03:00",
          is_deleted: false,
        },
        // 2. Sub-millisecond boundary invoice (2026-03-31 23:59:59.999500) -> MUST BE INCLUDED
        {
          id: "inv-subms-edge",
          invoice_number: "INV-002",
          customer_id: "c-1",
          invoice_type: "final",
          status: "partial",
          grand_total: 2000,
          amount_paid: 500,
          balance_due: 1500,
          issued_at: "2026-03-31T23:59:59.999500+03:00",
          is_deleted: false,
        },
        // 3. Draft invoice in period -> MUST BE EXCLUDED
        {
          id: "inv-draft",
          invoice_number: "INV-DRAFT",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "draft",
          grand_total: 500,
          amount_paid: 0,
          balance_due: 500,
          issued_at: "2026-03-10T10:00:00+03:00",
          is_deleted: false,
        },
        // 4. Cancelled invoice in period -> MUST BE EXCLUDED
        {
          id: "inv-cancelled",
          invoice_number: "INV-CANCELLED",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "cancelled",
          grand_total: 800,
          amount_paid: 0,
          balance_due: 800,
          issued_at: "2026-03-12T10:00:00+03:00",
          is_deleted: false,
        },
        // 5. Voided invoice in period -> MUST BE EXCLUDED
        {
          id: "inv-voided",
          invoice_number: "INV-VOIDED",
          customer_id: "c-1",
          invoice_type: "final",
          status: "voided",
          grand_total: 900,
          amount_paid: 0,
          balance_due: 900,
          issued_at: "2026-03-14T10:00:00+03:00",
          is_deleted: false,
        },
        // 6. Non-issued invoice (null issued_at) -> MUST BE EXCLUDED
        {
          id: "inv-null-issued",
          invoice_number: "INV-NULL",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 300,
          amount_paid: 300,
          balance_due: 0,
          issued_at: null,
          is_deleted: false,
        },
        // 7. Soft-deleted invoice -> MUST BE EXCLUDED
        {
          id: "inv-deleted",
          invoice_number: "INV-DEL",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 400,
          amount_paid: 400,
          balance_due: 0,
          issued_at: "2026-03-16T10:00:00+03:00",
          is_deleted: true,
        },
        // 8. Out of period: before start (2026-02-28) -> MUST BE EXCLUDED
        {
          id: "inv-before-range",
          invoice_number: "INV-OLD",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 600,
          amount_paid: 600,
          balance_due: 0,
          issued_at: "2026-02-28T23:59:59+03:00",
          is_deleted: false,
        },
        // 9. Out of period: after end (2026-04-01 00:00:00) -> MUST BE EXCLUDED
        {
          id: "inv-after-range",
          invoice_number: "INV-FUTURE",
          customer_id: "c-1",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 700,
          amount_paid: 700,
          balance_due: 0,
          issued_at: "2026-04-01T00:00:00+03:00",
          is_deleted: false,
        },
      ],
    },
  });

  const result = await readInvoices({ from: "2026-03-01", to: "2026-03-31" });

  // Exactly 2 valid live invoices returned
  assert.equal(result.length, 2);
  const ids = result.map((r) => r.id);
  assert.deepEqual(ids, ["inv-subms-edge", "inv-valid-1"]);
  assert.equal(result[0].grandTotal, 2000);
  assert.equal(result[1].grandTotal, 1000);
});

test("4. Multi-page pagination continues until empty page across server-capped responses (450 rows, ceiling 200)", async () => {
  const totalInvoices = 450;
  const mockRows = Array.from({ length: totalInvoices }, (_, index) => ({
    id: `inv-${String(index + 1).padStart(5, "0")}`,
    invoice_number: `INV-${index + 1}`,
    customer_id: `c-${(index % 50) + 1}`,
    invoice_type: index % 2 === 0 ? "deposit" : "final",
    status: "paid",
    grand_total: 100,
    amount_paid: 100,
    balance_due: 0,
    issued_at: "2026-06-15T12:00:00+03:00",
    is_deleted: false,
  }));

  const scenarioState = resetScenario({
    tableData: {
      invoices: mockRows,
    },
    // Simulate server ceiling of 200 rows max per response
    maxRowsPerResponse: 200,
  });

  const result = await readInvoices({ year: 2026 });

  // Assert exactly 450 unique rows are returned
  assert.equal(result.length, 450);
  const uniqueIds = new Set(result.map((r) => r.id));
  assert.equal(uniqueIds.size, 450);
  const totalValue = result.reduce((sum, invoice) => sum + invoice.grandTotal, 0);
  assert.equal(totalValue, 450 * 100);

  // Verifies 4 page calls executed with requested page size 500:
  // Expected page sizes: 200, 200, 50, 0
  // range(0, 499) -> received 200
  // range(200, 699) -> received 200
  // range(400, 899) -> received 50
  // range(450, 949) -> received 0
  const invoiceCalls = scenarioState.calls.filter((call) => call.table === "invoices");
  assert.equal(invoiceCalls.length, 4);
  assert.deepEqual(invoiceCalls[0].rangeLimits, [0, 499]);
  assert.deepEqual(invoiceCalls[1].rangeLimits, [200, 699]);
  assert.deepEqual(invoiceCalls[2].rangeLimits, [400, 899]);
  assert.deepEqual(invoiceCalls[3].rangeLimits, [450, 949]);
});

test("5. All report readers include stable ordering with unique id tie-breakers", async () => {
  const scenarioState = resetScenario({
    permissions: {
      "supplier_allocations:read": true,
      "supplier_bookings:read": true,
      "supplier_allocations:read_cost": true,
    },
  });

  await Promise.all([
    readQuotations({ year: 2026 }),
    readInvoices({ year: 2026 }),
    readServices({ year: 2026 }),
    readCustomers({ year: 2026 }),
    readPayments({ year: 2026 }),
  ]);

  const quotationQuery = scenarioState.calls.find((c) => c.table === "quotations");
  const invoiceQuery = scenarioState.calls.find((c) => c.table === "invoices");
  const serviceQuery = scenarioState.calls.find((c) => c.table === "services");
  const customerQuery = scenarioState.calls.find((c) => c.table === "customers");
  const paymentQuery = scenarioState.calls.find((c) => c.table === "payments");

  assert.ok(quotationQuery);
  assert.ok(invoiceQuery);
  assert.ok(serviceQuery);
  assert.ok(customerQuery);
  assert.ok(paymentQuery);

  // Verify unique tie-breaker on all queries
  assert.ok(quotationQuery.orders.some((o) => o.column === "id"));
  assert.ok(invoiceQuery.orders.some((o) => o.column === "id"));
  assert.ok(serviceQuery.orders.some((o) => o.column === "id"));
  assert.ok(customerQuery.orders.some((o) => o.column === "id"));
  assert.ok(paymentQuery.orders.some((o) => o.column === "id"));
});

test("6. readCustomers does not filter by created_at reporting range and returns master rows cleanly", async () => {
  resetScenario({
    tableData: {
      customers: [
        { id: "c-old", customer_number: "CUST-001", company: "Older Customer Co", status: "active", is_deleted: false },
        { id: "c-new", customer_number: "CUST-002", company: "Newer Customer Co", status: "active", is_deleted: false },
      ],
    },
  });

  const result = await readCustomers({ from: "2026-06-01", to: "2026-06-30" });

  assert.equal(result.length, 2);
  assert.equal(result[0].company, "Older Customer Co");
  assert.equal(result[1].company, "Newer Customer Co");
});

test("7. getReportsCenterData returns null metrics when invoice permission is forbidden", async () => {
  resetScenario({
    permissions: {
      "dashboard:read": true,
      "quotations:read": true,
      "invoices:read": false,
      "services:read": true,
      "customers:read": true,
      "payments:read": true,
      "supplier_allocations:read": false,
      "supplier_bookings:read": false,
    },
    tableData: {
      quotations: [
        { id: "q1", quotation_number: "QT-1", customer_id: "c1", event: "Gala", grand_total: 5000, status: "approved", created_at: "2026-01-10", date: "2026-01-10", is_deleted: false },
      ],
      customers: [
        { id: "c1", customer_number: "CUST-1", company: "Acme Active", status: "active", is_deleted: false },
        { id: "c2", customer_number: "CUST-2", company: "Inactive Outside", status: "active", is_deleted: false },
      ],
    },
  });

  const data = await getReportsCenterData({ year: 2026 });

  // salesBilling is ready because quotations are available, but invoice metrics MUST be null, not 0
  assert.equal(data.salesBilling.status, "ready");
  assert.equal(data.salesBilling.data.quotationCount, 1);
  assert.equal(data.salesBilling.data.quotationValue, 5000);
  assert.equal(data.salesBilling.data.approvedQuotationValue, 5000);

  // Invoices permission unavailable -> null, NEVER 0!
  assert.equal(data.salesBilling.data.invoicedValue, null);
  assert.equal(data.salesBilling.data.collectedValue, null);
  assert.equal(data.salesBilling.data.outstandingValue, null);
  assert.equal(data.salesBilling.data.depositInvoiceCount, null);
  assert.equal(data.salesBilling.data.finalInvoiceCount, null);

  // activeCustomers is null because invoice activity is forbidden/unavailable
  assert.equal(data.customerOverview.data.activeCustomers, null);
  assert.equal(data.customerOverview.data.outstandingCustomersCount, null);
  assert.equal(data.customerOverview.data.highestInvoicedCustomersCount, null);
  assert.deepEqual(data.customerOverview.data.outstandingCustomers, []);
  assert.deepEqual(data.customerOverview.data.highestInvoicedCustomers, []);
});

test("8. getReportsCenterData computes activeCustomers when all required activity permissions are available", async () => {
  resetScenario({
    permissions: {
      "dashboard:read": true,
      "quotations:read": true,
      "invoices:read": true,
      "services:read": true,
      "customers:read": true,
      "payments:read": true,
      "supplier_allocations:read": false,
      "supplier_bookings:read": false,
    },
    tableData: {
      quotations: [
        { id: "q1", quotation_number: "QT-1", customer_id: "c1", event: "Gala", grand_total: 5000, status: "approved", created_at: "2026-01-10", date: "2026-01-10", is_deleted: false },
      ],
      invoices: [],
      payments: [],
      services: [],
      customers: [
        { id: "c1", customer_number: "CUST-1", company: "Acme Active", status: "active", is_deleted: false },
        { id: "c2", customer_number: "CUST-2", company: "Inactive Outside", status: "active", is_deleted: false },
      ],
    },
  });

  const data = await getReportsCenterData({ year: 2026 });

  // activeCustomers is 1 (only c1 had a transaction in the period)
  assert.equal(data.customerOverview.data.activeCustomers, 1);
});

test("9. getReportsCenterData returns forbidden when all salesBilling permissions are forbidden", async () => {
  resetScenario({
    permissions: {
      "dashboard:read": true,
      "quotations:read": false,
      "invoices:read": false,
      "services:read": true,
      "customers:read": true,
      "payments:read": true,
      "supplier_allocations:read": false,
      "supplier_bookings:read": false,
    },
  });

  const data = await getReportsCenterData({ year: 2026 });

  assert.equal(data.salesBilling.status, "forbidden");
  assert.equal(data.salesBilling.data.quotationCount, null);
  assert.equal(data.salesBilling.data.invoicedValue, null);
});
