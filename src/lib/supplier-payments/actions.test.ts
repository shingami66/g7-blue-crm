import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {}" };
    }
    if (specifier === "next/cache") {
      return { shortCircuit: true, url: "data:text/javascript,export const revalidatePath = () => {}" };
    }
    if (specifier === "@/lib/auth/permissions") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const requirePermission = async () => ({ id: '11111111-1111-4111-8111-111111111111', role: 'accountant' })",
      };
    }
    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => globalThis.__supplierPaymentMockClient",
      };
    }
    if (specifier === "@/lib/documents/storage") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const uploadPrivateSupplierPaymentEvidence = (...args) => globalThis.__supplierPaymentUpload(...args); export const cleanupUploadedPrivateBusinessDocument = (...args) => globalThis.__supplierPaymentCleanup(...args); export const createPrivateSupplierPaymentEvidenceUrl = async () => ({ signedUrl: 'https://example.test/evidence', expiresInSeconds: 60 })",
      };
    }
    if (specifier.startsWith("@/")) {
      return { shortCircuit: true, url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href };
    }
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { recordSupplierPaymentAction } = await import("./actions.ts");

declare global {
  var __supplierPaymentMockClient: unknown;
  var __supplierPaymentUpload: (...args: unknown[]) => Promise<{ id: string }>;
  var __supplierPaymentCleanup: (...args: unknown[]) => Promise<void>;
}

test("same-request concurrent recording returns one payment and a replay", async () => {
  const supplierBillId = "22222222-2222-4222-8222-222222222222";
  const requestId = "33333333-3333-4333-8333-333333333333";
  let preflightCalls = 0;
  let uploadCalls = 0;
  let rpcCalls = 0;
  let cleanupCalls = 0;
  let releasePreflight!: () => void;
  const preflightBarrier = new Promise<void>((resolve) => {
    releasePreflight = resolve;
  });
  let persistedPayment: Record<string, unknown> | null = null;

  function builder(table: string) {
    const filters: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      eq: (field: string, value: unknown) => {
        filters[field] = value;
        return chain;
      },
      maybeSingle: async () => {
        if (table === "supplier_payments") {
          preflightCalls += 1;
          if (preflightCalls <= 2) {
            if (preflightCalls === 2) releasePreflight();
            await preflightBarrier;
            return { data: null, error: null };
          }
          return { data: persistedPayment, error: null };
        }
        if (table === "supplier_bills") return { data: { service_id: "44444444-4444-4444-8444-444444444444" }, error: null };
        if (table === "supplier_bill_payment_balances") return { data: { outstanding_amount: 500, payment_status: "partially_paid" }, error: null };
        return { data: null, error: null };
      },
    };
    return chain;
  }

  globalThis.__supplierPaymentMockClient = {
    from: (table: string) => builder(table),
    rpc: async () => {
      rpcCalls += 1;
      if (rpcCalls === 1) {
        persistedPayment = {
          id: "55555555-5555-4555-8555-555555555555",
          payment_number: "SPAY-2026-0001",
          supplier_bill_id: supplierBillId,
          payment_date: "2026-09-14",
          amount: 500,
          method: "cash",
          reference: null,
          notes: null,
          record_request_id: requestId,
        };
        return { data: [{ error_code: null, payment_id: persistedPayment.id, payment_number: persistedPayment.payment_number, outstanding_amount: 0, payment_status: "paid", idempotent_replay: false }], error: null };
      }
      return { data: [{ error_code: "supplier_payment_request_conflict", payment_id: persistedPayment?.id, payment_number: persistedPayment?.payment_number, supplier_bill_id: supplierBillId, idempotent_replay: false }], error: null };
    },
  };
  globalThis.__supplierPaymentUpload = async () => ({ id: `document-${++uploadCalls}` });
  globalThis.__supplierPaymentCleanup = async () => {
    cleanupCalls += 1;
  };

  function formData() {
    const form = new FormData();
    form.set("supplier_bill_id", supplierBillId);
    form.set("payment_date", "2026-09-14");
    form.set("amount", "500.00");
    form.set("method", "cash");
    form.set("reference", "");
    form.set("notes", "");
    form.set("request_id", requestId);
    form.set("document", new File(["receipt"], "receipt.pdf", { type: "application/pdf" }));
    return form;
  }

  const [first, second] = await Promise.all([
    recordSupplierPaymentAction(formData()),
    recordSupplierPaymentAction(formData()),
  ]);

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.idempotentReplay, true);
  assert.equal(first.data?.payment_id, second.data?.payment_id);
  assert.equal(uploadCalls, 2);
  assert.equal(cleanupCalls, 1);
  assert.equal(rpcCalls, 2);
});
