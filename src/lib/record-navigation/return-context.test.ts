import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { appendReturnTo, recordListReturnTo, recordNavigationHref, safeRecordReturnTo } from "./return-to.ts";
import { supplierBillDetailHref, supplierBillsHref, supplierBillsReturnTo } from "../supplier-bills/navigation.ts";
import { supplierPaymentDetailHref, supplierPaymentsHref, supplierPaymentsReturnTo } from "../supplier-payments/navigation.ts";
import { supplierAdvanceDetailHref, supplierAdvancesHref, supplierAdvancesReturnTo } from "../supplier-advances/navigation.ts";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const id = "307106ce-2a58-4901-bcb6-75abe12b03af";
const origin = "/suppliers?search=A%26B&category=sound&page=3&showDeleted=true";

test("record route context and return origin are independent, encoded and optional", () => {
  assert.equal(recordNavigationHref("/suppliers", id), `/suppliers/${id}`);
  const current = new URL(recordNavigationHref("/suppliers", id, "/suppliers?page=2"), "https://local.g7");
  assert.equal(current.searchParams.has("showDeleted"), false);
  assert.equal(current.searchParams.get("returnTo"), "/suppliers?page=2");
  const deleted = new URL(recordNavigationHref("/suppliers", id, origin, { showDeleted: "true", returnTo: "https://evil.example" }), "https://local.g7");
  assert.equal(deleted.searchParams.get("showDeleted"), "true");
  assert.equal(deleted.searchParams.get("returnTo"), origin);
  assert.equal(deleted.searchParams.getAll("returnTo").length, 1);
  assert.equal(recordNavigationHref("/suppliers", id, "https://evil.example"), `/suppliers/${id}`);
});

test("Supplier Bills detail links preserve current list query context and use a validated internal origin", () => {
  const query = {
    page: "3",
    pageSize: "50",
    search: "Supplier & Event",
    status: ["pending", "approved"],
    returnTo: "https://evil.example",
  };
  const returnTo = supplierBillsReturnTo(query);
  assert.equal(returnTo, "/supplier-bills?page=3&pageSize=50&search=Supplier+%26+Event&status=pending&status=approved");
  assert.equal(supplierBillsHref(4, 20, query), "/supplier-bills?search=Supplier+%26+Event&status=pending&status=approved&page=4&pageSize=20");
  assert.equal(safeRecordReturnTo(returnTo, "/supplier-bills"), returnTo);
  assert.equal(safeRecordReturnTo("https://evil.example", "/supplier-bills"), "/supplier-bills");
  assert.equal(safeRecordReturnTo("//evil.example", "/supplier-bills"), "/supplier-bills");

  const detailHref = new URL(supplierBillDetailHref(id, returnTo), "https://local.g7");
  assert.equal(detailHref.pathname, `/supplier-bills/${id}`);
  assert.equal(detailHref.searchParams.get("returnTo"), returnTo);
  assert.equal(new URL(supplierBillDetailHref(id, "https://evil.example"), "https://local.g7").searchParams.has("returnTo"), false);
});

test("Payables and Cash list origins preserve query state and reject unsafe destinations", () => {
  const query = { page: "3", pageSize: "50", search: "Supplier & Event", status: ["open", "closed"], returnTo: "https://evil.example" };
  for (const basePath of ["/supplier-payments", "/supplier-advances", "/advances", "/petty-cash"]) {
    const returnTo = recordListReturnTo(basePath, query);
    assert.equal(returnTo, `${basePath}?page=3&pageSize=50&search=Supplier+%26+Event&status=open&status=closed`);
    assert.equal(safeRecordReturnTo(returnTo, basePath), returnTo);
    assert.equal(safeRecordReturnTo("https://evil.example", basePath), basePath);
    assert.equal(safeRecordReturnTo("//evil.example", basePath), basePath);
    const detail = new URL(recordNavigationHref(basePath, id, returnTo), "https://local.g7");
    assert.equal(detail.pathname, `${basePath}/${id}`);
    assert.equal(detail.searchParams.get("returnTo"), returnTo);
  }
  assert.equal(recordListReturnTo("/supplier-payments", { returnTo: "/petty-cash?other=1" }), "/supplier-payments");
  assert.equal(safeRecordReturnTo("/supplier-payments\nLocation: https://evil.example", "/supplier-payments"), "/supplier-payments");
});

