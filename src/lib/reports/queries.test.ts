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
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  tableData: Record<string, unknown[]>;
  permissions: Record<string, boolean>;
  maxRowsPerResponse?: number;
  receivableResponse?: unknown;
  payableResponse?: unknown;
  eventResponse?: unknown;
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

function resolveRpcResponse(response: unknown, args: Record<string, unknown>): unknown {
  return typeof response === "function"
    ? (response as (args: Record<string, unknown>) => unknown)(args)
    : response;
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
      rpc: (name: string, args: Record<string, unknown>) => {
        const current = scenario();
        current.rpcCalls.push({ name, args });
        if (name === "get_accounts_payable_report" && current.payableResponse !== undefined) {
          return Promise.resolve({ data: resolveRpcResponse(current.payableResponse, args), error: null });
        }
        if (name === "get_event_economics_report" && current.eventResponse !== undefined) {
          return Promise.resolve({ data: resolveRpcResponse(current.eventResponse, args), error: null });
        }
        if (name !== "get_accounts_receivable_report") return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
        if (current.receivableResponse !== undefined) {
          return Promise.resolve({ data: resolveRpcResponse(current.receivableResponse, args), error: null });
        }
        return Promise.resolve({
          data: [{
            as_of_date: args.p_as_of_date,
            period_from: args.p_from_date,
            period_to: args.p_to_date,
            billed_amount: 0,
            collected_cash_amount: 0,
            total_outstanding: 0,
            total_overdue: 0,
            not_due_amount: 0,
            ageing_1_30_amount: 0,
            ageing_31_60_amount: 0,
            ageing_61_90_amount: 0,
            ageing_91_plus_amount: 0,
            detail_total_count: 0,
            detail_rows: [],
            outstanding_customer_count: 0,
            outstanding_customer_rows: [],
          }],
          error: null,
        });
      },
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
  readAccountsReceivable,
  getReportsCenterData,
  RIYADH_OFFSET,
} = await import("./queries.ts");

