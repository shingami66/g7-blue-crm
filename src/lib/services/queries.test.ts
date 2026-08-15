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
  tableData: Record<string, unknown[] | null>;
  permissions: Record<string, boolean>;
  simulatedError?: Record<string, string>;
  simulatedCeiling?: number;
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
    } else if (filter.op === "neq") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => row[col] !== val);
    } else if (filter.op === "in") {
      const [col, values] = filter.args as [string, unknown[]];
      const set = new Set(values);
      result = result.filter((row) => set.has(row[col]));
    } else if (filter.op === "is") {
      const [col, val] = filter.args as [string, unknown];
      result = result.filter((row) => (val === null ? row[col] == null : row[col] === val));
    } else if (filter.op === "not") {
      const [col, op, val] = filter.args as [string, string, unknown];
      if (op === "is" && val === null) {
        result = result.filter((row) => row[col] != null);
      } else if (op === "is" && val === true) {
        result = result.filter((row) => row[col] !== true);
      } else if (op === "in") {
        const set = new Set(
          String(val)
            .replace(/[()"]/g, "")
            .split(",")
            .map((s) => s.trim())
        );
        result = result.filter((row) => !set.has(String(row[col])));
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
    neq(...args: unknown[]) {
      call.filters.push({ op: "neq", args });
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
    or() {
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
    range(from: number, to: number) {
      call.rangeLimits = [from, to];
      return builder;
    },
    maybeSingle() {
      const errorMsg = scenario().simulatedError?.[table];
      if (errorMsg) {
        return Promise.resolve({ data: null, error: { message: errorMsg } });
      }
      const source = scenario().tableData[table] ?? [];
      const rows = applyFilterLogic(source, call.filters);
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then(onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) {
      const errorMsg = scenario().simulatedError?.[table];
      if (errorMsg) {
        return Promise.resolve({ data: null, count: null, error: { message: errorMsg } }).then(onfulfilled, onrejected);
      }

      const rawSource = scenario().tableData[table];
      if (rawSource === null) {
        return Promise.resolve({ data: null, count: null, error: null }).then(
          onfulfilled,
          onrejected,
        );
      }

      const source = rawSource ?? [];
      let rows = applyFilterLogic(source, call.filters);
      const totalCount = rows.length;
      rows = applyOrderLogic(rows, call.orders);

      if (call.limitCount !== undefined) {
        rows = rows.slice(0, call.limitCount);
      } else if (call.rangeLimits !== undefined) {
        let to = call.rangeLimits[1] + 1;
        if (scenario().simulatedCeiling !== undefined) {
          const maxAllowed = call.rangeLimits[0] + scenario().simulatedCeiling!;
          if (to > maxAllowed) to = maxAllowed;
        }
        rows = rows.slice(call.rangeLimits[0], to);
      } else if (scenario().simulatedCeiling !== undefined) {
        rows = rows.slice(0, scenario().simulatedCeiling!);
      }

      return Promise.resolve({ data: rows, count: totalCount, error: null }).then(onfulfilled, onrejected);
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
  getEligibleServicesForInvoiceChooser,
  getEligibleServicesForQuotation,
} = await import("./queries.ts");

test("getEligibleServicesForInvoiceChooser runs O(1) batch queries instead of O(N) query storms", async () => {
  const services = [];
  for (let i = 1; i <= 10; i++) {
    services.push({
      id: `svc-${i}`,
      service_number: `SVC-2026-${String(i).padStart(4, "0")}`,
      service_title: `Service ${i}`,
      status: "Approved",
      deleted_at: null,
      customers: { company: `Company ${i}`, contact: `Contact ${i}`, customer_number: `CUS-${i}` },
    });
  }

  const approvedBillingScopes = [
    { id: "abs-1", service_id: "svc-1", status: "approved", accepted_grand_total: 10000, source_quotation_id: "q-1", superseded_at: null, voided_at: null },
    { id: "abs-2", service_id: "svc-2", status: "approved", accepted_grand_total: 20000, source_quotation_id: "q-2", superseded_at: null, voided_at: null },
    { id: "abs-3", service_id: "svc-3", status: "approved", accepted_grand_total: 30000, source_quotation_id: "q-3", superseded_at: null, voided_at: null },
  ];

  const quotations = [
    { id: "q-1", service_id: "svc-1", quotation_number: "QT-001", status: "approved", grand_total: 10000, is_deleted: false, created_at: "2026-08-01T10:00:00Z" },
    { id: "q-2", service_id: "svc-2", quotation_number: "QT-002", status: "approved", grand_total: 20000, is_deleted: false, created_at: "2026-08-01T10:00:00Z" },
    { id: "q-3", service_id: "svc-3", quotation_number: "QT-003", status: "approved", grand_total: 30000, is_deleted: false, created_at: "2026-08-01T10:00:00Z" },
  ];

  const invoices = [
    { id: "inv-1-draft", service_id: "svc-1", invoice_number: "INV-001-D", invoice_type: "deposit", status: "draft", grand_total: 5000, is_deleted: false, voided_at: null, created_at: "2026-08-02T10:00:00Z", issued_at: null },
    { id: "inv-1-unissued", service_id: "svc-1", invoice_number: "INV-001-F", invoice_type: "final", status: "approved", grand_total: 5000, is_deleted: false, voided_at: null, created_at: "2026-08-02T10:00:00Z", issued_at: null },
    { id: "inv-2-dep", service_id: "svc-2", invoice_number: "INV-002-DEP", invoice_type: "deposit", status: "issued", grand_total: 5000, is_deleted: false, voided_at: null, created_at: "2026-08-02T10:00:00Z", issued_at: "2026-08-02T10:00:00Z" },
    { id: "inv-3-dep", service_id: "svc-3", invoice_number: "INV-003-DEP", invoice_type: "deposit", status: "issued", grand_total: 10000, is_deleted: false, voided_at: null, created_at: "2026-08-02T10:00:00Z", issued_at: "2026-08-02T10:00:00Z" },
    { id: "inv-3-fin", service_id: "svc-3", invoice_number: "INV-003-FIN", invoice_type: "final", status: "issued", grand_total: 20000, is_deleted: false, voided_at: null, created_at: "2026-08-03T10:00:00Z", issued_at: "2026-08-03T10:00:00Z" },
  ];

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: {
      services,
      approved_billing_scopes: approvedBillingScopes,
      quotations,
      invoices,
    },
  };

  const result = await getEligibleServicesForInvoiceChooser();
  assert.equal(result.status, "ready");

  // svc-1: canCreateDeposit = true, canCreateFinal = true
  // svc-2: canCreateDeposit = false (already has deposit), canCreateFinal = true
  // svc-3: canCreateDeposit = false, canCreateFinal = false (both deposit & final exist) -> excluded
  // svc-4..svc-10: no ABS / quotation -> excluded
  assert.equal(result.services.length, 2);
  assert.equal(result.services[0].serviceId, "svc-1");
  assert.equal(result.services[0].canCreateDeposit, true);
  assert.equal(result.services[0].canCreateFinal, true);
  assert.equal(result.services[1].serviceId, "svc-2");
  assert.equal(result.services[1].canCreateDeposit, false);
  assert.equal(result.services[1].canCreateFinal, true);

  // Assert query calls count: exactly 2 services reads (1 data + 1 terminal empty page) + 6 batch reads (2 per table: 1 data + 1 terminal empty page) = 8 total
  assert.equal(activeScenario.calls.length, 8);

  const scopeCall = activeScenario.calls.find((c) => c.table === "approved_billing_scopes");
  assert.ok(scopeCall);
  const scopeInFilter = scopeCall.filters.find((f) => f.op === "in" && f.args[0] === "service_id");
  assert.ok(scopeInFilter);
  assert.equal((scopeInFilter.args[1] as string[]).length, 10);

  const quotationCall = activeScenario.calls.find((c) => c.table === "quotations");
  assert.ok(quotationCall);
  const quotationInFilter = quotationCall.filters.find((f) => f.op === "in" && f.args[0] === "service_id");
  assert.ok(quotationInFilter);

  const invoiceCall = activeScenario.calls.find((c) => c.table === "invoices");
  assert.ok(invoiceCall);
  const invoiceInFilter = invoiceCall.filters.find((f) => f.op === "in" && f.args[0] === "service_id");
  assert.ok(invoiceInFilter);
});

test("getEligibleServicesForInvoiceChooser correctly handles error states and permission gates", async () => {
  activeScenario = {
    calls: [],
    permissions: { "invoices:write": false, "services:read": true },
    tableData: { services: [] },
  };

  await assert.rejects(() => getEligibleServicesForInvoiceChooser(), ForbiddenError);

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": false },
    tableData: { services: [] },
  };

  await assert.rejects(() => getEligibleServicesForInvoiceChooser(), ForbiddenError);

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: { services: [] },
    simulatedError: { services: "Service table error" },
  };

  const errorResult = await getEligibleServicesForInvoiceChooser();
  assert.deepEqual(errorResult, { status: "error", services: [] });

  // Null services data payload test (null data with no error must fail closed as status: error)
  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: { services: null },
  };

  const nullServicesResult = await getEligibleServicesForInvoiceChooser();
  assert.deepEqual(nullServicesResult, { status: "error", services: [] });

  // Batch source error test
  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: {
      services: [{ id: "svc-1", status: "Approved", customers: {} }],
      approved_billing_scopes: [{ id: "abs-1", service_id: "svc-1", status: "approved", accepted_grand_total: 10000, source_quotation_id: "q-1", superseded_at: null, voided_at: null }]
    },
    simulatedError: { invoices: "Invoices table error" },
  };

  const partialResult = await getEligibleServicesForInvoiceChooser();
  assert.equal(partialResult.status, "partial");
  assert.equal(partialResult.services.length, 0);
});

test("getEligibleServicesForInvoiceChooser handles backend page ceiling and short nonterminal pages exhaustively", async () => {
  const services = [];
  const approvedBillingScopes = [];
  const quotations = [];
  const invoices = [];

  for (let i = 1; i <= 25; i++) {
    services.push({
      id: `svc-${i}`,
      service_number: `SVC-2026-${String(i).padStart(4, "0")}`,
      service_title: `Service ${i}`,
      status: "Approved",
      deleted_at: null,
      customers: { company: `Company ${i}` },
    });
    approvedBillingScopes.push({
      id: `abs-${i}`, service_id: `svc-${i}`, status: "approved", accepted_grand_total: 10000, source_quotation_id: `q-${i}`, superseded_at: null, voided_at: null
    });
    quotations.push({
      id: `q-${i}`, service_id: `svc-${i}`, quotation_number: `QT-${i}`, status: "approved", grand_total: 10000, is_deleted: false, created_at: "2026-08-01T10:00:00Z"
    });
    invoices.push({
      id: `inv-${i}`, service_id: `svc-${i}`, invoice_number: `INV-${i}`, invoice_type: "deposit", status: "issued", grand_total: 5000, is_deleted: false, voided_at: null, created_at: "2026-08-02T10:00:00Z", issued_at: "2026-08-02T10:00:00Z"
    });
  }

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: {
      services,
      approved_billing_scopes: approvedBillingScopes,
      quotations,
      invoices,
    },
    simulatedCeiling: 10, // Simulate a backend row limit of 10 per page
  };

  const result = await getEligibleServicesForInvoiceChooser();
  assert.equal(result.status, "ready");

  // 25 services should all be parsed and returned correctly
  assert.equal(result.services.length, 25);

  // 25 rows with a limit of 10 means:
  // Data pages: 10 + 10 + 5 (3 pages)
  // Terminal empty page: 0 (1 page)
  // Total 4 pages per batch source.
  // Tables: services, approved_billing_scopes, quotations, invoices
  // 4 tables * 4 queries each = 16 O(1) query calls. No N+1.
  assert.equal(activeScenario.calls.length, 16);
});

test("getEligibleServicesForInvoiceChooser paginates active services at exact 500-row boundary with terminal empty page", async () => {
  const services = Array.from({ length: 500 }, (_, i) => {
    const num = i + 1;
    return {
      id: `svc-${num}`,
      service_number: `SVC-2026-${String(num).padStart(4, "0")}`,
      service_title: `Service ${num}`,
      status: "Approved",
      deleted_at: null,
      customers: { company: `Company ${num}`, contact: `Contact ${num}`, customer_number: `CUS-${num}` },
    };
  });

  const approvedBillingScopes = [
    {
      id: "abs-1",
      service_id: "svc-1",
      status: "approved",
      accepted_grand_total: 10000,
      source_quotation_id: "q-1",
      superseded_at: null,
      voided_at: null,
    },
    {
      id: "abs-500",
      service_id: "svc-500",
      status: "approved",
      accepted_grand_total: 50000,
      source_quotation_id: "q-500",
      superseded_at: null,
      voided_at: null,
    },
  ];

  const quotations = [
    {
      id: "q-1",
      service_id: "svc-1",
      quotation_number: "QT-001",
      status: "approved",
      grand_total: 10000,
      is_deleted: false,
      created_at: "2026-08-01T10:00:00Z",
    },
    {
      id: "q-500",
      service_id: "svc-500",
      quotation_number: "QT-500",
      status: "approved",
      grand_total: 50000,
      is_deleted: false,
      created_at: "2026-08-01T10:00:00Z",
    },
  ];

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: {
      services,
      approved_billing_scopes: approvedBillingScopes,
      quotations,
      invoices: [],
    },
  };

  const result = await getEligibleServicesForInvoiceChooser();
  assert.equal(result.status, "ready");
  assert.equal(result.services.length, 2);
  assert.equal(result.services[0].serviceId, "svc-1");
  assert.equal(result.services[1].serviceId, "svc-500");

  const serviceCalls = activeScenario.calls.filter((c) => c.table === "services");
  assert.equal(serviceCalls.length, 2);
  assert.deepEqual(serviceCalls[0].rangeLimits, [0, 499]);
  assert.deepEqual(serviceCalls[1].rangeLimits, [500, 999]);
});

