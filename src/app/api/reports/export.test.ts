import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { ForbiddenError } from "../../../lib/auth/errors.ts";
import type {
  ReportAccountsPayable,
  ReportEventEconomics,
  ReportReceivableRow,
} from "../../../lib/reports/types.ts";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;
const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
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

let locale: "en" | "ar" = "en";
let readFailure: Error | null = null;
let exportTruncated = false;
const readCalls: Array<{ source: string; options: unknown }> = [];

const arRow: ReportReceivableRow = {
  invoiceId: "internal-invoice-uuid", invoiceNumber: "INV-2041", customerId: "internal-customer-uuid",
  customerNumber: "CUS-2041", customerName: "Customer One", serviceId: null, serviceNumber: "SVC-2041",
  serviceTitle: "Riyadh Summit", issueDate: "2026-09-01", dueDate: "2026-09-21", grossAmount: 100,
  creditAdjustmentAmount: 5, creditApplicationAmount: 3, netReceivableAmount: 92, settledAmount: 22,
  outstandingAmount: 70, daysPastDue: 2, ageingBucket: "1_30",
};
const arData = {
  asOfDate: "2026-09-23", periodFrom: "2026-09-01", periodTo: "2026-09-30", billedAmount: 100,
  collectedCashAmount: 22, totalOutstanding: 70, totalOverdue: 70, notDueAmount: 0,
  ageing1To30Amount: 70, ageing31To60Amount: 0, ageing61To90Amount: 0, ageing91PlusAmount: 0,
  detailTotalCount: 1, rows: [arRow], outstandingCustomerCount: null, outstandingCustomers: [],
};
const apRow = {
  billId: "internal-bill-uuid", billNumber: "BILL-2041", supplierId: "internal-supplier-uuid",
  supplierName: "Supplier One", serviceId: null, serviceNumber: "SVC-2041", serviceTitle: "Riyadh Summit",
  invoiceDate: "2026-09-01", dueDate: "2026-09-21", status: "partially_paid" as const, currency: "SAR",
  payableAmount: 100, paidAmount: 40, outstandingAmount: 60, advanceAllocatedAmount: 2,
};
const apData: ReportAccountsPayable = {
  currentOnly: true, source: "supplier_bill_payment_balances", payableAmount: 100, paidAmount: 40,
  outstandingAmount: 60, openBillCount: 1, detailTotalCount: 1, rows: [apRow],
  pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
};
const eventRow = {
  serviceId: "internal-service-uuid", serviceNumber: "SVC-2041", serviceTitle: "Riyadh Summit",
  customerId: "internal-customer-uuid", customerNumber: "CUS-2041", customerName: "Customer One",
  approvedBudgetCost: null, openCommitment: null, actualCost: null, paidCost: null, outstandingCost: null,
  etc: null, eac: null, netApprovedCommercialValue: null, forecastMargin: null,
  completenessStatus: "PARTIAL" as const, completenessReasonCodes: [], closeState: "open" as const,
  closeVersion: null, closeEffectiveDate: null, finalActualCost: 22, finalManagerialMargin: 22, closedAt: null,
};
const eventData: ReportEventEconomics = {
  asOfDate: "2026-09-23", source: "get_event_costing + event_cost_close_versions", rows: [eventRow],
  summary: { completenessSummaryState: "available", completeCount: 0, partialCount: 1, unavailableCount: 0, openCount: 1, closedCount: 0 },
  pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
};

