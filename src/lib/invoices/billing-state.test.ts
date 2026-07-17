import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test, { mock } from "node:test";
import {
  parseAuthoritativeMoney,
  sumAuthoritativeMoney,
  toAuthoritativeMoneyField,
} from "./money.ts";

type TableName = "approved_billing_scopes" | "quotations" | "invoices";
type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
};
type BillingScenario = Record<TableName, QueryResponse>;
type InvoiceFilter =
  | { method: "eq" | "is"; column: string; value: unknown }
  | {
      method: "not";
      column: string;
      operator: string;
      value: unknown;
    };

let activeScenario: BillingScenario | null = null;
let invoiceFilters: InvoiceFilter[] = [];

function currentScenario(): BillingScenario {
  if (!activeScenario) throw new Error("Billing scenario not initialized");
  return activeScenario;
}

function createFakeSupabase() {
  return {
    from(table: TableName) {
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: unknown) {
          if (table === "invoices") {
            invoiceFilters.push({ method: "eq", column, value });
          }
          return query;
        },
        is(column: string, value: unknown) {
          if (table === "invoices") {
            invoiceFilters.push({ method: "is", column, value });
          }
          return query;
        },
        not(column: string, operator: string, value: unknown) {
          if (table === "invoices") {
            invoiceFilters.push({ method: "not", column, operator, value });
          }
          return query;
        },
        order() {
          return query;
        },
        then(
          onFulfilled?: (response: QueryResponse) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          const response = currentScenario()[table];
          const filteredResponse =
            table === "invoices" && Array.isArray(response.data)
              ? {
                  ...response,
                  data: response.data.filter((value) => {
                    if (
                      value === null ||
                      typeof value !== "object" ||
                      Array.isArray(value)
                    ) {
                      return true;
                    }

                    const row = value as Record<string, unknown>;
                    return invoiceFilters.every((filter) => {
                      if (filter.column !== "is_deleted") return true;
                      if (filter.method === "eq") {
                        return row.is_deleted === filter.value;
                      }
                      if (
                        filter.method === "not" &&
                        filter.operator === "is" &&
                        filter.value === true
                      ) {
                        return row.is_deleted !== true;
                      }
                      return true;
                    });
                  }),
                }
              : response;

          return Promise.resolve(filteredResponse).then(
            onFulfilled,
            onRejected,
          );
        },
      };

      return query;
    },
  };
}

function approvedScope(ceiling: unknown) {
  return {
    id: "scope-active",
    status: "approved",
    accepted_grand_total: ceiling,
    source_quotation_id: "qt-1",
    superseded_at: null,
    voided_at: null,
  };
}

function historicalScope() {
  return {
    ...approvedScope(40),
    id: "scope-voided",
    status: "voided",
    voided_at: "2026-07-14T00:00:00Z",
  };
}

function quotation(total: unknown) {
  return {
    id: "qt-1",
    quotation_number: "QT-1",
    status: "approved",
    grand_total: total,
    created_at: "2026-07-01T00:00:00Z",
  };
}

function invoice(
  total: unknown,
  invoiceType = "deposit",
  isDeleted?: boolean | null,
  index = 0,
) {
  return {
    id: `invoice-${invoiceType}-${index}`,
    invoice_number: "INV-1",
    invoice_type: invoiceType,
    status: "draft",
    grand_total: total,
    is_deleted: isDeleted,
    created_at: "2026-07-02T00:00:00Z",
  };
}

function startScenario(
  overrides: Partial<Record<TableName, QueryResponse>> = {},
) {
  invoiceFilters = [];
  activeScenario = {
    approved_billing_scopes: { data: [], error: null },
    quotations: { data: [quotation(100)], error: null },
    invoices: { data: [], error: null },
    ...overrides,
  };
}

mock.module("server-only", { namedExports: {} });
mock.module("../supabase/admin.ts", {
  namedExports: {
    createAdminClient: () => createFakeSupabase(),
  },
});

const { getServiceBillingState } = await import("./billing-state.ts");

