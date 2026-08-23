import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type RpcName =
  | "_p6_get_service_billing_authority"
  | "_p6_get_service_billing_exposure";
type RpcResponse = { data: unknown; error: { message: string } | null };
type RpcCall = { name: RpcName; args: { p_service_id: string } };

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: ResolveContext,
      nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
    ) => ResolveResult;
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

let deniedPermission: string | null = null;
let rpcCalls: RpcCall[] = [];
let rpcResponses: Record<RpcName, RpcResponse>;

function startScenario(
  responses: Partial<Record<RpcName, RpcResponse>> = {},
): void {
  deniedPermission = null;
  rpcCalls = [];
  rpcResponses = {
    _p6_get_service_billing_authority: {
      data: [{ authority_status: "legacy_quotation", billing_ceiling: 100 }],
      error: null,
    },
    _p6_get_service_billing_exposure: {
      data: [
        {
          exposure_status: "ready",
          applicable_invoice_count: 0,
          lifetime_invoice_total: 0,
        },
      ],
      error: null,
    },
    ...responses,
  };
}

mock.module("server-only", { namedExports: {} });
mock.module("../supabase/admin.ts", {
  namedExports: {
    createAdminClient: () => ({
      rpc(name: RpcName, args: { p_service_id: string }) {
        rpcCalls.push({ name, args });
        return Promise.resolve(rpcResponses[name]);
      },
    }),
  },
});
mock.module("../auth/permissions.ts", {
  namedExports: {
    requirePermission: async (permission: string) => {
      if (permission === deniedPermission) {
        throw new Error(`Denied ${permission}`);
      }
    },
  },
});

const { getServiceBillingSummary } = await import("./billing-summary-query.ts");
const { computeServiceBillingSummary } = await import("./billing-state.ts");

test("Service Billing summary checks both permissions before aggregate RPCs", async () => {
  startScenario();
  deniedPermission = "services:read";

  await assert.rejects(() => getServiceBillingSummary("service-1"));
  assert.deepEqual(rpcCalls, []);

  deniedPermission = "services:read_billing_summary";
  await assert.rejects(() => getServiceBillingSummary("service-1"));
  assert.deepEqual(rpcCalls, []);
});

test("Service Billing summary uses exactly two bounded aggregate reads and preserves canonical totals", async () => {
  startScenario({
    _p6_get_service_billing_authority: {
      data: [{ authority_status: "active_abs", billing_ceiling: "100" }],
      error: null,
    },
    _p6_get_service_billing_exposure: {
      data: [
        {
          exposure_status: "ready",
          applicable_invoice_count: "3",
          lifetime_invoice_total: "65",
        },
      ],
      error: null,
    },
  });

  const summary = await getServiceBillingSummary("service-1");
  const canonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [
      {
        status: "approved",
        accepted_grand_total: 100,
        source_quotation_id: "quotation-1",
        superseded_at: null,
        voided_at: null,
      },
    ],
    quotations: [{ id: "quotation-1", grand_total: 100 }],
    invoices: [{ grand_total: 30 }, { grand_total: 20 }, { grand_total: 15 }],
  });

  assert.deepEqual(summary, canonical);
  assert.deepEqual(rpcCalls, [
    {
      name: "_p6_get_service_billing_authority",
      args: { p_service_id: "service-1" },
    },
    {
      name: "_p6_get_service_billing_exposure",
      args: { p_service_id: "service-1" },
    },
  ]);
});

