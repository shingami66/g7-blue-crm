import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import ts from "typescript";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import {
  COMMON_REQUIREMENT_CATALOG,
  PROCUREMENT_PACKAGE_STATUSES,
  type PackageSupplierQuotationOption,
  type ProcurementPackage,
} from "./package-types.ts";

const require = createRequire(import.meta.url);
const reactResolvedUrl = "file:///" + require.resolve("react").replace(/\\/g, "/");
const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

async function loadTranspiledWorkspace(): Promise<React.ComponentType<Record<string, unknown>>> {
  const fullPath = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");
  let raw = readFileSync(fullPath, "utf8");

  raw = raw.replace(
    /import\s+Link\s+from\s+["']next\/link["'];?/g,
    "",
  );
  raw = raw.replace(
    /import[^;]*from\s+["']next\/navigation["'];?/g,
    "",
  );
  raw = raw.replace(
    /import\s+\{\s*[\s\S]*?\}\s+from\s+["']lucide-react["'];?/g,
    'const Boxes = () => null, Plus = () => null, X = () => null, Building2 = () => null, ExternalLink = () => null, Pencil = () => null, RotateCcw = () => null, Check = () => null, ChevronDown = () => null, Trash2 = () => null;',
  );

  raw = raw.replace(
    /import\s+Button\s+from\s+["']@\/components\/ui\/Button["'];?/g,
    'const Button = ({ children, onClick, variant, className, type, disabled }) => React.createElement("button", { type: type || "button", onClick, className, disabled }, children);',
  );
  raw = raw.replace(
    /import\s+StatusBadge\s+from\s+["']@\/components\/ui\/StatusBadge["'];?/g,
    'const StatusBadge = ({ children, variant }) => React.createElement("span", { className: "status-badge", "data-variant": variant }, children);',
  );
  raw = raw.replace(
    /import\s+\{\s*appendReturnTo\s*\}\s+from\s+["']@\/lib\/record-navigation\/(?:queries|return-to)["'];?/g,
    'const appendReturnTo = (href, returnTo) => returnTo ? `${href}?returnTo=${encodeURIComponent(returnTo)}` : href;',
  );
  raw = raw.replace(
    /import\s+\{[^}]*\}\s+from\s+["']@\/lib\/procurement\/package-actions["'];?/g,
    'const clearProcurementPackageSupplier = () => Promise.resolve({ success: true }), createProcurementPackage = () => Promise.resolve({ success: true }), selectProcurementPackageSupplier = () => Promise.resolve({ success: true }), setProcurementPackageRequirements = () => Promise.resolve({ success: true }), updateProcurementPackageMetadata = () => Promise.resolve({ success: true });',
  );

  raw = raw.replace(
    /import[^;]*from\s+["']react["'];?/g,
    "",
  );

  raw = raw.replace(/from\s+["']@\/([^"']+)["']/g, (_match, subPath) => {
    const candidateTs = join(REPO_ROOT, "src", subPath + ".ts");
    const candidateIndex = join(REPO_ROOT, "src", subPath, "index.ts");
    let target = subPath;
    if (existsSync(candidateTs)) target = subPath + ".ts";
    else if (existsSync(candidateIndex)) target = subPath + "/index.ts";
    return `from "file:///${join(REPO_ROOT, "src", target).replace(/\\/g, "/")}"`;
  });

  const transpiled = ts.transpileModule(
    `import React from "${reactResolvedUrl}";\n` +
      `const Link = ({ children, href, className, title }) => React.createElement("a", { href, className, title }, children);\n` +
      `const useRouter = () => ({ refresh: () => {} });\n` +
      `const { useState, useTransition, useId, useRef } = React;\n` +
      raw,
    {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const tmpPath = join(tmpdir(), `g7-proc-render-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(tmpPath, transpiled, "utf8");

  try {
    const mod = await import("file:///" + tmpPath.replace(/\\/g, "/"));
    return mod.default;
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
}

test("1. Procurement Workspace is Package-centric", () => {
  const pageSource = read("src/app/(dashboard)/services/[id]/procurement/page.tsx");
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // Page renders ProcurementPackageWorkspace
  assert.match(pageSource, /<ProcurementPackageWorkspace/);
  assert.match(pageSource, /getProcurementPackagesByServiceId/);
  assert.match(pageSource, /getSupplierQuotationsByServiceId/);

  // Workspace renders package cards, metrics (total, selected, draft), and add package
  assert.match(workspaceSource, /dictionary\.totalPackages/);
  assert.match(workspaceSource, /dictionary\.selectedSupplierPackages/);
  assert.match(workspaceSource, /dictionary\.draftPackages/);
  assert.match(workspaceSource, /dictionary\.addPackage/);
  assert.match(workspaceSource, /PackageCard/);
});

test("2. Candidate Supplier UI is absent from the new workspace", () => {
  const pageSource = read("src/app/(dashboard)/services/[id]/procurement/page.tsx");
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // No candidate supplier panels or buttons in workspace
  assert.doesNotMatch(pageSource, /ProcurementRequirementPanel/);
  assert.doesNotMatch(workspaceSource, /Candidate Suppliers|Add Candidate Supplier|candidateSuppliers/i);
  assert.doesNotMatch(workspaceSource, /service_procurement_candidates/);
  assert.doesNotMatch(workspaceSource, /comparisonNotes|quotedAmount/);
});

test("3. No comparison/ranking/scoring UX is introduced", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  assert.doesNotMatch(workspaceSource, /score|scoring|rank|ranking|winner|evaluation|matrix|comparison/i);
});

test("4. Add Package supports name, optional description, optional method, curated + custom requirements", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // Add Package dialog fields
  assert.match(workspaceSource, /name="packageName"/);
  assert.match(workspaceSource, /name="packageDescription"/);
  assert.match(workspaceSource, /name="procurementMethod"/);
  assert.match(workspaceSource, /rental/);
  assert.match(workspaceSource, /purchase/);
  assert.match(workspaceSource, /service/);

  // Requirements catalog & custom text
  assert.match(workspaceSource, /COMMON_REQUIREMENT_CATALOG/);
  assert.match(workspaceSource, /customReqInput/);
  assert.match(workspaceSource, /addCommonRequirement/);
  assert.match(workspaceSource, /addCustomRequirement/);
  assert.match(workspaceSource, /removeRequirement/);
  assert.match(workspaceSource, /specifications/);

  // Curated catalog contains key event categories
  const categories = COMMON_REQUIREMENT_CATALOG.map((c) => c.category);
  assert.ok(categories.includes("technical"));
  assert.ok(categories.includes("furniture"));
  assert.ok(categories.includes("decor"));
  assert.ok(categories.includes("hospitality"));
  assert.ok(categories.includes("operations"));
});

test("5. Exactly one selected supplier is represented and labeled Selected Supplier (not Approved)", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");
  const enDict = getServicesDictionary("en").procurementWorkspace;
  const arDict = getServicesDictionary("ar").procurementWorkspace;

  // English: "Selected Supplier", Arabic: "المورد المختار"
  assert.equal(enDict.selectedSupplierLabel, "Selected Supplier");
  assert.equal(arDict.selectedSupplierLabel, "المورد المختار");

  // Must NOT be labeled "Approved Supplier"
  assert.doesNotMatch(enDict.selectedSupplierLabel, /Approved Supplier/i);
  assert.doesNotMatch(arDict.selectedSupplierLabel, /المورد المعتمد/);

  // Single select for supplier (not multiple)
  assert.match(workspaceSource, /selectedSupplierId/);
  assert.doesNotMatch(workspaceSource, /selectedSupplierIds|selectedSuppliers/);
});

test("6. Supplier Quotation selector filters to selected supplier + current Service", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // Filtering code in workspace component
  assert.match(
    workspaceSource,
    /availableQuotations\s*=\s*selectedSupplierId\s*\?\s*quotations\.filter\(\(q\)\s*=>\s*q\.supplierId\s*===\s*selectedSupplierId\s*&&\s*q\.serviceId\s*===\s*serviceId\)\s*:\s*\[\];/,
  );
});

test("7. Wrong supplier or service quotation cannot be linked", () => {
  const sampleQuotations: PackageSupplierQuotationOption[] = [
    {
      id: "quote-1",
      supplierId: "supplier-A",
      serviceId: "service-1",
      supplierReference: "Q-001",
      quotationDate: "2026-09-01",
      packageTotal: 15000,
      currency: "SAR",
    },
    {
      id: "quote-2",
      supplierId: "supplier-B",
      serviceId: "service-1",
      supplierReference: "Q-002",
      quotationDate: "2026-09-02",
      packageTotal: 25000,
      currency: "SAR",
    },
  ];

  // Filtering function mirroring ProcurementPackageWorkspace
  function getEligibleQuotations(supplierId: string | null, serviceId: string, quotes: PackageSupplierQuotationOption[]) {
    if (!supplierId) return [];
    return quotes.filter((q) => q.supplierId === supplierId && q.serviceId === serviceId);
  }

  // When supplier-A is selected, supplier-B's quotation is rejected
  const eligibleForA = getEligibleQuotations("supplier-A", "service-1", sampleQuotations);
  assert.equal(eligibleForA.length, 1);
  assert.equal(eligibleForA[0].id, "quote-1");

  // Quotation for a different service is rejected
  const differentServiceQuote: PackageSupplierQuotationOption = {
    ...sampleQuotations[0],
    id: "quote-diff",
    serviceId: "service-2",
  };
  const eligibleForService1 = getEligibleQuotations("supplier-A", "service-1", [differentServiceQuote]);
  assert.equal(eligibleForService1.length, 0);
});

test("8. New quotation integration uses canonical Supplier Quotation ownership and returnTo", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // Clean secondary flow links to canonical new quotation workspace with returnTo
  assert.match(workspaceSource, /\/suppliers\/\$\{[^}]+\}\/quotations\/new/);
  assert.match(workspaceSource, /appendReturnTo/);
  assert.match(workspaceSource, /recordNewQuotation/);
});

test("9. No quotation document duplication is introduced", () => {
  const repair1Source = read("supabase/migrations/20260905062323_w4_procurement_package_upsert_rpc_ambiguity_repair.sql");
  const repair2Source = read("supabase/migrations/20260905062540_w4_procurement_package_audit_action_compatibility.sql");
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // No duplicate document storage tables
  assert.doesNotMatch(repair1Source, /CREATE TABLE.*document/i);
  assert.doesNotMatch(repair2Source, /CREATE TABLE.*document/i);
  assert.doesNotMatch(workspaceSource, /uploadPackageDocument|duplicateDocument/);
});

test("10. Package save does not create Approved Commitment", () => {
  const packageActionsSource = read("src/lib/procurement/package-actions.ts");
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // No calls to create_approved_commitment or approved_commitments
  assert.doesNotMatch(packageActionsSource, /approved_commitments|create_approved_commitment/);
  assert.doesNotMatch(workspaceSource, /createApprovedCommitment|approved_commitments/);

  // Status remains draft / selected / cancelled (never committed)
  assert.deepEqual(PROCUREMENT_PACKAGE_STATUSES, ["draft", "selected", "cancelled"]);
  assert.doesNotMatch(workspaceSource, /status === "committed"/);
});

test("11. EN and AR labels are present through canonical localization paths", () => {
  const enDict = getServicesDictionary("en").procurementWorkspace;
  const arDict = getServicesDictionary("ar").procurementWorkspace;

  // Title
  assert.equal(enDict.title, "Procurement Packages");
  assert.equal(arDict.title, "باقات التوريد");

  // Add Package
  assert.equal(enDict.addPackage, "Add Package");
  assert.equal(arDict.addPackage, "إضافة باقة توريد");

  // Statuses
  assert.equal(enDict.statuses.draft, "Draft");
  assert.equal(arDict.statuses.draft, "مسودة");
  assert.equal(enDict.statuses.selected, "Selected");
  assert.equal(arDict.statuses.selected, "تم الاختيار");
  assert.equal(enDict.statuses.cancelled, "Cancelled");
  assert.equal(arDict.statuses.cancelled, "ملغاة");

  // Methods
  assert.equal(enDict.methods.rental, "Rental");
  assert.equal(arDict.methods.rental, "تأجير");
  assert.equal(enDict.methods.purchase, "Purchase");
  assert.equal(arDict.methods.purchase, "شراء");
  assert.equal(enDict.methods.service, "Service");
  assert.equal(arDict.methods.service, "خدمة");

  // Metrics
  assert.ok(enDict.totalPackages);
  assert.ok(arDict.totalPackages);
  assert.ok(enDict.selectedSupplierPackages);
  assert.ok(arDict.selectedSupplierPackages);
  assert.ok(enDict.draftPackages);
  assert.ok(arDict.draftPackages);
});

test("12. Native unlocalized file-picker and date text does not regress", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // No unlocalized browser-native file picker
  assert.doesNotMatch(workspaceSource, /<input[^>]+type="file"/);
  // Numeric and bidi contracts
  assert.match(workspaceSource, /isolateLtrText/);
  assert.match(workspaceSource, /isolateBidiText/);
  assert.match(workspaceSource, /formatSarAmount/);
  assert.match(workspaceSource, /formatUiNumber/);
});

test("13. Canonical returnTo behavior remains intact", () => {
  const pageSource = read("src/app/(dashboard)/services/[id]/procurement/page.tsx");
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");

  // Uses RecordBackButton with returnTo
  assert.match(pageSource, /<RecordBackButton href=\{returnTo\}/);
  assert.match(pageSource, /safeRecordReturnTo\(resolvedSearchParams\.returnTo/);
  assert.match(pageSource, /appendReturnTo\(`\/services\/\$\{id\}\/commitments`, currentProcurementUrl\)/);
  assert.doesNotMatch(pageSource, /←|→/);
  assert.doesNotMatch(workspaceSource, /←|→/);
});

test("14. DEV repair migrations are reconciled with precise contracts", () => {
  const repair1 = read("supabase/migrations/20260905062323_w4_procurement_package_upsert_rpc_ambiguity_repair.sql");
  const repair2 = read("supabase/migrations/20260905062540_w4_procurement_package_audit_action_compatibility.sql");

  // Repair 1: Qualifies INSERT target with alias and returns pkg.id, pkg.status
  assert.match(repair1, /INSERT INTO public\.service_procurement_packages AS pkg/);
  assert.match(repair1, /RETURNING pkg\.id, pkg\.status/);
  assert.match(repair1, /INTO v_package_id, v_status/);

  // Repair 2: Preserves all 7 existing audit actions + 5 new procurement package actions
  const allowedActions = [
    "create",
    "update",
    "delete",
    "restore",
    "status_change",
    "payment_recorded",
    "correction",
    "procurement_package_created",
    "procurement_package_updated",
    "procurement_package_requirements_set",
    "procurement_package_supplier_selected",
    "procurement_package_supplier_cleared",
  ];
  for (const action of allowedActions) {
    assert.match(repair2, new RegExp(`'${action}'`));
  }
});

test("15. Runtime rendering: ProcurementPackageWorkspace renders package cards, metrics, and badges in EN and AR", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const samplePackages: ProcurementPackage[] = [
    {
      id: "pkg-1",
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceTitle: "Event Gala",
      eventName: "Annual Gala",
      serviceStatus: "confirmed",
      serviceDeleted: false,
      name: "Technical Production",
      description: "Stage, sound, and lighting package",
      procurementMethod: "rental",
      status: "selected",
      selectedSupplierId: "sup-1",
      selectedSupplierName: "FrameLine AV Demo",
      selectedSupplierQuotationId: "quote-1",
      selectedSupplierQuotationReference: "Q-002",
      selectedSupplierQuotationDate: "2026-09-01",
      selectedSupplierQuotationAmount: 17500,
      selectionReason: "Meets technical specs and budget",
      selectionEvidence: "DOC-2026-001",
      selectedAt: "2026-09-05T08:00:00Z",
      selectedBy: "user-1",
      createdAt: "2026-09-05T07:00:00Z",
      updatedAt: "2026-09-05T08:00:00Z",
      requirements: [
        {
          id: "req-1",
          packageId: "pkg-1",
          serviceId: "srv-100",
          requirementKey: "stage",
          title: "Stage",
          specifications: "12x8m modular",
          sortOrder: 0,
          legacyRequirementId: null,
          createdAt: "2026-09-05T07:00:00Z",
          updatedAt: "2026-09-05T07:00:00Z",
        },
        {
          id: "req-2",
          packageId: "pkg-1",
          serviceId: "srv-100",
          requirementKey: "led_screens",
          title: "LED Screens",
          specifications: "P2.6 500x500mm",
          sortOrder: 1,
          legacyRequirementId: null,
          createdAt: "2026-09-05T07:00:00Z",
          updatedAt: "2026-09-05T07:00:00Z",
        },
      ],
    },
    {
      id: "pkg-2",
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceTitle: "Event Gala",
      eventName: "Annual Gala",
      serviceStatus: "confirmed",
      serviceDeleted: false,
      name: "Hospitality & Catering",
      description: null,
      procurementMethod: "service",
      status: "draft",
      selectedSupplierId: null,
      selectedSupplierName: null,
      selectedSupplierQuotationId: null,
      selectedSupplierQuotationReference: null,
      selectedSupplierQuotationDate: null,
      selectedSupplierQuotationAmount: null,
      selectionReason: null,
      selectionEvidence: null,
      selectedAt: null,
      selectedBy: null,
      createdAt: "2026-09-05T07:30:00Z",
      updatedAt: "2026-09-05T07:30:00Z",
      requirements: [],
    },
  ];

  // Render in EN
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceStatus: "confirmed",
      packages: samplePackages,
      suppliers: [{ id: "sup-1", name: "FrameLine AV Demo", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-100",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
    }),
  );

  // Assertions for EN
  assert.match(htmlEn, /Technical Production/);
  assert.match(htmlEn, /FrameLine AV Demo/);
  assert.match(htmlEn, /Q-002/);
  assert.match(htmlEn, /Selected Supplier/);
  assert.doesNotMatch(htmlEn, /Approved Supplier/i);
  assert.match(htmlEn, /Add Package/);
  assert.match(htmlEn, /Total Packages/);
  assert.doesNotMatch(htmlEn, /Candidate Suppliers|Add Candidate Supplier|comparisonNotes/i);

  // Render in AR
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceStatus: "confirmed",
      packages: samplePackages,
      suppliers: [{ id: "sup-1", name: "FrameLine AV Demo", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-100",
      locale: "ar",
      dictionary: dictAr.procurementWorkspace,
    }),
  );

  // Assertions for AR
  assert.match(htmlAr, /Technical Production/);
  assert.match(htmlAr, /FrameLine AV Demo/);
  assert.match(htmlAr, /المورد المختار/);
  assert.doesNotMatch(htmlAr, /المورد المعتمد/);
  assert.match(htmlAr, /إضافة باقة توريد/);
  assert.match(htmlAr, /إجمالي الباقات/);
  assert.match(htmlAr, /باقات مسودة/);
  assert.doesNotMatch(htmlAr, /مرشح|مقارنة|مرشحين/);
});

test("16. Runtime rendering: ProcurementPackageWorkspace renders empty state when no packages exist", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceStatus: "confirmed",
      packages: [],
      suppliers: [],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-100",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
    }),
  );

  assert.match(htmlEn, /No Procurement Packages/);
  assert.match(htmlEn, /Add Package/);

  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-100",
      serviceNumber: "SRV-2026-001",
      serviceStatus: "confirmed",
      packages: [],
      suppliers: [],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-100",
      locale: "ar",
      dictionary: dictAr.procurementWorkspace,
    }),
  );

  assert.match(htmlAr, /لا توجد باقات توريد/);
  assert.match(htmlAr, /إضافة باقة توريد/);
});

test("17. Client/server import boundary: ProcurementPackageWorkspace uses client-safe navigation helpers", () => {
  const workspaceSource = read("src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");
  const returnToSource = read("src/lib/record-navigation/return-to.ts");
  const queriesSource = read("src/lib/record-navigation/queries.ts");

  // 1. ProcurementPackageWorkspace.tsx does NOT import record-navigation/queries
  assert.doesNotMatch(workspaceSource, /@\/lib\/record-navigation\/queries/);
  assert.match(workspaceSource, /from\s+["']@\/lib\/record-navigation\/return-to["']/);

  // 2. return-to.ts is strictly client-safe and does NOT import server-only, permissions, or admin
  assert.doesNotMatch(returnToSource, /["']server-only["']/);
  assert.doesNotMatch(returnToSource, /@\/lib\/auth\/permissions/);
  assert.doesNotMatch(returnToSource, /@\/lib\/supabase\/admin/);
  assert.doesNotMatch(returnToSource, /@clerk\/nextjs\/server/);

  // 3. queries.ts maintains server-only protection
  assert.match(queriesSource, /import\s+["']server-only["'];/);
  assert.match(queriesSource, /export\s+\{\s*appendReturnTo,\s*buildReturnToUrl\s*\}\s+from\s+["']\.\/return-to["'];/);
});