mock.module("@/lib/i18n/session-locale", {
  namedExports: { getCurrentSessionEffectiveLocale: async () => locale },
});
mock.module("@/lib/reports/reporting", {
  namedExports: {
    MAX_EXPORT_ROWS: 500,
    readAccountsReceivableExport: async (options: unknown) => {
      readCalls.push({ source: "ar", options });
      if (readFailure) throw readFailure;
      return { data: exportTruncated ? { ...arData, detailTotalCount: 700 } : arData, truncated: exportTruncated };
    },
    readAccountsPayableExport: async (options: unknown) => {
      readCalls.push({ source: "ap", options });
      if (readFailure) throw readFailure;
      return { data: exportTruncated ? { ...apData, detailTotalCount: 700, pagination: { ...apData.pagination, total: 700, totalPages: 14 } } : apData, truncated: exportTruncated };
    },
    readEventEconomicsExport: async (options: unknown) => {
      readCalls.push({ source: "event", options });
      if (readFailure) throw readFailure;
      return { data: exportTruncated ? { ...eventData, pagination: { ...eventData.pagination, total: 700, totalPages: 14 } } : eventData, truncated: exportTruncated };
    },
  },
});

const [{ GET: getArExport }, { GET: getApExport }, { GET: getEventExport }] = await Promise.all([
  import("./accounts-receivable/export/route.ts"),
  import("./accounts-payable/export/route.ts"),
  import("./event-economics/export/route.ts"),
]);

async function readWorkbook(response: Response) {
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /spreadsheetml\.sheet/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Summary", "Data"]);
  return workbook;
}

test("AR export API applies query filters and returns Summary plus complete Data details", async () => {
  readCalls.length = 0;
  locale = "en";
  const response = await getArExport(new Request("http://localhost/api/reports/accounts-receivable/export?from=2026-09-01&to=2026-09-30&asOf=2026-09-23"));
  const workbook = await readWorkbook(response);
  assert.deepEqual(readCalls[0], { source: "ar", options: { from: "2026-09-01", to: "2026-09-30", year: 2026, asOf: "2026-09-23" } });
  const data = workbook.getWorksheet("Data");
  assert.equal(data?.columnCount, 15);
  assert.equal(data?.getCell("A2").value, "INV-2041");
  assert.equal(data?.getCell("B2").value, "Customer One");
  assert.equal(data?.getCell("C2").value, "CUS-2041");
  assert.equal(data?.getCell("I2").value, 5);
  assert.equal(data?.getCell("J2").value, 3);
  assert.equal(data?.getCell("O2").value, "1–30 days");
  assert.equal(workbook.getWorksheet("Summary")?.getCell("A2").value, "Customer Receivables");
  assert.equal(workbook.getWorksheet("Summary")?.getCell("D4").value, "Source basis");
});

test("AP export API localizes status and keeps invoice date, currency, and advance allocation in Data", async () => {
  readCalls.length = 0;
  locale = "ar";
  const response = await getApExport(new Request("http://localhost/api/reports/accounts-payable/export?status=partially_paid&supplierSearch=Supplier&serviceSearch=Conference&dueFrom=2026-09-01"));
  const workbook = await readWorkbook(response);
  assert.deepEqual(readCalls[0], { source: "ap", options: { status: "partially_paid", supplierSearch: "Supplier", serviceSearch: "Conference", dueFrom: "2026-09-01", dueTo: undefined } });
  const data = workbook.getWorksheet("Data");
  assert.equal(data?.getCell("E2").numFmt, "dd/mm/yyyy");
  assert.equal(data?.getCell("G2").value, "مدفوعة جزئياً");
  assert.equal(data?.getCell("H2").value, "SAR");
  assert.equal(data?.getCell("L2").value, 2);
  assert.equal(data?.views[0]?.rightToLeft, true);
  assert.equal(workbook.getWorksheet("Summary")?.views[0]?.rightToLeft, true);
  const apSummary = workbook.getWorksheet("Summary");
  assert.equal(apSummary?.getCell("A2").value, "مستحقات الموردين");
  assert.equal(apSummary?.getCell("B4").value, "السجلات الحالية فقط");
  assert.equal(apSummary?.getCell("A8").value, "إجمالي مستحقات الموردين");
});

