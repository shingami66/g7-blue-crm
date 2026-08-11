import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryFilter = { op: string; args: unknown[] };
type QueryCall = {
  columns?: string;
  filters: QueryFilter[];
  range?: [number, number];
  selectOptions?: unknown;
};

type QueryResponse = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type Scenario = {
  calls: QueryCall[];
  countResponse: QueryResponse;
  dataResponse: QueryResponse;
};

let activeScenario: Scenario | null = null;

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

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
mock.module("@/lib/auth/errors", {
  namedExports: {
    ForbiddenError: TestForbiddenError,
    UnauthorizedError: TestUnauthorizedError,
  },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async () => undefined,
  },
});

function scenario(): Scenario {
  if (!activeScenario) throw new Error("scenario not configured");
  return activeScenario;
}

function createQueryBuilder() {
  const call: QueryCall = { filters: [] };
  scenario().calls.push(call);

  const builder = {
    select(columns: string, options?: unknown) {
      call.columns = columns;
      call.selectOptions = options;
      return builder;
    },
    eq(...args: unknown[]) {
      call.filters.push({ op: "eq", args });
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
    lt(...args: unknown[]) {
      call.filters.push({ op: "lt", args });
      return builder;
    },
    or(...args: unknown[]) {
      call.filters.push({ op: "or", args });
      return builder;
    },
    order() {
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
      const response = call.selectOptions
        ? scenario().countResponse
        : scenario().dataResponse;
      return Promise.resolve(response).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };

  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({ from: () => createQueryBuilder() }),
  },
});

const { getInvoicesList, getInvoices } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    countResponse: { data: null, error: null, count: 0 },
    dataResponse: { data: [], error: null },
    ...overrides,
  };
  return activeScenario;
}

function hasFilter(call: QueryCall, op: string, column: string, value: unknown): boolean {
  return call.filters.some(
    (filter) => filter.op === op && filter.args[0] === column && filter.args[1] === value,
  );
}

function listQueries(scenarioState: Scenario): QueryCall[] {
  assert.equal(scenarioState.calls.length, 2);
  return scenarioState.calls;
}

test("All Statuses uses invoice date for Business Year and keeps count aligned with rows", async () => {
  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 33 },
  });

  const result = await getInvoicesList({
    year: 2026,
    status: "all",
    page: 2,
    pageSize: 10,
  });

  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.pageSize, 10);
  assert.equal(result.pagination.total, 33);
  assert.equal(result.pagination.totalPages, 4);

  const [countQuery, dataQuery] = listQueries(scenarioState);
  for (const query of [countQuery, dataQuery]) {
    assert.equal(hasFilter(query, "eq", "is_deleted", false), true);
    assert.equal(hasFilter(query, "gte", "date", "2026-01-01"), true);
    assert.equal(hasFilter(query, "lt", "date", "2027-01-01"), true);
    assert.equal(query.filters.some((filter) => filter.args[0] === "issued_at"), false);
    assert.equal(query.filters.some((filter) => filter.args[0] === "status"), false);
  }
  assert.deepEqual(dataQuery.range, [10, 19]);
});

test("Explicit status filtering remains paired with the same Business Year dataset", async () => {
  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 10 },
  });

  const result = await getInvoicesList({ year: 2026, status: "draft" });

  assert.equal(result.pagination.total, 10);
  const [countQuery, dataQuery] = listQueries(scenarioState);
  for (const query of [countQuery, dataQuery]) {
    assert.equal(hasFilter(query, "eq", "status", "draft"), true);
    assert.equal(hasFilter(query, "gte", "date", "2026-01-01"), true);
    assert.equal(hasFilter(query, "lt", "date", "2027-01-01"), true);
    assert.equal(query.filters.some((filter) => filter.args[0] === "issued_at"), false);
  }
});