test("bounded authority outcomes match canonical summary semantics", async () => {
  const activeCanonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [
      {
        status: "approved",
        accepted_grand_total: 100,
        source_quotation_id: "quotation-1",
        superseded_at: null,
        voided_at: null,
      },
    ],
    quotations: [{ id: "quotation-1", grand_total: 100 }],
    invoices: [{ grand_total: 20 }],
  });
  const legacyCanonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [],
    quotations: [{ id: "quotation-1", grand_total: 100 }],
    invoices: [{ grand_total: 20 }],
  });
  const historicalCanonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [
      {
        status: "voided",
        accepted_grand_total: 100,
        source_quotation_id: "quotation-1",
        superseded_at: null,
        voided_at: "2026-08-01T00:00:00Z",
      },
    ],
    quotations: [{ id: "quotation-1", grand_total: 100 }],
    invoices: [{ grand_total: 20 }],
  });
  const noAuthorityCanonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [],
    quotations: [],
    invoices: [{ grand_total: 20 }],
  });
  const unavailableCanonical = computeServiceBillingSummary({
    serviceId: "service-1",
    scopes: [],
    quotations: [],
    invoices: [],
    hasScopesError: true,
  });

  const cases = [
    {
      name: "active ABS",
      authority: { authority_status: "active_abs", billing_ceiling: 100 },
      expected: activeCanonical,
    },
    {
      name: "legacy approved quotation fallback",
      authority: { authority_status: "legacy_quotation", billing_ceiling: 100 },
      expected: legacyCanonical,
    },
    {
      name: "historical ABS only",
      authority: { authority_status: "historical_abs_only", billing_ceiling: null },
      expected: historicalCanonical,
    },
    {
      name: "empty histories with no authority",
      authority: { authority_status: "no_authority", billing_ceiling: null },
      expected: noAuthorityCanonical,
    },
    {
      name: "contradictory or malformed authority",
      authority: { authority_status: "unavailable", billing_ceiling: null },
      expected: unavailableCanonical,
    },
  ];

  for (const scenario of cases) {
    startScenario({
      _p6_get_service_billing_authority: { data: [scenario.authority], error: null },
      _p6_get_service_billing_exposure: {
        data: [
          {
            exposure_status: "ready",
            applicable_invoice_count: 1,
            lifetime_invoice_total: 20,
          },
        ],
        error: null,
      },
    });

    assert.deepEqual(
      await getServiceBillingSummary("service-1"),
      scenario.expected,
      scenario.name,
    );
  }
});

test("small and large synthetic histories retain exactly two aggregate requests", async () => {
  for (const applicableInvoiceCount of ["1", "1000000"]) {
    startScenario({
      _p6_get_service_billing_authority: {
        data: [{ authority_status: "active_abs", billing_ceiling: 1000001 }],
        error: null,
      },
      _p6_get_service_billing_exposure: {
        data: [
          {
            exposure_status: "ready",
            applicable_invoice_count: applicableInvoiceCount,
            lifetime_invoice_total: 1,
          },
        ],
        error: null,
      },
    });

    assert.deepEqual(await getServiceBillingSummary("service-1"), {
      billingCeiling: 1000001,
      activePriorInvoiceTotal: 1,
      remainingUninvoicedAmount: 1000000,
    });
    assert.equal(rpcCalls.length, 2);
  }
});

test("authority aggregate failure clears all three Service Billing money fields", async () => {
  startScenario({
    _p6_get_service_billing_authority: {
      data: [{ authority_status: "unavailable", billing_ceiling: null }],
      error: null,
    },
    _p6_get_service_billing_exposure: {
      data: [
        {
          exposure_status: "ready",
          applicable_invoice_count: 1,
          lifetime_invoice_total: 20,
        },
      ],
      error: null,
    },
  });

  assert.deepEqual(await getServiceBillingSummary("service-1"), {
    billingCeiling: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
  });
});

test("exposure aggregate failure preserves a valid ceiling but clears exposure and remaining", async () => {
  startScenario({
    _p6_get_service_billing_authority: {
      data: [{ authority_status: "active_abs", billing_ceiling: 100 }],
      error: null,
    },
    _p6_get_service_billing_exposure: {
      data: [
        {
          exposure_status: "unavailable",
          applicable_invoice_count: null,
          lifetime_invoice_total: null,
        },
      ],
      error: null,
    },
  });

  assert.deepEqual(await getServiceBillingSummary("service-1"), {
    billingCeiling: 100,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
  });
});

test("malformed aggregate shape fails closed rather than fabricating a zero", async () => {
  startScenario({
    _p6_get_service_billing_authority: {
      data: [{ authority_status: "active_abs", billing_ceiling: 100 }],
      error: null,
    },
    _p6_get_service_billing_exposure: {
      data: [
        {
          exposure_status: "ready",
          applicable_invoice_count: 1,
          lifetime_invoice_total: "Infinity",
        },
      ],
      error: null,
    },
  });

  assert.deepEqual(await getServiceBillingSummary("service-1"), {
    billingCeiling: 100,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
  });
});
