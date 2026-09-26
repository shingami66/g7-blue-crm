import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { getReportCenterDictionary } from "../i18n/dictionaries/report-center.ts";

const ROOT = join(import.meta.dirname, "../../..");
const AP_PAGE = "src/app/(dashboard)/reports/accounts-payable/page.tsx";
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

function visit(source: ts.Node, callback: (node: ts.Node) => void) {
  const walk = (node: ts.Node) => {
    callback(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
}

function property(object: ts.ObjectLiteralExpression, name: string) {
  return object.properties.find((entry) =>
    ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === name,
  ) as ts.PropertyAssignment | undefined;
}

function propertyText(object: ts.ObjectLiteralExpression, name: string) {
  const entry = property(object, name);
  if (!entry) return undefined;
  if (ts.isStringLiteral(entry.initializer)) return entry.initializer.text;
  if (ts.isNumericLiteral(entry.initializer)) return Number(entry.initializer.text);
  if (entry.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (entry.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function getColumns(source: ts.SourceFile) {
  let columns: ts.ArrayLiteralExpression | undefined;
  visit(source, (node) => {
    if (!ts.isJsxOpeningElement(node) || !ts.isIdentifier(node.tagName) || node.tagName.text !== "DataTable") return;
    const attribute = node.attributes.properties.find((entry) =>
      ts.isJsxAttribute(entry) && ts.isIdentifier(entry.name) && entry.name.text === "columns",
    );
    assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer));
    const expression = attribute.initializer.expression;
    assert.ok(expression && ts.isArrayLiteralExpression(expression), "AP columns must stay a static contract");
    columns = expression;
  });
  assert.ok(columns, "Supplier Payables must render a DataTable");
  return columns.elements.map((entry) => {
    assert.ok(ts.isObjectLiteralExpression(entry), "each AP column must declare a static object contract");
    return entry;
  });
}

test("Supplier Payables keeps the localized report identity, Current Only context, and compact disclosure", () => {
  const en = getReportCenterDictionary("en").ap;
  const ar = getReportCenterDictionary("ar").ap;
  const page = read(AP_PAGE);
  const workspace = read("src/app/(dashboard)/reports/ReportWorkspace.tsx");

  assert.equal(en.title, "Supplier Payables");
  assert.equal(ar.title, "مستحقات الموردين");
  assert.equal(en.reportDetails, "Report details");
  assert.equal(ar.reportDetails, "تفاصيل التقرير");
  assert.equal(en.generatedAt, "Generated At");
  assert.equal(ar.generatedAt, "تاريخ ووقت الإنشاء");
  assert.equal(en.currentOnlyLabel, "Current Only");
  assert.equal(ar.currentOnlyLabel, "السجلات الحالية فقط");
  assert.match(en.currentOnly, /Historical AP reconstruction is unavailable from an authoritative source/);
  assert.match(ar.currentOnly, /لا تتوفر بيانات معتمدة لإعادة بناء مستحقات الموردين تاريخياً/);
  assert.match(page, /detailsLabel: dictionary\.ap\.reportDetails/);
  assert.match(page, /currentOnlyDetail: \{ label: dictionary\.ap\.currentOnlyLabel, value: dictionary\.ap\.currentOnly \}/);
  assert.match(page, /dictionary\.workspace\.timezone/);
  assert.match(page, /dictionary\.ap\.updated/);
  assert.match(page, /options=\{\{ timeZone: "Asia\/Riyadh", dateStyle: "medium" \}\}/);
  assert.match(page, /generatedAtDetail:[\s\S]*dictionary\.ap\.generatedAt[\s\S]*timeStyle: "short"/);
  assert.match(workspace, /presentation\?\.currentOnlyDetail/);
  assert.match(workspace, /dictionary\.workspace\.source/);
  assert.match(workspace, /dictionary\.workspace\.timeBasis/);
  assert.match(workspace, /presentation\?\.generatedAtDetail/);
  assert.doesNotMatch(page, /stateNote=\{<p/);
  assert.match(page, /exportHref=\{exportQuery\(values\)\}/);
  assert.doesNotMatch(page, /backToReports|Back to Reports/);
});

test("Supplier Payables retains its filter names and exact eight-column financial table", () => {
  const source = ts.createSourceFile(AP_PAGE, read(AP_PAGE), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = read(AP_PAGE);
  const en = getReportCenterDictionary("en").ap;
  const ar = getReportCenterDictionary("ar").ap;
  const columns = getColumns(source);
  const keys = columns.map((column) => propertyText(column, "key"));

  assert.deepEqual(keys, ["bill", "supplier", "service", "dueDate", "status", "payable", "paid", "outstanding"]);
  assert.deepEqual([en.bill, en.supplier, en.service, en.dueDate, en.status, en.payable, en.paid, en.outstanding], ["Bill", "Supplier", "Service", "Due date", "Status", "Payable", "Paid", "Outstanding"]);
  assert.deepEqual([ar.bill, ar.supplier, ar.service, ar.dueDate, ar.status, ar.payable, ar.paid, ar.outstanding], ["الفاتورة", "المورد", "الخدمة", "تاريخ الاستحقاق", "الحالة", "المستحق", "المدفوع", "المتبقي للدفع"]);
  for (const key of ["payable", "paid", "outstanding"]) {
    const column = columns.find((entry) => propertyText(entry, "key") === key);
    assert.ok(column);
    assert.equal(propertyText(column, "kind"), "money");
    assert.equal(propertyText(column, "align"), "end");
    assert.equal(propertyText(column, "minWidth"), 128);
    assert.equal(propertyText(column, "noWrap"), true);
  }
  assert.equal(propertyText(columns.find((entry) => propertyText(entry, "key") === "dueDate")!, "noWrap"), true);
  assert.match(page, /getAccountsPayableReport\(\{ \.\.\.values, status, page, pageSize: 20 \}\)/);
  assert.match(page, /name="supplierSearch"/);
  assert.match(page, /name="serviceSearch"/);
  assert.match(page, /name="dueFrom"/);
  assert.match(page, /name="dueTo"/);
  assert.match(page, /<legend className="sr-only">\{dictionary\.ap\.dueDate\}<\/legend>/);
  assert.match(page, /report\.payableAmount/);
  assert.match(page, /report\.paidAmount/);
  assert.match(page, /report\.outstandingAmount/);
  assert.match(page, /value=\{row\.payableAmount\}/);
  assert.match(page, /value=\{row\.paidAmount\}/);
  assert.match(page, /value=\{row\.outstandingAmount\}/);
  assert.doesNotMatch(page, /key: "invoiceDate"/);
});

test("Supplier Payables service search is rendered only when the service-read capability is present", () => {
  const source = ts.createSourceFile(AP_PAGE, read(AP_PAGE), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let serviceSearchInput: ts.JsxSelfClosingElement | undefined;
  let permissionCheckFound = false;
  const filterCapabilityBindings: ts.Expression[] = [];

  visit(source, (node) => {
    if (ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isIdentifier(node.left)
      && node.left.text === "canReadServices"
      && ts.isAwaitExpression(node.right)
      && ts.isCallExpression(node.right.expression)
      && ts.isIdentifier(node.right.expression.expression)
      && node.right.expression.expression.text === "checkPermission"
      && node.right.expression.arguments.some((argument) => ts.isStringLiteral(argument) && argument.text === "services:read")) {
      permissionCheckFound = true;
    }

    if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "input") {
      const name = node.attributes.properties.find((attribute) =>
        ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === "name",
      );
      if (name && ts.isJsxAttribute(name) && name.initializer && ts.isStringLiteral(name.initializer) && name.initializer.text === "serviceSearch") {
        serviceSearchInput = node;
      }
    }

    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && ts.isIdentifier(node.tagName)
      && node.tagName.text === "AccountsPayableFilters") {
      const capability = node.attributes.properties.find((attribute) =>
        ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === "showServiceFilter",
      );
      if (capability && ts.isJsxAttribute(capability) && capability.initializer && ts.isJsxExpression(capability.initializer) && capability.initializer.expression) {
        filterCapabilityBindings.push(capability.initializer.expression);
      }
    }
  });

  assert.equal(permissionCheckFound, true, "the page must derive service-filter visibility from services:read");
  assert.ok(serviceSearchInput, "the Service search input must remain available for authorized users");
  let conditional: ts.ConditionalExpression | undefined;
  for (let parent: ts.Node | undefined = serviceSearchInput; parent; parent = parent.parent) {
    if (ts.isConditionalExpression(parent)) {
      conditional = parent;
      break;
    }
  }
  assert.ok(conditional && ts.isIdentifier(conditional.condition) && conditional.condition.text === "showServiceFilter");
  assert.equal(filterCapabilityBindings.length, 2, "both the report and failure states must use the same service capability");
  assert.ok(filterCapabilityBindings.every((binding) => ts.isIdentifier(binding) && binding.text === "canReadServices"));
});

test("Supplier Payables uses localized invoices and count wording without exposing internal record IDs", () => {
  const en = getReportCenterDictionary("en").ap;
  const ar = getReportCenterDictionary("ar").ap;
  const page = read(AP_PAGE);

  assert.equal(en.invoicesHeading, "Invoices");
  assert.equal(ar.invoicesHeading, "الفواتير");
  assert.equal(en.billCountSingular, "bill");
  assert.equal(en.billCountPlural, "bills");
  assert.equal(ar.billCountSingular, "فاتورة");
  assert.equal(ar.billCountPlural, "فواتير");
  assert.match(page, /dictionary\.ap\.invoicesHeading/);
  assert.match(page, /report\.detailTotalCount === 1 \? dictionary\.ap\.billCountSingular : dictionary\.ap\.billCountPlural/);
  assert.match(page, /<UiNumberText locale=\{locale\} value=\{report\.detailTotalCount\}/);
  assert.match(page, /resolveRecordTitle\(locale, row\.supplierName\)/);
  assert.match(page, /<UiBidiText>\{resolveRecordTitle\(locale, row\.supplierName\)\}<\/UiBidiText>/);
  assert.match(page, /<UiLtrText className="whitespace-nowrap">\{row\.billNumber\}<\/UiLtrText>/);
  assert.doesNotMatch(page, /row\.supplierId|row\.supplierNumber/);
  assert.doesNotMatch(page, /<UiLtrText>\{row\.billId\}<\/UiLtrText>/);
  assert.match(page, /row\.status === "paid"[\s\S]*row\.status === "partially_paid"[\s\S]*dictionary\.ap\.unpaid/);
  assert.match(page, /border border-outline-variant bg-surface-container-low[\s\S]*<UiBidiText>\{statusLabel\}<\/UiBidiText>/);
});