const {
  getAccountsPayableReport,
  getEventEconomicsReport,
  readAccountsPayableExport,
  readEventEconomicsExport,
} = await import("./reporting.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    rpcCalls: [],
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

test("7. W7D report adapter preserves authoritative reconciliation and redacts unavailable identities", async () => {
  resetScenario({
    permissions: { "customers:read": false, "services:read": false },
    receivableResponse: [{
      as_of_date: "2026-09-22",
      period_from: "2026-01-01",
      period_to: "2026-09-22",
      billed_amount: "60000.00",
      collected_cash_amount: "5000.00",
      total_outstanding: "59000.00",
      total_overdue: "59000.00",
      not_due_amount: "0.00",
      ageing_1_30_amount: "59000.00",
      ageing_31_60_amount: "0.00",
      ageing_61_90_amount: "0.00",
      ageing_91_plus_amount: "0.00",
      detail_total_count: 1,
      detail_rows: [{
        invoice_id: "invoice-24",
        invoice_number: "INV-2026-0024",
        customer_id: "customer-1",
        customer_number: "CUST-1",
        customer_name: "Hidden Customer",
        service_id: "service-1",
        service_number: "SVC-1",
        service_title: "Hidden Service",
        issue_date: "2026-09-01",
        due_date: "2026-09-10",
        gross_amount: "60000.00",
        credit_adjustment_amount: "1000.00",
        credit_application_amount: "0.00",
        net_receivable_amount: "59000.00",
        settled_amount: "0.00",
        outstanding_amount: "59000.00",
        days_past_due: 12,
        ageing_bucket: "1_30",
      }],
      outstanding_customer_count: 1,
      outstanding_customer_rows: [{ customer_id: "customer-1", customer_number: "CUST-1", customer_name: "Hidden Customer", amount: "59000.00" }],
    }],
  });

  const report = await readAccountsReceivable({ asOf: "2026-09-22", from: "2026-01-01", to: "2026-12-31" });

  assert.equal(report.asOfDate, "2026-09-22");
  assert.equal(report.totalOutstanding, 59000);
  assert.equal(report.collectedCashAmount, 5000);
  assert.equal(report.rows[0].creditAdjustmentAmount, 1000);
  assert.equal(report.rows[0].netReceivableAmount, 59000);
  assert.equal(report.rows[0].ageingBucket, "1_30");
  assert.equal(report.rows[0].customerName, null);
  assert.equal(report.rows[0].serviceTitle, null);
  assert.equal(report.outstandingCustomerCount, null);
  assert.deepEqual(report.outstandingCustomers, []);
});

test("8. getReportsCenterData returns null metrics when invoice permission is forbidden", async () => {
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

test("9. getReportsCenterData computes activeCustomers when all required activity permissions are available", async () => {
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

test("10. getReportsCenterData returns forbidden when all salesBilling permissions are forbidden", async () => {
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

test("11. supplier cost reads remain isolated for asymmetric permissions", async () => {
  const cases = [
    {
      name: "allocation cost only",
      allocationCost: true,
      bookingCost: false,
      expectedCost: 100,
      allocationIncludesCost: true,
      bookingIncludesCost: false,
    },
    {
      name: "booking cost only",
      allocationCost: false,
      bookingCost: true,
      expectedCost: 200,
      allocationIncludesCost: false,
      bookingIncludesCost: true,
    },
    {
      name: "both denied",
      allocationCost: false,
      bookingCost: false,
      expectedCost: null,
      allocationIncludesCost: false,
      bookingIncludesCost: false,
    },
    {
      name: "both allowed",
      allocationCost: true,
      bookingCost: true,
      expectedCost: 300,
      allocationIncludesCost: true,
      bookingIncludesCost: true,
    },
  ];

  for (const testCase of cases) {
    const scenarioState = resetScenario({
      permissions: {
        "dashboard:read": true,
        "supplier_allocations:read": true,
        "supplier_bookings:read": true,
        "supplier_allocations:read_cost": testCase.allocationCost,
        "supplier_bookings:read_cost": testCase.bookingCost,
      },
      tableData: {
        service_supplier_allocations: [
          { service_id: "service-1", estimated_total_cost: 100, status: "draft", created_at: "2026-01-01", is_deleted: false },
        ],
        supplier_bookings: [
          { service_id: "service-1", estimated_total_cost: 200, status: "draft", created_at: "2026-01-01", is_deleted: false },
        ],
      },
    });

    const data = await getReportsCenterData({ year: 2026 });
    const allocationCall = scenarioState.calls.find((call) => call.table === "service_supplier_allocations");
    const bookingCall = scenarioState.calls.find((call) => call.table === "supplier_bookings");

    assert.equal(data.supplierOperations.status, "ready", testCase.name);
    assert.equal(data.supplierOperations.data.internalEstimatedCost, testCase.expectedCost, testCase.name);
    assert.ok(allocationCall, testCase.name);
    assert.ok(bookingCall, testCase.name);
    assert.equal(allocationCall.selectColumns?.includes("estimated_total_cost"), testCase.allocationIncludesCost, testCase.name);
    assert.equal(bookingCall.selectColumns?.includes("estimated_total_cost"), testCase.bookingIncludesCost, testCase.name);
  }
});

test("12. AR report pages keep authoritative whole-result summary and the final partial slice", async () => {
  const detailRows = Array.from({ length: 25 }, (_, index) => ({
    invoice_id: `invoice-${String(index + 1).padStart(2, "0")}`,
    invoice_number: `INV-${String(index + 1).padStart(2, "0")}`,
    customer_id: "customer-1",
    customer_number: "CUST-001",
    customer_name: "Filtered customer",
    service_id: "service-1",
    service_number: "SVC-001",
    service_title: "Filtered service",
    issue_date: "2026-09-15",
    due_date: "2026-10-15",
    gross_amount: "100.00",
    credit_adjustment_amount: "5.00",
    credit_application_amount: "10.00",
    net_receivable_amount: "85.00",
    settled_amount: "15.00",
    outstanding_amount: "70.00",
    days_past_due: 0,
    ageing_bucket: "not_due",
  }));
  const scenarioState = resetScenario({
    receivableResponse: (args: Record<string, unknown>) => [{
      as_of_date: args.p_as_of_date,
      period_from: args.p_from_date,
      period_to: args.p_to_date,
      billed_amount: "2500.00",
      collected_cash_amount: "500.00",
      total_outstanding: "1750.00",
      total_overdue: "125.00",
      not_due_amount: "1200.00",
      ageing_1_30_amount: "250.00",
      ageing_31_60_amount: "150.00",
      ageing_61_90_amount: "100.00",
      ageing_91_plus_amount: "50.00",
      detail_total_count: 25,
      detail_rows: detailRows.slice(Number(args.p_page_offset), Number(args.p_page_offset) + Number(args.p_page_size)),
      outstanding_customer_count: 2,
      outstanding_customer_rows: [{ customer_id: "customer-1", customer_number: "CUST-001", customer_name: "Filtered customer", amount: "1200.00" }],
    }],
  });
  const filters: ReportFilters = { from: "2026-09-01", to: "2026-09-30", asOf: "2026-09-30" };

  const first = await readAccountsReceivable(filters, { page: 1, pageSize: 20 });
  const second = await readAccountsReceivable(filters, { page: 2, pageSize: 20 });
  const summary = (report: typeof first) => ({
    billedAmount: report.billedAmount,
    collectedCashAmount: report.collectedCashAmount,
    totalOutstanding: report.totalOutstanding,
    totalOverdue: report.totalOverdue,
    ageing: [report.notDueAmount, report.ageing1To30Amount, report.ageing31To60Amount, report.ageing61To90Amount, report.ageing91PlusAmount],
    detailTotalCount: report.detailTotalCount,
    outstandingCustomerCount: report.outstandingCustomerCount,
    outstandingCustomers: report.outstandingCustomers,
  });

  assert.equal(first.rows.length, 20);
  assert.equal(second.rows.length, 5);
  assert.notEqual(first.rows[0].invoiceId, second.rows[0].invoiceId);
  assert.equal(first.detailTotalCount, 25);
  assert.equal(Math.ceil(first.detailTotalCount / 20), 2);
  assert.deepEqual(summary(first), summary(second));
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => ({
    asOf: args.p_as_of_date,
    from: args.p_from_date,
    to: args.p_to_date,
    pageSize: args.p_page_size,
  })), [
    { asOf: "2026-09-30", from: "2026-09-01", to: "2026-09-30", pageSize: 20 },
    { asOf: "2026-09-30", from: "2026-09-01", to: "2026-09-30", pageSize: 20 },
  ]);
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => args.p_page_offset), [0, 20]);
});

test("13. AP report filters share three paginated slices and whole-result totals", async () => {
  const billRows = Array.from({ length: 45 }, (_, index) => ({
    supplier_bill_id: `bill-${String(index + 1).padStart(2, "0")}`,
    bill_number: `BILL-${String(index + 1).padStart(2, "0")}`,
    supplier_id: "supplier-1",
    supplier_name_snapshot: "Acme Supplies",
    service_id: null,
    currency: "SAR",
    payable_amount: "100.00",
    paid_amount: "20.00",
    outstanding_amount: "80.00",
    payment_status: "unpaid",
    advance_allocated_amount: "0.00",
    invoice_date: "2026-09-24",
    due_date: "2026-10-10",
  }));
  const scenarioState = resetScenario({
    payableResponse: (args: Record<string, unknown>) => ({
      payable_amount: "4500.00",
      paid_amount: "900.00",
      outstanding_amount: "3600.00",
      open_bill_count: 45,
      detail_total_count: 45,
      detail_rows: billRows.slice(Number(args.p_page_offset), Number(args.p_page_offset) + Number(args.p_page_size)),
    }),
  });
  const filters = {
    status: "unpaid" as const,
    supplierSearch: "Acme",
    serviceSearch: "SVC-2026",
    dueFrom: "2026-10-01",
    dueTo: "2026-10-31",
  };

  const pages = await Promise.all([1, 2, 3].map((page) => getAccountsPayableReport({ ...filters, page, pageSize: 20 })));
  const reports = pages.map((result) => {
    assert.equal(result.status, "ready");
    if (result.status !== "ready") throw new Error("AP fixture did not return report data");
    return result.data;
  });

  assert.deepEqual(reports.map((report) => report.rows.length), [20, 20, 5]);
  assert.notEqual(reports[0].rows[0].billId, reports[1].rows[0].billId);
  assert.notEqual(reports[1].rows[0].billId, reports[2].rows[0].billId);
  assert.deepEqual(reports.map(({ payableAmount, paidAmount, outstandingAmount, openBillCount, pagination }) => ({
    payableAmount,
    paidAmount,
    outstandingAmount,
    openBillCount,
    total: pagination.total,
    totalPages: pagination.totalPages,
  })), Array.from({ length: 3 }, () => ({
    payableAmount: 4500,
    paidAmount: 900,
    outstandingAmount: 3600,
    openBillCount: 45,
    total: 45,
    totalPages: 3,
  })));
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => ({
    status: args.p_status,
    supplier: args.p_supplier_search,
    service: args.p_service_search,
    dueFrom: args.p_due_from,
    dueTo: args.p_due_to,
    pageSize: args.p_page_size,
  })), Array.from({ length: 3 }, () => ({
    status: "unpaid",
    supplier: "Acme",
    service: "SVC-2026",
    dueFrom: "2026-10-01",
    dueTo: "2026-10-31",
    pageSize: 20,
  })));
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => args.p_page_offset), [0, 20, 40]);
});

