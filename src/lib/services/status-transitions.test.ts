import assert from "node:assert/strict";
import { mock } from "node:test";
import test from "node:test";

mock.module("server-only", { namedExports: {} });

const {
  getServiceStatusTransitionState,
  validateServiceStatusTransition,
} = await import("./status-transitions.ts");

type InvoiceRow = {
  id: string;
  service_id: string;
  invoice_type: string;
  status: string;
  grand_total: number | string | null;
  balance_due: number | string | null;
  voided_at: string | null;
  is_deleted: boolean;
};

type QuotationRow = {
  id: string;
  status: string;
  grand_total: number | string | null;
  service_id: string;
  is_deleted: boolean;
};

type Scenario = {
  invoices?: InvoiceRow[];
  payments?: Array<{ invoice_id: string; amount: number }>;
  quotations?: QuotationRow[];
};

const SERVICE_ID = "service-1";

function deposit(
  balance_due: number | string | null,
  overrides: Partial<InvoiceRow> = {},
): InvoiceRow {
  return {
    id: "deposit-1",
    service_id: SERVICE_ID,
    invoice_type: "deposit",
    status: "sent",
    grand_total: 100,
    balance_due,
    voided_at: null,
    is_deleted: false,
    ...overrides,
  };
}

function quotation(overrides: Partial<QuotationRow> = {}): QuotationRow {
  return {
    id: "quotation-1",
    status: "approved",
    grand_total: 100,
    service_id: SERVICE_ID,
    is_deleted: false,
    ...overrides,
  };
}

function createFakeSupabase(scenario: Scenario) {
  const queriedTables: string[] = [];

  return {
    queriedTables,
    client: {
      from(table: string) {
        queriedTables.push(table);
        if (table === "payments") {
          throw new Error("Payment evidence must not be queried");
        }

        const sourceRows =
          table === "invoices"
            ? (scenario.invoices ?? [])
            : table === "quotations"
              ? (scenario.quotations ?? [])
              : [];
        const filters: Array<[string, unknown]> = [];

        const query = {
          select() {
            return query;
          },
          eq(column: string, value: unknown) {
            filters.push([column, value]);
            return query;
          },
          then<TResult1 = { data: unknown[]; error: null }>(
            onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
          ) {
            const data = sourceRows.filter((row) =>
              filters.every(([column, value]) =>
                (row as unknown as Record<string, unknown>)[column] === value
              )
            );
            return Promise.resolve({ data, error: null }).then(onfulfilled);
          },
        };

        return query;
      },
    },
  };
}

async function validate(
  currentStatus: Parameters<typeof validateServiceStatusTransition>[2],
  requestedStatus: Parameters<typeof validateServiceStatusTransition>[3],
  scenario: Scenario,
) {
  const fake = createFakeSupabase(scenario);
  const result = await validateServiceStatusTransition(
    fake.client as never,
    SERVICE_ID,
    currentStatus,
    requestedStatus,
    requestedStatus === "Cancelled" ? "Customer cancelled" : null,
    "en",
  );
  return { fake, result };
}

test("Approved to Deposit Paid is blocked without an active Deposit Invoice", async () => {
  const { result } = await validate("Approved", "Deposit Paid", {});
  assert.equal(result.success, false);
});

test("Approved to Deposit Paid is blocked for a positive Deposit balance", async () => {
  const { result } = await validate("Approved", "Deposit Paid", { invoices: [deposit(25)] });
  assert.equal(result.success, false);
});

test("Approved to Deposit Paid is allowed for a numeric zero Deposit balance", async () => {
  const { result } = await validate("Approved", "Deposit Paid", { invoices: [deposit(0)] });
  assert.deepEqual(result, { success: true });
});

test("Approved to Deposit Paid is allowed for a numeric-string zero Deposit balance", async () => {
  const { result } = await validate("Approved", "Deposit Paid", { invoices: [deposit("0.00")] });
  assert.deepEqual(result, { success: true });
});

for (const [label, balance] of [
  ["malformed", "not-a-balance"],
  ["null", null],
  ["negative", -1],
] as const) {
  test(`Approved to Deposit Paid is blocked for a ${label} Deposit balance`, async () => {
    const { result } = await validate("Approved", "Deposit Paid", {
      invoices: [deposit(balance)],
    });
    assert.equal(result.success, false);
  });
}

test("Approved to Deposit Paid is blocked when multiple active Deposits exist", async () => {
  const { result } = await validate("Approved", "Deposit Paid", {
    invoices: [deposit(0), deposit(0, { id: "deposit-2" })],
  });
  assert.equal(result.success, false);
});

for (const [label, overrides] of [
  ["voided", { status: "voided" }],
  ["cancelled", { status: "cancelled" }],
  ["soft-deleted", { is_deleted: true }],
  ["voided-at", { voided_at: "2026-07-23T00:00:00Z" }],
] as const) {
  test(`${label} Deposit Invoice is not active`, async () => {
    const { result } = await validate("Approved", "Deposit Paid", {
      invoices: [deposit(0, overrides)],
    });
    assert.equal(result.success, false);
  });
}

test("multiple Payments impose no count restriction because settlement authority is balance_due", async () => {
  const { fake, result } = await validate("Approved", "Deposit Paid", {
    invoices: [deposit(0)],
    payments: [
      { invoice_id: "deposit-1", amount: 40 },
      { invoice_id: "deposit-1", amount: 60 },
    ],
  });
  assert.deepEqual(result, { success: true });
  assert.deepEqual(fake.queriedTables, ["quotations", "invoices"]);
});

test("partial Deposit does not enable In Progress", async () => {
  const { result } = await validate("Deposit Paid", "In Progress", {
    invoices: [deposit(1, { status: "partial" })],
  });
  assert.equal(result.success, false);
});

test("fully settled Deposit enables In Progress", async () => {
  const { result } = await validate("Deposit Paid", "In Progress", {
    invoices: [deposit(0, { status: "paid" })],
  });
  assert.deepEqual(result, { success: true });
});

test("non-Deposit transition rules remain unchanged", async () => {
  const inquiry = await validate("Inquiry", "Quoted", { quotations: [quotation()] });
  const quoted = await validate("Quoted", "Approved", { quotations: [quotation()] });
  assert.deepEqual(inquiry.result, { success: true });
  assert.deepEqual(quoted.result, { success: true });
});

test("cancellation still fails closed when financial records exist", async () => {
  const { result } = await validate("Approved", "Cancelled", {
    invoices: [deposit(0)],
  });
  assert.equal(result.success, false);
});

test("Completed evidence rules still block unpaid active invoices", async () => {
  const { result } = await validate("In Progress", "Completed", {
    quotations: [quotation()],
    invoices: [deposit(10, { status: "partial" })],
  });
  assert.equal(result.success, false);
});

test("transition state exposes the full-settlement blocked reason", async () => {
  const fake = createFakeSupabase({ invoices: [deposit(5)] });
  const state = await getServiceStatusTransitionState(
    fake.client as never,
    SERVICE_ID,
    "Approved",
    "en",
  );
  assert.equal(
    state.actions.find((action) => action.status === "Deposit Paid")?.blockedReason,
    "The active Deposit Invoice must be fully paid before moving this Service to Deposit Paid.",
  );
});
