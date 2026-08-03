import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { resolveInvoiceControlVisibility } from "./control-visibility.ts";
import { getServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle.ts";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };

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

const { INVOICE_PERMISSIONS, hasPermissionForRole } = await import(
  "../auth/role-permissions.ts"
);

function lifecycle(status: unknown) {
  return getServiceInvoiceLifecycleDecision({ status, deletedAt: null });
}

function eligibleState(role: unknown) {
  return resolveInvoiceControlVisibility({
    canCreateInvoices: hasPermissionForRole(role, INVOICE_PERMISSIONS.write),
    authorityMode: "active_abs",
    lifecycleDecision: lifecycle("Approved"),
    canCreateDepositInvoice: true,
    canCreateFinalInvoice: true,
    remainingUninvoicedAmount: 20,
  });
}

test("Admin and Manager see eligible Deposit and Final Invoice controls", () => {
  for (const role of ["admin", "manager"] as const) {
    assert.deepEqual(eligibleState(role), {
      showInvoiceActions: true,
      canCreateDepositInvoice: true,
      canCreateFinalInvoice: true,
    });
  }
});

test("Accountant financial visibility never becomes mutation-control visibility", () => {
  assert.equal(hasPermissionForRole("accountant", INVOICE_PERMISSIONS.read), true);
  assert.deepEqual(eligibleState("accountant"), {
    showInvoiceActions: false,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
  });
});

test("Historical-only and unavailable authority hide controls for every role", () => {
  for (const authorityMode of ["historical_abs_only", "unavailable"] as const) {
    const result = resolveInvoiceControlVisibility({
      canCreateInvoices: true,
      authorityMode,
      lifecycleDecision: lifecycle("Approved"),
      canCreateDepositInvoice: true,
      canCreateFinalInvoice: true,
      remainingUninvoicedAmount: 20,
    });

    assert.deepEqual(result, {
      showInvoiceActions: false,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
    });
  }
});

test("Fully allocated authority blocks Final Invoice regardless of permission", () => {
  const result = resolveInvoiceControlVisibility({
    canCreateInvoices: true,
    authorityMode: "active_abs",
    lifecycleDecision: lifecycle("Approved"),
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: true,
    remainingUninvoicedAmount: 0,
  });

  assert.equal(result.showInvoiceActions, true);
  assert.equal(result.canCreateDepositInvoice, false);
  assert.equal(result.canCreateFinalInvoice, false);
});

test("Permission and financial-state gates cannot override one another", () => {
  const permissionDenied = resolveInvoiceControlVisibility({
    canCreateInvoices: false,
    authorityMode: "active_abs",
    lifecycleDecision: lifecycle("Approved"),
    canCreateDepositInvoice: true,
    canCreateFinalInvoice: true,
    remainingUninvoicedAmount: 20,
  });
  const financiallyDenied = resolveInvoiceControlVisibility({
    canCreateInvoices: true,
    authorityMode: "active_abs",
    lifecycleDecision: lifecycle("Approved"),
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    remainingUninvoicedAmount: 20,
  });

  assert.equal(permissionDenied.showInvoiceActions, false);
  assert.equal(permissionDenied.canCreateDepositInvoice, false);
  assert.equal(permissionDenied.canCreateFinalInvoice, false);
  assert.equal(financiallyDenied.showInvoiceActions, true);
  assert.equal(financiallyDenied.canCreateDepositInvoice, false);
  assert.equal(financiallyDenied.canCreateFinalInvoice, false);
});

for (const lifecycleCase of [
  { status: "Inquiry", deposit: true, final: true, actions: true },
  { status: "Quoted", deposit: true, final: true, actions: true },
  { status: "Approved", deposit: true, final: true, actions: true },
  { status: "Deposit Paid", deposit: false, final: true, actions: true },
  { status: "In Progress", deposit: false, final: true, actions: true },
  { status: "Completed", deposit: false, final: true, actions: true },
  { status: "Cancelled", deposit: false, final: false, actions: false },
] as const) {
  test(`Invoice controls apply the shared lifecycle matrix for ${lifecycleCase.status}`, () => {
    assert.deepEqual(
      resolveInvoiceControlVisibility({
        canCreateInvoices: true,
        authorityMode: "active_abs",
        lifecycleDecision: lifecycle(lifecycleCase.status),
        canCreateDepositInvoice: true,
        canCreateFinalInvoice: true,
        remainingUninvoicedAmount: 20,
      }),
      {
        showInvoiceActions: lifecycleCase.actions,
        canCreateDepositInvoice: lifecycleCase.deposit,
        canCreateFinalInvoice: lifecycleCase.final,
      },
    );
  });
}

test("Malformed lifecycle evidence hides every Invoice control", () => {
  assert.deepEqual(
    resolveInvoiceControlVisibility({
      canCreateInvoices: true,
      authorityMode: "active_abs",
      lifecycleDecision: lifecycle("Archived"),
      canCreateDepositInvoice: true,
      canCreateFinalInvoice: true,
      remainingUninvoicedAmount: 20,
    }),
    {
      showInvoiceActions: false,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
    },
  );
});