const EXPECTED_INVOICE_LIST_PROJECTION =
  "id, invoice_number, approved_quotation_id, approved_billing_scope_id, customer_id, invoice_type, service_id, date, due_date, status, subtotal, discount_amount, vat_rate, vat_amount, grand_total, amount_paid, balance_due, currency, document_label, vat_mode, snapshot_seller, snapshot_buyer, snapshot_quotation, snapshot_bank_details, snapshot_document_rules, issued_at, voided_at, void_reason, created_at, updated_at, is_deleted, deleted_at, customers(company,contact), services(service_number,service_title)";

const EXPECTED_INVOICE_INNER_SEARCH_PROJECTION =
  "id, invoice_number, approved_quotation_id, approved_billing_scope_id, customer_id, invoice_type, service_id, date, due_date, status, subtotal, discount_amount, vat_rate, vat_amount, grand_total, amount_paid, balance_due, currency, document_label, vat_mode, snapshot_seller, snapshot_buyer, snapshot_quotation, snapshot_bank_details, snapshot_document_rules, issued_at, voided_at, void_reason, created_at, updated_at, is_deleted, deleted_at, customers!inner(company,contact), services(service_number,service_title)";

test("getInvoicesList uses exact explicit projection and maps full row shape preserving all fields", async () => {
  const sampleRow = {
    id: "inv-1",
    invoice_number: "INV-2026-0001",
    approved_quotation_id: "quot-1",
    approved_billing_scope_id: "scope-1",
    customer_id: "cust-1",
    invoice_type: "deposit",
    service_id: "serv-1",
    date: "2026-08-01",
    due_date: "2026-08-15",
    status: "issued",
    subtotal: 10000,
    discount_amount: 500,
    vat_rate: 0.15,
    vat_amount: 1425,
    grand_total: 10925,
    amount_paid: 5000,
    balance_due: 5925,
    currency: "SAR",
    document_label: "Deposit Invoice",
    vat_mode: "standard",
    snapshot_seller: null,
    snapshot_buyer: null,
    snapshot_quotation: null,
    snapshot_bank_details: null,
    snapshot_document_rules: null,
    issued_at: "2026-08-01T10:00:00Z",
    voided_at: null,
    void_reason: null,
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
    is_deleted: false,
    deleted_at: null,
    customers: { company: "Alpha Corp", contact: "John Doe" },
    services: { service_number: "SRV-2026-0001", service_title: "Annual Gala" },
  };

  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 1 },
    dataResponse: { data: [sampleRow], error: null },
  });

  const result = await getInvoicesList({ page: 1, pageSize: 10 });

  const [, dataQuery] = listQueries(scenarioState);
  assert.equal(dataQuery.columns, EXPECTED_INVOICE_LIST_PROJECTION);
  assert.equal(dataQuery.columns?.includes("*"), false);

  assert.equal(result.invoices.length, 1);
  const expectedMappedInvoice = {
    id: "inv-1",
    invoice_number: "INV-2026-0001",
    approved_quotation_id: "quot-1",
    approved_billing_scope_id: "scope-1",
    invoice_type: "deposit",
    service_id: "serv-1",
    documentDate: "2026-08-01",
    documentDueDate: "2026-08-15",
    status: "issued",
    subtotal: 10000,
    discount_amount: 500,
    vat_rate: 0.15,
    vat_amount: 1425,
    grand_total: 10925,
    amount_paid: 5000,
    balance_due: 5925,
    currency: "SAR",
    document_label: "Deposit Invoice",
    vat_mode: "standard",
    snapshot_seller: null,
    snapshot_buyer: null,
    snapshot_quotation: null,
    snapshot_bank_details: null,
    snapshot_document_rules: null,
    issued_at: "2026-08-01T10:00:00Z",
    voided_at: null,
    void_reason: null,
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
    customer: "Alpha Corp",
    serviceNumber: "SRV-2026-0001",
    serviceTitle: "Annual Gala",
    customerId: "cust-1",
    relatedQuote: "quot-1",
    relatedQuoteNumber: undefined,
    amount: "10,925.00",
    date: new Date("2026-08-01T10:00:00Z").toLocaleDateString(),
    dueDate: new Date("2026-08-01T10:00:00Z").toLocaleDateString(),
    items: [],
  };
  assert.deepEqual(result.invoices[0], expectedMappedInvoice);
});

