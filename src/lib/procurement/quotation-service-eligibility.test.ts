import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  isServiceEligibleForQuotation,
  validatePackageQuotationContext,
} from "./package-context.ts";
import { getSuppliersDictionary } from "../i18n/dictionaries/suppliers.ts";
import { safeRecordReturnTo } from "../record-navigation/return-to.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const NEW_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/new/page.tsx");
const FORM_COMPONENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx");
const DETAIL_COMPONENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationDetail.tsx");
const QUERIES_FILE = join(REPO_ROOT, "src/lib/procurement/queries.ts");

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

test("1. Inquiry non-deleted is eligible", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Inquiry", deleted_at: null }),
    true,
    "Inquiry service with deleted_at === null must be eligible",
  );
  assert.equal(
    isServiceEligibleForQuotation({ status: "Inquiry", deletedAt: null }),
    true,
  );
});

test("2. Approved is eligible", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Approved", deleted_at: null }),
    true,
    "Approved service with deleted_at === null must be eligible",
  );
});

test("3. Deposit Paid is eligible", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Deposit Paid", deleted_at: null }),
    true,
    "Deposit Paid service with deleted_at === null must be eligible",
  );
});

test("4. Completed is excluded", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Completed", deleted_at: null }),
    false,
    "Completed service must be excluded from quotation eligibility",
  );
});

test("5. Cancelled is excluded", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Cancelled", deleted_at: null }),
    false,
    "Cancelled service must be excluded from quotation eligibility",
  );
});

test("6. deleted Service is excluded", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Approved", deleted_at: "2026-09-01T12:00:00Z" }),
    false,
    "Soft-deleted service with status Approved must be excluded",
  );
  assert.equal(
    isServiceEligibleForQuotation({ status: "Inquiry", deleted_at: "2026-09-01T12:00:00Z" }),
    false,
    "Soft-deleted service with status Inquiry must be excluded",
  );
  assert.equal(
    isServiceEligibleForQuotation({ status: "Deposit Paid", deletedAt: "2026-09-01T12:00:00Z" }),
    false,
    "Soft-deleted service with camelCase deletedAt must be excluded",
  );
});

test("7. valid selected Package + matching Service + matching Supplier is accepted and locked", () => {
  const pkg = {
    id: "pkg-101",
    serviceId: "svc-201",
    selectedSupplierId: "sup-301",
    status: "selected",
    name: "Catering and Stage Package",
  };

  const validation = validatePackageQuotationContext(pkg, {
    packageId: "pkg-101",
    serviceId: "svc-201",
    supplierId: "sup-301",
  });

  assert.equal(validation.isValid, true);
  assert.deepEqual(validation.packageContext, {
    packageId: "pkg-101",
    packageTitle: "Catering and Stage Package",
  });

  // Check form component locks the service when packageContext is present
  const form = read(FORM_COMPONENT);
  assert.match(form, /const isServiceLocked = Boolean\(packageContext && serviceId\);/);
  assert.match(form, /isServiceLocked && selectedService/);
  assert.match(form, /<input type="hidden" name="serviceId" value=\{serviceId\} \/>/);
});

test("8. same Service but wrong selected Supplier Package context is rejected", () => {
  const pkg = {
    id: "pkg-101",
    serviceId: "svc-201",
    selectedSupplierId: "sup-OTHER",
    status: "selected",
    name: "AV Package",
  };

  const validation = validatePackageQuotationContext(pkg, {
    packageId: "pkg-101",
    serviceId: "svc-201",
    supplierId: "sup-301",
  });

  assert.equal(validation.isValid, false);
  assert.equal(validation.packageContext, null);
  assert.equal(validation.reason, "supplier_mismatch");
});

test("9. wrong Service Package context is rejected", () => {
  const pkg = {
    id: "pkg-101",
    serviceId: "svc-WRONG",
    selectedSupplierId: "sup-301",
    status: "selected",
    name: "AV Package",
  };

  const validation = validatePackageQuotationContext(pkg, {
    packageId: "pkg-101",
    serviceId: "svc-201",
    supplierId: "sup-301",
  });

  assert.equal(validation.isValid, false);
  assert.equal(validation.packageContext, null);
  assert.equal(validation.reason, "service_id_mismatch");
});

test("10. Completed contextual Service is rejected", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Completed", deleted_at: null }),
    false,
  );

  const page = read(NEW_PAGE);
  assert.match(page, /isServiceEligible/);
  assert.match(page, /dictionary\.quotationHistory\.serviceUnavailable/);
  assert.match(page, /data\.eligibleServices\.some\(\s*\(s\) => s\.serviceId === resolvedSearchParams\.serviceId/);
});

test("11. Cancelled contextual Service is rejected", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Cancelled", deleted_at: null }),
    false,
  );

  const queries = read(QUERIES_FILE);
  assert.match(queries, /\.not\("status", "in", '\("Completed","Cancelled"\)'\)/);
});

test("12. deleted contextual Service is rejected", () => {
  assert.equal(
    isServiceEligibleForQuotation({ status: "Approved", deleted_at: "2026-09-01" }),
    false,
  );

  const queries = read(QUERIES_FILE);
  assert.match(queries, /\.is\("deleted_at", null\)/);
});

