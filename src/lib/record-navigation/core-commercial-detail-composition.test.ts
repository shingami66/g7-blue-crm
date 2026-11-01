import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { getInvoicesDictionary } from "../i18n/dictionaries/invoices.ts";
import { getQuotationsDictionary } from "../i18n/dictionaries/quotations.ts";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

const routes = [
  {
    name: "Service Detail",
    path: "src/app/(dashboard)/services/[id]/page.tsx",
    basePath: "/services",
    direction: "auto",
    returnLabel: /dictionary\.detail\.backToServices/,
    contracts: [
      'requirePermission("services:read")',
      'checkPermission("quotations:write")',
      'checkPermission("services:write")',
      'checkPermission("services:update_status")',
      "getServiceStatusLabel(locale, service.status)",
      "ServiceLifecycleActions",
      "ServiceCancellationActions",
      "canCreateQuotation",
      "canEditEventBrief",
      "appendReturnTo",
    ],
  },
  {
    name: "Quotation Detail",
    path: "src/app/(dashboard)/quotations/[id]/page.tsx",
    basePath: "/quotations",
    direction: "ltr",
    returnLabel: /dictionary\.editStates\.backToQuotations/,
    contracts: [
      'requirePermission("quotations:read")',
      'checkPermission("quotations:approve")',
      'checkPermission("quotations:write")',
      "QuotationApprovalActions",
      "CommercialAmendmentCreateDialog",
      "dictionary.detail.actions.edit",
      "dictionary.detail.actions.printPdf",
      "/quotations/${quotation.id}/pdf",
      "appendReturnTo",
    ],
  },
  {
    name: "Invoice Detail",
    path: "src/app/(dashboard)/invoices/[id]/page.tsx",
    basePath: "/invoices",
    direction: "ltr",
    returnLabel: /dictionary\.detail\.actions\.backToInvoices/,
    contracts: [
      'requirePermission("invoices:read")',
      "INVOICE_PERMISSIONS.write",
      'checkPermission("payments:write")',
      "IssueInvoiceAction",
      "RecordPaymentAction",
      "CustomerCreditActions",
      "dictionary.detail.actions.printPdf",
      "/invoices/${invoice.id}/pdf",
    ],
  },
] as const;

type JsxNode = ts.JsxElement | ts.JsxSelfClosingElement;

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

function descendants(root: ts.Node, name: string): JsxNode[] {
  const found: JsxNode[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && tagName(node) === name) {
      found.push(node);
    }
    node.forEachChild(visit);
  };
  visit(root);
  return found;
}

function openingElement(node: JsxNode) {
  return ts.isJsxElement(node) ? node.openingElement : node;
}

function attribute(node: JsxNode, name: string) {
  const property = openingElement(node).attributes.properties.find(
    (item): item is ts.JsxAttribute => ts.isJsxAttribute(item) && item.name.getText() === name,
  );
  return property?.initializer?.getText();
}

function sourceFor(path: string) {
  const filePath = join(REPO_ROOT, path);
  const text = readFileSync(filePath, "utf8");
  return {
    text,
    ast: ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  };
}

