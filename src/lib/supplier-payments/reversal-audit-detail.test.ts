import assert from "node:assert/strict";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { resolveUiDateTimeDisplay } from "../i18n/formatting.ts";

type QueryResult = { data: unknown; error: null };
type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

interface QueryChain extends PromiseLike<QueryResult> {
  select: (columns: string) => QueryChain;
  eq: (field: string, value: unknown) => QueryChain;
  in: (field: string, values: unknown[]) => QueryChain;
  order: (field: string, options: { ascending: boolean }) => QueryChain;
  maybeSingle: () => Promise<QueryResult>;
}

type QueryCall = {
  table: string;
  selectedColumns: string | null;
  filters: Record<string, unknown>;
};

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export default {}" };
    if (specifier === "@/lib/auth/permissions") return { shortCircuit: true, url: "data:text/javascript,export const requirePermission = async () => ({ id: '11111111-1111-4111-8111-111111111111', role: 'accountant' })" };
    if (specifier === "@/lib/supabase/admin") return { shortCircuit: true, url: "data:text/javascript,export const createAdminClient = () => globalThis.__supplierPaymentDetailMockClient" };
    if (specifier.startsWith("@/")) return { shortCircuit: true, url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href };
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

const { getSupplierPaymentById } = await import("./queries.ts");
const { supplierPaymentsDictionaryAr, supplierPaymentsDictionaryEn } = await import("../i18n/dictionaries/supplier-payments.ts");

const repoRoot = join(import.meta.dirname, "../../..");
const reactResolvedUrl = pathToFileURL(require.resolve("react")).href;
const formattingUrl = pathToFileURL(join(repoRoot, "src/lib/i18n/formatting.ts")).href;

declare global {
  var __supplierPaymentDetailMockClient: { from: (table: string) => QueryChain };
}

test("reversed payment detail resolves a display identity without exposing the reversal UUID", async () => {
  const paymentId = "55555555-5555-4555-8555-555555555555";
  const reversingUserId = "66666666-6666-4666-8666-666666666666";
  const reversal = {
    supplier_payment_id: paymentId,
    reason: "Duplicate bank transfer reference.",
    reversed_by: reversingUserId,
    reversed_at: "2026-09-15T08:04:00.000Z",
  };
  const queryCalls: QueryCall[] = [];

  function result(table: string, single: boolean): QueryResult {
    const payment = {
      id: paymentId,
      payment_number: "SPAY-2026-0001",
      supplier_bill_id: "22222222-2222-4222-8222-222222222222",
      supplier_id: "33333333-3333-4333-8333-333333333333",
      service_id: "44444444-4444-4444-8444-444444444444",
      payment_date: "2026-09-14",
      amount: 1000,
      method: "bank_transfer",
      reference: "TXN-1000",
      bank_name_snapshot: "Example Bank",
      bank_account_name_snapshot: "Supplier Account",
      iban_snapshot: "SA0380000000608010167519",
      notes: null,
      recorded_by: "11111111-1111-4111-8111-111111111111",
      recorded_at: "2026-09-14T08:00:00.000Z",
      record_request_id: "77777777-7777-4777-8777-777777777777",
    };
    const dataByTable: Record<string, unknown> = {
      supplier_payments: single ? payment : [],
      supplier_payment_reversals: single ? reversal : [reversal],
      supplier_bills: [{ id: payment.supplier_bill_id, bill_number: "BILL-2026-0001", total_amount: 1000, currency: "SAR" }],
      suppliers: [{ id: payment.supplier_id, display_name: "Supplier Name", name: "Supplier Name" }],
      services: [{ id: payment.service_id, service_number: "SVC-2026-0001", service_title: "Service title" }],
      supplier_bill_payment_balances: { supplier_bill_id: payment.supplier_bill_id, currency: "SAR", payable_amount: 1000, outstanding_amount: 1000 },
      supplier_payment_documents: [],
    };
    return { data: dataByTable[table] ?? (single ? null : []), error: null };
  }

  function builder(table: string): QueryChain {
    const call: QueryCall = { table, selectedColumns: null, filters: {} };
    queryCalls.push(call);
    const chain: QueryChain = {
      select: (columns) => {
        call.selectedColumns = columns;
        return chain;
      },
      eq: (field, value) => {
        call.filters[field] = value;
        return chain;
      },
      in: () => chain,
      order: () => chain,
      maybeSingle: async () => {
        if (table === "app_users") {
          const isExactIdentityLookup = call.selectedColumns === "id,name,email" && call.filters.id === reversingUserId;
          return { data: isExactIdentityLookup ? { id: reversingUserId, name: "Finance Reviewer", email: "reviewer@example.test" } : null, error: null };
        }
        return result(table, true);
      },
      then(onfulfilled, onrejected) {
        return Promise.resolve(result(table, false)).then(onfulfilled, onrejected);
      },
    };
    return chain;
  }

  globalThis.__supplierPaymentDetailMockClient = { from: builder };

  const resultDetail = await getSupplierPaymentById(paymentId);

  assert.equal(resultDetail.error, undefined);
  assert.ok(resultDetail.payment);
  assert.equal(resultDetail.payment.reversal_reason, reversal.reason);
  assert.equal(resultDetail.payment.reversed_at, reversal.reversed_at);
  assert.equal(resultDetail.payment.reversed_by_name, "Finance Reviewer");
  assert.equal(Object.hasOwn(resultDetail.payment, "reversed_by"), false);
  assert.doesNotMatch(JSON.stringify(resultDetail.payment), new RegExp(reversingUserId));
  assert.deepEqual(
    queryCalls.filter((call) => call.table === "app_users"),
    [{ table: "app_users", selectedColumns: "id,name,email", filters: { id: reversingUserId } }],
  );

  assert.equal(supplierPaymentsDictionaryEn.fields.reversedBy, "Reversed by");
  assert.equal(supplierPaymentsDictionaryAr.fields.reversedBy, "تم العكس بواسطة");
  assert.equal(supplierPaymentsDictionaryEn.fields.reversalReason, "Reversal Reason");
  assert.equal(supplierPaymentsDictionaryEn.fields.reversedAt, "Reversed At");
});