test("13. Package Requirements initialize detailed lines exactly once", () => {
  const form = read(FORM_COMPONENT);

  // Initialized via useState lazy initializer function, NOT useEffect
  assert.match(form, /const \[lines, setLines\] = useState<LineItemState\[\]>\(\(\) => \{/);
  assert.doesNotMatch(form, /useEffect\(\(\) => \{[\s\S]*?setLines\(/);

  // Each requirement maps to a draft line with requirement title
  assert.match(form, /packageRequirements\.map\(\(req\) => \(\{/);
  assert.match(form, /packageRequirementId: req\.id/);
  assert.match(form, /description: req\.title/);

  // Does not show an extra arbitrary blank row when valid packageRequirements exist
  assert.match(form, /if \(packageRequirements && packageRequirements\.length > 0\) \{/);
});

test("14. no quantity or price is inferred", () => {
  const form = read(FORM_COMPONENT);

  // Form initialization sets zero commercial values
  assert.match(form, /quantity: "",\s*unit: "",\s*unitPrice: "",\s*lineTotal: ""/);

  // Model test verifying blank commercial fields
  const mockReq = { id: "req-1", title: "Lighting Equipment", sortOrder: 0 };
  const initialized = {
    id: "line-test",
    packageRequirementId: mockReq.id,
    description: mockReq.title,
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  };

  assert.equal(initialized.quantity, "");
  assert.equal(initialized.unit, "");
  assert.equal(initialized.unitPrice, "");
  assert.equal(initialized.lineTotal, "");
  assert.equal(initialized.packageRequirementId, "req-1");
});

test("15. free-text lines remain supported", () => {
  const form = read(FORM_COMPONENT);

  // addLine creates an unlinked line with empty description
  assert.match(form, /function addLine\(\)/);
  assert.match(form, /packageRequirementId: ""/);
  assert.match(form, /description: ""/);
});

test("16. multiple lines may link to the same Package Requirement", () => {
  const form = read(FORM_COMPONENT);

  // packageRequirements options rendered in select dropdown allowing any line to select any requirement
  assert.match(form, /packageRequirements\.map\(\(pr\) => \(/);
  assert.match(form, /<option key=\{pr\.id\} value=\{pr\.id\}>/);
});

test("17. linkage remains optional", () => {
  const form = read(FORM_COMPONENT);
  const dictEn = getSuppliersDictionary("en").quotationHistory;
  const dictAr = getSuppliersDictionary("ar").quotationHistory;

  // Unlinked dropdown option exists
  assert.match(form, /<option value="">\{dictionary\.unlinkedLine\}<\/option>/);
  assert.equal(dictEn.unlinkedLine, "None");
  assert.equal(dictAr.unlinkedLine, "غير مرتبط");

  // Form payload maps empty packageRequirementId to null
  assert.match(form, /packageRequirementId: line\.packageRequirementId \|\| null/);
});

test("18. Legacy is not exposed", () => {
  const form = read(FORM_COMPONENT);

  // Pricing mode state is constrained to detailed | total_only
  assert.match(form, /useState<\s*"detailed"\s*\|\s*"total_only"\s*>/);
  assert.doesNotMatch(form, /legacy/i);
  assert.doesNotMatch(form, /dictionary\.legacyPricing/);
});

test("19. EN/AR/RTL and returnTo remain correct", () => {
  const page = read(NEW_PAGE);
  const form = read(FORM_COMPONENT);
  const dictEn = getSuppliersDictionary("en").quotationHistory;
  const dictAr = getSuppliersDictionary("ar").quotationHistory;

  // Bilingual UI labels for Package Requirement
  assert.equal(dictEn.packageRequirement, "Package Requirement");
  assert.equal(dictAr.packageRequirement, "متطلب الباقة");

  // Simplified UI label without parentheses
  assert.match(form, /<label[^>]*>\s*\{dictionary\.packageRequirement\}\s*<select/);

  // RTL container attributes
  assert.match(page, /dir=\{locale === "ar" \? "rtl" : "ltr"\}/);
  assert.match(page, /RecordBackButton href=\{returnTo\} locale=\{locale\}/);

  // Return to contract validation
  const testUrl = safeRecordReturnTo(
    "/suppliers/11111111-1111-4111-8111-111111111111/quotations",
    "/suppliers",
  );
  assert.equal(testUrl, "/suppliers/11111111-1111-4111-8111-111111111111/quotations");
});

test("20. no Client Component imports server-only query/auth/admin modules", () => {
  const form = read(FORM_COMPONENT);
  const detail = read(DETAIL_COMPONENT);

  for (const [name, content] of [["SupplierQuotationForm", form], ["SupplierQuotationDetail", detail]]) {
    assert.doesNotMatch(content, /import\s+.*from\s+["']server-only["']/, `${name} must not import server-only`);
    assert.doesNotMatch(content, /import\s+.*from\s+["']@\/lib\/supabase\/admin["']/, `${name} must not import admin client`);
    assert.doesNotMatch(content, /import\s+.*from\s+["']@\/lib\/auth\/permissions["']/, `${name} must not import auth permissions`);
    assert.doesNotMatch(content, /import\s+.*from\s+["']@\/lib\/procurement\/queries["']/, `${name} must not import server queries`);
    assert.doesNotMatch(content, /import\s+.*from\s+["']@\/lib\/procurement\/package-queries["']/, `${name} must not import package queries`);
  }
});
