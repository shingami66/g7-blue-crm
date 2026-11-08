import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appendReturnTo, safeRecordReturnTo } from "./return-to.ts";
import { supplierBillsReturnTo, supplierBillDetailHref } from "../supplier-bills/navigation.ts";
import { supplierAdvancesReturnTo } from "../supplier-advances/navigation.ts";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const id = "307106ce-2a58-4901-bcb6-75abe12b03af";

const financialForms = [
  {
    name: "Supplier Bill Create",
    page: "app/(dashboard)/supplier-bills/new/page.tsx",
    form: "app/(dashboard)/supplier-bills/SupplierBillForm.tsx",
    list: "app/(dashboard)/supplier-bills/SupplierBillsClient.tsx",
    fallback: "/supplier-bills",
    title: "newBill",
    returnLabel: "backToList",
  },
  {
    name: "Supplier Payment Create",
    page: "app/(dashboard)/supplier-payments/new/page.tsx",
    form: "app/(dashboard)/supplier-payments/SupplierPaymentForm.tsx",
    list: "app/(dashboard)/supplier-payments/SupplierPaymentsClient.tsx",
    fallback: "/supplier-payments",
    title: "recordPayment",
  },
  {
    name: "Supplier Advance Create",
    page: "app/(dashboard)/supplier-advances/new/page.tsx",
    form: "app/(dashboard)/supplier-advances/SupplierAdvanceAuthorizationForm.tsx",
    list: "app/(dashboard)/supplier-advances/SupplierAdvancesClient.tsx",
    fallback: "/supplier-advances",
    title: "authorizeAdvance",
    returnLabel: "backToList",
  },
] as const;