test("authoritative money parsing preserves zero and rejects unavailable values", () => {
  assert.equal(parseAuthoritativeMoney(0), 0);
  assert.equal(parseAuthoritativeMoney("0"), 0);
  assert.equal(parseAuthoritativeMoney(12.5), 12.5);
  assert.equal(parseAuthoritativeMoney(null), null);
  assert.equal(parseAuthoritativeMoney(""), null);
  assert.equal(parseAuthoritativeMoney("NaN"), null);
  assert.equal(parseAuthoritativeMoney("Infinity"), null);
  assert.equal(parseAuthoritativeMoney(Number.POSITIVE_INFINITY), null);
  assert.equal(parseAuthoritativeMoney(-1), null);
  assert.equal(sumAuthoritativeMoney([]), 0);
  assert.deepEqual(toAuthoritativeMoneyField(0), {
    kind: "value",
    amount: 0,
  });
  assert.deepEqual(toAuthoritativeMoneyField(null), { kind: "unavailable" });
});

test("successful empty Invoice read proves zero exposure", async () => {
  startScenario();

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "legacy_quotation");
  assert.equal(state.activePriorInvoiceTotal, 0);
  assert.equal(state.billingCeiling, 100);
  assert.equal(state.remainingUninvoicedAmount, 100);
  assert.equal(state.canCreateDepositInvoice, true);
  assert.equal(state.canCreateFinalInvoice, true);
});

test("active ABS computes remaining from authoritative ceiling and exposure", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(50)], error: null },
    invoices: { data: [invoice(30)], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "active_abs");
  assert.equal(state.billingCeiling, 50);
  assert.equal(state.activePriorInvoiceTotal, 30);
  assert.equal(state.remainingUninvoicedAmount, 20);
});

test("active ABS equality preserves authoritative zero remaining", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(40)], error: null },
    invoices: { data: [invoice(40)], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.billingCeiling, 40);
  assert.equal(state.activePriorInvoiceTotal, 40);
  assert.equal(state.remainingUninvoicedAmount, 0);
  assert.deepEqual(toAuthoritativeMoneyField(state.remainingUninvoicedAmount), {
    kind: "value",
    amount: 0,
  });
});

test("Invoice query failure preserves active authority but disables uncertain money", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(50)], error: null },
    invoices: { data: null, error: { message: "invoice read failed" } },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "active_abs");
  assert.equal(state.billingCeiling, 50);
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
  assert.ok(state.disabledReasons.includes("invoice_exposure_unavailable"));
});

test("null Invoice payload never becomes zero exposure", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(50)], error: null },
    invoices: { data: null, error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
});

for (const malformedAmount of [
  null,
  "",
  "NaN",
  "Infinity",
  "0x10",
  "0b10",
  "1e3",
  "+5",
  Infinity,
  -1,
]) {
  test(`malformed Invoice amount ${String(malformedAmount)} fails closed`, async () => {
    startScenario({
      approved_billing_scopes: { data: [approvedScope(50)], error: null },
      invoices: { data: [invoice(malformedAmount)], error: null },
    });

    const state = await getServiceBillingState("service-1");

    assert.equal(state.depositInvoice?.amount, null);
    assert.equal(state.activePriorInvoiceTotal, null);
    assert.equal(state.remainingUninvoicedAmount, null);
    assert.equal(state.canCreateDepositInvoice, false);
    assert.equal(state.canCreateFinalInvoice, false);
  });
}

test("canonical string zero remains authoritative Invoice exposure", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(50)], error: null },
    invoices: { data: [invoice("0")], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.activePriorInvoiceTotal, 0);
  assert.equal(state.remainingUninvoicedAmount, 50);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, true);
});