test("getInvoicesList with customer search uses exact inner join projection without wildcard (*)", async () => {
  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 1 },
  });

  await getInvoicesList({ search: "Acme", searchMode: "customer" });

  const [countQuery, dataQuery] = listQueries(scenarioState);
  assert.equal(countQuery.columns, "id, customers!inner(id)");
  assert.equal(dataQuery.columns, EXPECTED_INVOICE_INNER_SEARCH_PROJECTION);
  assert.equal(dataQuery.columns?.includes("*"), false);
});

test("getInvoices uses exact explicit projection and does not request wildcard (*)", async () => {
  const sampleRow = {
    id: "inv-2",
    invoice_number: "INV-2026-0002",
    approved_quotation_id: "quot-2",
    approved_billing_scope_id: null,
    customer_id: "cust-2",
    invoice_type: "final",
    service_id: "serv-2",
    date: "2026-08-02",
    due_date: "2026-08-16",
    status: "paid",
    subtotal: 20000,
    discount_amount: 0,
    vat_rate: 0.15,
    vat_amount: 3000,
    grand_total: 23000,
    amount_paid: 23000,
    balance_due: 0,
    currency: "SAR",
    document_label: "Final Invoice",
    vat_mode: "standard",
    snapshot_seller: null,
    snapshot_buyer: null,
    snapshot_quotation: null,
    snapshot_bank_details: null,
    snapshot_document_rules: null,
    issued_at: "2026-08-02T10:00:00Z",
    voided_at: null,
    void_reason: null,
    created_at: "2026-08-02T10:00:00Z",
    updated_at: "2026-08-02T10:00:00Z",
    is_deleted: false,
    deleted_at: null,
    customers: { company: "Beta LLC", contact: "Jane Doe" },
    services: { service_number: "SRV-2026-0002", service_title: "Conference" },
  };

  const scenarioState = resetScenario({
    dataResponse: { data: [sampleRow], error: null },
  });

  const invoices = await getInvoices({ year: 2026 });

  assert.equal(scenarioState.calls.length, 1);
  const query = scenarioState.calls[0];
  assert.equal(query.columns, EXPECTED_INVOICE_LIST_PROJECTION);
  assert.equal(query.columns?.includes("*"), false);

  assert.equal(invoices.length, 1);
  const expectedMappedYearInvoice = {
    id: "inv-2",
    invoice_number: "INV-2026-0002",
    approved_quotation_id: "quot-2",
    approved_billing_scope_id: null,
    invoice_type: "final",
    service_id: "serv-2",
    documentDate: "2026-08-02",
    documentDueDate: "2026-08-16",
    status: "paid",
    subtotal: 20000,
    discount_amount: 0,
    vat_rate: 0.15,
    vat_amount: 3000,
    grand_total: 23000,
    amount_paid: 23000,
    balance_due: 0,
    currency: "SAR",
    document_label: "Final Invoice",
    vat_mode: "standard",
    snapshot_seller: null,
    snapshot_buyer: null,
    snapshot_quotation: null,
    snapshot_bank_details: null,
    snapshot_document_rules: null,
    issued_at: "2026-08-02T10:00:00Z",
    voided_at: null,
    void_reason: null,
    created_at: "2026-08-02T10:00:00Z",
    updated_at: "2026-08-02T10:00:00Z",
    customer: "Beta LLC",
    serviceNumber: "SRV-2026-0002",
    serviceTitle: "Conference",
    customerId: "cust-2",
    relatedQuote: "quot-2",
    relatedQuoteNumber: undefined,
    amount: "23,000.00",
    date: new Date("2026-08-02T10:00:00Z").toLocaleDateString(),
    dueDate: new Date("2026-08-02T10:00:00Z").toLocaleDateString(),
    items: [],
  };
  assert.deepEqual(invoices[0], expectedMappedYearInvoice);
});
