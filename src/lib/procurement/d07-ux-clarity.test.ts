import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getProcurementCommitmentDictionary } from "../i18n/dictionaries/procurement-commitments.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

test("W4 operational numbers use the shared Latin-digit and bidi-safe display contract", () => {
  const workspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");
  const history = read("src/app/(dashboard)/suppliers/[id]/SupplierQuotationHistory.tsx");

  assert.match(workspace, /formatSarAmount/);
  assert.match(workspace, /formatUiQuantity/);
  assert.match(workspace, /isolateLtrText\(commitment\.serviceNumber\)/);
  assert.match(workspace, /formatUiQuantity\(dictionary\.locale, receipt\.actualQuantity/);
  assert.doesNotMatch(workspace, /new Intl\.NumberFormat|String\(receipt\.(actualQuantity|actualHours)\)/);
  assert.match(history, /formatUiNumber/);
});

test("Commitments workspace financial metrics preserve natural RTL cell alignment with LTR numeric spans", () => {
  const workspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");

  // dd must not place dir="ltr" on the entire cell
  assert.doesNotMatch(workspace, /<dd[^>]*dir=\{numeric \? "ltr" : "auto"\}/);
  assert.doesNotMatch(workspace, /<dd[^>]*dir="ltr"/);

  // Numeric content is isolated in an LTR tabular-nums span
  assert.match(workspace, /<span dir="ltr" className="inline-block tabular-nums">[\s\S]*?\{value\}[\s\S]*?<\/span>/);
});

test("Commitments workspace localized file picker and instance-safe evidence upload contracts", () => {
  const workspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");
  const dictEn = getProcurementCommitmentDictionary("en");
  const dictAr = getProcurementCommitmentDictionary("ar");

  // Dictionary keys
  assert.equal(dictEn.chooseFiles, "Choose files");
  assert.equal(dictAr.chooseFiles, "اختيار الملفات");
  assert.equal(dictEn.noFilesSelected, "No files selected");
  assert.equal(dictAr.noFilesSelected, "لم يتم اختيار ملفات");

  // Instance-safe unique ID derived from target and targetId
  assert.match(workspace, /const inputId = `evidence-files-\$\{target\}-\$\{targetId\}`;/);

  // Accessible trigger button and sr-only sibling file input (not nested)
  assert.match(workspace, /htmlFor=\{inputId\}/);
  assert.match(workspace, /dictionary\.chooseFiles/);
  assert.match(workspace, /id=\{inputId\}/);
  assert.match(workspace, /name="files"/);
  assert.match(workspace, /type="file"/);
  assert.match(workspace, /multiple/);
  assert.match(workspace, /required/);
  assert.match(workspace, /accept="application\/pdf,image\/jpeg,image\/png,\.pdf,\.jpg,\.jpeg,\.png"/);

  // State reset on form reset and submit success
  assert.match(workspace, /onReset=\{handleReset\}/);
  assert.match(workspace, /resetFileInput\(\)/);
  assert.match(workspace, /fileInputRef\.current\.value = ""/);
  assert.match(workspace, /setSelectedFiles\(\[\]\)/);

  // Authentic filenames rendered without alteration
  assert.match(workspace, /selectedFiles\.map\(\(file\) => file\.name\)\.join\(/);

  // No redundant visible "Supporting documents" heading inside EvidenceUploadForm
  assert.doesNotMatch(workspace, /<label[^>]*>\{dictionary\.fields\.documents\}<input/);
});

test("Commitments workspace canonical date-only input contracts (approvedAt and performanceDate)", () => {
  const workspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");
  const dictEn = getProcurementCommitmentDictionary("en");
  const dictAr = getProcurementCommitmentDictionary("ar");

  // Dictionary keys
  assert.equal(dictEn.datePlaceholder, "YYYY-MM-DD");
  assert.equal(dictAr.datePlaceholder, "YYYY-MM-DD");
  assert.equal(dictEn.openCalendar, "Open calendar");
  assert.equal(dictAr.openCalendar, "فتح التقويم");

  // approvedAt visible text input is canonical form field, hidden picker has NO name attribute
  assert.match(workspace, /id="commitment-approved-at-input"/);
  assert.match(workspace, /htmlFor="commitment-approved-at-input"/);
  assert.match(workspace, /name="approvedAt"/);
  assert.match(workspace, /ref=\{approvedAtPickerRef\}/);

  // performanceDate visible text input is canonical form field, hidden picker has NO name attribute
  assert.match(workspace, /id=\{`receipt-performance-date-\$\{commitmentId\}`\}/);
  assert.match(workspace, /htmlFor=\{`receipt-performance-date-\$\{commitmentId\}`\}/);
  assert.match(workspace, /name="performanceDate"/);
  assert.match(workspace, /ref=\{performanceDatePickerRef\}/);

  // Both date fields share the canonical date pattern, placeholder, and showPicker mechanics
  assert.match(workspace, /pattern="\\d\{4\}-\\d\{2\}-\\d\{2\}"/);
  assert.match(workspace, /placeholder=\{dictionary\.datePlaceholder\}/);
  assert.match(workspace, /showPicker/);

  // Neither hidden date picker has a name attribute
  assert.doesNotMatch(workspace, /<input[^>]*ref=\{approvedAtPickerRef\}[^>]*name=/);
  assert.doesNotMatch(workspace, /<input[^>]*ref=\{performanceDatePickerRef\}[^>]*name=/);
});