test("getEligibleServicesForInvoiceChooser continues pagination across 501-row boundary with continuation page and terminal empty page", async () => {
  const services = Array.from({ length: 501 }, (_, i) => {
    const num = i + 1;
    return {
      id: `svc-${num}`,
      service_number: `SVC-2026-${String(num).padStart(4, "0")}`,
      service_title: `Service ${num}`,
      status: "Approved",
      deleted_at: null,
      customers: { company: `Company ${num}`, contact: `Contact ${num}`, customer_number: `CUS-${num}` },
    };
  });

  const approvedBillingScopes = [
    {
      id: "abs-1",
      service_id: "svc-1",
      status: "approved",
      accepted_grand_total: 10000,
      source_quotation_id: "q-1",
      superseded_at: null,
      voided_at: null,
    },
    {
      id: "abs-500",
      service_id: "svc-500",
      status: "approved",
      accepted_grand_total: 50000,
      source_quotation_id: "q-500",
      superseded_at: null,
      voided_at: null,
    },
    {
      id: "abs-501",
      service_id: "svc-501",
      status: "approved",
      accepted_grand_total: 50100,
      source_quotation_id: "q-501",
      superseded_at: null,
      voided_at: null,
    },
  ];

  const quotations = [
    {
      id: "q-1",
      service_id: "svc-1",
      quotation_number: "QT-001",
      status: "approved",
      grand_total: 10000,
      is_deleted: false,
      created_at: "2026-08-01T10:00:00Z",
    },
    {
      id: "q-500",
      service_id: "svc-500",
      quotation_number: "QT-500",
      status: "approved",
      grand_total: 50000,
      is_deleted: false,
      created_at: "2026-08-01T10:00:00Z",
    },
    {
      id: "q-501",
      service_id: "svc-501",
      quotation_number: "QT-501",
      status: "approved",
      grand_total: 50100,
      is_deleted: false,
      created_at: "2026-08-01T10:00:00Z",
    },
  ];

  activeScenario = {
    calls: [],
    permissions: { "invoices:write": true, "services:read": true },
    tableData: {
      services,
      approved_billing_scopes: approvedBillingScopes,
      quotations,
      invoices: [],
    },
  };

  const result = await getEligibleServicesForInvoiceChooser();
  assert.equal(result.status, "ready");
  assert.equal(result.services.length, 3);
  assert.equal(result.services[0].serviceId, "svc-1");
  assert.equal(result.services[1].serviceId, "svc-500");
  assert.equal(result.services[2].serviceId, "svc-501");

  const serviceCalls = activeScenario.calls.filter((c) => c.table === "services");
  assert.equal(serviceCalls.length, 3);
  assert.deepEqual(serviceCalls[0].rangeLimits, [0, 499]);
  assert.deepEqual(serviceCalls[1].rangeLimits, [500, 999]);
  assert.deepEqual(serviceCalls[2].rangeLimits, [501, 1000]);
});

