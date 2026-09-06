import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import { getSuppliersDictionary } from "../i18n/dictionaries/suppliers.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SUPPLIER_DETAIL_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/page.tsx");
const HISTORY_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/page.tsx");
const NEW_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/new/page.tsx");
const DETAIL_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/[quotationId]/page.tsx");
const HISTORY_COMPONENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/SupplierQuotationHistory.tsx");
const FORM_COMPONENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx");
const DETAIL_COMPONENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationDetail.tsx");
const SERVICE_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");
const PROCUREMENT_WORKSPACE_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/procurement/page.tsx");
const PROCUREMENT_SUMMARY_CARD = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/ProcurementSummaryCard.tsx");
const RETURN_TO_HELPER = join(REPO_ROOT, "src/lib/record-navigation/queries.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("Supplier Detail keeps quotations compact and Rate Cards separate", () => {
  const detail = read(SUPPLIER_DETAIL_PAGE);

  assert.match(detail, /appendReturnTo/);
  assert.match(detail, /dictionary\.quotationHistory\.openWorkspace/);
  assert.doesNotMatch(detail, /SupplierQuotationHistory|getSupplierQuotationHistory|getSupplierQuotationRequirement/);
  assert.match(detail, /SupplierRateCardsList/);
  assert.match(detail, /dictionary\.detail\.rateCards/);
});