test("the three routed financial Create pages use one shared form shell and labeled Return", () => {
  for (const route of financialForms) {
    const page = read(route.page);
    const form = read(route.form);
    assert.ok(page.includes('<PageFrame variant="form">'), `${route.name} must use PageFrame form`);
    assert.ok(page.includes("<PageLocation"), `${route.name} must expose structural location`);
    if ("returnLabel" in route) assert.ok(page.includes(`label={dictionary.${route.returnLabel}}`), `${route.name} must label its return destination`);
    assert.match(page, /<PageHeader variant="composed" title=\{dictionary\./);
    assert.doesNotMatch(page, /<main\b|<h1\b/i, `${route.name} must not add a main landmark or duplicate h1`);
    assert.doesNotMatch(form, /<h1\b/i, `${route.name} form body must not duplicate the composed h1`);
    assert.match(page, new RegExp(`safeRecordReturnTo\\(returnToParam, "${route.fallback.replaceAll("/", "\\/")}"\\)`));
    assert.ok(page.includes(`title={dictionary.${route.title}}`), `${route.name} must use its existing localized title`);
  }

  assert.match(read("components/ui/PageHeader.tsx"), /variant === "composed"[\s\S]*?<h1\b/);
});

test("owning-list origins survive Create navigation and cancel", () => {
  const billParams = { page: "3", pageSize: "50", search: "Supplier & Event" };
  const billListOrigin = supplierBillsReturnTo(billParams);
  const billCreateHref = appendReturnTo("/supplier-bills/new", billListOrigin);
  assert.equal(new URL(billCreateHref, "https://local.g7").searchParams.get("returnTo"), billListOrigin);
  assert.match(read("app/(dashboard)/supplier-bills/SupplierBillsClient.tsx"), /appendReturnTo\("\/supplier-bills\/new", listReturnTo\)/);

  const advanceParams = { page: "2", pageSize: "20", search: "Supplier & Event" };
  const advanceListOrigin = supplierAdvancesReturnTo(advanceParams);
  const advanceCreateHref = appendReturnTo("/supplier-advances/new", advanceListOrigin);
  assert.equal(new URL(advanceCreateHref, "https://local.g7").searchParams.get("returnTo"), advanceListOrigin);
  assert.match(read("app/(dashboard)/supplier-advances/SupplierAdvancesClient.tsx"), /appendReturnTo\("\/supplier-advances\/new", listReturnTo\)/);
  assert.match(read("app/(dashboard)/supplier-advances/SupplierAdvanceAuthorizationForm.tsx"), /href=\{exitHref\}/);
  assert.match(read("app/(dashboard)/supplier-advances/SupplierAdvanceAuthorizationForm.tsx"), /safeRecordReturnTo\(returnTo, "\/supplier-advances"\)/);
});

test("Supplier Payment retains its bill and original list context through Return and Cancel", () => {
  const billListOrigin = supplierBillsReturnTo({ page: "4", pageSize: "20", search: "A&B" });
  const billOrigin = supplierBillDetailHref(id, billListOrigin);
  const createHref = appendReturnTo(`/supplier-payments/new?billId=${encodeURIComponent(id)}`, billOrigin);
  const createUrl = new URL(createHref, "https://local.g7");
  const returnTo = createUrl.searchParams.get("returnTo");

  assert.equal(createUrl.pathname, "/supplier-payments/new");
  assert.equal(createUrl.searchParams.get("billId"), id);
  assert.equal(returnTo, billOrigin);
  assert.equal(safeRecordReturnTo(returnTo, "/supplier-payments"), billOrigin);
  const returnedBill = new URL(returnTo!, "https://local.g7");
  assert.equal(returnedBill.pathname, `/supplier-bills/${id}`);
  assert.equal(returnedBill.searchParams.get("returnTo"), billListOrigin);
  assert.equal(safeRecordReturnTo(undefined, "/supplier-payments"), "/supplier-payments");

  const page = read("app/(dashboard)/supplier-payments/new/page.tsx");
  const form = read("app/(dashboard)/supplier-payments/SupplierPaymentForm.tsx");
  const billDetail = read("app/(dashboard)/supplier-bills/SupplierBillDetailClient.tsx");
  const paymentDictionary = read("lib/i18n/dictionaries/supplier-payments.ts");
  assert.match(page, /returnTo\?: string \| string\[\]/);
  assert.match(page, /safeRecordReturnTo\(returnToParam, "\/supplier-payments"\)/);
  assert.match(page, /dictionary=\{dictionary\} returnTo=\{returnTo\}/);
  assert.match(paymentDictionary, /backToBill: "Back to Supplier Bill"/);
  assert.match(paymentDictionary, /backToBill: "العودة إلى فاتورة المورد"/);
  assert.ok(billDetail.includes("appendReturnTo(`/supplier-payments/new?billId=${encodeURIComponent(bill.id)}`, supplierBillDetailHref(bill.id, returnTo))"));
  assert.match(form, /safeRecordReturnTo\(returnTo, "\/supplier-payments"\)/);
  assert.match(form, /onClick=\{\(\) => router\.push\(exitHref\)\}/);
});

test("financial form fields, evidence, validation limits, permission gates, and save destinations stay in place", () => {
  const billPage = read("app/(dashboard)/supplier-bills/new/page.tsx");
  const billForm = read("app/(dashboard)/supplier-bills/SupplierBillForm.tsx");
  const paymentPage = read("app/(dashboard)/supplier-payments/new/page.tsx");
  const paymentForm = read("app/(dashboard)/supplier-payments/SupplierPaymentForm.tsx");
  const advancePage = read("app/(dashboard)/supplier-advances/new/page.tsx");
  const advanceForm = read("app/(dashboard)/supplier-advances/SupplierAdvanceAuthorizationForm.tsx");

  assert.match(billPage, /checkPermission\(SUPPLIER_BILL_PERMISSIONS\.record\)/);
  for (const name of ["supplier_id", "service_id", "commitment_id", "service_receipt_id", "invoice_number", "currency", "invoice_date", "due_date", "subtotal", "vat_amount", "total_amount", "invoice"]) {
    assert.ok(billForm.includes(`name="${name}"`), `Supplier Bill field ${name} remains`);
  }
  assert.match(billForm, /createSupplierBillAction\(data\)/);
  assert.match(billForm, /router\.push\(`\/supplier-bills\/\$\{result\.data\.bill_id\}`\)/);

  assert.match(paymentPage, /checkPermission\(SUPPLIER_PAYMENT_PERMISSIONS\.record\)/);
  for (const name of ["amount", "payment_date", "method", "reference", "document", "notes"]) {
    assert.ok(paymentForm.includes(`name="${name}"`), `Supplier Payment field ${name} remains`);
  }
  assert.match(paymentForm, /data\.set\("supplier_bill_id", supplierBillId\)/);
  assert.match(paymentForm, /max=\{outstandingAmount\}/);
  assert.match(paymentForm, /required accept="application\/pdf,image\/jpeg,image\/png/);
  assert.match(paymentForm, /recordSupplierPaymentAction\(data\)/);
  assert.match(paymentForm, /router\.push\(`\/supplier-payments\/\$\{result\.data\?\.payment_id\}`\)/);

  assert.match(advancePage, /checkPermission\(SUPPLIER_ADVANCE_PERMISSIONS\.authorize\)/);
  for (const name of ["commitment_id", "amount", "reason", "document", "request_id"]) {
    assert.ok(advanceForm.includes(`name="${name}"`), `Supplier Advance field ${name} remains`);
  }
  assert.match(advanceForm, /authorizeSupplierAdvanceAction\(formData\)/);
  assert.match(advanceForm, /router\.push\(`\/supplier-advances\/\$\{result\.data\?\.advance_id\}`\)/);
});

test("new bill-detail returns are restricted to the existing UUID Supplier Bill route", () => {
  const billDetail = `/supplier-bills/${id}?returnTo=${encodeURIComponent("/supplier-bills?page=2")}`;
  assert.equal(safeRecordReturnTo(billDetail, "/supplier-payments"), billDetail);
  for (const invalid of [
    "https://evil.example",
    "//evil.example/path",
    "/supplier-bills/not-a-uuid",
    "/supplier-bills/new",
    `/supplier-bills/${id}/edit`,
    `/supplier-bills/${id}#fragment`,
    `/supplier-bills/${id}\r\nLocation: https://evil.example`,
  ]) {
    assert.equal(safeRecordReturnTo(invalid, "/supplier-payments"), "/supplier-payments");
  }
});
