import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test, { mock } from "node:test";

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return { url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("server-only", { namedExports: {} });
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async () => undefined,
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({}),
  },
});

const { safeRecordReturnTo, appendReturnTo, buildReturnToUrl } = await import("../record-navigation/queries.ts");
const { getCommonDictionary } = await import("../i18n/dictionaries/common.ts");

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

const SERVICE_ID = "88af0b24-65b9-4eba-882d-49cf67ade7fc";
const SUPPLIER_ID = "ecf1440f-4510-45f6-8c04-0d70079c51a9";
const QUOTATION_ID = "11111111-1111-1111-8111-111111111111";

test("1. safeRecordReturnTo accepts valid internal application paths", () => {
  assert.equal(safeRecordReturnTo("/services", "/fallback"), "/services");
  assert.equal(safeRecordReturnTo("/suppliers", "/fallback"), "/suppliers");
  assert.equal(safeRecordReturnTo(`/services/${SERVICE_ID}`, "/fallback"), `/services/${SERVICE_ID}`);
  assert.equal(safeRecordReturnTo(`/services/${SERVICE_ID}/procurement`, "/fallback"), `/services/${SERVICE_ID}/procurement`);
  assert.equal(safeRecordReturnTo(`/services/${SERVICE_ID}/commitments`, "/fallback"), `/services/${SERVICE_ID}/commitments`);
  assert.equal(safeRecordReturnTo(`/suppliers/${SUPPLIER_ID}`, "/fallback"), `/suppliers/${SUPPLIER_ID}`);
  assert.equal(safeRecordReturnTo(`/suppliers/${SUPPLIER_ID}/quotations`, "/fallback"), `/suppliers/${SUPPLIER_ID}/quotations`);
  assert.equal(safeRecordReturnTo(`/suppliers/${SUPPLIER_ID}/quotations/new`, "/fallback"), `/suppliers/${SUPPLIER_ID}/quotations/new`);
  assert.equal(safeRecordReturnTo(`/suppliers/${SUPPLIER_ID}/quotations/${QUOTATION_ID}`, "/fallback"), `/suppliers/${SUPPLIER_ID}/quotations/${QUOTATION_ID}`);
  assert.equal(safeRecordReturnTo(`/suppliers/${SUPPLIER_ID}?showDeleted=true`, "/fallback"), `/suppliers/${SUPPLIER_ID}?showDeleted=true`);
  assert.equal(safeRecordReturnTo(`/services/${SERVICE_ID}?returnTo=%2Fservices`, "/fallback"), `/services/${SERVICE_ID}?returnTo=%2Fservices`);
});

test("2. safeRecordReturnTo strictly rejects external, protocol-relative, and dangerous URLs", () => {
  const fallback = `/services/${SERVICE_ID}`;

  assert.equal(safeRecordReturnTo("https://external.example", fallback), fallback);
  assert.equal(safeRecordReturnTo("http://external.example", fallback), fallback);
  assert.equal(safeRecordReturnTo("//external.example", fallback), fallback);
  assert.equal(safeRecordReturnTo("//example.com/services", fallback), fallback);
  assert.equal(safeRecordReturnTo("javascript:alert(1)", fallback), fallback);
  assert.equal(safeRecordReturnTo("data:text/html,evil", fallback), fallback);
  assert.equal(safeRecordReturnTo("/unknown/route", fallback), fallback);
  assert.equal(safeRecordReturnTo("/services\r\n/evil", fallback), fallback);
  assert.equal(safeRecordReturnTo("/services\n/evil", fallback), fallback);
  assert.equal(safeRecordReturnTo(12345, fallback), fallback);
  assert.equal(safeRecordReturnTo(null, fallback), fallback);
  assert.equal(safeRecordReturnTo(undefined, fallback), fallback);
  assert.equal(safeRecordReturnTo("", fallback), fallback);
});

test("3. Semantic parent fallbacks when returnTo is absent or invalid", () => {
  // Service Detail -> /services
  assert.equal(safeRecordReturnTo(undefined, "/services"), "/services");
  // Service Procurement -> /services/{serviceId}
  assert.equal(safeRecordReturnTo(null, `/services/${SERVICE_ID}`), `/services/${SERVICE_ID}`);
  // Service Commitments -> /services/{serviceId}
  assert.equal(safeRecordReturnTo("https://malicious.site", `/services/${SERVICE_ID}`), `/services/${SERVICE_ID}`);
  // Supplier Quotation History -> /suppliers/{supplierId}
  assert.equal(safeRecordReturnTo("", `/suppliers/${SUPPLIER_ID}`), `/suppliers/${SUPPLIER_ID}`);
  // New Supplier Quotation -> /suppliers/{supplierId}/quotations
  assert.equal(safeRecordReturnTo("//open-redirect.com", `/suppliers/${SUPPLIER_ID}/quotations`), `/suppliers/${SUPPLIER_ID}/quotations`);
  // Supplier Quotation Detail -> /suppliers/{supplierId}/quotations
  assert.equal(safeRecordReturnTo(undefined, `/suppliers/${SUPPLIER_ID}/quotations`), `/suppliers/${SUPPLIER_ID}/quotations`);
});