test("AP service filters require services:read without blocking legitimate AP-only reads", async () => {
  const payableResponse = {
    payable_amount: "100.00",
    paid_amount: "20.00",
    outstanding_amount: "80.00",
    open_bill_count: 1,
    detail_total_count: 1,
    detail_rows: [{
      supplier_bill_id: "bill-1",
      bill_number: "BILL-1",
      supplier_id: "supplier-1",
      supplier_name_snapshot: "Acme Supplies",
      service_id: null,
      currency: "SAR",
      payable_amount: "100.00",
      paid_amount: "20.00",
      outstanding_amount: "80.00",
      payment_status: "unpaid",
      advance_allocated_amount: "0.00",
      invoice_date: "2026-09-24",
      due_date: "2026-10-10",
    }],
  };
  const apOnly = resetScenario({ permissions: { "services:read": false }, payableResponse });
  const ordinaryRead = await getAccountsPayableReport({ status: "unpaid" });
  assert.equal(ordinaryRead.status, "ready");
  assert.equal(apOnly.rpcCalls[0]?.args.p_service_search, null);
  assert.equal(apOnly.rpcCalls[0]?.args.p_service_id, null);
  assert.equal(apOnly.calls.some(({ table }) => table === "services"), false);

  for (const serviceFilter of [{ serviceSearch: "Festival" }, { serviceId: "service-1" }]) {
    const denied = resetScenario({ permissions: { "services:read": false }, payableResponse });
    await assert.rejects(
      getAccountsPayableReport(serviceFilter),
      (error: unknown) => error instanceof Error && error.name === "ForbiddenError",
    );
    assert.equal(denied.rpcCalls.length, 0, "unauthorized service filters must not reach the AP RPC");
  }

  const authorized = resetScenario({ permissions: { "services:read": true }, payableResponse });
  await getAccountsPayableReport({ serviceSearch: "Festival", serviceId: "service-1" });
  assert.equal(authorized.rpcCalls[0]?.args.p_service_search, "Festival");
  assert.equal(authorized.rpcCalls[0]?.args.p_service_id, "service-1");
});

