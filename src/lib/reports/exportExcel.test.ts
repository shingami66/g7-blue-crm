import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "./exportExcel.ts";

async function loadWorkbook(locale: "en" | "ar" = "en") {
  const buffer = await buildExcelReportBuffer({
    metadata: {
      brandName: "G7 BLUE",
      reportTitle: locale === "ar" ? "مستحقات العملاء" : "Accounts Receivable",
      definition: locale === "ar" ? "الفواتير والتحصيل والأرصدة" : "Invoice balances from the approved receivables source.",
      source: "W7D AR Authority",
      timeBasis: locale === "ar" ? "إعادة بناء تاريخية حتى تاريخ محدد" : "Historical as-of reconstruction",
      timeZone: "Asia/Riyadh",
      generatedAt: new Date("2026-09-24T08:15:00.000Z"),
      filters: [locale === "ar" ? "حتى تاريخ: 2026-09-23" : "As of: 2026-09-23"],
      totalRecords: 1,
      fileName: "accounts-receivable.xlsx",
    },
    columns: [
      { header: locale === "ar" ? "الفاتورة" : "Invoice", key: "invoice", format: "text", width: 22 },
      { header: locale === "ar" ? "تاريخ الاستحقاق" : "Due Date", key: "dueDate", format: "date", width: 14 },
      { header: locale === "ar" ? "المتبقي" : "Outstanding", key: "outstanding", format: "currency", width: 18 },
      { header: locale === "ar" ? "الرصيد غير المتاح" : "Unavailable", key: "unavailable", format: "currency", width: 18 },
    ],
    rows: [{ invoice: "INV-2041", dueDate: "2026-09-21", outstanding: 22, unavailable: null }],
    summary: { metrics: [{ label: locale === "ar" ? "المتبقي" : "Outstanding", value: 22, format: "currency" }] },
    locale,
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  return workbook;
}

test("workbook contains concise Summary and full Data sheets with context and numeric metrics", async () => {
  const workbook = await loadWorkbook();
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Summary", "Data"]);
  const summary = workbook.getWorksheet("Summary");
  const data = workbook.getWorksheet("Data");
  assert.ok(summary);
  assert.ok(data);
  assert.equal(summary.getCell("A1").value, "G7 BLUE");
  assert.equal(summary.getCell("A2").value, "Accounts Receivable");
  assert.equal(summary.getCell("A3").value, "Definition: Invoice balances from the approved receivables source.");
  assert.ok(summary.getCell("A4").value === "Source");
  assert.ok(summary.getCell("B4").value === "W7D AR Authority");
  assert.ok(summary.getCell("A8").value === "Filters");
  assert.equal(summary.getCell("A10").value, "Outstanding");
  assert.equal(summary.getCell("B10").value, 22);
  assert.equal(summary.getCell("B10").numFmt, '"SAR" #,##0.00');
  assert.equal(data.getCell("A2").value, "INV-2041");
  assert.equal(data.getCell("C2").value, 22);
  assert.equal(data.getCell("C2").numFmt, '"SAR" #,##0.00');
});

test("Data sheet keeps date-only values, blank nullable currency, filter, freeze, and readable widths", async () => {
  const data = (await loadWorkbook()).getWorksheet("Data");
  assert.ok(data);
  assert.equal(data.getCell("B2").numFmt, "dd/mm/yyyy");
  assert.ok(data.getCell("B2").value instanceof Date);
  assert.equal(data.getCell("D2").value, null);
  assert.equal(data.getCell("D2").numFmt, '"SAR" #,##0.00');
  assert.equal(data.autoFilter, "A1:D1");
  const view = data.views[0];
  assert.ok(view);
  assert.equal(view.state, "frozen");
  assert.equal(view.ySplit, 1);
  assert.ok((data.getColumn(1).width ?? 0) >= 20);
  assert.ok((data.getColumn(3).width ?? 0) >= 18);
});

test("formula-like text remains escaped in the actual generated XLSX cell", async () => {
  const buffer = await buildExcelReportBuffer({
    metadata: {
      brandName: "G7 BLUE",
      reportTitle: "Safe report",
      definition: "Formula-safe export",
      source: "Approved source",
      timeBasis: "Current source records",
      timeZone: "Asia/Riyadh",
      generatedAt: new Date("2026-09-24T00:00:00.000Z"),
      totalRecords: 1,
      fileName: "safe.xlsx",
    },
    columns: [{ header: "Reference", key: "reference", format: "text" }],
    rows: [{ reference: "=HYPERLINK(\"https://example.com\")" }],
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  assert.equal(workbook.getWorksheet("Data")?.getCell("A2").value, "'=HYPERLINK(\"https://example.com\")");
});

test("legacy single-sheet customer exports retain their established workbook contract", async () => {
  const buffer = await buildExcelReportBuffer({
    metadata: {
      companyName: "G SEVEN BLUE Company",
      brandName: "G7 BLUE CRM",
      reportTitle: "Customers Report",
      generatedAt: new Date("2026-09-24T08:00:00.000Z"),
      generatedBy: "System Generated",
      totalRecords: 1,
      sheetName: "Customers",
      fileName: "customers.xlsx",
    },
    columns: [
      { header: "Customer Number", key: "number", width: 20, format: "text" },
      { header: "Company", key: "company", width: 30, format: "text" },
    ],
    rows: [{ number: "CUS-2041", company: "Northwind" }],
    chrome: {
      filteredView: "Filtered View",
      generatedAtLabel: "Generated At",
      generatedByLabel: "Generated By",
      totalRecordsLabel: "Total Records",
      filtersLabel: "Filters",
      allRecords: "All records",
      systemGenerated: "System Generated",
      defaultSheetName: "Report",
    },
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Customers"]);
  const sheet = workbook.getWorksheet("Customers");
  assert.equal(sheet?.getCell("A1").value, "G SEVEN BLUE Company - G7 BLUE CRM");
  assert.equal(sheet?.getCell("A5").value, "Customer Number");
  assert.equal(sheet?.getCell("A6").value, "CUS-2041");
  assert.equal(sheet?.autoFilter, "A5:B5");
  assert.equal((sheet?.views[0] as { ySplit?: number } | undefined)?.ySplit, 5);
});

test("Arabic workbook applies real RTL worksheet views and Arabic headers", async () => {
  const workbook = await loadWorkbook("ar");
  assert.equal(workbook.getWorksheet("Summary")?.views[0]?.rightToLeft, true);
  assert.equal(workbook.getWorksheet("Data")?.views[0]?.rightToLeft, true);
  assert.equal(workbook.getWorksheet("Data")?.getCell("A1").value, "الفاتورة");
  assert.equal(workbook.getWorksheet("Data")?.getCell("A2").value, "INV-2041");
  assert.equal(DEFAULT_EXCEL_EXPORT_CHROME_EN.summarySheetName, "Summary");
  assert.equal(DEFAULT_EXCEL_EXPORT_CHROME_EN.dataSheetName, "Data");
});