test("4. Nested returnTo preservation with appendReturnTo and buildReturnToUrl", () => {
  const serviceUrlWithReturn = buildReturnToUrl(`/services/${SERVICE_ID}`, "/services");
  assert.equal(serviceUrlWithReturn, `/services/${SERVICE_ID}?returnTo=%2Fservices`);

  const procurementUrl = appendReturnTo(`/services/${SERVICE_ID}/procurement`, serviceUrlWithReturn);
  assert.equal(procurementUrl, `/services/${SERVICE_ID}/procurement?returnTo=%2Fservices%2F${SERVICE_ID}%3FreturnTo%3D%252Fservices`);

  const commitmentsUrl = appendReturnTo(`/services/${SERVICE_ID}/commitments`, procurementUrl);
  assert.equal(
    commitmentsUrl,
    `/services/${SERVICE_ID}/commitments?returnTo=%2Fservices%2F${SERVICE_ID}%2Fprocurement%3FreturnTo%3D%252Fservices%252F${SERVICE_ID}%253FreturnTo%253D%25252Fservices`
  );
});

test("5. URL encoding safety: nested query parameters are preserved without corruption or double-decoding", () => {
  const base = `/services/${SERVICE_ID}`;
  const firstHop = appendReturnTo(base, "/services");
  const secondHop = appendReturnTo(`/services/${SERVICE_ID}/procurement`, firstHop);

  // Parsing the searchParams must recover the exact inner returnTo string
  const url = new URL(secondHop, "https://local.g7");
  const parsedReturnTo = url.searchParams.get("returnTo");
  assert.equal(parsedReturnTo, `/services/${SERVICE_ID}?returnTo=%2Fservices`);

  // Safe validation on the recovered returnTo must accept it as valid internal service path
  assert.equal(safeRecordReturnTo(parsedReturnTo, "/fallback"), `/services/${SERVICE_ID}?returnTo=%2Fservices`);

  const innerUrl = new URL(parsedReturnTo!, "https://local.g7");
  assert.equal(innerUrl.searchParams.get("returnTo"), "/services");
});

test("6. Procurement -> Commitments contextual return propagation", () => {
  const procurementPage = read("src/app/(dashboard)/services/[id]/procurement/page.tsx");
  assert.match(procurementPage, /const currentProcurementUrl = resolvedSearchParams\.returnTo/);
  assert.match(procurementPage, /appendReturnTo\(`\/services\/\$\{id\}\/commitments`, currentProcurementUrl\)/);
  assert.match(procurementPage, /<RecordBackButton href=\{returnTo\} locale=\{locale\} \/>/);
});

test("7. Commitments -> Supplier Quotation Detail contextual return propagation", () => {
  const commitmentsWorkspace = read("src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx");
  assert.match(commitmentsWorkspace, /currentCommitmentsUrl = returnTo/);
  assert.match(commitmentsWorkspace, /appendReturnTo\(`\/suppliers\/\$\{commitment\.supplierId\}\/quotations\/\$\{commitment\.supplierQuotationId\}`, currentCommitmentsUrl\)/);
});

test("8. Supplier History -> New Quotation contextual return propagation", () => {
  const historyPage = read("src/app/(dashboard)/suppliers/[id]/quotations/page.tsx");
  assert.match(historyPage, /currentHistoryUrl = resolvedSearchParams\.returnTo/);
  assert.match(historyPage, /appendReturnTo\(`\/suppliers\/\$\{supplier\.id\}\/quotations\/new`, currentHistoryUrl\)/);
  assert.match(historyPage, /<SupplierQuotationHistory[\s\S]*?currentHistoryUrl=\{currentHistoryUrl\}/);
});

test("9. EN and AR Back control presentation contract", () => {
  const enCommon = getCommonDictionary("en");
  const arCommon = getCommonDictionary("ar");

  assert.equal(enCommon.actions.back, "Back");
  assert.equal(arCommon.actions.back, "رجوع");

  const recordBackButton = read("src/components/navigation/RecordBackButton.tsx");
  assert.match(recordBackButton, /getCommonDictionary\(locale\)/);
  assert.match(recordBackButton, /common\.actions\.back/);
  assert.match(recordBackButton, /<LocaleBackIcon size=\{16\} \/>/);
  assert.match(recordBackButton, /<PendingLink[\s\S]*?aria-label=\{label\}/);
  assert.match(recordBackButton, /h-8 w-8/);
});

test("10. No standardized raw Unicode back-arrows remain on W4 Back controls", () => {
  const filesToCheck = [
    "src/app/(dashboard)/services/[id]/page.tsx",
    "src/app/(dashboard)/services/[id]/procurement/page.tsx",
    "src/app/(dashboard)/services/[id]/commitments/page.tsx",
    "src/app/(dashboard)/suppliers/[id]/quotations/page.tsx",
    "src/app/(dashboard)/suppliers/[id]/quotations/new/page.tsx",
    "src/app/(dashboard)/suppliers/[id]/quotations/[quotationId]/page.tsx",
  ];

  for (const relPath of filesToCheck) {
    const content = read(relPath);
    // Standardized header Back control must use RecordBackButton
    assert.match(content, /<RecordBackButton[\s\S]*href=\{returnTo\}/, `${relPath} must use RecordBackButton`);
    // Must not contain raw Unicode back arrows for navigation
    assert.doesNotMatch(content, /"←"|"→"|'←'|'→'/, `${relPath} must not contain raw Unicode arrow strings`);
  }
});