test("14. Event 53-row pages preserve authoritative whole-filter summary metadata", async () => {
  const eventRows = Array.from({ length: 53 }, (_, index) => ({
    service_id: `service-${String(index + 1).padStart(2, "0")}`,
    service_number: `SVC-${String(index + 1).padStart(4, "0")}`,
    service_title: `Event ${index + 1}`,
    customer_id: null,
    approved_budget_cost: "100.00",
    open_commitment: "10.00",
    actual_cost: "20.00",
    paid_cost: "15.00",
    outstanding_cost: "5.00",
    etc: "80.00",
    eac: "100.00",
    net_approved_commercial_value: "150.00",
    forecast_margin: "50.00",
    completeness_status: index < 20 ? "COMPLETE" : index < 48 ? "PARTIAL" : "UNAVAILABLE",
    completeness_reason_codes: [],
    close_state: index < 41 ? "open" : "closed",
    close_version: index < 41 ? null : 1,
    close_effective_date: index < 41 ? null : "2026-09-01",
    final_actual_cost: "20.00",
    final_managerial_margin: "130.00",
    closed_at: index < 41 ? null : "2026-09-01T12:00:00+03:00",
  }));
  const scenarioState = resetScenario({
    eventResponse: (args: Record<string, unknown>) => ({
      report_state: "ready",
      as_of_date: args.p_as_of_date,
      detail_total_count: 53,
      open_count: 41,
      closed_count: 12,
      completeness_summary_state: "available",
      complete_count: 20,
      partial_count: 28,
      unavailable_count: 5,
      detail_rows: eventRows.slice(Number(args.p_page_offset), Number(args.p_page_offset) + Number(args.p_page_size)),
    }),
  });
  const filters = { asOfDate: "2026-09-25", search: "Riyadh", completeness: "all" as const, closeState: "all" as const };

  const pages = await Promise.all([1, 2, 3].map((page) => getEventEconomicsReport({ ...filters, page, pageSize: 20 })));
  const reports = pages.map((result) => {
    assert.equal(result.status, "partial");
    if (result.status !== "partial") throw new Error("Event fixture did not return whole-result incomplete status");
    return result.data;
  });

  assert.deepEqual(reports.map((report) => report.rows.length), [20, 20, 13]);
  assert.deepEqual(reports.map((report) => report.pagination.page), [1, 2, 3]);
  assert.deepEqual(reports.map((report) => report.pagination.total), [53, 53, 53]);
  assert.deepEqual(reports.map((report) => report.pagination.totalPages), [3, 3, 3]);
  assert.notEqual(reports[0].rows[0].serviceId, reports[1].rows[0].serviceId);
  assert.notEqual(reports[1].rows[0].serviceId, reports[2].rows[0].serviceId);
  assert.deepEqual(reports.map((report) => report.summary), Array.from({ length: 3 }, () => ({
    completenessSummaryState: "available",
    completeCount: 20,
    partialCount: 28,
    unavailableCount: 5,
    openCount: 41,
    closedCount: 12,
  })));
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => ({
    asOf: args.p_as_of_date,
    search: args.p_search,
    completeness: args.p_completeness,
    closeState: args.p_close_state,
  })), Array.from({ length: 3 }, () => ({
    asOf: "2026-09-25",
    search: "Riyadh",
    completeness: null,
    closeState: null,
  })));
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => args.p_page_offset), [0, 20, 40]);
});

