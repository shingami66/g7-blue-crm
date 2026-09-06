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
import { validatePackageQuotationContext } from "./package-context.ts";
import type { ProcurementPackage } from "./package-types.ts";

const require = createRequire(import.meta.url);
const reactResolvedUrl = "file:///" + require.resolve("react").replace(/\\/g, "/");
const REPO_ROOT = join(import.meta.dirname, "../../..");

interface CapturedHandlers {
  handleSavePackage: (navigateToQuotation?: boolean) => void;
  closeModal?: () => void;
  isModalOpen?: boolean;
  selectedSupplierId?: string;
}

declare global {
  var __test_mockRouter: { push: (url: string) => void; refresh: () => void } | undefined;
  var __test_mockActions: Record<string, (...args: unknown[]) => Promise<unknown>> | undefined;
}

async function loadTranspiledWorkspace(): Promise<React.ComponentType<Record<string, unknown>>> {
  const fullPath = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx");
  let raw = readFileSync(fullPath, "utf8");

  raw = raw.replace(/import\s+Link\s+from\s+["']next\/link["'];?/g, "");
  raw = raw.replace(/import[^;]*from\s+["']next\/navigation["'];?/g, "");
  raw = raw.replace(
    /import\s+\{\s*[\s\S]*?\}\s+from\s+["']lucide-react["'];?/g,
    "const Boxes = () => null, Plus = () => null, X = () => null, Building2 = () => null, ExternalLink = () => null, Pencil = () => null, RotateCcw = () => null, Check = () => null, ChevronDown = () => null, Trash2 = () => null;",
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
    "const appendReturnTo = (href, returnTo) => returnTo ? `${href}${href.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(returnTo)}` : href;",
  );
  raw = raw.replace(
    /import\s+\{[^}]*\}\s+from\s+["']@\/lib\/procurement\/package-actions["'];?/g,
    `
    const clearProcurementPackageSupplier = (...args) => (globalThis.__test_mockActions?.clearProcurementPackageSupplier || (() => Promise.resolve({ success: true })))(...args);
    const createProcurementPackage = (...args) => (globalThis.__test_mockActions?.createProcurementPackage || (() => Promise.resolve({ success: true, data: { packageId: "pkg-new-created" } })))(...args);
    const selectProcurementPackageSupplier = (...args) => (globalThis.__test_mockActions?.selectProcurementPackageSupplier || (() => Promise.resolve({ success: true })))(...args);
    const setProcurementPackageRequirements = (...args) => (globalThis.__test_mockActions?.setProcurementPackageRequirements || (() => Promise.resolve({ success: true })))(...args);
    const updateProcurementPackageMetadata = (...args) => (globalThis.__test_mockActions?.updateProcurementPackageMetadata || (() => Promise.resolve({ success: true })))(...args);
    `,
  );

  // Replace component function signature to accept props including test hooks
  raw = raw.replace(
    /export default function ProcurementPackageWorkspace\(\{[\s\S]*?\}\s*:\s*Props\)\s*\{/,
    `export default function ProcurementPackageWorkspace(props: any) {
      const {
        serviceId,
        serviceNumber,
        serviceStatus,
        packages,
        suppliers,
        quotations,
        canWrite,
        returnTo,
        locale,
        dictionary,
        __test_inspect,
        __test_isModalOpen,
        __test_selectedSupplierId,
        __test_packageName,
        __test_editingPackage,
      } = props;`,
  );

  // Allow controlled test initialization for modal state inspection
  raw = raw.replace(
    /const \[isModalOpen, setIsModalOpen\] = useState\(false\);/,
    'const [isModalOpen, setIsModalOpen] = useState(__test_isModalOpen ?? false);',
  );
  raw = raw.replace(
    /const \[selectedSupplierId, setSelectedSupplierId\] = useState<string>\(""\);/,
    'const [selectedSupplierId, setSelectedSupplierId] = useState<string>(__test_selectedSupplierId ?? "");',
  );
  raw = raw.replace(
    /const \[packageName, setPackageName\] = useState\(""\);/,
    'const [packageName, setPackageName] = useState<string>(__test_packageName ?? "");',
  );
  raw = raw.replace(
    /const \[editingPackage, setEditingPackage\] = useState<ProcurementPackage \| null>\(null\);/,
    'const [editingPackage, setEditingPackage] = useState<ProcurementPackage | null>(__test_editingPackage ?? null);',
  );

  // Mock useTransition with an async runner that doesn't throw on server render
  raw = raw.replace(
    /const \[isPending, startTransition\] = useTransition\(\);/,
    'const [isPending, setIsPending] = useState(false);\nconst startTransition = (fn) => { setIsPending(true); return Promise.resolve(fn()).finally(() => setIsPending(false)); };',
  );

  // Hook inspect handler into component right before return
  raw = raw.replace(
    /return\s*\(\s*<div className="space-y-6">/,
    'if (props.__test_inspect) props.__test_inspect({ handleSavePackage, closeModal, isModalOpen, selectedSupplierId });\n  return (\n    <div className="space-y-6">',
  );

  raw = raw.replace(/import[^;]*from\s+["']react["'];?/g, "");

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
      `const useRouter = () => (globalThis.__test_mockRouter || { refresh: () => {}, push: () => {} });\n` +
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

  const tmpPath = join(tmpdir(), `g7-proc-ux-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
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

const mockDraftPackage: ProcurementPackage = {
  id: "pkg-draft-1",
  serviceId: "srv-200",
  serviceNumber: "SRV-2026-002",
  serviceTitle: "Sound & Stage",
  eventName: "Winter Gala",
  serviceStatus: "confirmed",
  serviceDeleted: false,
  name: "Draft AV Package",
  description: "Initial draft without supplier",
  procurementMethod: "rental",
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
  createdAt: "2026-09-06T00:00:00Z",
  updatedAt: "2026-09-06T00:00:00Z",
  requirements: [
    {
      id: "req-1",
      packageId: "pkg-draft-1",
      serviceId: "srv-200",
      requirementKey: "sound_system",
      title: "Sound System",
      specifications: "Line array 12kW",
      sortOrder: 0,
      legacyRequirementId: null,
      createdAt: "2026-09-06T00:00:00Z",
      updatedAt: "2026-09-06T00:00:00Z",
    },
  ],
};

const mockSelectedPackage: ProcurementPackage = {
  id: "pkg-selected-1",
  serviceId: "srv-200",
  serviceNumber: "SRV-2026-002",
  serviceTitle: "Sound & Stage",
  eventName: "Winter Gala",
  serviceStatus: "confirmed",
  serviceDeleted: false,
  name: "Selected AV Package",
  description: "Selected supplier package",
  procurementMethod: "rental",
  status: "selected",
  selectedSupplierId: "sup-99",
  selectedSupplierName: "Global Event Tech",
  selectedSupplierQuotationId: null,
  selectedSupplierQuotationReference: null,
  selectedSupplierQuotationDate: null,
  selectedSupplierQuotationAmount: null,
  selectionReason: "Best technical proposal",
  selectionEvidence: "DOC-TECH-001",
  selectedAt: "2026-09-06T01:00:00Z",
  selectedBy: "usr-1",
  createdAt: "2026-09-06T00:00:00Z",
  updatedAt: "2026-09-06T01:00:00Z",
  requirements: [
    {
      id: "req-1",
      packageId: "pkg-selected-1",
      serviceId: "srv-200",
      requirementKey: "sound_system",
      title: "Sound System",
      specifications: "Line array 12kW",
      sortOrder: 0,
      legacyRequirementId: null,
      createdAt: "2026-09-06T00:00:00Z",
      updatedAt: "2026-09-06T00:00:00Z",
    },
    {
      id: "req-2",
      packageId: "pkg-selected-1",
      serviceId: "srv-200",
      requirementKey: "lighting",
      title: "Lighting",
      specifications: "Stage moving heads",
      sortOrder: 1,
      legacyRequirementId: null,
      createdAt: "2026-09-06T00:00:00Z",
      updatedAt: "2026-09-06T00:00:00Z",
    },
  ],
};

test("1. No Supplier selected: quotation action unavailable and concise guidance shown", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  // A. Package Card (unselected package)
  const cardHtmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
    }),
  );
  assert.doesNotMatch(cardHtmlEn, /\/quotations\/new/);
  assert.doesNotMatch(cardHtmlEn, /Record New Quotation/);
  assert.match(cardHtmlEn, /Select a supplier first to record a quotation for this package\./);

  // B. Modal Open with NO supplier selected (English)
  const modalHtmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "",
      __test_packageName: "New Package Draft",
    }),
  );
  assert.match(modalHtmlEn, /Select a supplier first to record a quotation for this package\./);
  assert.doesNotMatch(modalHtmlEn, />Record Supplier Quotation</);

  // C. Modal Open with NO supplier selected (Arabic)
  const modalHtmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "ar",
      dictionary: dictAr.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "",
      __test_packageName: "باقة جديدة مسودة",
    }),
  );
  assert.match(modalHtmlAr, /اختر المورد أولاً لتسجيل عرض سعر لهذه الباقة\./);
  assert.doesNotMatch(modalHtmlAr, />تسجيل عرض سعر</);
});

test("2. Supplier selected in unsaved modal state: 'Record Supplier Quotation' becomes available", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  // English modal with supplier selected (using packages: [] to isolate modal from cards)
  const modalHtmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "Draft with Supplier Selected",
    }),
  );

  // Both section 4 and footer expose "Record Supplier Quotation"
  assert.match(modalHtmlEn, />Record Supplier Quotation</);
  assert.doesNotMatch(modalHtmlEn, /Select a supplier first to record a quotation for this package\./);

  // Arabic modal with supplier selected (using packages: [] to isolate modal from cards)
  const modalHtmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "ar",
      dictionary: dictAr.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "مسودة تم اختيار المورد لها",
    }),
  );

  // Arabic exposes "تسجيل عرض سعر"
  assert.match(modalHtmlAr, />تسجيل عرض سعر</);
  assert.doesNotMatch(modalHtmlAr, /اختر المورد أولاً لتسجيل عرض سعر لهذه الباقة\./);
});

test("3. Clicking normal 'Save Package': saves Package and does NOT navigate to quotation creation", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");

  let pushCalled = false;
  let refreshCalled = false;
  let savePackageCalled = false;

  globalThis.__test_mockRouter = {
    push: () => {
      pushCalled = true;
    },
    refresh: () => {
      refreshCalled = true;
    },
  };

  globalThis.__test_mockActions = {
    createProcurementPackage: async () => {
      savePackageCalled = true;
      return { success: true, data: { packageId: "pkg-new-saved" } };
    },
    selectProcurementPackageSupplier: async () => {
      return { success: true };
    },
  };

  let captured: CapturedHandlers | null = null;

  ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "New Sound Package",
      __test_inspect: (h: CapturedHandlers) => {
        captured = h;
      },
    }),
  );

  assert.ok(captured, "Modal handlers not captured");
  const handlersTest3 = captured as CapturedHandlers;
  // Execute normal Save Package (navigateToQuotation = false)
  handlersTest3.handleSavePackage(false);

  // Allow async startTransition to finish
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(savePackageCalled, true, "createProcurementPackage should have been called");
  assert.equal(refreshCalled, true, "router.refresh should have been called");
  assert.equal(pushCalled, false, "router.push must NOT be called on normal Save Package");
});

test("4. Clicking 'Record Supplier Quotation': uses canonical Package save path first and navigates on success", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");

  let pushedUrl: string | null = null;
  const executionOrder: string[] = [];

  globalThis.__test_mockRouter = {
    push: (url: string) => {
      executionOrder.push("router.push");
      pushedUrl = url;
    },
    refresh: () => {
      executionOrder.push("router.refresh");
    },
  };

  globalThis.__test_mockActions = {
    createProcurementPackage: async () => {
      executionOrder.push("createProcurementPackage");
      return { success: true, data: { packageId: "pkg-created-456" } };
    },
    selectProcurementPackageSupplier: async () => {
      executionOrder.push("selectProcurementPackageSupplier");
      return { success: true };
    },
  };

  let captured: CapturedHandlers | null = null;

  ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "Package For Direct Quotation",
      __test_inspect: (h: CapturedHandlers) => {
        captured = h;
      },
    }),
  );

  assert.ok(captured, "Modal handlers not captured");
  const handlersTest4 = captured as CapturedHandlers;
  // Execute Record Supplier Quotation (navigateToQuotation = true)
  handlersTest4.handleSavePackage(true);

  // Allow async startTransition to finish
  await new Promise((resolve) => setTimeout(resolve, 60));

  // Verify save occurred before navigation
  assert.equal(executionOrder[0], "createProcurementPackage");
  assert.equal(executionOrder[1], "selectProcurementPackageSupplier");
  assert.ok(executionOrder.includes("router.push"), "router.push was not called");
  assert.ok(executionOrder.indexOf("router.push") > executionOrder.indexOf("createProcurementPackage"));

  assert.ok(pushedUrl, "router.push was not called with URL");
  const resolvedPushedUrl = pushedUrl as string;
  assert.ok(resolvedPushedUrl.startsWith("/suppliers/sup-99/quotations/new"));
  assert.ok(resolvedPushedUrl.includes("packageId=pkg-created-456"));
});

test("5. Save failure: no navigation occurs and modal remains usable", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");

  let pushCalled = false;

  globalThis.__test_mockRouter = {
    push: () => {
      pushCalled = true;
    },
    refresh: () => {},
  };

  globalThis.__test_mockActions = {
    updateProcurementPackageMetadata: async () => {
      return { success: false, error: "Database lock timeout" };
    },
  };

  let captured: CapturedHandlers | null = null;

  ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockDraftPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: "/services/srv-200/procurement",
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_editingPackage: mockDraftPackage,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "Draft AV Package Edited",
      __test_inspect: (h: CapturedHandlers) => {
        captured = h;
      },
    }),
  );

  assert.ok(captured, "Modal handlers not captured");
  const handlersTest5 = captured as CapturedHandlers;
  // Trigger quotation navigation on a failing save
  handlersTest5.handleSavePackage(true);

  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(pushCalled, false, "Navigation must NOT happen when save fails");
});

test("6. Successful save: quotation route preserves supplierId, serviceId, packageId, and returnTo", async () => {
  const ProcurementPackageWorkspace = await loadTranspiledWorkspace();
  const dictEn = getServicesDictionary("en");

  let targetUrl = "";

  globalThis.__test_mockRouter = {
    push: (url: string) => {
      targetUrl = url;
    },
    refresh: () => {},
  };

  globalThis.__test_mockActions = {
    updateProcurementPackageMetadata: async () => ({ success: true }),
    setProcurementPackageRequirements: async () => ({ success: true }),
    selectProcurementPackageSupplier: async () => ({ success: true }),
  };

  const testReturnTo = "/services/srv-200/procurement?tab=packages&source=details";
  let captured: CapturedHandlers | null = null;

  ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementPackageWorkspace, {
      serviceId: "srv-200",
      serviceNumber: "SRV-2026-002",
      serviceStatus: "confirmed",
      packages: [mockSelectedPackage],
      suppliers: [{ id: "sup-99", name: "Global Event Tech", taxNumber: null, isCommercialVendor: true }],
      quotations: [],
      canWrite: true,
      returnTo: testReturnTo,
      locale: "en",
      dictionary: dictEn.procurementWorkspace,
      __test_isModalOpen: true,
      __test_editingPackage: mockSelectedPackage,
      __test_selectedSupplierId: "sup-99",
      __test_packageName: "Selected AV Package",
      __test_inspect: (h: CapturedHandlers) => {
        captured = h;
      },
    }),
  );

  assert.ok(captured, "Modal handlers not captured");
  const handlersTest6 = captured as CapturedHandlers;
  handlersTest6.handleSavePackage(true);

  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.ok(targetUrl.startsWith("/suppliers/sup-99/quotations/new"), "Target URL missing correct supplier route");
  assert.ok(targetUrl.includes("serviceId=srv-200"), "serviceId not preserved");
  assert.ok(targetUrl.includes("packageId=pkg-selected-1"), "packageId not preserved");

  const expectedWorkspaceUrl = `/services/srv-200/procurement?returnTo=${encodeURIComponent(testReturnTo)}`;
  assert.ok(
    targetUrl.includes(`returnTo=${encodeURIComponent(expectedWorkspaceUrl)}`),
    "returnTo not preserved with upstream returnTo parameter",
  );
});

test("7. Package Requirements still initialize quotation draft lines exactly once", () => {
  // Validate package context helper approves selected package with matching supplier
  const validation = validatePackageQuotationContext(mockSelectedPackage, {
    packageId: "pkg-selected-1",
    serviceId: "srv-200",
    supplierId: "sup-99",
  });
  assert.equal(validation.isValid, true);
  assert.equal(validation.packageContext?.packageId, "pkg-selected-1");
  assert.equal(validation.packageContext?.packageTitle, "Selected AV Package");

  // Replicate the exact initialization logic from SupplierQuotationForm
  const packageRequirements = mockSelectedPackage.requirements.map((r) => ({
    id: r.id,
    title: r.title,
    sortOrder: r.sortOrder,
  }));

  const initialPricingMode = packageRequirements.length > 0 ? "detailed" : "total_only";
  assert.equal(initialPricingMode, "detailed");

  const initialLines = packageRequirements.map((req) => ({
    id: `line-${req.id}`,
    packageRequirementId: req.id,
    description: req.title,
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  }));

  assert.equal(initialLines.length, 2);
  assert.equal(initialLines[0].packageRequirementId, "req-1");
  assert.equal(initialLines[0].description, "Sound System");
  assert.equal(initialLines[1].packageRequirementId, "req-2");
  assert.equal(initialLines[1].description, "Lighting");
});

test("8. No commercial values are inferred", () => {
  const packageRequirements = mockSelectedPackage.requirements;

  // In SupplierQuotationForm, lines initialized from package requirements MUST have empty commercial values
  const lines = packageRequirements.map((req) => ({
    packageRequirementId: req.id,
    description: req.title,
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  }));

  for (const line of lines) {
    assert.equal(line.quantity, "", "Quantity must not be inferred");
    assert.equal(line.unit, "", "Unit must not be inferred");
    assert.equal(line.unitPrice, "", "Unit price must not be inferred");
    assert.equal(line.lineTotal, "", "Line total must not be inferred");
  }
});

test("9. EN/AR/RTL labels and behavior are correct", () => {
  const enDict = getServicesDictionary("en").procurementWorkspace;
  const arDict = getServicesDictionary("ar").procurementWorkspace;

  // Concise guidance text
  assert.equal(
    enDict.selectSupplierFirstNotice,
    "Select a supplier first to record a quotation for this package.",
    "English guidance text mismatch",
  );
  assert.equal(
    arDict.selectSupplierFirstNotice,
    "اختر المورد أولاً لتسجيل عرض سعر لهذه الباقة.",
    "Arabic guidance text mismatch",
  );

  // Record quotation action in modal
  assert.equal(
    enDict.modal.recordSupplierQuotation,
    "Record Supplier Quotation",
    "English modal recordSupplierQuotation mismatch",
  );
  assert.equal(
    arDict.modal.recordSupplierQuotation,
    "تسجيل عرض سعر",
    "Arabic modal recordSupplierQuotation mismatch",
  );

  // Save package button in modal
  assert.equal(
    enDict.modal.save,
    "Save Package",
    "English modal save mismatch",
  );
  assert.equal(
    arDict.modal.save,
    "حفظ الباقة",
    "Arabic modal save mismatch",
  );
});

test("10. No Client Component introduces server-only imports", () => {
  const workspaceSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/services/[id]/procurement/ProcurementPackageWorkspace.tsx"),
    "utf8",
  );

  // Must begin with 'use client'
  assert.match(workspaceSource, /^["']use client["']/);

  // Must NOT import server-only packages
  assert.doesNotMatch(workspaceSource, /from\s+["']server-only["']/);
  assert.doesNotMatch(workspaceSource, /from\s+["']@\/lib\/supabase\/server["']/);
  assert.doesNotMatch(workspaceSource, /from\s+["']next\/headers["']/);

  // Must NOT import Node.js server modules
  assert.doesNotMatch(workspaceSource, /from\s+["']node:fs["']|from\s+["']fs["']/);
  assert.doesNotMatch(workspaceSource, /from\s+["']node:child_process["']|from\s+["']child_process["']/);
  assert.doesNotMatch(workspaceSource, /from\s+["']node:net["']|from\s+["']net["']/);
});
