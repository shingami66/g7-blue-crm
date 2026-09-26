import assert from "node:assert/strict";
import test from "node:test";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;
const reactModuleUrl = pathToFileURL(require.resolve("react")).href;
const nextLinkDataUrl = "data:text/javascript," + encodeURIComponent([
  `import React from ${JSON.stringify(reactModuleUrl)};`,
  "export default function Link({ href, children, ...props }) {",
  '  return React.createElement("a", { href, ...props }, children);',
  "}",
].join("\n"));
const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/link") return { url: ${JSON.stringify(nextLinkDataUrl)}, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const basePath = join(process.cwd(), "src", specifier.slice(2));
    if (existsSync(basePath + ".tsx")) return { url: pathToFileURL(basePath + ".tsx").href, shortCircuit: true };
    if (existsSync(basePath + ".ts")) return { url: pathToFileURL(basePath + ".ts").href, shortCircuit: true };
  }
  if (specifier.startsWith(".")) {
    const parentDir = context.parentURL ? fileURLToPath(new URL(".", context.parentURL)) : process.cwd();
    const candidate = join(parentDir, specifier);
    if (existsSync(candidate + ".tsx")) return { url: pathToFileURL(candidate + ".tsx").href, shortCircuit: true };
    if (existsSync(candidate + ".ts")) return { url: pathToFileURL(candidate + ".ts").href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
    return { format: "module", shortCircuit: true, source: transpiled.outputText };
  }
  return nextLoad(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

const [{ default: ReportWorkspace }, { default: AccountsReceivableReportContent, getReceivablesPresentation }, { getReportDefinitions }, { getReportCenterDictionary }, { default: AccountsReceivableFilters }] = await Promise.all([
  import("./ReportWorkspace.tsx"),
  import("./accounts-receivable/AccountsReceivableReportContent.tsx"),
  import("../../../lib/reports/catalog.ts"),
  import("../../../lib/i18n/dictionaries/report-center.ts"),
  import("./accounts-receivable/AccountsReceivableFilters.tsx"),
]);

test("compact receivables workspace keeps the full report context in its disclosure", () => {
  const dictionary = getReportCenterDictionary("en");
  const html = renderToStaticMarkup(ReportWorkspace({
    definition: getReportDefinitions("en").find((item) => item.key === "accounts_receivable")!,
    dictionary,
    locale: "en",
    asOfDate: "2026-09-25",
    periodFrom: "2026-01-01",
    periodTo: "2026-09-25",
    generatedAt: "2026-09-25T08:15:00.000Z",
    presentation: {
      description: dictionary.ar.presentationDescription,
      detailsLabel: dictionary.ar.reportDetails,
      contextSummary: React.createElement("span", null, "As of 25 Sep 2026 · Historical · Riyadh time"),
    },
    children: React.createElement("div", null, "Receivables report"),
  }));

  assert.match(html, /Invoices, payments, and what customers still owe\./);
  assert.match(html, /As of 25 Sep 2026 · Historical · Riyadh time/);
  assert.match(html, /<summary[^>]*>Report details<\/summary>/);
  assert.match(html, /Time basis/);
  assert.match(html, /Source/);
  assert.match(html, /Asia\/Riyadh \(\+03:00\)/);
  assert.match(html, /Generated/);
  assert.match(html, /Period/);
  assert.match(html, /As of/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test("receivables context omits a leading separator when an invalid filter has no as-of date", () => {
  const dictionary = getReportCenterDictionary("en");
  const withoutDate = renderToStaticMarkup(React.createElement("div", null, getReceivablesPresentation("en", dictionary).contextSummary));
  const withDate = renderToStaticMarkup(React.createElement("div", null, getReceivablesPresentation("en", dictionary, "2026-09-25").contextSummary));

  assert.match(withoutDate, /Historical/);
  assert.match(withoutDate, /Riyadh time/);
  assert.equal([...withoutDate.matchAll(/aria-hidden="true">·<\/span>/g)].length, 1);
  assert.equal([...withDate.matchAll(/aria-hidden="true">·<\/span>/g)].length, 2);
  assert.match(withDate, /As of/);
});

test("Arabic receivables filters retain the Period legend without shifting the three date controls", () => {
  const dictionary = getReportCenterDictionary("ar");
  const html = renderToStaticMarkup(AccountsReceivableFilters({
    dictionary,
    values: { from: "2026-01-01", to: "2026-09-25", asOf: "2026-09-25" },
  }));
  const dateLabels = [...html.matchAll(/<label class="([^"]+)"><span>([^<]+)<\/span><input ([^>]+)\/><\/label>/g)]
    .map(([, className, label, inputAttributes]) => ({
      className,
      label,
      name: inputAttributes.match(/\bname="(from|to|asOf)"/)?.[1],
    }));

  assert.match(html, /<fieldset[^>]*><legend class="sr-only">الفترة<\/legend><div class="grid/);
  assert.equal(dateLabels.length, 3, "expected one labeled control for each report date");
  assert.deepEqual(dateLabels, [
    { className: "flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant", label: dictionary.workspace.fromDate, name: "from" },
    { className: "flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant", label: dictionary.workspace.toDate, name: "to" },
    { className: "flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant xl:col-span-3", label: dictionary.workspace.asOf, name: "asOf" },
  ]);
  assert.equal([...html.matchAll(/type="date"/g)].length, 3);
  assert.equal([...html.matchAll(/class="h-10 w-full min-w-0 rounded-md border/g)].length, 3);
});

test("receivables content presents the focused invoice model and ranked customer insight in both locales", () => {
  const report = {
    asOfDate: "2026-09-25",
    periodFrom: "2026-01-01",
    periodTo: "2026-09-25",
    billedAmount: 65501.4,
    collectedCashAmount: 5000,
    totalOutstanding: 59501.4,
    totalOverdue: 0,
    notDueAmount: 59501.4,
    ageing1To30Amount: 0,
    ageing31To60Amount: 0,
    ageing61To90Amount: 0,
    ageing91PlusAmount: 0,
    detailTotalCount: 3,
    rows: [
      {
        invoiceId: "invoice-uuid-1", invoiceNumber: "INV-2026-0024", customerId: "customer-uuid-1",
        customerNumber: "CUST-001", customerName: "W7B DEV Acceptance Customer", serviceId: "service-uuid-1",
        serviceNumber: "SVC-2026-9743", serviceTitle: "W7B Flexible Billing Acceptance",
        issueDate: "2026-09-01", dueDate: "2026-10-07", grossAmount: 59000, creditAdjustmentAmount: 0,
        creditApplicationAmount: 0, netReceivableAmount: 59000, settledAmount: 0, outstandingAmount: 59000,
        daysPastDue: 0, ageingBucket: "not_due" as const,
      },
      {
        invoiceId: "invoice-uuid-2", invoiceNumber: "INV-2026-0023", customerId: "customer-uuid-2",
        customerNumber: "CUST-002", customerName: "شركة أفق المؤتمرات", serviceId: "service-uuid-2",
        serviceNumber: "SVC-2026-0001", serviceTitle: "المؤتمر السنوي للشركة",
        issueDate: "2026-09-01", dueDate: "2026-10-05", grossAmount: 501.4, creditAdjustmentAmount: 0,
        creditApplicationAmount: 0, netReceivableAmount: 501.4, settledAmount: 0, outstandingAmount: 501.4,
        daysPastDue: 0, ageingBucket: "not_due" as const,
      },
      {
        invoiceId: "invoice-uuid-3", invoiceNumber: "INV-2026-0021", customerId: "customer-uuid-3",
        customerNumber: "CUST-003", customerName: "شركة مسار الإعلام", serviceId: "service-uuid-3",
        serviceNumber: "SVC-2026-0026", serviceTitle: "عرس مظفر",
        issueDate: "2026-08-01", dueDate: "2026-08-18", grossAmount: 4999, creditAdjustmentAmount: 0,
        creditApplicationAmount: 0, netReceivableAmount: 4999, settledAmount: 5000, outstandingAmount: 0,
        daysPastDue: 0, ageingBucket: "not_due" as const,
      },
    ],
    outstandingCustomerCount: 2,
    outstandingCustomers: [
      { customerId: "customer-uuid-1", customerNumber: "CUST-001", company: "W7B DEV Acceptance Customer", amount: 59000 },
      { customerId: "customer-uuid-2", customerNumber: "CUST-002", company: "شركة أفق المؤتمرات", amount: 501.4 },
    ],
  };

  const render = (locale: "en" | "ar") => {
    const html = renderToStaticMarkup(React.createElement(
      "div",
      { dir: locale === "ar" ? "rtl" : "ltr" },
      AccountsReceivableReportContent({
        report,
        locale,
        dictionary: getReportCenterDictionary(locale),
        page: 1,
        queryValues: {},
      }),
    ));
    const visibleText = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    const headers = [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
      .map((match) => match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    return { html, visibleText, headers };
  };

  const english = render("en");
  assert.equal(english.visibleText.includes("Invoices"), true);
  assert.match(english.visibleText, /3 invoices/);
  assert.deepEqual(english.headers, ["Invoice", "Customer", "Service", "Due date", "Net due", "Settled", "Outstanding"]);
  for (const label of ["Billed", "Collected Cash", "Outstanding", "Overdue", "Not due", "1–30 days", "31–60 days", "61–90 days", "91+ days"]) {
    assert.ok(english.visibleText.includes(label), `missing ${label}`);
  }
  for (const amount of ["SAR 65,501.40", "SAR 5,000.00", "SAR 59,501.40", "SAR 59,000.00", "SAR 501.40"]) {
    assert.ok(english.visibleText.includes(amount), `missing ${amount}`);
  }
  assert.ok(english.visibleText.includes("Customers by outstanding balance"));
  assert.ok(english.visibleText.includes("W7B DEV Acceptance Customer"));
  assert.ok(!english.visibleText.includes("customer-uuid-1"));
  assert.ok(!english.visibleText.includes("CUST-001"));
  const firstRowWidths = [...english.html.matchAll(/<td\b[^>]*style="[^"]*width:(\d+)%/g)]
    .slice(0, 7)
    .map(([, width]) => Number(width));
  assert.deepEqual(firstRowWidths, [13, 19, 28, 10, 10, 10, 10]);
  assert.equal(firstRowWidths.reduce((total, width) => total + width, 0), 100);
  const customerCell = english.html.match(/<td\b[^>]*style="[^"]*width:19%;[^\"]*min-width:200px[^\"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1];
  assert.ok(customerCell, "customer receives a small width increase without widening the table");
  assert.match(customerCell, /<bdi dir="auto"[^>]*>W7B DEV Acceptance Customer<\/bdi>/);
  const serviceCellMatch = english.html.match(/<td\b(?=[^>]*style="[^"]*width:28%;[^"]*min-width:250px)[^>]*>([\s\S]*?)<\/td>/);
  const serviceCell = serviceCellMatch?.[1];
  assert.ok(serviceCell, "service cell receives the expanded desktop width");
  const serviceHeader = english.html.match(/<th\b([^>]*)>Service<\/th>/)?.[1];
  assert.ok(serviceHeader, "Service header is rendered");
  assert.match(serviceHeader, /text-align:start/);
  assert.match(serviceCellMatch?.[0].split(">", 1)[0] ?? "", /text-align:start/);
  assert.match(english.html, /<div dir="ltr">/);
  const serviceIdentities = [
    ["service-uuid-1", "W7B Flexible Billing Acceptance", "SVC-2026-9743"],
    ["service-uuid-2", "المؤتمر السنوي للشركة", "SVC-2026-0001"],
    ["service-uuid-3", "عرس مظفر", "SVC-2026-0026"],
  ];
  const assertServiceIdentityAlignment = (html: string, direction: "ltr" | "rtl") => {
    assert.ok(html.includes(`<div dir="${direction}">`), `${direction} locale direction is inherited`);
    const classTokens = (attributes: string) =>
      attributes.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? [];

    for (const [serviceId, title, number] of serviceIdentities) {
      const identity = html.match(new RegExp(`<a\\b(?=[^>]*href="\\/services\\/${serviceId}")([^>]*)>([\\s\\S]*?)<\\/a>`));
      assert.ok(identity, `${title} Service identity block is rendered`);
      assert.doesNotMatch(identity[1], /\bdir=/, "identity block inherits locale direction");
      assert.ok(classTokens(identity[1]).includes("text-start"), "identity block aligns at logical start");

      const blocks = [...identity[2].matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/g)];
      assert.equal(blocks.length, 2, "title and service number occupy separate blocks");
      const [primary, secondary] = blocks;
      assert.ok(primary[2].includes(title), "stored service title remains unchanged");
      assert.ok(classTokens(primary[1]).includes("w-full"));
      assert.ok(classTokens(primary[1]).includes("text-start"));
      assert.ok(classTokens(primary[1]).includes("line-clamp-2"));
      assert.doesNotMatch(primary[1], /\bdir=/, "title block inherits locale direction");
      assert.match(primary[2], /<bdi\b[^>]*dir="auto"/, "title value owns bidi isolation");

      assert.ok(secondary[2].includes(number), "service number remains beneath its title");
      assert.ok(classTokens(secondary[1]).includes("w-full"));
      assert.ok(classTokens(secondary[1]).includes("text-start"));
      assert.doesNotMatch(secondary[1], /\bdir=/, "number block inherits locale direction");
      assert.match(secondary[2], /<bdi\b[^>]*dir="ltr"[^>]*whitespace-nowrap/);
    }
  };
  assertServiceIdentityAlignment(english.html, "ltr");
  assert.match(english.html, /<td[^>]*style="[^\"]*width:10%;[^\"]*min-width:120px;white-space:nowrap/);
  const monetaryCellStyles = [...english.html.matchAll(/<td\b[^>]*style="([^"]*width:10%;[^"]*)"[^>]*>([\s\S]*?)<\/td>/g)]
    .filter(([, style, content]) => /min-width:128px/.test(style) && /white-space:nowrap/.test(style) && /SAR/.test(content))
    .map(([, style]) => style);
  assert.equal(monetaryCellStyles.length, 9, "all three financial columns have stable styles across the rendered rows");
  assert.equal(new Set(monetaryCellStyles).size, 1, "Net Due, Settled, and Outstanding use equal widths and no-wrap behavior");
  assert.doesNotMatch(english.visibleText, /Annual Corporate Conference \| المؤتمر السنوي للشركة/);
  const barWidths = [...english.html.matchAll(/class="h-full rounded-full bg-primary" style="width:([^\"]+)"/g)].map((match) => Number.parseFloat(match[1]));
  assert.equal(barWidths.length, 2);
  assert.equal(barWidths[0], 100);
  assert.ok(barWidths[1] > 0 && barWidths[1] < 1);

  const arabic = render("ar");
  assert.match(arabic.visibleText, /الفواتير/);
  assert.match(arabic.visibleText, /٣ فواتير|3 فواتير/);
  assert.ok(arabic.visibleText.includes("غير مستحق"));
  assert.ok(arabic.visibleText.includes("1–30 يوماً"));
  assert.ok(arabic.visibleText.includes("الرصيد المستحق"));
  assert.ok(arabic.visibleText.includes("المؤتمر السنوي للشركة"));
  assert.ok(arabic.visibleText.includes("W7B Flexible Billing Acceptance"));
  assert.ok(arabic.visibleText.includes("عرس مظفر"));
  assert.match(arabic.html, /W7B Flexible Billing Acceptance[\s\S]*?SVC-2026-9743/);
  const arabicServiceCellMatch = arabic.html.match(/<td\b(?=[^>]*style="[^"]*width:28%;[^"]*min-width:250px)[^>]*>([\s\S]*?)<\/td>/);
  const arabicServiceCell = arabicServiceCellMatch?.[1];
  assert.ok(arabicServiceCell, "Arabic service identity uses the same adjusted column");
  const arabicHeader = arabic.html.match(/<th\b([^>]*)>الخدمة<\/th>/)?.[1];
  assert.ok(arabicHeader, "Arabic Service header is rendered");
  assert.match(arabicHeader, /text-align:start/);
  assert.match(arabicServiceCellMatch?.[0].split(">", 1)[0] ?? "", /text-align:start/);
  assertServiceIdentityAlignment(arabic.html, "rtl");
  assert.ok(!arabic.visibleText.includes("customer-uuid-1"));
});