test("15. Event scopes above 500 keep exact total/open/closed counts and unavailable completeness counts", async () => {
  const eventRows = Array.from({ length: 20 }, (_, index) => ({
    service_id: `service-${index + 1}`,
    service_number: `SVC-${String(index + 1).padStart(4, "0")}`,
    service_title: `Event ${index + 1}`,
    customer_id: null,
    completeness_status: "PARTIAL",
    completeness_reason_codes: [],
    close_state: "open",
  }));
  const scenarioState = resetScenario({
    eventResponse: (args: Record<string, unknown>) => ({
      report_state: "ready",
      as_of_date: args.p_as_of_date,
      detail_total_count: 1000,
      open_count: 720,
      closed_count: 280,
      completeness_summary_state: "unavailable",
      complete_count: null,
      partial_count: null,
      unavailable_count: null,
      detail_rows: eventRows,
    }),
  });
  const result = await getEventEconomicsReport({ asOfDate: "2026-09-25", search: "Riyadh", page: 2, pageSize: 20 });

  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Large Event fixture did not remain available");
  assert.equal(result.data.rows.length, 20);
  assert.deepEqual(result.data.summary, {
    completenessSummaryState: "unavailable",
    completeCount: null,
    partialCount: null,
    unavailableCount: null,
    openCount: 720,
    closedCount: 280,
  });
  assert.equal(result.data.pagination.total, 1000);
  assert.equal(result.data.pagination.page, 2);
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => [args.p_search, args.p_page_size, args.p_page_offset]), [["Riyadh", 20, 20]]);
});

test("16. Event completeness filter stays unavailable above 500 candidates", async () => {
  const scenarioState = resetScenario({
    eventResponse: (args: Record<string, unknown>) => ({
      report_state: "unavailable",
      error: "event_completeness_filter_bounded",
      as_of_date: args.p_as_of_date,
      detail_total_count: null,
      open_count: null,
      closed_count: null,
      completeness_summary_state: "unavailable",
      complete_count: null,
      partial_count: null,
      unavailable_count: null,
      detail_rows: [],
    }),
  });
  const result = await getEventEconomicsReport({ asOfDate: "2026-09-25", completeness: "PARTIAL", page: 1, pageSize: 20 });

  assert.deepEqual(result, { status: "unavailable", error: "event_completeness_filter_bounded" });
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => [args.p_completeness, args.p_page_size, args.p_page_offset]), [["PARTIAL", 20, 0]]);
});