test("historical-only known-zero exposure stays zero while remaining is unavailable", async () => {
  startScenario({
    approved_billing_scopes: { data: [historicalScope()], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "historical_abs_only");
  assert.equal(state.billingCeiling, null);
  assert.equal(state.activePriorInvoiceTotal, 0);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
});

test("historical-only unavailable exposure never becomes zero", async () => {
  startScenario({
    approved_billing_scopes: { data: [historicalScope()], error: null },
    invoices: { data: null, error: { message: "invoice read failed" } },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "historical_abs_only");
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
});

test("unavailable authority carries no fabricated financial values", async () => {
  startScenario({
    approved_billing_scopes: {
      data: null,
      error: { message: "scope read failed" },
    },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "unavailable");
  assert.equal(state.billingCeiling, null);
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
});

test("legacy quotation retains valid calculation behavior", async () => {
  startScenario({
    invoices: { data: [invoice(30)], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "legacy_quotation");
  assert.equal(state.billingCeiling, 100);
  assert.equal(state.activePriorInvoiceTotal, 30);
  assert.equal(state.remainingUninvoicedAmount, 70);
});

test("nullable soft-delete Invoice counts while true soft-delete is excluded", async () => {
  startScenario({
    invoices: {
      data: [
        invoice(80, "deposit", null),
        invoice(90, "final", true, 1),
      ],
      error: null,
    },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "legacy_quotation");
  assert.equal(state.billingCeiling, 100);
  assert.equal(state.activePriorInvoiceTotal, 80);
  assert.equal(state.remainingUninvoicedAmount, 20);
  assert.equal(state.depositInvoice?.amount, 80);
  assert.equal(state.finalInvoice, null);
  assert.deepEqual(invoiceFilters, [
    { method: "eq", column: "service_id", value: "service-1" },
    {
      method: "not",
      column: "is_deleted",
      operator: "is",
      value: true,
    },
    { method: "is", column: "voided_at", value: null },
    {
      method: "not",
      column: "status",
      operator: "in",
      value: '("voided","cancelled")',
    },
  ]);
});

test("legacy quotation exposure failure disables fallback controls", async () => {
  startScenario({
    invoices: { data: null, error: { message: "invoice read failed" } },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "legacy_quotation");
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
});

for (const malformedCeiling of [null, "", "NaN", "Infinity", Infinity, -1]) {
  test(`malformed active ceiling ${String(malformedCeiling)} is unavailable`, async () => {
    startScenario({
      approved_billing_scopes: {
        data: [approvedScope(malformedCeiling)],
        error: null,
      },
    });

    const state = await getServiceBillingState("service-1");

    assert.equal(state.authorityMode, "unavailable");
    assert.equal(state.billingCeiling, null);
    assert.equal(state.activePriorInvoiceTotal, null);
    assert.equal(state.remainingUninvoicedAmount, null);
  });
}

test("malformed legacy quotation total fails closed", async () => {
  startScenario({
    quotations: { data: [quotation("")], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.approvedQuotation?.grandTotal, null);
  assert.equal(state.authorityMode, "unavailable");
  assert.equal(state.billingCeiling, null);
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
});

test("malformed source quotation total also fails closed for active ABS", async () => {
  startScenario({
    approved_billing_scopes: { data: [approvedScope(50)], error: null },
    quotations: { data: [quotation("NaN")], error: null },
  });

  const state = await getServiceBillingState("service-1");

  assert.equal(state.authorityMode, "unavailable");
  assert.equal(state.billingCeiling, null);
  assert.equal(state.activePriorInvoiceTotal, null);
  assert.equal(state.remainingUninvoicedAmount, null);
  assert.equal(state.canCreateDepositInvoice, false);
  assert.equal(state.canCreateFinalInvoice, false);
});

test("BillingPanel preserves nullable money and never passes a zero fallback", () => {
  const panelPath = join(
    import.meta.dirname,
    "../../app/(dashboard)/services/[id]/BillingPanel.tsx",
  );
  const panelSource = readFileSync(panelPath, "utf8");

  assert.match(panelSource, /exposureUnavailable/);
  assert.match(panelSource, /remainingUnavailable/);
  assert.match(panelSource, /amountUnavailable/);
  assert.match(panelSource, /quotationTotal=\{billingState\.billingCeiling\}/);
  assert.doesNotMatch(panelSource, /billingState\.billingCeiling \?\? 0/);
});
