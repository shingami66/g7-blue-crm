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
  for (const filter of filters) {
    if (filter.op === "eq") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => row[col] === val);
    } else if (filter.op === "gt") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => Number(row[col]) > Number(val));
    } else if (filter.op === "gte") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => String(row[col]) >= String(val));
    } else if (filter.op === "is") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => (val === null ? row[col] == null : row[col] === val));
    } else if (filter.op === "not") {
      const [col, op, val] = filter.args as [string, string, unknown];
      if (op === "is" && val === null) {
        result = result.filter((row) => row[col] != null);
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
  getDashboardInvoicesData,
  getDashboardServicesData,
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

test("getDashboardInvoicesData uses limit(6) for attention invoices without any full-table aggregate reads", async () => {
  const invoices = [
    { id: "inv-1", invoice_number: "INV-0001", balance_due: 100, is_deleted: false, created_at: "2026-08-01T10:00:00Z" },
    { id: "inv-2", invoice_number: "INV-0002", balance_due: 200, is_deleted: false, created_at: "2026-08-02T10:00:00Z" },
    { id: "inv-3", invoice_number: "INV-0003", balance_due: 300, is_deleted: false, created_at: "2026-08-03T10:00:00Z" },
    { id: "inv-4", invoice_number: "INV-0004", balance_due: 400, is_deleted: false, created_at: "2026-08-04T10:00:00Z" },
    { id: "inv-5", invoice_number: "INV-0005", balance_due: 500, is_deleted: false, created_at: "2026-08-05T10:00:00Z" },
    { id: "inv-6", invoice_number: "INV-0006", balance_due: 600, is_deleted: false, created_at: "2026-08-06T10:00:00Z" },
    { id: "inv-7", invoice_number: "INV-0007", balance_due: 700, is_deleted: false, created_at: "2026-08-07T10:00:00Z" },
    { id: "inv-8", invoice_number: "INV-0008", balance_due: 0, is_deleted: false, created_at: "2026-08-08T10:00:00Z" },
  ];

  activeScenario = {
    calls: [],
    permissions: { "invoices:read": true },
    tableData: { invoices },
  };

  const result = await getDashboardInvoicesData();
  assert.equal(result.openInvoiceCount, 7);
  assert.equal(result.attentionInvoices.length, 6);
  assert.equal(result.hasMoreAttentionInvoices, true);

  // Financial aggregates are explicitly null/unavailable without DB-side view/RPC
  assert.equal(result.totalCollected, null);
  assert.equal(result.pendingBalance, null);

  // Assert exactly 1 bounded query was executed on invoices and NO full-table read was done
  assert.equal(activeScenario.calls.length, 1);
  const attentionCall = activeScenario.calls[0];
  assert.equal(attentionCall.table, "invoices");
  assert.equal(attentionCall.limitCount, 6);
  assert.equal(attentionCall.selectColumns, "id, invoice_number, balance_due");
  assert.deepEqual(attentionCall.filters, [
    { op: "eq", args: ["is_deleted", false] },
    { op: "gt", args: ["balance_due", 0] },
  ]);

  // Error propagation
  activeScenario.simulatedError = { invoices: "Invoice DB error" };
  await assert.rejects(() => getDashboardInvoicesData(), /Attention error/);
});

test("getDashboardServicesData uses bounded database-side counts for all workflow statuses without memory aggregation", async () => {
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
  assert.equal(result.readyToStartCount, 1);
  assert.equal(result.inProgressCount, 1);
  assert.deepEqual(result.workflowCounts, {
    Inquiry: 1,
    Quoted: 1,
    Approved: 1,
    "Deposit Paid": 1,
  });

  // Verify that all status counts used head count queries with exact filters
  const inquiryCall = activeScenario.calls.find((c) => c.filters.some((f) => f.op === "eq" && f.args[0] === "status" && f.args[1] === "Inquiry"));
  assert.ok(inquiryCall);
  assert.deepEqual(inquiryCall.selectOptions, { count: "exact", head: true });

  const depositPaidCall = activeScenario.calls.find((c) => c.filters.some((f) => f.op === "eq" && f.args[0] === "status" && f.args[1] === "Deposit Paid"));
  assert.ok(depositPaidCall);
  assert.deepEqual(depositPaidCall.selectOptions, { count: "exact", head: true });

  const inProgressCall = activeScenario.calls.find((c) => c.filters.some((f) => f.op === "eq" && f.args[0] === "status" && f.args[1] === "In Progress"));
  assert.ok(inProgressCall);
  assert.deepEqual(inProgressCall.selectOptions, { count: "exact", head: true });

  activeScenario.simulatedError = { services: "Service DB error" };
  await assert.rejects(() => getDashboardServicesData("2026-08-11"), /Count error|Upcoming error|Inquiry count error/);
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
      "invoices:read": false,
      "services:read": false,
      "payments:read": false,
    },
    tableData: {},
  };

  await assert.rejects(() => getDashboardCustomersData(), ForbiddenError);
  await assert.rejects(() => getDashboardQuotationsData(), ForbiddenError);
  await assert.rejects(() => getDashboardInvoicesData(), ForbiddenError);
  await assert.rejects(() => getDashboardServicesData(), ForbiddenError);
  await assert.rejects(() => getDashboardPaymentsData(), ForbiddenError);
});