test("17. Event completeness filter below 500 returns summary counts after the filter", async () => {
  const matchingRows = Array.from({ length: 28 }, (_, index) => ({
    service_id: `service-${index + 21}`,
    service_number: `SVC-${String(index + 21).padStart(4, "0")}`,
    service_title: `Partial event ${index + 1}`,
    customer_id: null,
    completeness_status: "PARTIAL",
    completeness_reason_codes: [],
    close_state: index < 21 ? "open" : "closed",
  }));
  const scenarioState = resetScenario({
    eventResponse: (args: Record<string, unknown>) => ({
      report_state: "ready",
      as_of_date: args.p_as_of_date,
      detail_total_count: 28,
      open_count: 21,
      closed_count: 7,
      completeness_summary_state: "available",
      complete_count: 0,
      partial_count: 28,
      unavailable_count: 0,
      detail_rows: matchingRows.slice(Number(args.p_page_offset), Number(args.p_page_offset) + Number(args.p_page_size)),
    }),
  });
  const result = await getEventEconomicsReport({ asOfDate: "2026-09-25", completeness: "PARTIAL", page: 2, pageSize: 20 });

  assert.equal(result.status, "partial");
  if (result.status !== "partial") throw new Error("Filtered Event fixture did not preserve its authoritative incomplete state");
  assert.equal(result.data.rows.length, 8);
  assert.deepEqual(result.data.summary, {
    completenessSummaryState: "available",
    completeCount: 0,
    partialCount: 28,
    unavailableCount: 0,
    openCount: 21,
    closedCount: 7,
  });
  assert.deepEqual(scenarioState.rpcCalls.map(({ args }) => [args.p_completeness, args.p_page_offset]), [["PARTIAL", 20]]);
});

test("18. AP and Event exports fetch 50-row pages independently through the 500-row cap", async () => {
  const totals = [0, 1, 20, 50, 51, 99, 100, 499, 500, 501];
  const payableRows = Array.from({ length: 501 }, (_, index) => ({
    supplier_bill_id: `bill-${String(index + 1).padStart(4, "0")}`,
    bill_number: `BILL-${String(index + 1).padStart(4, "0")}`,
    supplier_id: "supplier-1",
    supplier_name_snapshot: "Acme Supplies",
    service_id: null,
    currency: "SAR",
    payable_amount: "100.00",
    paid_amount: "20.00",
    outstanding_amount: "80.00",
    payment_status: "unpaid",
    advance_allocated_amount: "0.00",
    invoice_date: "2026-09-24",
    due_date: "2026-10-10",
  }));
  const eventRows = Array.from({ length: 501 }, (_, index) => ({
    service_id: `service-${String(index + 1).padStart(4, "0")}`,
    service_number: `SVC-${String(index + 1).padStart(4, "0")}`,
    service_title: `Event ${index + 1}`,
    customer_id: null,
    approved_budget_cost: "100.00",
    open_commitment: "10.00",
    actual_cost: "20.00",
    paid_cost: "15.00",
    outstanding_cost: "5.00",
    etc: "80.00",
    eac: "100.00",
    net_approved_commercial_value: "150.00",
    forecast_margin: "50.00",
    completeness_status: "COMPLETE",
    completeness_reason_codes: [],
    close_state: "open",
  }));
  const expectedPageOffsets = (total: number) => Array.from(
    { length: Math.min(Math.max(1, Math.ceil(total / 50)), 10) },
    (_, index) => index * 50,
  );

  for (const total of totals) {
    const apScenario = resetScenario({
      payableResponse: (args: Record<string, unknown>) => ({
        payable_amount: String(total * 100),
        paid_amount: String(total * 20),
        outstanding_amount: String(total * 80),
        open_bill_count: total,
        detail_total_count: total,
        detail_rows: payableRows.slice(Number(args.p_page_offset), Math.min(total, Number(args.p_page_offset) + Number(args.p_page_size))),
      }),
    });
    const apExport = await readAccountsPayableExport({
      status: "unpaid",
      supplierSearch: "Acme",
      dueFrom: "2026-10-01",
      page: 7,
      pageSize: 20,
    });
    assert.equal(apExport.data.rows.length, Math.min(total, 500), `AP exported rows for total ${total}`);
    assert.equal(apExport.truncated, total > 500, `AP truncation for total ${total}`);
    assert.deepEqual(apScenario.rpcCalls.map(({ args }) => [args.p_page_size, args.p_page_offset]), expectedPageOffsets(total).map((offset) => [50, offset]));
    assert.ok(apScenario.rpcCalls.every(({ args }) => args.p_status === "unpaid" && args.p_supplier_search === "Acme" && args.p_due_from === "2026-10-01"));

    const eventScenario = resetScenario({
      eventResponse: (args: Record<string, unknown>) => ({
        report_state: "ready",
        as_of_date: args.p_as_of_date,
        detail_total_count: total,
        open_count: total,
        closed_count: 0,
        completeness_summary_state: total <= 500 ? "available" : "unavailable",
        complete_count: total <= 500 ? total : null,
        partial_count: total <= 500 ? 0 : null,
        unavailable_count: total <= 500 ? 0 : null,
        detail_rows: eventRows.slice(Number(args.p_page_offset), Math.min(total, Number(args.p_page_offset) + Number(args.p_page_size))),
      }),
    });
    const eventExport = await readEventEconomicsExport({
      asOfDate: "2026-09-25",
      search: "Riyadh",
      closeState: "open",
      page: 7,
      pageSize: 20,
    });
    assert.equal(eventExport.data.rows.length, Math.min(total, 500), `Event exported rows for total ${total}`);
    assert.equal(eventExport.truncated, total > 500, `Event truncation for total ${total}`);
    assert.deepEqual(eventScenario.rpcCalls.map(({ args }) => [args.p_page_size, args.p_page_offset]), expectedPageOffsets(total).map((offset) => [50, offset]));
    assert.ok(eventScenario.rpcCalls.every(({ args }) => args.p_as_of_date === "2026-09-25" && args.p_search === "Riyadh" && args.p_close_state === "open"));
  }
});