for (const route of routes) {
  test(`${route.name} uses the shared record shell with separate origin, identity, actions, and pager`, () => {
    const { text, ast } = sourceFor(route.path);
    const frames = descendants(ast, "PageFrame");
    const locations = descendants(ast, "PageLocation");
    const headers = descendants(ast, "PageHeader");
    const regions = descendants(ast, "RecordNavigationRegion");

    assert.equal(frames.length, 1);
    assert.equal(attribute(frames[0], "variant"), '"record"');
    assert.equal(locations.length, 1);
    assert.equal(headers.length, 1);
    assert.equal(attribute(headers[0], "variant"), '"composed"');
    assert.ok(attribute(headers[0], "status"), "record status must remain in the shared identity header");
    assert.ok(attribute(headers[0], "actions"), "existing business actions must use the shared action region");
    assert.equal(regions.length, 1);
    assert.match(text, new RegExp(`label: dictionary\\.list\\.title, href: "${route.basePath}"`));
    assert.match(text, /current: true/);
    assert.match(text, /label: dictionary\.detail\.locationLabel/);
    assert.match(text, /variant="labeled"/);
    assert.match(text, /href=\{returnTo\}/);
    assert.match(text, route.returnLabel);
    assert.match(text, /<RecordNavigationRegion[\s\S]*?<RecordNavigationSlot[\s\S]*?returnTo=\{returnTo\}/);
    assert.match(text, /safeRecordReturnTo\([^\n]+/);
    assert.equal(descendants(ast, "h1").length, 0, "the shared composed header owns the page h1");
    assert.equal(descendants(frames[0], "PageLocation").length, 1);
    assert.equal(descendants(frames[0], "PageHeader").length, 1);
    assert.equal(descendants(frames[0], "RecordNavigationRegion").length, 1);

    const locationText = locations[0].getText(ast);
    assert.match(locationText, /returnControl=\{<RecordBackButton/);
    assert.match(locationText, /breadcrumbs=\{/);
    assert.match(locationText, /dir: "auto"|dir: "ltr"/);
    assert.match(text, new RegExp(`titleDir="${route.direction}"`));
  });

  test(`${route.name} retains its existing authority and domain action contracts`, () => {
    const { text } = sourceFor(route.path);
    for (const contract of route.contracts) {
      assert.ok(text.includes(contract), `Expected existing contract: ${contract}`);
    }
  });
}

test("Service Event Brief keeps domain context while shared header owns one title and status", () => {
  const { text: brief } = sourceFor("src/app/(dashboard)/services/[id]/EventBrief.tsx");
  const { text: page } = sourceFor("src/app/(dashboard)/services/[id]/page.tsx");
  const header = sourceFor("src/components/ui/PageHeader.tsx").text;

  assert.match(brief, /service\.eventName[\s\S]*?service\.eventLocation[\s\S]*?service\.description/);
  assert.doesNotMatch(brief, /<h1\b|service\.serviceNumber|service\.serviceTitle|StatusBadge|service\.status/);
  assert.match(page, /title=\{service\.serviceTitle\}/);
  assert.match(page, /\{dictionary\.list\.table\.serviceNumber\}: <bdi dir="ltr">\{service\.serviceNumber\}<\/bdi>/);
  assert.match(page, /getServiceStatusLabel\(locale, service\.status\)/);
  assert.equal((header.match(/<h1\b/g) ?? []).length, 1);
});

test("detail navigation and action labels are localized in both supported locales", () => {
  const enServices = getServicesDictionary("en");
  const arServices = getServicesDictionary("ar");
  const enQuotations = getQuotationsDictionary("en");
  const arQuotations = getQuotationsDictionary("ar");
  const enInvoices = getInvoicesDictionary("en");
  const arInvoices = getInvoicesDictionary("ar");

  assert.deepEqual(
    [enServices.detail.locationLabel, enServices.detail.actionsLabel, enServices.detail.backToServices],
    ["Page location", "Event actions", "Back to events"],
  );
  assert.deepEqual(
    [arServices.detail.locationLabel, arServices.detail.actionsLabel, arServices.detail.backToServices],
    ["مسار الصفحة", "إجراءات الفعالية", "العودة إلى الفعاليات"],
  );
  assert.deepEqual(
    [enQuotations.detail.locationLabel, enQuotations.detail.actionsLabel, enQuotations.editStates.backToQuotations],
    ["Page location", "Quotation actions", "Back to Quotations"],
  );
  assert.deepEqual(
    [arQuotations.detail.locationLabel, arQuotations.detail.actionsLabel, arQuotations.editStates.backToQuotations],
    ["مسار الصفحة", "إجراءات عرض السعر", "العودة إلى عروض الأسعار"],
  );
  assert.deepEqual(
    [enInvoices.detail.locationLabel, enInvoices.detail.actionsLabel, enInvoices.detail.actions.backToInvoices],
    ["Page location", "Invoice actions", "Back to Invoices"],
  );
  assert.deepEqual(
    [arInvoices.detail.locationLabel, arInvoices.detail.actionsLabel, arInvoices.detail.actions.backToInvoices],
    ["مسار الصفحة", "إجراءات الفاتورة", "العودة إلى الفواتير"],
  );
});
