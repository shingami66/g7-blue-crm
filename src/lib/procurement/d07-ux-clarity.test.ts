import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getProcurementCommitmentDictionary } from "../i18n/dictionaries/procurement-commitments.ts";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

test("Service Detail is a compact procurement summary with a dedicated workspace", () => {
  const servicePage = read("src/app/(dashboard)/services/[id]/page.tsx");
  const summary = read("src/app/(dashboard)/services/[id]/ProcurementSummaryCard.tsx");
  const workspacePage = read("src/app/(dashboard)/services/[id]/procurement/page.tsx");
  const commitmentsPage = read("src/app/(dashboard)/services/[id]/commitments/page.tsx");

  assert.match(servicePage, /<ProcurementSummaryCard/);
  assert.match(servicePage, /returnTo=\{currentServiceUrl\}/);
  assert.match(servicePage, /appendReturnTo\(`\/services\/\$\{service\.id\}\/commitments`, currentServiceUrl\)/);
  assert.doesNotMatch(servicePage, /<ProcurementRequirementPanel|SupplierAllocationsPanel|SupplierBookingsPanel/);
  assert.match(summary, /openRequirements|candidateSuppliers|supplierQuotations|selectedSupplier/);
  assert.match(summary, /workspaceHref/);
  assert.match(summary, /formatUiNumber/);
  assert.match(workspacePage, /<ProcurementPackageWorkspace/);
  assert.match(workspacePage, /checkPermission\("supplier_costing:write"\)/);
  assert.match(workspacePage, /<RecordBackButton[\s\S]*href=\{returnTo\}/);
  assert.match(commitmentsPage, /<RecordBackButton[\s\S]*href=\{returnTo\}/);
  assert.doesNotMatch(workspacePage, /←|→/);
  assert.doesNotMatch(commitmentsPage, /←|→/);
});

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

test("D07 workspace presents secondary authority surfaces as clear collapsible sections", () => {
  const servicePage = read("src/app/(dashboard)/services/[id]/page.tsx");
  const workspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");
  const cancellation = read("src/app/(dashboard)/services/[id]/ServiceCancellationActions.tsx");

  assert.match(workspace, /dictionary\.fields\.documents/);
  assert.match(workspace, /dictionary\.fields\.receipt/);
  assert.match(workspace, /dictionary\.fields\.amendment/);
  assert.match(workspace, /dictionary\.forms\.executeAction/);
  assert.match(workspace, /formatUiDate\(dictionary\.locale, commitment\.approvedAt\)/);
  assert.match(workspace, /formatUiDate\(dictionary\.locale, amendment\.approvedAt\)/);
  assert.doesNotMatch(workspace, /<details open className="overflow-hidden/);
  assert.doesNotMatch(workspace, /<details open=\{commitment\.receipts/);
  assert.doesNotMatch(workspace, /<details open=\{commitment\.amendments/);
  assert.match(workspace, /dictionary\.fields\.openAmount/);
  assert.match(cancellation, /<details/);
  assert.match(cancellation, /advancedActions/);
  assert.match(servicePage, /<ServiceCancellationActions/);
});

test("D07 labels preserve the locked English and Arabic workflow language", () => {
  const english = getProcurementCommitmentDictionary("en");
  const arabic = getProcurementCommitmentDictionary("ar");
  const servicesEnglish = getServicesDictionary("en");
  const servicesArabic = getServicesDictionary("ar");

  assert.equal(english.fields.amendmentType, "Amendment type");
  assert.equal(english.fields.amendmentAmount, "Amendment amount");
  assert.equal(english.fields.approvalEvidenceReference, "Approval evidence reference");
  assert.equal(english.forms.action, "Action");
  assert.equal(english.forms.executeAction, "Execute Action");
  assert.equal(arabic.fields.amendmentType, "نوع التعديل");
  assert.equal(arabic.fields.amendmentAmount, "قيمة التعديل");
  assert.equal(arabic.fields.approvalEvidenceReference, "مرجع دليل الاعتماد");
  assert.equal(arabic.fields.receipt, "استلام الخدمة");
  assert.equal(arabic.fields.receivedAmount, "قيمة الجزء المستلم من الالتزام");
  assert.equal(servicesEnglish.serviceStatusControl.advancedActions, "Advanced Actions");
  assert.equal(servicesArabic.serviceStatusControl.advancedActions, "إجراءات متقدمة");
  assert.equal(servicesEnglish.serviceLifecycle.actions.updateAction, "Update lifecycle state");
  assert.equal(servicesArabic.serviceLifecycle.actions.updateAction, "تحديث حالة دورة الحياة");
  assert.equal(servicesEnglish.commitmentSummary.title, "Approved Commitments & Receipts");
  assert.equal(servicesArabic.commitmentSummary.title, "الالتزامات المعتمدة والاستلام");
});

test("Service Detail enforces the compact operational summary visual hierarchy", () => {
  const servicePage = read("src/app/(dashboard)/services/[id]/page.tsx");
  const lifecycleActions = read("src/app/(dashboard)/services/[id]/ServiceLifecycleActions.tsx");
  const commitmentCard = read("src/app/(dashboard)/services/[id]/CommitmentSummaryCard.tsx");

  // Verify visual hierarchy order in page:
  // Lifecycle Summary -> Key Facts -> Related Quotations -> Procurement -> Commitments -> Billing -> Activity -> Advanced Actions
  assert.match(
    servicePage,
    /<ServiceLifecycleActions[\s\S]*?<SectionHeader title=\{dictionary\.detail\.sections\.serviceSchedule\}[\s\S]*?<RelatedQuotationsCard[\s\S]*?<ProcurementSummaryCard[\s\S]*?<CommitmentSummaryCard[\s\S]*?<ServiceBillingSummaryCard[\s\S]*?<ServiceActivityHistory[\s\S]*?<ServiceCancellationActions/,
  );

  // Verify lifecycle compaction and secondary collapsible mutation
  assert.match(lifecycleActions, /grid-cols-2 sm:grid-cols-3 lg:grid-cols-6/);
  assert.match(lifecycleActions, /isUpdateOpen/);
  assert.match(lifecycleActions, /aria-controls="service-lifecycle-update-panel"/);
  assert.match(lifecycleActions, /dictionary\.serviceLifecycle\.actions\.updateAction/);

  // Verify CommitmentSummaryCard adheres to formatting and isolation contracts
  assert.match(commitmentCard, /formatSarAmount/);
  assert.match(commitmentCard, /formatUiNumber/);
  assert.match(commitmentCard, /isolateBidiText/);
  assert.match(commitmentCard, /summary\.openWorkspace/);
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