test("AP and Event exports reject a failed later page and an early empty page", async () => {
  const payableRows = Array.from({ length: 50 }, (_, index) => ({
    supplier_bill_id: `bill-${index + 1}`,
    bill_number: `BILL-${index + 1}`,
    supplier_id: "supplier-1",
    supplier_name_snapshot: "Acme Supplies",
    service_id: null,
    currency: "SAR",
    payable_amount: "100.00",
    paid_amount: "20.00",
    outstanding_amount: "80.00",
    payment_status: "unpaid",
    advance_allocated_amount: "0.00",
    invoice_date: "2026-09-24",
    due_date: "2026-10-10",
  }));
  const eventRows = Array.from({ length: 50 }, (_, index) => ({
    service_id: `service-${index + 1}`,
    service_number: `SVC-${index + 1}`,
    service_title: `Event ${index + 1}`,
    customer_id: null,
    completeness_status: "COMPLETE",
    completeness_reason_codes: [],
    close_state: "open",
  }));

  for (const laterPage of ["unavailable", "empty"] as const) {
    const apScenario = resetScenario({
      permissions: { "services:read": false },
      payableResponse: (args: Record<string, unknown>) => Number(args.p_page_offset) === 0
        ? {
          payable_amount: "5100.00", paid_amount: "1020.00", outstanding_amount: "4080.00",
          open_bill_count: 51, detail_total_count: 51, detail_rows: payableRows,
        }
        : laterPage === "unavailable"
          ? null
          : {
            payable_amount: "0.00", paid_amount: "0.00", outstanding_amount: "0.00",
            open_bill_count: 0, detail_total_count: 0, detail_rows: [],
          },
    });
    await assert.rejects(
      readAccountsPayableExport(),
      new RegExp(laterPage === "unavailable" ? "accounts_payable_unavailable" : "accounts_payable_export_incomplete"),
    );
    assert.deepEqual(apScenario.rpcCalls.map(({ args }) => args.p_page_offset), [0, 50]);

    const eventScenario = resetScenario({
      eventResponse: (args: Record<string, unknown>) => Number(args.p_page_offset) === 0
        ? {
          report_state: "ready", as_of_date: "2026-09-25", detail_total_count: 51,
          open_count: 51, closed_count: 0, completeness_summary_state: "available",
          complete_count: 51, partial_count: 0, unavailable_count: 0, detail_rows: eventRows,
        }
        : laterPage === "unavailable"
          ? { report_state: "unavailable", error: "event_later_page_unavailable" }
          : {
            report_state: "ready", as_of_date: "2026-09-25", detail_total_count: 0,
            open_count: 0, closed_count: 0, completeness_summary_state: "available",
            complete_count: 0, partial_count: 0, unavailable_count: 0, detail_rows: [],
          },
    });
    await assert.rejects(
      readEventEconomicsExport({ asOfDate: "2026-09-25" }),
      new RegExp(laterPage === "unavailable" ? "event_later_page_unavailable" : "event_economics_export_incomplete"),
    );
    assert.deepEqual(eventScenario.rpcCalls.map(({ args }) => args.p_page_offset), [0, 50]);
  }
});
