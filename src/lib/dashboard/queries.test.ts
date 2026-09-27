import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";
import { ForbiddenError } from "../auth/errors.ts";

type QueryFilter = { op: string; args: unknown[] };
type QueryOrder = { column: string; options?: { ascending?: boolean; nullsFirst?: boolean } };
type QueryCall = {
  table: string;
  selectColumns?: string;
  selectOptions?: unknown;
  filters: QueryFilter[];
  orders: QueryOrder[];
  limitCount?: number;
  rangeLimits?: [number, number];
};

type Scenario = {
  calls: QueryCall[];
  tableData: Record<string, unknown[]>;
  permissions: Record<string, boolean>;
  simulatedError?: Record<string, string>;
};

let activeScenario: Scenario | null = null;
const reportCalls: Array<{ source: string; options: unknown }> = [];

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
    requirePermission: async (permission: string) => {
      const perms = scenario().permissions;
      if (perms[permission] === false) {
        throw new ForbiddenError(`Missing permission: ${permission}`);
      }
    },
  },
});

function applyFilterLogic(rows: unknown[], filters: QueryFilter[]): unknown[] {
  let result = [...rows] as Array<Record<string, unknown>>;
  const readColumn = (row: Record<string, unknown>, column: string) =>
    column.split(".").reduce<unknown>((value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined), row);
  for (const filter of filters) {
    if (filter.op === "eq") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => readColumn(row, col) === val);
    } else if (filter.op === "in") {
      const [col, values] = filter.args as [string, unknown[]];
      result = result.filter((row) => values.includes(readColumn(row, col)));
    } else if (filter.op === "gt") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => Number(readColumn(row, col)) > Number(val));
    } else if (filter.op === "gte") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => String(readColumn(row, col)) >= String(val));
    } else if (filter.op === "is") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => (val === null ? readColumn(row, col) === null || readColumn(row, col) === undefined : readColumn(row, col) === val));
    } else if (filter.op === "not") {
      const [col, op, val] = filter.args as [string, string, unknown];
      if (op === "is" && val === null) {
        result = result.filter((row) => readColumn(row, col) !== null && readColumn(row, col) !== undefined);
      }
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
    gt(...args: unknown[]) {
      call.filters.push({ op: "gt", args });
      return builder;
    },
    gte(...args: unknown[]) {
      call.filters.push({ op: "gte", args });
      return builder;
    },
    in(...args: unknown[]) {
      call.filters.push({ op: "in", args });
      return builder;
    },
    is(...args: unknown[]) {
      call.filters.push({ op: "is", args });
      return builder;
    },
    not(...args: unknown[]) {
      call.filters.push({ op: "not", args });
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
    then(onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) {
      const errorMsg = scenario().simulatedError?.[table];
      if (errorMsg) {
        return Promise.resolve({ data: null, count: null, error: { message: errorMsg } }).then(onfulfilled, onrejected);
      }

      const source = scenario().tableData[table] ?? [];
      const isHead = typeof call.selectOptions === "object" && call.selectOptions !== null && (call.selectOptions as { head?: boolean }).head;

      let rows = applyFilterLogic(source, call.filters);
      const totalCount = rows.length;
      rows = applyOrderLogic(rows, call.orders);

      if (call.limitCount !== undefined) {
        rows = rows.slice(0, call.limitCount);
      }

      const response = {
        data: isHead ? null : rows,
        count: totalCount,
        error: null,
      };

      return Promise.resolve(response).then(onfulfilled, onrejected);
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

mock.module("@/lib/reports/filters", {
  namedExports: { getCurrentRiyadhDate: () => "2026-09-26" },
});

mock.module("@/lib/reports/reporting", {
  namedExports: {
    getAccountsReceivableReport: async (options: unknown) => {
      reportCalls.push({ source: "ar", options });
      if (scenario().simulatedError?.reports) throw new Error(scenario().simulatedError?.reports);
      return {
        status: "ready",
        data: {
          asOfDate: "2026-09-26",
          periodFrom: null,
          periodTo: null,
          billedAmount: 900,
          collectedCashAmount: 500,
          totalOutstanding: 400,
          totalOverdue: 100,
          notDueAmount: 300,
          ageing1To30Amount: 100,
          ageing31To60Amount: 0,
          ageing61To90Amount: 0,
          ageing91PlusAmount: 0,
          detailTotalCount: 3,
          outstandingCustomerCount: null,
          outstandingCustomers: [],
          rows: [
            { invoiceId: "inv-1", invoiceNumber: "INV-1", outstandingAmount: 250 },
            { invoiceId: "inv-2", invoiceNumber: "INV-2", outstandingAmount: 150 },
            { invoiceId: "inv-settled", invoiceNumber: "INV-SETTLED", outstandingAmount: 0 },
          ],
        },
      };
    },
    getAccountsPayableReport: async (options: unknown) => {
      reportCalls.push({ source: "ap", options });
      if (scenario().simulatedError?.reports) return { status: "unavailable", error: "unavailable" };
      return {
        status: "ready",
        data: {
          currentOnly: true,
          source: "supplier_bill_payment_balances",
          payableAmount: 900,
          paidAmount: 400,
          outstandingAmount: 500,
          openBillCount: 3,
          detailTotalCount: 3,
          rows: [],
          pagination: { page: 1, pageSize: 1, total: 3, totalPages: 3 },
        },
      };
    },
    getEventEconomicsReport: async (options: unknown) => {
      reportCalls.push({ source: "event", options });
      if (scenario().simulatedError?.reports) return { status: "unavailable", error: "unavailable" };
      return {
        status: "partial",
        data: {
          asOfDate: "2026-09-26",
          source: "get_event_costing + event_cost_close_versions",
          summary: {
            completenessSummaryState: "unavailable",
            completeCount: null,
            partialCount: null,
            unavailableCount: null,
            openCount: 4,
            closedCount: 2,
          },
          rows: [],
          pagination: { page: 1, pageSize: 1, total: 6, totalPages: 6 },
        },
      };
    },
    hasReportData: (result: { status: string }) => ["ready", "partial", "empty"].includes(result.status),
  },
});

mock.module("@/lib/payments/queries", {
  namedExports: {
    getPaymentsList: async (opts?: { pageSize?: number }) => {
      const errorMsg = scenario().simulatedError?.payments;
      if (errorMsg) {
        throw new Error(errorMsg);
      }
      return {
        payments: [
          { id: "p-1", paymentNumber: "PMT-001", invoiceId: "inv-1", amount: 500, method: "cash", date: "2026-08-01", reference: null, notes: null, createdAt: "2026-08-01T10:00:00Z" },
        ],
        totalCount: 1,
        page: 1,
        pageSize: opts?.pageSize ?? 20,
        totalPages: 1,
      };
    },
  },
});

const {
  getDashboardCustomersData,
  getDashboardQuotationsData,
  getDashboardQuotationApprovalData,
  getDashboardReceivablesData,
  getDashboardPayablesData,
  getDashboardEventEconomicsData,
  getDashboardServicesData,
  getDashboardServiceLifecycleData,
  getDashboardExpenseFinanceReviewData,
  getDashboardCashAdvanceIssueData,
  getDashboardPaymentsData,
} = await import("./queries.ts");

test("getDashboardCustomersData uses database-side head count and propagates query errors without fake zeros", async () => {
  activeScenario = {
    calls: [],
    permissions: { "customers:read": true },
    tableData: {
      customers: [
        { id: "c-1", is_deleted: false },
        { id: "c-2", is_deleted: false },
        { id: "c-3", is_deleted: true },
      ],
    },
  };

  const result = await getDashboardCustomersData();
  assert.equal(result.totalCount, 2);

  assert.equal(activeScenario.calls.length, 1);
  const call = activeScenario.calls[0];
  assert.equal(call.table, "customers");
  assert.equal(call.selectColumns, "id");
  assert.deepEqual(call.selectOptions, { count: "exact", head: true });
  assert.deepEqual(call.filters, [{ op: "eq", args: ["is_deleted", false] }]);

  activeScenario.simulatedError = { customers: "Connection failure" };
  await assert.rejects(() => getDashboardCustomersData(), /Database error: Connection failure/);
});

test("getDashboardQuotationsData uses head count, bounded limit(4), and propagates query errors", async () => {
  activeScenario = {
    calls: [],
    permissions: { "quotations:read": true },
    tableData: {
      quotations: [
        { id: "q-1", quotation_number: "QT-2026-0001", grand_total: 1000, status: "draft", created_at: "2026-08-01T10:00:00Z", is_deleted: false, customers: { company: "Company A" }, services: { event_name: "Event A" } },
        { id: "q-2", quotation_number: "QT-2026-0002", grand_total: 2000, status: "approved", created_at: "2026-08-02T10:00:00Z", is_deleted: false, customers: { company: "Company B" }, services: { event_name: "Event B" } },
        { id: "q-3", quotation_number: "QT-2026-0003", grand_total: 3000, status: "sent", created_at: "2026-08-03T10:00:00Z", is_deleted: false, customers: { company: "Company C" }, services: null },
        { id: "q-4", quotation_number: "QT-2026-0004", grand_total: 4000, status: "approved", created_at: "2026-08-04T10:00:00Z", is_deleted: false, customers: { company: "Company D" }, services: { event_name: "Event D" } },
        { id: "q-5", quotation_number: "QT-2026-0005", grand_total: 5000, status: "approved", created_at: "2026-08-05T10:00:00Z", is_deleted: false, customers: { company: "Company E" }, services: { event_name: "Event E" } },
      ],
    },
  };

  const result = await getDashboardQuotationsData();
  assert.equal(result.totalCount, 5);
  assert.equal(result.recentQuotations.length, 4);
  assert.equal(result.recentQuotations[0].quotationNumber, "QT-2026-0005");
  assert.equal(result.recentQuotations[0].customer?.company, "Company E");
  assert.equal(result.recentQuotations[0].event, "Event E");
  assert.equal(result.recentQuotations[1].event, "Event D");
  assert.equal(result.recentQuotations[2].event, null);
  assert.equal(result.recentQuotations[3].event, "Event B");

  const recentCall = activeScenario.calls.find((c) => c.limitCount !== undefined);
  assert.ok(recentCall);
  assert.equal(recentCall.limitCount, 4);
  assert.deepEqual(recentCall.orders, [
    { column: "created_at", options: { ascending: false } },
    { column: "id", options: { ascending: false } },
  ]);

  activeScenario.simulatedError = { quotations: "Quotation read error" };
  await assert.rejects(() => getDashboardQuotationsData(), /Count error|Recent error/);
});

test("getDashboardQuotationApprovalData derives bounded pending work from the quotation approval workflow", async () => {
  const quotations: Array<{
    id: string;
    quotation_number: string;
    status: string;
    created_at: string;
    is_deleted: boolean;
    customers: { company: string | null } | null;
    services: { service_title: string | null; status: string | null; event_name: string | null; deleted_at: string | null } | null;
  }> = Array.from({ length: 7 }, (_, index) => ({
    id: `q-${index + 1}`,
    quotation_number: `QT-2026-${String(index + 1).padStart(4, "0")}`,
    status: index === 6 ? "sent" : "draft",
    created_at: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
    is_deleted: false,
    customers: { company: `Company ${index + 1}` },
    services: { service_title: `Service ${index + 1}`, status: index === 5 ? "Inquiry" : "Quoted", event_name: `Event ${index + 1}`, deleted_at: null },
  }));
  quotations.push(
    { id: "q-approved", quotation_number: "QT-APPROVED", status: "approved", created_at: "2026-08-20T10:00:00Z", is_deleted: false, customers: null, services: { service_title: "Approved", status: "Quoted", event_name: "Approved event", deleted_at: null } },
    { id: "q-service-approved", quotation_number: "QT-SERVICE-APPROVED", status: "draft", created_at: "2026-08-21T10:00:00Z", is_deleted: false, customers: null, services: { service_title: "Service approved", status: "Approved", event_name: "Not pending", deleted_at: null } },
    { id: "q-service-deleted", quotation_number: "QT-SERVICE-DELETED", status: "draft", created_at: "2026-08-22T10:00:00Z", is_deleted: false, customers: null, services: { service_title: "Deleted service", status: "Quoted", event_name: "Not pending", deleted_at: "2026-08-22T12:00:00Z" } },
  );
  activeScenario = {
    calls: [],
    permissions: { "quotations:approve": true },
    tableData: { quotations },
  };

  const result = await getDashboardQuotationApprovalData();
  assert.equal(result.pendingQuotationApprovals.length, 6);
  assert.equal(result.pendingQuotationApprovals[0].quotationNumber, "QT-2026-0001");
  assert.equal(result.pendingQuotationApprovals[0].customer?.company, "Company 1");
  assert.equal(result.pendingQuotationApprovals[5].event, "Event 6");

  assert.equal(activeScenario.calls.length, 1);
  const call = activeScenario.calls[0];
  assert.equal(call.table, "quotations");
  assert.equal(call.selectColumns, "id, quotation_number, status, created_at, services!inner(service_title, status, event_name, deleted_at), customers(company)");
  assert.equal(call.selectOptions, undefined);
  assert.deepEqual(call.filters, [
    { op: "eq", args: ["is_deleted", false] },
    { op: "in", args: ["status", ["draft", "sent"]] },
    { op: "in", args: ["services.status", ["Inquiry", "Quoted"]] },
    { op: "is", args: ["services.deleted_at", null] },
  ]);
  assert.deepEqual(call.orders, [
    { column: "created_at", options: { ascending: true } },
    { column: "id", options: { ascending: true } },
  ]);
  assert.equal(call.limitCount, 6);

  activeScenario.simulatedError = { quotations: "Quotation approval DB error" };
  await assert.rejects(() => getDashboardQuotationApprovalData(), /Pending approval error/);
});

test("Dashboard AR uses one canonical as-of report for snapshot and outstanding invoice attention", async () => {
  activeScenario = { calls: [], permissions: { "invoices:read": true }, tableData: {} };
  reportCalls.length = 0;

  const result = await getDashboardReceivablesData("2026-09-26");
  assert.equal(result.asOfDate, "2026-09-26");
  assert.equal(result.collectedCashAmount, 500);
  assert.equal(result.totalOutstanding, 400);
  assert.equal(result.totalOverdue, 100);
  assert.equal(result.detailTotalCount, 3);
  assert.deepEqual(result.attentionInvoices, [
    { id: "inv-1", invoiceNumber: "INV-1", outstandingAmount: 250 },
    { id: "inv-2", invoiceNumber: "INV-2", outstandingAmount: 150 },
  ]);
  assert.equal(result.hasMoreAttentionInvoices, false);
  assert.equal(reportCalls.length, 1);
  assert.deepEqual(reportCalls[0], {
    source: "ar",
    options: { filters: { asOf: "2026-09-26" }, page: 1, pageSize: 10 },
  });

  activeScenario.simulatedError = { reports: "AR unavailable" };
  await assert.rejects(() => getDashboardReceivablesData("2026-09-26"), /AR unavailable/);
});

test("Dashboard AP and Event metrics preserve canonical source and temporal/completeness contracts", async () => {
  activeScenario = { calls: [], permissions: {}, tableData: {} };
  reportCalls.length = 0;

  const payables = await getDashboardPayablesData();
  assert.deepEqual(payables, {
    currentOnly: true,
    detailTotalCount: 3,
    payableAmount: 900,
    paidAmount: 400,
    outstandingAmount: 500,
    openBillCount: 3,
  });
  const event = await getDashboardEventEconomicsData("2026-09-26");
  assert.deepEqual(event, {
    asOfDate: "2026-09-26",
    status: "partial",
    detailTotalCount: 6,
    openCount: 4,
    closedCount: 2,
    completenessSummaryState: "unavailable",
    completeCount: null,
    partialCount: null,
    unavailableCount: null,
  });
  assert.deepEqual(reportCalls, [
    { source: "ap", options: { page: 1, pageSize: 1 } },
    { source: "event", options: { asOfDate: "2026-09-26", page: 1, pageSize: 1 } },
  ]);

  activeScenario.simulatedError = { reports: "Report source unavailable" };
  await assert.rejects(() => getDashboardPayablesData(), /Report unavailable/);
  await assert.rejects(() => getDashboardEventEconomicsData("2026-09-26"), /Report unavailable/);
});

test("getDashboardServicesData uses the Riyadh date for bounded upcoming Services and no legacy status groups", async () => {
  activeScenario = {
    calls: [],
    permissions: { "services:read": true },
    tableData: {
      services: [
        { id: "s-1", service_number: "SVC-2026-0001", service_title: "Past Gala", event_start_date: "2026-07-01", status: "Inquiry", deleted_at: null },
        { id: "s-2", service_number: "SVC-2026-0002", service_title: "Upcoming Summit", event_start_date: "2026-08-15", status: "Quoted", deleted_at: null },
        { id: "s-3", service_number: "SVC-2026-0003", service_title: "Future Expo", event_start_date: "2026-08-20", status: "Approved", deleted_at: null },
        { id: "s-4", service_number: "SVC-2026-0004", service_title: "Ready Launch", event_start_date: "2026-08-25", status: "Deposit Paid", deleted_at: null },
        { id: "s-5", service_number: "SVC-2026-0005", service_title: "Active Production", event_start_date: "2026-08-12", status: "In Progress", deleted_at: null },
      ],
    },
  };

  const result = await getDashboardServicesData("2026-08-11");
  assert.equal(result.totalCount, 5);
  assert.equal(result.upcomingServices.length, 4);
  assert.equal(result.upcomingServices[0].serviceNumber, "SVC-2026-0005");
  assert.equal(activeScenario.calls.length, 2);
  const upcoming = activeScenario.calls.find((call) => call.limitCount === 6);
  assert.ok(upcoming);
  assert.ok(upcoming.filters.some((filter) => filter.op === "gte" && filter.args[0] === "event_start_date" && filter.args[1] === "2026-08-11"));
  assert.ok(!upcoming.filters.some((filter) => filter.args[0] === "status"));

  activeScenario.simulatedError = { services: "Service DB error" };
  await assert.rejects(() => getDashboardServicesData("2026-08-11"), /Count error|Upcoming error/);
});

test("Dashboard Service start queue uses W3 projection eligibility and excludes legacy-status inference", async () => {
  activeScenario = {
    calls: [],
    permissions: { "services:read": true, "services:update_status": true },
    tableData: {
      service_lifecycle_states: [
        { service_id: "s-ready", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "settled_payment", services: { id: "s-ready", service_number: "SVC-2026-0001", service_title: "Ready Launch", deleted_at: null } },
        { service_id: "s-credit", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "authorized_credit", services: { id: "s-credit", service_number: "SVC-2026-0002", service_title: "Credit Gate", deleted_at: null } },
        { service_id: "s-unpaid", commercial_state: "approved", payment_state: "unpaid", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "settled_payment", services: { id: "s-unpaid", service_number: "SVC-2026-0003", service_title: "Unpaid", deleted_at: null } },
        { service_id: "s-blocked", commercial_state: "approved", payment_state: "settled", readiness_state: "blocked", execution_state: "not_started", start_gate_basis: "settled_payment", services: { id: "s-blocked", service_number: "SVC-2026-0004", service_title: "Blocked", deleted_at: null } },
        { service_id: "s-running", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "in_progress", start_gate_basis: "settled_payment", services: { id: "s-running", service_number: "SVC-2026-0005", service_title: "Running", deleted_at: null } },
        { service_id: "s-deleted", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "settled_payment", services: { id: "s-deleted", service_number: "SVC-2026-0006", service_title: "Deleted", deleted_at: "2026-09-01T00:00:00Z" } },
        { service_id: "s-deleted-running", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "in_progress", start_gate_basis: "settled_payment", services: { id: "s-deleted-running", service_number: "SVC-2026-0007", service_title: "Deleted running", deleted_at: "2026-09-01T00:00:00Z" } },
      ],
    },
  };

  const result = await getDashboardServiceLifecycleData(true);
  assert.equal(result.readyToStartCount, 1);
  assert.equal(result.inProgressCount, 1);
  assert.deepEqual(result.readyToStartServices, [
    { id: "s-ready", serviceNumber: "SVC-2026-0001", serviceTitle: "Ready Launch" },
  ]);

  const serviceCall = activeScenario.calls.find((call) => call.table === "service_lifecycle_states" && call.limitCount !== undefined);
  assert.ok(serviceCall);
  assert.match(serviceCall.selectColumns ?? "", /services!inner/);
  assert.deepEqual(serviceCall.filters, [
    { op: "eq", args: ["commercial_state", "approved"] },
    { op: "eq", args: ["readiness_state", "ready"] },
    { op: "eq", args: ["execution_state", "not_started"] },
    { op: "eq", args: ["payment_state", "settled"] },
    { op: "eq", args: ["start_gate_basis", "settled_payment"] },
    { op: "is", args: ["services.deleted_at", null] },
  ]);
  assert.deepEqual(serviceCall.orders, [{ column: "service_id", options: { ascending: true } }]);
  assert.equal(serviceCall.limitCount, 6);

  activeScenario = {
    calls: [],
    permissions: { "services:read": true, "services:update_status": false },
    tableData: {
      service_lifecycle_states: [
        { service_id: "s-ready", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "settled_payment", services: { deleted_at: null } },
        { service_id: "s-deleted", commercial_state: "approved", payment_state: "settled", readiness_state: "ready", execution_state: "not_started", start_gate_basis: "settled_payment", services: { deleted_at: "2026-09-01T00:00:00Z" } },
        { service_id: "s-running", execution_state: "in_progress", services: { deleted_at: null } },
        { service_id: "s-deleted-running", execution_state: "in_progress", services: { deleted_at: "2026-09-01T00:00:00Z" } },
      ],
    },
  };
  const readOnly = await getDashboardServiceLifecycleData(false);
  assert.equal(readOnly.readyToStartCount, 1);
  assert.equal(readOnly.inProgressCount, 1);
  assert.deepEqual(readOnly.readyToStartServices, []);
  assert.equal(activeScenario.calls.length, 2);
  assert.ok(activeScenario.calls.every((call) => {
    assert.match(call.selectColumns ?? "", /services!inner/);
    assert.ok(call.selectOptions && (call.selectOptions as { head?: boolean }).head === true);
    return call.filters.some((filter) => filter.op === "is" && filter.args[0] === "services.deleted_at" && filter.args[1] === null);
  }));
});

test("Expense finance-review queue is permission-gated, source-filtered, and bounded", async () => {
  activeScenario = {
    calls: [],
    permissions: { "expenses:read": true, "expenses:finance_review": true },
    tableData: {
      expense_accountability_summaries: [
        { id: "e-pending", expense_number: "EXP-001", description: "Travel", status: "submitted", finance_reviewed_at: null, submitted_at: "2026-09-01T09:00:00Z" },
        { id: "e-reviewed", expense_number: "EXP-002", description: "Venue", status: "submitted", finance_reviewed_at: "2026-09-02T09:00:00Z", submitted_at: "2026-09-02T09:00:00Z" },
        { id: "e-approved", expense_number: "EXP-003", description: "Meal", status: "approved", finance_reviewed_at: null, submitted_at: "2026-09-03T09:00:00Z" },
      ],
    },
  };

  const result = await getDashboardExpenseFinanceReviewData();
  assert.deepEqual(result, [{ id: "e-pending", expenseNumber: "EXP-001", description: "Travel" }]);
  assert.equal(activeScenario.calls.length, 1);
  assert.equal(activeScenario.calls[0].table, "expense_accountability_summaries");
  assert.deepEqual(activeScenario.calls[0].filters, [
    { op: "eq", args: ["status", "submitted"] },
    { op: "is", args: ["finance_reviewed_at", null] },
  ]);
  assert.equal(activeScenario.calls[0].limitCount, 6);

  activeScenario.permissions["expenses:finance_review"] = false;
  await assert.rejects(() => getDashboardExpenseFinanceReviewData(), ForbiddenError);
});

test("Cash-advance issue queue exposes only approved records and requires read plus issue permissions", async () => {
  activeScenario = {
    calls: [],
    permissions: { "cash_advances:read": true, "cash_advances:issue": true },
    tableData: {
      employee_cash_advances: [
        { id: "a-approved", advance_number: "ADV-001", status: "approved", approved_at: "2026-09-01T09:00:00Z" },
        { id: "a-issued", advance_number: "ADV-002", status: "issued", approved_at: "2026-09-02T09:00:00Z" },
      ],
    },
  };

  const result = await getDashboardCashAdvanceIssueData();
  assert.deepEqual(result, [{ id: "a-approved", advanceNumber: "ADV-001" }]);
  assert.equal(activeScenario.calls.length, 1);
  assert.equal(activeScenario.calls[0].table, "employee_cash_advances");
  assert.deepEqual(activeScenario.calls[0].filters, [{ op: "eq", args: ["status", "approved"] }]);
  assert.equal(activeScenario.calls[0].limitCount, 6);

  activeScenario.permissions["cash_advances:issue"] = false;
  await assert.rejects(() => getDashboardCashAdvanceIssueData(), ForbiddenError);
});

test("getDashboardPaymentsData loads payments with limit and propagates errors", async () => {
  activeScenario = {
    calls: [],
    permissions: { "payments:read": true },
    tableData: {},
  };

  const result = await getDashboardPaymentsData();
  assert.equal(result.payments.length, 1);
  assert.equal(result.payments[0].paymentNumber, "PMT-001");

  activeScenario.simulatedError = { payments: "Payments error" };
  await assert.rejects(() => getDashboardPaymentsData(), /Payments error/);
});

test("dashboard query loaders reject with ForbiddenError when required permissions are missing", async () => {
  activeScenario = {
    calls: [],
    permissions: {
      "customers:read": false,
      "quotations:read": false,
      "quotations:approve": false,
      "invoices:read": false,
      "services:read": false,
      "services:update_status": false,
      "expenses:read": false,
      "expenses:finance_review": false,
      "cash_advances:read": false,
      "cash_advances:issue": false,
      "payments:read": false,
    },
    tableData: {},
  };

  await assert.rejects(() => getDashboardCustomersData(), ForbiddenError);
  await assert.rejects(() => getDashboardQuotationsData(), ForbiddenError);
  await assert.rejects(() => getDashboardQuotationApprovalData(), ForbiddenError);
  await assert.rejects(() => getDashboardServicesData(), ForbiddenError);
  await assert.rejects(() => getDashboardServiceLifecycleData(false), ForbiddenError);
  await assert.rejects(() => getDashboardExpenseFinanceReviewData(), ForbiddenError);
  await assert.rejects(() => getDashboardCashAdvanceIssueData(), ForbiddenError);
  await assert.rejects(() => getDashboardPaymentsData(), ForbiddenError);
});