function structuredDateTimeText(locale: "en" | "ar", value: string): string {
  const tokens = resolveUiDateTimeDisplay(locale, value);
  if (tokens.kind !== "segments") return tokens.text;
  const date = [tokens.day, tokens.month, tokens.year].filter(Boolean).join(" ");
  const time = [tokens.time, tokens.dayPeriod].filter(Boolean).join(" ");
  return time ? `${date}، ${time}` : date;
}

async function loadSupplierPaymentDetailClient(): Promise<React.ComponentType<Record<string, unknown>>> {
  const componentPath = join(repoRoot, "src/app/(dashboard)/supplier-payments/SupplierPaymentDetailClient.tsx");
  let source = readFileSync(componentPath, "utf8");

  source = source.replace(/from\s+["']react["']/g, `from "${reactResolvedUrl}"`);
  source = source.replace(/import\s+\{\s*useRouter\s*\}\s+from\s+["']next\/navigation["'];?/, "const useRouter = () => ({ refresh: () => {} });");
  source = source.replace(/import\s+\{\s*ArrowLeft,\s*ArrowRight\s*\}\s+from\s+["']lucide-react["'];?/, "const ArrowLeft = () => null; const ArrowRight = () => null;");
  source = source.replace(/import\s+Button\s+from\s+["']@\/components\/ui\/Button["'];?/, "const Button = ({ children }) => React.createElement('button', null, children);");
  source = source.replace(/import\s+PendingLink\s+from\s+["']@\/components\/ui\/PendingLink["'];?/, "const PendingLink = ({ href, children }) => React.createElement('a', { href }, children);");
  source = source.replace(/import\s+StatusBadge\s+from\s+["']@\/components\/ui\/StatusBadge["'];?/, "const StatusBadge = ({ children }) => React.createElement('span', null, children);");
  source = source.replace(/import\s+\{\s*UiDateText,\s*UiDateTimeText\s*\}\s+from\s+["']@\/components\/i18n\/UiDateText["'];?/, `import { resolveUiDateTimeDisplay } from "${formattingUrl}"; const UiDateText = ({ value }) => React.createElement('span', null, String(value)); const UiDateTimeText = ({ locale, value }) => { const tokens = resolveUiDateTimeDisplay(locale, value); const text = tokens.kind === 'segments' ? [tokens.day, tokens.month, tokens.year].filter(Boolean).join(' ') + (tokens.time ? '، ' + [tokens.time, tokens.dayPeriod].filter(Boolean).join(' ') : '') : tokens.text; return React.createElement('span', { 'data-ui-date-time': 'structured' }, text); };`);
  source = source.replace(/from\s+["']@\/lib\/i18n\/formatting["']/, `from "${formattingUrl}"`);
  source = source.replace(/import\s+\{\s*createSupplierPaymentDocumentViewUrl,\s*reverseSupplierPaymentAction\s*\}\s+from\s+["']@\/lib\/supplier-payments\/actions["'];?/, "const createSupplierPaymentDocumentViewUrl = async () => ({ success: true }); const reverseSupplierPaymentAction = async () => ({ success: true });");

  const transpiled = ts.transpileModule(`import React from "${reactResolvedUrl}";\n${source}`, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const temporaryModule = join(tmpdir(), `g7-supplier-payment-audit-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(temporaryModule, transpiled, "utf8");
  try {
    const importedComponent = await import(pathToFileURL(temporaryModule).href);
    return importedComponent.default as React.ComponentType<Record<string, unknown>>;
  } finally {
    unlinkSync(temporaryModule);
  }
}

test("reversal audit renders reason, structured date-time, and the resolved identity in English and Arabic", async () => {
  const detailSource = readFileSync(new URL("../../app/(dashboard)/supplier-payments/SupplierPaymentDetailClient.tsx", import.meta.url), "utf8");
  assert.match(detailSource, /<UiDateTimeText locale=\{locale\} value=\{payment\.reversed_at\} \/>/);
  const SupplierPaymentDetailClient = await loadSupplierPaymentDetailClient();
  const reversedById = "66666666-6666-4666-8666-666666666666";
  const reversedAt = "2026-09-15T08:04:00.000Z";
  const payment = {
    id: "55555555-5555-4555-8555-555555555555", payment_number: "SPAY-2026-0001", supplier_bill_id: "22222222-2222-4222-8222-222222222222", supplier_id: "33333333-3333-4333-8333-333333333333", service_id: "44444444-4444-4444-8444-444444444444", payment_date: "2026-09-14", amount: 1000, method: "cash", reference: null, bank_name_snapshot: null, bank_account_name_snapshot: null, iban_snapshot: null, notes: null, recorded_by: "11111111-1111-4111-8111-111111111111", recorded_at: "2026-09-14T08:00:00.000Z", record_request_id: "77777777-7777-4777-8777-777777777777", reversed_at: reversedAt, reversal_reason: "Duplicate bank transfer reference.", status: "reversed", bill_number: "BILL-2026-0001", supplier_name: "Supplier Name", service_number: "SVC-2026-0001", service_title: "Service title", bill_currency: "SAR", bill_total: 1000, outstanding_amount: 1000, documents: [], reversed_by_name: "Finance Reviewer",
  };

  for (const dictionary of [supplierPaymentsDictionaryEn, supplierPaymentsDictionaryAr]) {
    const html = renderToStaticMarkup(React.createElement(SupplierPaymentDetailClient, { payment, canReverse: false, dictionary }));
    const expectedDateTime = structuredDateTimeText(dictionary.locale, reversedAt);

    assert.equal((html.match(new RegExp(dictionary.fields.reversalReason, "g")) ?? []).length, 1);
    assert.equal((html.match(new RegExp(dictionary.fields.reversedAt, "g")) ?? []).length, 1);
    assert.equal((html.match(new RegExp(dictionary.fields.reversedBy, "g")) ?? []).length, 1);
    assert.match(html, new RegExp(dictionary.fields.reversalAudit));
    assert.match(html, /data-ui-date-time="structured"/);
    assert.match(html, new RegExp(expectedDateTime));
    assert.match(html, /Duplicate bank transfer reference\./);
    assert.match(html, /Finance Reviewer/);
    assert.doesNotMatch(html, new RegExp(reversedById));
  }
});