test("getEligibleServicesForQuotation filters by status Inquiry/Quoted and excludes deleted services", async () => {
  const services = [
    { id: "s-1", service_number: "SVC-001", service_title: "Inquiry Service", status: "Inquiry", deleted_at: null, customers: { company: "Co A" } },
    { id: "s-2", service_number: "SVC-002", service_title: "Quoted Service", status: "Quoted", deleted_at: null, customers: { company: "Co B" } },
    { id: "s-3", service_number: "SVC-003", service_title: "Approved Service", status: "Approved", deleted_at: null, customers: { company: "Co C" } },
    { id: "s-4", service_number: "SVC-004", service_title: "Cancelled Service", status: "Cancelled", deleted_at: null, customers: { company: "Co D" } },
    { id: "s-5", service_number: "SVC-005", service_title: "Deleted Service", status: "Inquiry", deleted_at: "2026-08-01", customers: { company: "Co E" } },
  ];

  activeScenario = {
    calls: [],
    permissions: { "services:read": true },
    tableData: { services },
  };

  const result = await getEligibleServicesForQuotation();
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "s-1");
  assert.equal(result[0].status, "Inquiry");
  assert.equal(result[1].id, "s-2");
  assert.equal(result[1].status, "Quoted");

  const queryCall = activeScenario.calls[0];
  assert.equal(queryCall.table, "services");
  assert.deepEqual(queryCall.orders, [
    { column: "service_number", options: { ascending: true } },
    { column: "id", options: { ascending: true } },
  ]);
});
