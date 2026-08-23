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

type MockUser = {
  id?: string;
  clerk_user_id: string;
  role: string;
  is_active: boolean;
  locale?: string;
};

type Scenario = {
  calls: QueryCall[];
  tableData: Record<string, unknown[]>;
  currentUser?: MockUser | null;
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

mock.module("@clerk/nextjs/server", {
  namedExports: {
    auth: async () => {
      const user = scenario().currentUser;
      return user ? { userId: user.clerk_user_id } : { userId: null };
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
    single() {
      const source = scenario().tableData[table] ?? [];
      const filtered = applyFilterLogic(source, call.filters);
      if (filtered.length === 0) {
        return Promise.resolve({ data: null, error: { code: "PGRST116", message: "Row not found" } });
      }
      return Promise.resolve({ data: filtered[0], error: null });
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
const { UnauthorizedError, ForbiddenError } = await import("../auth/errors.ts");

const defaultAdminUser: MockUser = {
  id: "u-admin",
  clerk_user_id: "user-admin",
  role: "admin",
  is_active: true,
  locale: "en",
};

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  const currentUser = overrides.currentUser !== undefined ? overrides.currentUser : defaultAdminUser;
  const initialTableData = { ...(overrides.tableData ?? {}) };
  if (currentUser && !initialTableData.app_users) {
    initialTableData.app_users = [
      {
        id: currentUser.id ?? "u-1",
        clerk_user_id: currentUser.clerk_user_id,
        role: currentUser.role,
        is_active: currentUser.is_active,
        locale: currentUser.locale ?? "en",
      },
    ];
  }
  activeScenario = {
    calls: [],
    tableData: initialTableData,
    currentUser,
    maxRowsPerResponse: overrides.maxRowsPerResponse,
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
    currentUser: {
      clerk_user_id: "user-operations",
      role: "operations",
      is_active: true,
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

  const scenarioState = resetScenario({
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
    // The invoice table remains a bounded preview of the same ordered full read used for summary calculation.
    assert.equal(result.data.invoices.items.length, 50);

    // Soft-deleted invoices are completely excluded
    assert.equal(result.data.invoices.items.some((inv) => inv.id.startsWith("inv-deleted")), false);

    // Only the 60 live invoices contribute to financial summary (60 * 100 = 6000 invoiced, 60 * 40 = 2400 collected, 60 * 60 = 3600 balance)
    assert.equal(result.data.summary.totalInvoiced, 6000);
    assert.equal(result.data.summary.totalCollected, 2400);
    assert.equal(result.data.summary.outstandingBalance, 3600);

    const invoiceCalls = scenarioState.calls.filter((call) => call.table === "invoices");
    assert.equal(invoiceCalls.length, 2);
    assert.equal(invoiceCalls.filter((call) => call.rangeLimits !== undefined).length, 2);
    assert.equal(invoiceCalls.some((call) => call.limitCount === 50), false);
    assert.ok(invoiceCalls.every((call) => call.selectColumns?.includes("service_id")));
    assert.ok(invoiceCalls.every((call) => call.selectColumns?.includes("services(service_number,service_title)")));
  }
});

test("getCustomer360 keeps a live invoice outside the bounded preview in recentFinancialActivity", async () => {
  const outsidePreviewInvoice = {
    id: "inv-activity-outside-preview",
    invoice_number: "INV-ACTIVITY-OUTSIDE-PREVIEW",
    customer_id: "c-1",
    invoice_type: "final",
    status: "paid",
    grand_total: 900,
    amount_paid: 900,
    balance_due: 0,
    issued_at: "2026-09-01T10:00:00+03:00",
    created_at: "2026-07-01T10:00:00+03:00",
    is_deleted: false,
  };
  const newerPreviewInvoices = Array.from({ length: 60 }, (_, index) => ({
    id: `inv-preview-${String(index + 1).padStart(3, "0")}`,
    invoice_number: `INV-PREVIEW-${index + 1}`,
    customer_id: "c-1",
    invoice_type: "final",
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
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
      invoices: [...newerPreviewInvoices, outsidePreviewInvoice],
      services: [],
      quotations: [],
      payments: [],
    },
  });

  const result = await getCustomer360("c-1");

  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.data.invoices.items.some((invoice) => invoice.id === outsidePreviewInvoice.id), false);
    assert.deepEqual(
      result.data.recentFinancialActivity.find((activity) => activity.identifier === outsidePreviewInvoice.invoice_number),
      {
        id: `invoice-${outsidePreviewInvoice.id}`,
        date: outsidePreviewInvoice.issued_at,
        kind: "financial",
        eventType: "invoice",
        identifier: outsidePreviewInvoice.invoice_number,
        subject: outsidePreviewInvoice.invoice_type,
        status: outsidePreviewInvoice.status,
        amount: outsidePreviewInvoice.grand_total,
        href: `/invoices/${outsidePreviewInvoice.id}`,
      },
    );
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

test("5. getCustomer360 recentFinancialActivity excludes newer non-live invoices and preserves live invoice activity and deterministic ordering", async () => {
  resetScenario({
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha Corp", status: "active", is_deleted: false },
      ],
      invoices: [
        // Newer draft invoice (must be excluded from recentFinancialActivity despite newer created_at)
        {
          id: "inv-draft-new",
          customer_id: "c-1",
          invoice_number: "INV-DRAFT-01",
          invoice_type: "deposit",
          status: "draft",
          grand_total: 9999,
          amount_paid: 0,
          balance_due: 9999,
          issued_at: null,
          created_at: "2026-08-10T12:00:00+03:00",
          is_deleted: false,
        },
        // Newer cancelled invoice (must be excluded)
        {
          id: "inv-cancelled-new",
          customer_id: "c-1",
          invoice_number: "INV-CANCEL-01",
          invoice_type: "final",
          status: "cancelled",
          grand_total: 5000,
          amount_paid: 0,
          balance_due: 5000,
          issued_at: "2026-08-09T12:00:00+03:00",
          created_at: "2026-08-09T12:00:00+03:00",
          is_deleted: false,
        },
        // Newer voided invoice (must be excluded)
        {
          id: "inv-voided-new",
          customer_id: "c-1",
          invoice_number: "INV-VOID-01",
          invoice_type: "final",
          status: "voided",
          grand_total: 4000,
          amount_paid: 0,
          balance_due: 4000,
          issued_at: "2026-08-08T12:00:00+03:00",
          created_at: "2026-08-08T12:00:00+03:00",
          is_deleted: false,
        },
        // Non-issued invoice with created_at (must not become financial activity)
        {
          id: "inv-unissued-new",
          customer_id: "c-1",
          invoice_number: "INV-UNISSUED-01",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 3000,
          amount_paid: 3000,
          balance_due: 0,
          issued_at: null,
          created_at: "2026-08-07T12:00:00+03:00",
          is_deleted: false,
        },
        // Eligible live invoice 1 (must be included)
        {
          id: "inv-live-1",
          customer_id: "c-1",
          invoice_number: "INV-LIVE-01",
          invoice_type: "deposit",
          status: "paid",
          grand_total: 2000,
          amount_paid: 2000,
          balance_due: 0,
          issued_at: "2026-08-05T10:00:00+03:00",
          created_at: "2026-08-05T10:00:00+03:00",
          is_deleted: false,
        },
        // Eligible live invoice 2 (must be included)
        {
          id: "inv-live-2",
          customer_id: "c-1",
          invoice_number: "INV-LIVE-02",
          invoice_type: "final",
          status: "partial",
          grand_total: 1000,
          amount_paid: 400,
          balance_due: 600,
          issued_at: "2026-08-01T10:00:00+03:00",
          created_at: "2026-08-01T10:00:00+03:00",
          is_deleted: false,
        },
      ],
      payments: [
        // Payment occurring between live invoice 1 and live invoice 2
        {
          id: "pay-1",
          customer_id: "c-1",
          payment_number: "PAY-001",
          invoice_id: "inv-live-1",
          date: "2026-08-03",
          amount: 2000,
          method: "bank_transfer",
          reference: "REF-100",
          status: "completed",
          is_deleted: false,
        },
      ],
      services: [],
      quotations: [],
    },
  });

  const result = await getCustomer360("c-1");

  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    // 1. Audit/history invoices list still contains all 6 non-deleted records
    assert.equal(result.data.invoices.items.length, 6);

    // 2. recentFinancialActivity contains only the 2 live invoices + 1 payment = exactly 3 items
    assert.equal(result.data.recentFinancialActivity.length, 3);

    // 3. Excluded non-live invoices are not present in financial activity
    const activityIdentifiers = result.data.recentFinancialActivity.map((a) => a.identifier);
    assert.equal(activityIdentifiers.includes("INV-DRAFT-01"), false);
    assert.equal(activityIdentifiers.includes("INV-CANCEL-01"), false);
    assert.equal(activityIdentifiers.includes("INV-VOID-01"), false);
    assert.equal(activityIdentifiers.includes("INV-UNISSUED-01"), false);

    // 4. Eligible live items remain included in deterministic descending date order
    assert.deepEqual(result.data.recentFinancialActivity, [
      {
        id: "invoice-inv-live-1",
        date: "2026-08-05T10:00:00+03:00",
        kind: "financial",
        eventType: "invoice",
        identifier: "INV-LIVE-01",
        subject: "deposit",
        status: "paid",
        amount: 2000,
        href: "/invoices/inv-live-1",
      },
      {
        id: "payment-pay-1",
        date: "2026-08-03",
        kind: "financial",
        eventType: "payment",
        identifier: "PAY-001",
        subject: "REF-100",
        status: "completed",
        amount: 2000,
        href: "/invoices/inv-live-1",
      },
      {
        id: "invoice-inv-live-2",
        date: "2026-08-01T10:00:00+03:00",
        kind: "financial",
        eventType: "invoice",
        identifier: "INV-LIVE-02",
        subject: "final",
        status: "partial",
        amount: 1000,
        href: "/invoices/inv-live-2",
      },
    ]);
  }
});

test("6. getCustomer360 rejects with UnauthorizedError when caller is unauthenticated", async () => {
  resetScenario({
    currentUser: null,
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
    },
  });

  await assert.rejects(
    () => getCustomer360("c-1"),
    (err: unknown) => err instanceof UnauthorizedError || (err instanceof Error && err.name === "UnauthorizedError"),
  );
});

test("7. getCustomer360 rejects with ForbiddenError when caller account is inactive", async () => {
  resetScenario({
    currentUser: {
      clerk_user_id: "user-inactive",
      role: "admin",
      is_active: false,
    },
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
    },
  });

  await assert.rejects(
    () => getCustomer360("c-1"),
    (err: unknown) => err instanceof ForbiddenError || (err instanceof Error && err.name === "ForbiddenError"),
  );
});

test("8. getCustomer360 rejects with ForbiddenError when caller role lacks customers:read permission", async () => {
  resetScenario({
    currentUser: {
      clerk_user_id: "user-no-read",
      role: "unauthorized_role",
      is_active: true,
    },
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha", status: "active", is_deleted: false },
      ],
    },
  });

  await assert.rejects(
    () => getCustomer360("c-1"),
    (err: unknown) => err instanceof ForbiddenError || (err instanceof Error && err.name === "ForbiddenError"),
  );
});

test("9. getCustomer360 executes real role-based section gating across services, quotations, invoices, and payments", async () => {
  resetScenario({
    currentUser: {
      clerk_user_id: "user-operations",
      role: "operations",
      is_active: true,
    },
    tableData: {
      customers: [
        { id: "c-1", customer_number: "CUST-001", company: "Alpha Corp", status: "active", is_deleted: false },
      ],
      services: [
        {
          id: "srv-1",
          customer_id: "c-1",
          service_number: "SRV-001",
          service_title: "Event Ops",
          event_name: "Annual Gala",
          status: "in_progress",
          created_at: "2026-08-01",
        },
      ],
      quotations: [
        {
          id: "qt-1",
          customer_id: "c-1",
          quotation_number: "QT-001",
          service_id: "srv-1",
          event: "Annual Gala",
          date: "2026-08-01",
          grand_total: 15000,
          status: "approved",
          is_deleted: false,
        },
      ],
      invoices: [
        {
          id: "inv-1",
          customer_id: "c-1",
          invoice_number: "INV-001",
          grand_total: 15000,
          amount_paid: 15000,
          balance_due: 0,
          status: "paid",
          issued_at: "2026-08-01",
          is_deleted: false,
        },
      ],
      payments: [
        {
          id: "pay-1",
          customer_id: "c-1",
          payment_number: "PAY-001",
          invoice_id: "inv-1",
          amount: 15000,
          status: "completed",
          is_deleted: false,
        },
      ],
    },
  });

  const result = await getCustomer360("c-1");

  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    // operations role has customers:read, services:read, quotations:read
    assert.equal(result.data.services.status, "ready");
    assert.equal(result.data.services.items.length, 1);
    assert.equal(result.data.quotations.status, "ready");
    assert.equal(result.data.quotations.items.length, 1);

    // operations role does NOT have invoices:read or payments:read
    assert.equal(result.data.invoices.status, "forbidden");
    assert.deepEqual(result.data.invoices.items, []);
    assert.equal(result.data.payments.status, "forbidden");
    assert.deepEqual(result.data.payments.items, []);

    // Summary evaluates to null when invoice visibility is forbidden
    assert.equal(result.data.summary.totalInvoiced, null);
    assert.equal(result.data.summary.totalCollected, null);
    assert.equal(result.data.summary.outstandingBalance, null);

    // Operational activity is populated, but financial activity is empty
    assert.equal(result.data.recentOperationalActivity.length, 1);
    assert.deepEqual(result.data.recentFinancialActivity, []);
  }
});