test("Supplier quotation history is a header-level table with compatibility presentation", () => {
  const page = read(HISTORY_PAGE);
  const component = read(HISTORY_COMPONENT);

  assert.match(page, /getSupplierQuotationHistoryBySupplierId/);
  assert.match(page, /<RecordBackButton[\s\S]*href=\{returnTo\}/);
  assert.doesNotMatch(page, /getSupplierQuotationRequirementOptions|recordSupplierQuotationEvidence/);
  assert.match(page, /<SupplierQuotationHistory/);
  assert.match(page, /documentsAccessible=\{data\.canReadDocuments\}/);
  assert.match(page, /appendReturnTo\(`\/suppliers\/\$\{supplier\.id\}\/quotations\/new`, currentHistoryUrl\)/);
  assert.match(component, /<table/);
  assert.match(component, /dictionary\.coveredRequirements/);
  assert.match(component, /quotation\.requirements\.length/);
  assert.match(component, /quotation\.sourceCandidateRequirementId/);
  assert.match(component, /dictionary\.legacyRecordedEvidence/);
  assert.match(component, /dictionary\.documentsRestricted/);
  assert.match(component, /detailQuery\.set\("showDeleted", "true"\)/);
  assert.match(component, /const historyPath = `\/suppliers\/\$\{supplierId\}\/quotations/);
  assert.match(component, /new URLSearchParams\(\{ returnTo: baseHistory \}\)/);
  assert.match(component, /encodeURIComponent\(baseHistory\)/);
  assert.match(component, /quotation\.serviceDeleted/);
  assert.match(component, /formatUiDate\(locale, quotation\.recordedAt\)/);
  assert.match(component, /quotations\/\$\{quotation\.id\}/);
  assert.doesNotMatch(component, /recordSupplierQuotationEvidence|lineSummary:|type="file"/);
});

test("Dedicated new quotation route owns the multi-requirement form", () => {
  const page = read(NEW_PAGE);
  const form = read(FORM_COMPONENT);

  assert.match(page, /getSupplierQuotationRequirementOptions/);
  assert.match(page, /<SupplierQuotationForm/);
  assert.match(page, /checkPermission\("supplier_costing:write"\)/);
  assert.match(page, /checkPermission\("documents:write"\)/);
  assert.match(form, /formData\.set\("requirements"/);
  assert.match(form, /formData\.set\("lines"/);
  assert.match(form, /recordSupplierQuotationEvidence/);
  assert.match(form, /returnTo: string/);
  assert.match(form, /quotations\/\$\{result\.data\.quotationId\}\?returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(form, /type="file" multiple/);
  assert.match(form, /dictionary\.serviceSelection/);
  assert.match(form, /dictionary\.serviceLabel/);
  assert.match(form, /dictionary\.selectServicePlaceholder/);
  assert.doesNotMatch(form, /<h2[^>]*>\{dictionary\.chooseService\}<\/h2>/);
  assert.doesNotMatch(form, /lineEvidenceRef|evidenceReferencePlaceholder/);
  assert.doesNotMatch(form, /score|rank|comparison/i);
});

test("Dedicated quotation detail keeps header identity, compact lines, and private originals", () => {
  const page = read(DETAIL_PAGE);
  const component = read(DETAIL_COMPONENT);

  assert.match(page, /getSupplierQuotationById/);
  assert.match(page, /<SupplierQuotationDetail/);
  assert.match(page, /checkPermission\("supplier_costing:read"\)/);
  assert.match(page, /quotationResult\.quotation\.supplierId !== supplierId/);
  assert.match(component, /dictionary\.legacyDetailNotice/);
  assert.match(component, /dictionary\.supplierReference/);
  assert.match(component, /dictionary\.quotationDate/);
  assert.match(component, /dictionary\.recorded/);
  assert.match(component, /dictionary\.lineAmount/);
  assert.match(component, /dictionary\.legacyEvidenceReference/);
  assert.match(component, /createSupplierQuotationDocumentViewUrl/);
  assert.match(component, /documentsAccessible/);
  assert.doesNotMatch(component, /lineEvidenceRef:|supplierReference.*requirement/i);
  assert.doesNotMatch(component, /score|rank|comparison/i);
});

test("Service Detail removes allocation and booking presentation but keeps procurement quotation navigation", () => {
  const servicePage = read(SERVICE_PAGE);
  const procurementWorkspacePage = read(PROCUREMENT_WORKSPACE_PAGE);
  const procurementSummaryCard = read(PROCUREMENT_SUMMARY_CARD);

  assert.doesNotMatch(servicePage, /SupplierAllocationsPanel|SupplierBookingsPanel|getSupplierAllocationsByServiceId|getSupplierBookingsByServiceId/);
  assert.match(servicePage, /<ProcurementSummaryCard/);
  assert.match(procurementSummaryCard, /workspaceHref/);
  assert.match(procurementSummaryCard, /encodeURIComponent\(returnTo\)/);
  assert.match(procurementWorkspacePage, /canReadCommitments/);
  assert.match(procurementWorkspacePage, /PROCUREMENT_COMMITMENT_PERMISSIONS\.read/);
  assert.doesNotMatch(servicePage, /checkPermission\("supplier_costing:write"\)/);
  assert.match(procurementWorkspacePage, /<ProcurementPackageWorkspace/);
});

test("Quotation copy and Service quotation navigation remain bilingual", () => {
  assert.equal(getSuppliersDictionary("en").quotationHistory.addQuotation, "Add supplier quotation");
  assert.equal(getSuppliersDictionary("ar").quotationHistory.addQuotation, "إضافة عرض سعر مورد");
  assert.equal(getSuppliersDictionary("en").quotationHistory.serviceSelection, "Service Selection");
  assert.equal(getSuppliersDictionary("ar").quotationHistory.serviceSelection, "اختيار الخدمة");
  assert.equal(getSuppliersDictionary("en").quotationHistory.serviceLabel, "Service");
  assert.equal(getSuppliersDictionary("ar").quotationHistory.serviceLabel, "الخدمة");
  assert.equal(getSuppliersDictionary("en").quotationHistory.selectServicePlaceholder, "Select a Service…");
  assert.equal(getSuppliersDictionary("ar").quotationHistory.selectServicePlaceholder, "اختر خدمة…");
  assert.equal(getServicesDictionary("en").procurementRequirement.actions.viewQuotations, "View supplier quotations");
  assert.equal(getServicesDictionary("ar").procurementRequirement.actions.viewQuotations, "عرض عروض أسعار المورد");
});

test("Supplier record return paths remain constrained", () => {
  const navigation = read(RETURN_TO_HELPER);

  assert.match(navigation, /allowedSupplierRecordPath/);
  assert.equal(navigation.includes("[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"), true);
  assert.match(navigation, /allowedModulePath \|\| allowedSupplierRecordPath/);
  assert.match(navigation, /allowedServiceRecordPath/);
  assert.match(navigation, /allowedServiceProcurementPath/);
  assert.match(navigation, /allowedSupplierQuotationHistoryPath/);
});

test("New Supplier Quotation localized file picker and date input contracts", () => {
  const form = read(FORM_COMPONENT);
  const page = read(NEW_PAGE);
  const dictEn = getSuppliersDictionary("en").quotationHistory;
  const dictAr = getSuppliersDictionary("ar").quotationHistory;

  // New page passes session locale to form
  assert.match(page, /<SupplierQuotationForm[\s\S]*locale=\{locale\}/);

  // Bilingual file picker dictionary keys
  assert.equal(dictEn.chooseFiles, "Choose files");
  assert.equal(dictAr.chooseFiles, "اختيار الملفات");
  assert.equal(dictEn.noFilesSelected, "No files selected");
  assert.equal(dictAr.noFilesSelected, "لم يتم اختيار ملفات");

  // Underlying file input preserves type, multiple, accept, and accessible wrapping
  assert.match(form, /type="file" multiple/);
  assert.match(form, /id="quotation-files-input"/);
  assert.match(form, /htmlFor="quotation-files-input"/);
  assert.match(form, /accept="application\/pdf,image\/jpeg,image\/png,\.pdf,\.jpg,\.jpeg,\.png"/);
  assert.match(form, /name="files"/);
  assert.match(form, /dictionary\.chooseFiles/);
  assert.match(form, /dictionary\.noFilesSelected/);

  // Selected filenames rendered authentically without alteration/translation
  assert.match(form, /selectedFiles\.map\(\(file\) => file\.name\)\.join\(/);

  // Date input uses canonical date format YYYY-MM-DD and accessible calendar trigger
  assert.equal(dictEn.quotationDatePlaceholder, "YYYY-MM-DD");
  assert.equal(dictAr.quotationDatePlaceholder, "YYYY-MM-DD");
  assert.equal(dictEn.openCalendar, "Open calendar");
  assert.equal(dictAr.openCalendar, "فتح التقويم");

  // Date input avoids native mm/dd/yyyy exposure
  assert.doesNotMatch(form, /mm\/dd\/yyyy/i);
  assert.match(form, /pattern="\\d\{4\}-\\d\{2\}-\\d\{2\}"/);
  assert.match(form, /inputMode="numeric"/);
  assert.match(form, /placeholder=\{dictionary\.quotationDatePlaceholder\}/);
  assert.match(form, /type="date"/);
  assert.match(form, /showPicker/);
  // Collision guard: date input container has explicit dir="ltr" to prevent RTL icon collision
  assert.match(form, /className="relative mt-1"\s+dir="ltr"/);
  assert.match(form, /htmlFor="quotation-date-input"/);
  assert.match(form, /id="quotation-date-input"/);
});