test("Event export API blanks phantom final values for open events and keeps all analytical columns", async () => {
  readCalls.length = 0;
  locale = "en";
  const response = await getEventExport(new Request("http://localhost/api/reports/event-economics/export?asOf=2026-09-23&completeness=PARTIAL&closeState=open&search=Riyadh"));
  const workbook = await readWorkbook(response);
  assert.deepEqual(readCalls[0], { source: "event", options: { asOfDate: "2026-09-23", search: "Riyadh", completeness: "PARTIAL", closeState: "open" } });
  const data = workbook.getWorksheet("Data");
  assert.equal(data?.columnCount, 20);
  assert.equal(data?.getCell("A2").value, "Riyadh Summit");
  assert.equal(data?.getCell("B2").value, "SVC-2041");
  assert.equal(data?.getCell("C2").value, "CUS-2041");
  assert.equal(data?.getCell("D2").value, "Customer One");
  assert.equal(data?.getCell("N2").value, "Partial");
  assert.equal(data?.getCell("O2").value, "Open");
  for (const column of ["E", "F", "G", "H", "I", "J", "K", "L", "M", "P", "Q"]) {
    assert.equal(data?.getCell(`${column}2`).value, null, `${column}2 unavailable monetary cell should be blank`);
  }
  const summary = workbook.getWorksheet("Summary");
  assert.equal(summary?.getCell("A2").value, "Event Cost & Margin");
  assert.equal(summary?.getCell("A7").value, "Included Events");
  assert.equal(summary?.getCell("A8").value, "Some exported events have incomplete source data.");
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => summary?.getCell(11, index + 1).value), [
      "Event", "Customer", "Approved Budget", "Actual Cost", "Estimate at Completion (EAC)", "Forecast Margin", "Completeness", "Close State",
  ]);
  assert.equal(summary?.getCell("A12").value, "Riyadh Summit");
  assert.equal(summary?.getCell("B12").value, "Customer One");
});

test("bounded exports keep source totals distinct from exported row counts in EN and AR summaries", async () => {
  exportTruncated = true;
  locale = "en";
  try {
    const responses = await Promise.all([
      getArExport(new Request("http://localhost/api/reports/accounts-receivable/export")),
      getApExport(new Request("http://localhost/api/reports/accounts-payable/export")),
      getEventExport(new Request("http://localhost/api/reports/event-economics/export")),
    ]);
    const workbooks = await Promise.all(responses.map((response) => readWorkbook(response)));
    for (const workbook of workbooks) {
      const summary = workbook.getWorksheet("Summary");
      assert.equal(summary?.getCell("B7").value, "700");
      assert.match(String(summary?.getCell("B6").value), /Rows exported: 1 \(Export limit: 500\)/);
    }

    locale = "ar";
    const arabicAp = await readWorkbook(await getApExport(new Request("http://localhost/api/reports/accounts-payable/export")));
    assert.match(String(arabicAp.getWorksheet("Summary")?.getCell("B6").value), /السجلات المصدرة: 1 \(الحد الأقصى للتصدير: 500\)/);
  } finally {
    exportTruncated = false;
  }
});

test("AP export API retains the server-side forbidden response for a service filter", async () => {
  readFailure = new ForbiddenError();
  try {
    const response = await getApExport(new Request("http://localhost/api/reports/accounts-payable/export?serviceSearch=restricted-service"));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), "Forbidden");
  } finally {
    readFailure = null;
  }
});

test("AP and Event export APIs return unavailable instead of producing a workbook when a report reader fails", async () => {
  readFailure = new Error("later page unavailable");
  try {
    const responses = await Promise.all([
      getApExport(new Request("http://localhost/api/reports/accounts-payable/export")),
      getEventExport(new Request("http://localhost/api/reports/event-economics/export")),
    ]);
    for (const response of responses) {
      assert.equal(response.status, 503);
      assert.equal(await response.text(), "Report unavailable");
      assert.doesNotMatch(response.headers.get("content-type") ?? "", /spreadsheetml\.sheet/);
    }
  } finally {
    readFailure = null;
  }
});
