import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import React from "react";
import ReactDOMServer from "react-dom/server";
import ts from "typescript";

import { getServicesDictionary } from "../i18n/dictionaries/services.ts";

const require = createRequire(import.meta.url);
const reactResolvedUrl = "file:///" + require.resolve("react").replace(/\\/g, "/");
const REPO_ROOT = join(import.meta.dirname, "../../..");

async function loadTranspiledComponent<T>(
  relativePath: string,
  customTransform?: (code: string) => string,
): Promise<T> {
  const fullPath = join(REPO_ROOT, relativePath);
  let raw = readFileSync(fullPath, "utf8");
  if (customTransform) {
    raw = customTransform(raw);
  }

  // Mock next/link, next/navigation, and lucide icons
  raw = raw.replace(
    /import\s+Link\s+from\s+["']next\/link["'];?/g,
    'const Link = ({ children, href, className, title }) => React.createElement("a", { href, className, title }, children);',
  );
  raw = raw.replace(
    /import\s+\{\s*useRouter\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'const useRouter = () => ({ refresh: () => {} });',
  );
  raw = raw.replace(
    /import\s+\{\s*FileText\s*\}\s+from\s+["']lucide-react["'];?/g,
    'const FileText = () => React.createElement("svg", { "data-icon": "file-text" });',
  );

  // Mock child UI component dependencies and server actions
  raw = raw.replace(
    /import\s+Button\s+from\s+["']@\/components\/ui\/Button["'];?/g,
    'const Button = ({ children, onClick, variant, className, type, disabled, loading, loadingLabel }) => React.createElement("button", { type: type || "button", onClick, className, disabled }, children);',
  );
  raw = raw.replace(
    /import\s+StatusBadge\s+from\s+["']@\/components\/ui\/StatusBadge["'];?/g,
    'const StatusBadge = ({ children, variant }) => React.createElement("span", { className: "status-badge", "data-variant": variant }, children);',
  );
  raw = raw.replace(
    /import\s+\{\s*UiDateText\s*\}\s+from\s+["']@\/components\/i18n\/UiDateText["'];?/g,
    'const UiDateText = ({ value }) => React.createElement("span", { className: "ui-date" }, String(value));',
  );
  raw = raw.replace(
    /import\s+\{\s*transitionServiceLifecycle[^}]*\}\s+from\s+["']@\/lib\/services\/actions["'];?/g,
    'const transitionServiceLifecycle = () => Promise.resolve({ success: true });',
  );
  raw = raw.replace(
    /import\s+\{\s*getServiceStatusErrorMessage\s*\}\s+from\s+["']@\/lib\/i18n\/service-action-feedback["'];?/g,
    'const getServiceStatusErrorMessage = () => "Error";',
  );
  raw = raw.replace(
    /import\s+\{\s*getQuotationStatusLabel\s*\}\s+from\s+["']@\/lib\/i18n\/dictionaries\/quotations["'];?/g,
    'const getQuotationStatusLabel = (_locale, status) => status;',
  );

  // Bind react import to fully resolved react file URL
  raw = raw.replace(/from\s+["']react["']/g, `from "${reactResolvedUrl}"`);

  // Resolve remaining @/ imports with proper .ts file URLs
  raw = raw.replace(/from\s+["']@\/([^"']+)["']/g, (_match, subPath) => {
    const candidateTs = join(REPO_ROOT, "src", subPath + ".ts");
    const candidateIndex = join(REPO_ROOT, "src", subPath, "index.ts");
    let target = subPath;
    if (existsSync(candidateTs)) target = subPath + ".ts";
    else if (existsSync(candidateIndex)) target = subPath + "/index.ts";
    return `from "file:///${join(REPO_ROOT, "src", target).replace(/\\/g, "/")}"`;
  });

  const transpiled = ts.transpileModule(`import React from "${reactResolvedUrl}";\n` + raw, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const tmpPath = join(tmpdir(), `g7-render-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(tmpPath, transpiled, "utf8");

  try {
    const mod = await import("file:///" + tmpPath.replace(/\\/g, "/"));
    return mod.default as T;
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
}

test("Runtime rendering: ServiceLifecycleActions renders collapsed by default in both locales", async () => {
  const ServiceLifecycleActions = await loadTranspiledComponent<React.ComponentType<Record<string, unknown>>>(
    "src/app/(dashboard)/services/[id]/ServiceLifecycleActions.tsx",
  );

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const lifecycle = {
    commercialState: "approved",
    paymentState: "settled",
    readinessState: "ready",
    executionState: "not_started",
    completionState: "not_applicable",
    closeState: "open",
    source: "projection",
    legacyStatus: "Approved",
  };

  // English Render
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ServiceLifecycleActions, {
      serviceId: "srv-test",
      lifecycle,
      canAuthorizeCredit: true,
      canReopen: false,
      dictionary: dictEn,
    }),
  );

  assert.ok(htmlEn.includes(dictEn.serviceLifecycle.title), "Renders English title");
  assert.ok(htmlEn.includes(dictEn.serviceLifecycle.actions.updateAction), "Renders English update action trigger");
  assert.ok(!htmlEn.includes('id="service-lifecycle-reason"'), "Reason textarea is NOT in DOM when collapsed");
  assert.ok(!htmlEn.includes("<textarea"), "No textarea element rendered in summary flow");
  assert.ok(!htmlEn.includes(dictEn.serviceLifecycle.actions.markReady), "Mark ready button is NOT in summary flow");

  // Arabic Render
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ServiceLifecycleActions, {
      serviceId: "srv-test",
      lifecycle,
      canAuthorizeCredit: true,
      canReopen: false,
      dictionary: dictAr,
    }),
  );

  assert.ok(htmlAr.includes(dictAr.serviceLifecycle.title), "Renders Arabic title (دورة حياة الفعالية)");
  assert.ok(htmlAr.includes(dictAr.serviceLifecycle.actions.updateAction), "Renders Arabic update action trigger (تحديث حالة دورة الحياة)");
  assert.ok(!htmlAr.includes('id="service-lifecycle-reason"'), "Reason textarea is NOT in DOM when collapsed in Arabic");
  assert.ok(!htmlAr.includes("<textarea"), "No textarea element rendered in summary flow in Arabic");
  assert.ok(!htmlAr.includes(dictAr.serviceLifecycle.actions.markReady), "Mark ready button is NOT in summary flow in Arabic");
});

test("Runtime rendering: ServiceLifecycleActions renders mutation controls when expanded", async () => {
  const ServiceLifecycleActionsOpen = await loadTranspiledComponent<React.ComponentType<Record<string, unknown>>>(
    "src/app/(dashboard)/services/[id]/ServiceLifecycleActions.tsx",
    (code) => code.replace(
      "const [isUpdateOpen, setIsUpdateOpen] = useState(false);",
      "const [isUpdateOpen, setIsUpdateOpen] = useState(true);",
    ),
  );

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const lifecycle = {
    commercialState: "approved",
    paymentState: "settled",
    readinessState: "ready",
    executionState: "not_started",
    completionState: "not_applicable",
    closeState: "open",
    source: "projection",
    legacyStatus: "Approved",
  };

  // English Expanded Render
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ServiceLifecycleActionsOpen, {
      serviceId: "srv-test",
      lifecycle,
      canAuthorizeCredit: true,
      canReopen: false,
      dictionary: dictEn,
    }),
  );

  assert.ok(htmlEn.includes('id="service-lifecycle-reason"'), "Reason textarea is present in DOM when expanded");
  assert.ok(htmlEn.includes("<textarea"), "Textarea element rendered when expanded");
  assert.ok(htmlEn.includes(dictEn.serviceLifecycle.actions.startExecution), "Start action rendered when expanded");

  // Arabic Expanded Render
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ServiceLifecycleActionsOpen, {
      serviceId: "srv-test",
      lifecycle,
      canAuthorizeCredit: true,
      canReopen: false,
      dictionary: dictAr,
    }),
  );

  assert.ok(htmlAr.includes('id="service-lifecycle-reason"'), "Reason textarea is present in DOM when expanded in Arabic");
  assert.ok(htmlAr.includes("<textarea"), "Textarea element rendered when expanded in Arabic");
  assert.ok(htmlAr.includes(dictAr.serviceLifecycle.actions.startExecution), "Start action rendered when expanded in Arabic");
});

test("Runtime rendering: RelatedQuotationsCard renders localized headings and table in both locales", async () => {
  const RelatedQuotationsCard = await loadTranspiledComponent<React.ComponentType<Record<string, unknown>>>(
    "src/app/(dashboard)/services/[id]/RelatedQuotationsCard.tsx",
  );

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const quotations = [
    {
      id: "q-1",
      quotationNumber: "Q-2026-001",
      status: "approved",
      date: "2026-06-16",
      validUntil: "2026-07-16",
      grandTotal: 17250,
    },
  ];

  // English
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RelatedQuotationsCard, {
      quotations,
      serviceId: "srv-test",
      canCreateQuotation: true,
      dictionary: dictEn,
    }),
  );

  assert.ok(htmlEn.includes(dictEn.relatedQuotations.title), "Renders English quotations title");
  assert.ok(htmlEn.includes(dictEn.relatedQuotations.table.quotation), "Renders English table header quotation");
  assert.ok(htmlEn.includes("Q-2026-001"), "Renders quotation number");

  // Arabic
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RelatedQuotationsCard, {
      quotations,
      serviceId: "srv-test",
      canCreateQuotation: true,
      dictionary: dictAr,
    }),
  );

  assert.ok(htmlAr.includes(dictAr.relatedQuotations.title), "Renders Arabic quotations title (عروض الأسعار المرتبطة)");
  assert.ok(htmlAr.includes(dictAr.relatedQuotations.table.quotation), "Renders Arabic table header (رقم عرض السعر)");
  assert.ok(htmlAr.includes(dictAr.relatedQuotations.table.grandTotal), "Renders Arabic table header (قيمة عرض السعر)");
  assert.ok(htmlAr.includes("text-start"), "Table headers and cells use logical text-start for RTL alignment");
});

test("Runtime rendering: ProcurementSummaryCard preserves natural RTL layout without block dir=ltr", async () => {
  const ProcurementSummaryCard = await loadTranspiledComponent<React.ComponentType<Record<string, unknown>>>(
    "src/app/(dashboard)/services/[id]/ProcurementSummaryCard.tsx",
  );

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const requirements = [
    {
      requirementId: "req-1",
      serviceId: "srv-1",
      lineItemId: "li-1",
      specSummary: "Sound System Rigging",
      quantity: 2,
      unit: "set",
      deliveryDate: "2026-06-20",
      selectionStatus: "open",
      selectedSupplierId: null,
      selectedSupplierName: null,
      evidenceCount: 1,
      candidates: [
        {
          supplierId: "sup-1",
          supplierName: "Acoustic Pro Ltd",
          hasActiveRateCard: true,
          historicalEngagementCount: 3,
          complianceRating: "A",
          pricingConfidenceScore: 92,
        },
      ],
    },
  ];

  // English
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementSummaryCard, {
      serviceId: "srv-test",
      requirements,
      supplierQuotationCount: 2,
      dictionary: dictEn,
    }),
  );

  assert.ok(htmlEn.includes(dictEn.procurementSummary.title), "Renders English procurement title");
  assert.ok(htmlEn.includes(dictEn.procurementSummary.openWorkspace), "Renders English workspace button");

  // Arabic
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProcurementSummaryCard, {
      serviceId: "srv-test",
      requirements,
      supplierQuotationCount: 2,
      dictionary: dictAr,
    }),
  );

  assert.ok(htmlAr.includes(dictAr.procurementSummary.title), "Renders Arabic procurement title (مساحة التوريد)");
  assert.ok(htmlAr.includes(dictAr.procurementSummary.openRequirements), "Renders Arabic open requirements label");
  assert.ok(htmlAr.includes(dictAr.procurementSummary.candidateSuppliers), "Renders Arabic candidate suppliers label");
  assert.ok(htmlAr.includes(dictAr.procurementSummary.openWorkspace), "Renders Arabic workspace link (فتح مساحة التوريد)");

  // Assert NO nested block dir="ltr" on dd
  assert.ok(!htmlAr.includes('<dd class="mt-1 break-words text-[14px] font-semibold text-on-surface tabular-nums" dir="ltr">'), "No block-level dir=ltr on dd");
  assert.ok(!htmlAr.includes('<dd dir="ltr">'), "No block dir=ltr on dd element");
  assert.ok(htmlAr.includes('<span dir="ltr" class="inline-block tabular-nums">'), "Numbers are isolated inline with dir=ltr");
});

test("Runtime rendering: CommitmentSummaryCard preserves natural RTL layout without block dir=ltr", async () => {
  const CommitmentSummaryCard = await loadTranspiledComponent<React.ComponentType<Record<string, unknown>>>(
    "src/app/(dashboard)/services/[id]/CommitmentSummaryCard.tsx",
  );

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const commitments = [
    {
      commitmentId: "com-1",
      serviceId: "srv-1",
      requirementId: "req-1",
      supplierId: "sup-1",
      supplierName: "Acoustic Pro Ltd",
      scopeSummary: "Sound System Rigging Package",
      authorizedAmount: 15000,
      openCommitmentAmount: 15000,
      status: "open",
      createdAt: "2026-06-16T10:00:00Z",
      receipts: [],
    },
  ];

  // English
  const htmlEn = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitmentSummaryCard, {
      serviceId: "srv-test",
      commitments,
      dictionary: dictEn,
    }),
  );

  assert.ok(htmlEn.includes("Approved Commitments"), "Renders English commitment title");
  assert.ok(htmlEn.includes(dictEn.commitmentSummary.openWorkspace), "Renders English workspace button");

  // Arabic
  const htmlAr = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CommitmentSummaryCard, {
      serviceId: "srv-test",
      commitments,
      dictionary: dictAr,
    }),
  );

  assert.ok(htmlAr.includes(dictAr.commitmentSummary.title), "Renders Arabic commitment title (الالتزامات المعتمدة والاستلام)");
  assert.ok(htmlAr.includes(dictAr.commitmentSummary.activeCommitments), "Renders Arabic active commitments label");
  assert.ok(htmlAr.includes(dictAr.commitmentSummary.authorizedAmount), "Renders Arabic authorized amount label");
  assert.ok(htmlAr.includes(dictAr.commitmentSummary.openWorkspace), "Renders Arabic workspace link (فتح مساحة الالتزامات)");

  // Assert NO nested block dir="ltr" on dd
  assert.ok(!htmlAr.includes('<dd class="mt-1 break-words text-[14px] font-semibold text-on-surface tabular-nums" dir="ltr">'), "No block-level dir=ltr on dd");
  assert.ok(!htmlAr.includes('<dd dir="ltr">'), "No block dir=ltr on dd element");
  assert.ok(htmlAr.includes('<span dir="ltr" class="inline-block tabular-nums">'), "Amounts/counts are isolated inline with dir=ltr");
});