test("Supplier Payment and Supplier Advance pagers retain unrelated list query state", () => {
  const query = { page: "2", pageSize: "20", search: "cash & bank", status: ["paid", "reversed"], returnTo: "https://evil.example" };
  const paymentOrigin = supplierPaymentsReturnTo(query);
  const advanceOrigin = supplierAdvancesReturnTo(query);
  assert.equal(paymentOrigin, "/supplier-payments?page=2&pageSize=20&search=cash+%26+bank&status=paid&status=reversed");
  assert.equal(advanceOrigin, "/supplier-advances?page=2&pageSize=20&search=cash+%26+bank&status=paid&status=reversed");
  assert.equal(supplierPaymentsHref(4, 50, query), "/supplier-payments?search=cash+%26+bank&status=paid&status=reversed&page=4&pageSize=50");
  assert.equal(supplierAdvancesHref(4, 50, query), "/supplier-advances?search=cash+%26+bank&status=paid&status=reversed&page=4&pageSize=50");
  assert.equal(new URL(supplierPaymentDetailHref(id, paymentOrigin), "https://local.g7").searchParams.get("returnTo"), paymentOrigin);
  assert.equal(new URL(supplierAdvanceDetailHref(id, advanceOrigin), "https://local.g7").searchParams.get("returnTo"), advanceOrigin);
});

test("all Payables/Cash detail-opening affordances share the safe family origin helper", () => {
  const paymentList = read("app/(dashboard)/supplier-payments/SupplierPaymentsClient.tsx");
  const supplierAdvanceList = read("app/(dashboard)/supplier-advances/SupplierAdvancesClient.tsx");
  const cashAdvanceList = read("app/(dashboard)/advances/AdvancesClient.tsx");
  const pettyCashList = read("app/(dashboard)/petty-cash/PettyCashClient.tsx");
  assert.equal((paymentList.match(/href=\{detailHref\(payment\.id\)\}/g) ?? []).length, 4);
  assert.equal((supplierAdvanceList.match(/href=\{detailHref\(advance\.supplier_advance_id\)\}/g) ?? []).length, 4);
  assert.equal((cashAdvanceList.match(/href=\{detailHref\(adv\.id\)\}/g) ?? []).length, 2);
  assert.match(pettyCashList, /href=\{detailHref\(fund\.id\)\}/);
  assert.match(pettyCashList, /recordNavigationHref\("\/petty-cash", fund\.id, listReturnTo\)/);
  for (const source of [paymentList, supplierAdvanceList, cashAdvanceList, pettyCashList]) {
    assert.doesNotMatch(source, /href=\{`\/(?:supplier-payments|supplier-advances|advances|petty-cash)\/\$\{/);
  }
});

test("actual record pager renders all four destinations with mode and origin", () => {
  const source = read("components/records/RecordNavigation.tsx");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const compiledModule = { exports: {} as { default?: React.ComponentType<Record<string, unknown>> } };
  const icon = () => null;
  const imports: Record<string, unknown> = {
    "next/link": { default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement("a", { href, ...props }, children) },
    "lucide-react": { ChevronsLeft: icon, ChevronsRight: icon, ChevronLeft: icon, ChevronRight: icon },
    "@/lib/record-navigation/return-to": { recordNavigationHref },
    "@/components/ui/useGlobalNavigationPending": { useGlobalNavigationPending: () => ({ isPending: false, push: () => {} }) },
    "./record-navigation-guard": { createRecordNavigationGuard: () => ({ acquire: () => true, release: () => {} }) },
  };
  new Function("require", "module", "exports", js)((name: string) => imports[name] ?? require(name), compiledModule, compiledModule.exports);
  const Component = compiledModule.exports.default!;
  for (const recordQuery of [undefined, { showDeleted: "true" }]) {
    const html = renderToStaticMarkup(React.createElement(Component, {
      basePath: "/suppliers", recordType: "Suppliers", returnTo: origin, recordQuery,
      navigation: { first: "first", previous: "previous", next: "next", last: "last" },
      dictionary: { title: "Browse", first: "First", previous: "Previous", next: "Next", last: "Last" },
    }));
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => new URL(m[1].replaceAll("&amp;", "&"), "https://local.g7"));
    assert.equal(links.length, 4);
    assert.deepEqual(links.map((link) => link.pathname), ["/suppliers/first", "/suppliers/previous", "/suppliers/next", "/suppliers/last"]);
    for (const link of links) {
      assert.equal(link.searchParams.get("returnTo"), origin);
      assert.equal(link.searchParams.get("showDeleted"), recordQuery ? "true" : null);
    }
  }
});

test("supplier edit round trip retains detail and original list; invalid origin falls back", () => {
  const detail = appendReturnTo(`/suppliers/${id}`, origin);
  const edit = new URL(appendReturnTo(`/suppliers/${id}/edit`, detail), "https://local.g7");
  const exit = safeRecordReturnTo(edit.searchParams.get("returnTo"), `/suppliers/${id}`);
  assert.equal(exit, detail);
  assert.equal(new URL(exit, "https://local.g7").searchParams.get("returnTo"), origin);
  for (const invalid of [undefined, [], "https://evil.example", "//evil.example", "/reports", "/suppliers\nLocation: evil"]) {
    assert.equal(safeRecordReturnTo(invalid, `/suppliers/${id}`), `/suppliers/${id}`);
  }
  const page = read("app/(dashboard)/suppliers/[id]/page.tsx");
  assert.ok(page.includes('recordQuery={includeDeleted ? { showDeleted: "true" } : undefined}'));
  assert.ok(page.includes('appendReturnTo(`/suppliers/${supplier.id}/edit`, currentSupplierUrl)'));
  // Current/deleted Edit visibility is exercised on the rendered real page in
  // detail-pilot.test.ts; it no longer depends on one spelling of the condition.
  const editPage = read("app/(dashboard)/suppliers/[id]/edit/page.tsx");
  assert.ok(editPage.includes("getSupplierById(id)")); // Deleted editing remains unavailable.
  assert.ok(editPage.includes("returnTo={returnTo}"));
  const form = read("app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx");
  assert.ok(form.includes("router.push(exitHref)"));
  assert.equal((form.match(/onClick=\{\(\) => push\(exitHref\)\}/g) ?? []).length, 2);
});

for (const [file, fallback] of [
  ["services/new/ServiceForm.tsx", '"/services"'],
  ["services/[id]/edit/EditServiceForm.tsx", "`/services/${service.id}`"],
  ["quotations/new/QuotationForm.tsx", "initialData ? `/quotations/${initialData.id}` : `/services/${service.id}`"],
]) {
  test(`${file}: explicit origin and deterministic deep-link exit wiring`, () => {
    const source = read(`app/(dashboard)/${file}`);
    assert.ok(source.includes(`safeRecordReturnTo(returnTo, ${fallback})`));
    assert.ok(source.includes("onClick={() => push(exitHref)}"));
    assert.ok(!source.includes("back()"));
    const target = file.startsWith("services/new") ? "/services" : `/services/${id}`;
    for (const invalid of [undefined, "https://evil.example", "/accounting/journals"]) {
      assert.equal(safeRecordReturnTo(invalid, target), target);
    }
    assert.equal(safeRecordReturnTo(origin, target), origin);
  });
}

test("record slot forwards context without changing neighbor scope", () => {
  assert.ok(read("components/records/RecordNavigationSlot.tsx").includes("recordQuery={recordQuery}"));
  const page = read("app/(dashboard)/suppliers/[id]/page.tsx");
  assert.ok(page.includes("getSupplierRecordNavigation(id, { isPreferred: supplier.isPreferred, name: supplier.name }, includeDeleted)"));
});

test("quotation edit route forwards validated origin and detail link retains list context", () => {
  const list = "/quotations?page=2&search=QT%26A";
  const detail = appendReturnTo(`/quotations/${id}`, list);
  const edit = new URL(appendReturnTo(`/quotations/${id}/edit`, detail), "https://local.g7");
  assert.equal(safeRecordReturnTo(edit.searchParams.get("returnTo"), `/quotations/${id}`), detail);
  assert.equal(safeRecordReturnTo(undefined, `/quotations/${id}`), `/quotations/${id}`);
  assert.equal(safeRecordReturnTo("https://evil.example", `/quotations/${id}`), `/quotations/${id}`);
  const page = read("app/(dashboard)/quotations/[id]/edit/page.tsx");
  assert.ok(page.includes("safeRecordReturnTo((await searchParams).returnTo, `/quotations/${id}`)"));
  assert.ok(page.includes("returnTo={returnTo}"));
  assert.ok(read("app/(dashboard)/quotations/[id]/page.tsx").includes("appendReturnTo(`/quotations/${quotation.id}/edit`, appendReturnTo(`/quotations/${quotation.id}`, returnTo))"));
  for (const [route, wiring] of [
    ["services/new/page.tsx", "returnTo={returnTo}"],
    ["services/[id]/edit/page.tsx", "returnTo={(await searchParams).returnTo}"],
    ["quotations/new/page.tsx", "returnTo={resolvedSearchParams.returnTo}"],
  ]) assert.ok(read(`app/(dashboard)/${route}`).includes(wiring));
});
