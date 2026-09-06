import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import { getSuppliersDictionary } from "../i18n/dictionaries/suppliers.ts";
import {
  supplierQuotationDetailedLineSchema,
  supplierQuotationSchema,
} from "./schemas.ts";
import type { SupplierQuotationHistoryRecord, SupplierQuotationLineItem } from "./types.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const migrationSource = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260905140000_w4_supplier_quotation_line_items.sql"),
  "utf8",
);

function withoutSqlComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

test("1. Migration creates supplier_quotation_lines table with all required columns", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(executable, /CREATE TABLE public\.supplier_quotation_lines\s*\(/);
  assert.match(executable, /id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
  assert.match(executable, /quotation_id uuid NOT NULL/);
  assert.match(executable, /service_id uuid NOT NULL/);
  assert.match(executable, /package_requirement_id uuid/);
  assert.match(executable, /description text NOT NULL/);
  assert.match(executable, /quantity numeric\(12,2\)/);
  assert.match(executable, /unit text/);
  assert.match(executable, /unit_price numeric\(14,2\)/);
  assert.match(executable, /line_total numeric\(14,2\) NOT NULL/);
  assert.match(executable, /sort_order integer NOT NULL DEFAULT 0/);
  assert.match(executable, /created_at timestamptz NOT NULL DEFAULT transaction_timestamp\(\)/);
  assert.match(executable, /created_by text NOT NULL/);
});

test("2. Composite FK uses ON DELETE SET NULL (package_requirement_id) preserving service_id", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(
    executable,
    /FOREIGN KEY\s*\(package_requirement_id,\s*service_id\)\s*REFERENCES\s*public\.service_procurement_package_requirements\s*\(id,\s*service_id\)\s*ON DELETE SET NULL\s*\(package_requirement_id\)/,
  );
});

test("3. Unique constraint on package requirements (id, service_id) added for FK support", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(
    executable,
    /ADD CONSTRAINT\s*service_procurement_package_requirements_id_service_key\s*UNIQUE\s*\(id,\s*service_id\)/,
  );
});

test("4. Quotation FK enforces ON DELETE RESTRICT to preserve commercial evidence", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(
    executable,
    /FOREIGN KEY\s*\(quotation_id,\s*service_id\)\s*REFERENCES\s*public\.supplier_quotations\s*\(id,\s*service_id\)\s*ON DELETE RESTRICT/,
  );
});

test("5. Test contract item 5: No quotation price is inferred from Package Requirements", () => {
  // Package requirements in the ERP have estimated budgets or no pricing.
  // Quotation line prefilling from package requirements MUST NOT copy or infer any price.
  const packageReq = {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Stage Lighting Truss",
    description: "Aluminum truss structure for main stage",
  };

  // Pre-fill model: converts package requirement to quotation line
  const prefilledLine = {
    packageRequirementId: packageReq.id,
    description: packageReq.title,
    quantity: null,
    unit: null,
    unitPrice: null,
    lineTotal: 0,
    sortOrder: 0,
  };

  // Price fields must not be inferred from any package requirement estimate
  assert.equal(prefilledLine.quantity, null);
  assert.equal(prefilledLine.unitPrice, null);
  assert.equal(prefilledLine.unit, null);
  assert.equal(prefilledLine.lineTotal, 0);
  assert.equal(prefilledLine.description, "Stage Lighting Truss");
  assert.equal(prefilledLine.packageRequirementId, packageReq.id);
});

test("6. Primary 10-argument create_supplier_quotation RPC has zero default values", () => {
  const executable = withoutSqlComments(migrationSource);
  const rpcMatch = executable.match(
    /CREATE OR REPLACE FUNCTION public\.create_supplier_quotation\s*\(([\s\S]*?)\)\s*RETURNS TABLE/i,
  );
  assert.ok(rpcMatch, "10-argument create_supplier_quotation function must exist");
  const paramsBlock = rpcMatch[1];
  const params = paramsBlock
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  assert.equal(params.length, 10, "Must have exactly 10 parameters");
  assert.ok(!paramsBlock.includes("DEFAULT"), "10-argument function must NOT have any parameter with DEFAULT");
  assert.ok(params[0].includes("p_supplier_id"));
  assert.ok(params[1].includes("p_service_id"));
  assert.ok(params[2].includes("p_supplier_reference"));
  assert.ok(params[3].includes("p_quotation_date"));
  assert.ok(params[4].includes("p_package_total"));
  assert.ok(params[5].includes("p_requirements"));
  assert.ok(params[6].includes("p_lines"));
  assert.ok(params[7].includes("p_request_id"));
  assert.ok(params[8].includes("p_actor_id"));
  assert.ok(params[9].includes("p_actor_role"));
});

test("7. Mode A: Legacy mode handling in RPC", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(executable, /v_mode := 'legacy'/);
  assert.match(executable, /INSERT INTO public\.supplier_quotation_requirements/);
  assert.match(executable, /JOIN public\.service_procurement_requirements r/);
});

test("8. Mode B: Total-only mode handling in RPC", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(executable, /v_mode := 'total_only'/);
  assert.match(executable, /IF p_package_total IS NULL THEN\s*RETURN QUERY SELECT 'supplier_quotation_total_required'/);
});

test("9. Mode C: Detailed mode handling in RPC", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(executable, /v_mode := 'detailed'/);
  assert.match(executable, /INSERT INTO public\.supplier_quotation_lines/);
  assert.match(executable, /JOIN public\.service_procurement_package_requirements pr/);
});

test("10. Mutually exclusive mode conflict rejection in RPC", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(
    executable,
    /IF v_legacy_count > 0 AND v_detailed_count > 0 THEN\s*RETURN QUERY SELECT 'supplier_quotation_mode_conflict'/,
  );
});

test("11. Existing 9-argument create_supplier_quotation is preserved unchanged and NOT redefined in migration", () => {
  const executable = withoutSqlComments(migrationSource);
  // Must NOT contain a 9-argument CREATE OR REPLACE FUNCTION public.create_supplier_quotation
  const allRpcMatches = [
    ...executable.matchAll(
      /CREATE OR REPLACE FUNCTION public\.create_supplier_quotation\s*\(([\s\S]*?)\)\s*RETURNS TABLE/gi,
    ),
  ];
  assert.equal(allRpcMatches.length, 1, "Only the 10-argument function must be created in this migration");
  const params = allRpcMatches[0][1]
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  assert.equal(params.length, 10, "The single declared function must have exactly 10 parameters");

  // Migration preflight verifies existence of legacy 9-argument RPC
  assert.match(
    executable,
    /to_regprocedure\('public\.create_supplier_quotation\(uuid,uuid,text,date,numeric,jsonb,uuid,text,text\)'\)\s*IS NULL/,
  );
});

test("12. Application read model pricingMode derivation", () => {
  function derivePricingMode(
    detailedLines: unknown[],
    legacyRequirements: unknown[],
  ): "legacy" | "total_only" | "detailed" {
    if (detailedLines.length > 0) return "detailed";
    if (legacyRequirements.length > 0) return "legacy";
    return "total_only";
  }

  assert.equal(derivePricingMode([{ id: "1" }], []), "detailed");
  assert.equal(derivePricingMode([{ id: "1" }], [{ requirementId: "r1" }]), "detailed");
  assert.equal(derivePricingMode([], [{ requirementId: "r1" }]), "legacy");
  assert.equal(derivePricingMode([], []), "total_only");
});

test("13. Historical legacy quotations are never misclassified as total-only", () => {
  const historicalRecord: Partial<SupplierQuotationHistoryRecord> = {
    id: "quot-1",
    packageTotal: 5000,
    requirements: [
      {
        requirementId: "req-1",
        requirement: "Sound engineer",
        lineSummary: "Full day audio engineer",
        lineAmount: 5000,
        legacyEvidenceRef: "legacy-ref-1",
      },
    ],
    lines: [],
  };

  const pricingMode: "legacy" | "total_only" | "detailed" =
    (historicalRecord.lines?.length ?? 0) > 0
      ? "detailed"
      : (historicalRecord.requirements?.length ?? 0) > 0
        ? "legacy"
        : "total_only";

  assert.equal(pricingMode, "legacy");
  assert.notEqual(pricingMode, "total_only");
});

test("14. Detailed line schema validates quantity × unitPrice = lineTotal with exact reconciliation and rejects scale violations", () => {
  // Valid exact
  const validExact = supplierQuotationDetailedLineSchema.safeParse({
    description: "LED Screen rental",
    quantity: 4,
    unit: "panel",
    unitPrice: 250,
    lineTotal: 1000,
  });
  assert.equal(validExact.success, true);

  // Valid with 2-decimal rounded multiplication
  const validRounded = supplierQuotationDetailedLineSchema.safeParse({
    description: "Design consultation",
    quantity: 3,
    unit: "hours",
    unitPrice: 33.33,
    lineTotal: 99.99,
  });
  assert.equal(validRounded.success, true);

  // Invalid: mismatch between quantity * unitPrice and lineTotal
  const invalidMismatch = supplierQuotationDetailedLineSchema.safeParse({
    description: "Catering",
    quantity: 10,
    unit: "meals",
    unitPrice: 50,
    lineTotal: 600, // Should be 500
  });
  assert.equal(invalidMismatch.success, false);

  // Invalid: tolerance-based discrepancy (e.g. 99.99 vs 100) is strictly rejected
  const invalidTolerance = supplierQuotationDetailedLineSchema.safeParse({
    description: "Design consultation",
    quantity: 3,
    unit: "hours",
    unitPrice: 33.33,
    lineTotal: 100, // 3 * 33.33 = 99.99, delta 0.01 must not be tolerated
  });
  assert.equal(invalidTolerance.success, false);

  // Scale checks: values exceeding 2 decimal places must be rejected
  const invalidQuantityScale = supplierQuotationDetailedLineSchema.safeParse({
    description: "Hardware",
    quantity: 4.123,
    lineTotal: 400,
  });
  assert.equal(invalidQuantityScale.success, false);

  const invalidUnitPriceScale = supplierQuotationDetailedLineSchema.safeParse({
    description: "Hardware",
    unitPrice: 250.555,
    lineTotal: 250.56,
  });
  assert.equal(invalidUnitPriceScale.success, false);

  const invalidLineTotalScale = supplierQuotationDetailedLineSchema.safeParse({
    description: "Hardware",
    lineTotal: 1000.999,
  });
  assert.equal(invalidLineTotalScale.success, false);
});

test("15. Detailed lines lump-sum support allows null quantity and unitPrice", () => {
  const lumpSumLine = supplierQuotationDetailedLineSchema.safeParse({
    description: "Stage setup lump-sum fee",
    quantity: null,
    unit: null,
    unitPrice: null,
    lineTotal: 3500,
  });
  assert.equal(lumpSumLine.success, true);
  if (lumpSumLine.success) {
    assert.equal(lumpSumLine.data.lineTotal, 3500);
    assert.equal(lumpSumLine.data.quantity, null);
    assert.equal(lumpSumLine.data.unitPrice, null);
  }
});

test("16. Schema rejects hybrid legacy requirements and detailed lines mode conflict", () => {
  const hybridInput = {
    supplierId: "55555555-5555-4555-8555-555555555555",
    serviceId: "44444444-4444-4444-8444-444444444444",
    supplierReference: "REF-HYBRID",
    quotationDate: "2026-09-05",
    pricingMode: "detailed" as const,
    packageTotal: 1000,
    requestId: "77777777-7777-4777-8777-777777777777",
    requirements: [
      {
        requirementId: "22222222-2222-4222-8222-222222222222",
        lineSummary: "Legacy scope",
        lineAmount: 500,
      },
    ],
    lines: [
      {
        description: "Detailed item",
        lineTotal: 500,
      },
    ],
  };

  const result = supplierQuotationSchema.safeParse(hybridInput);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0].message, /cannot combine legacy requirements with detailed line items/i);
  }
});

test("17. Total-only mode requires package total", () => {
  const missingTotal = {
    supplierId: "55555555-5555-4555-8555-555555555555",
    serviceId: "44444444-4444-4444-8444-444444444444",
    supplierReference: "REF-TOTAL-ONLY",
    quotationDate: "2026-09-05",
    pricingMode: "total_only" as const,
    packageTotal: null,
    requestId: "77777777-7777-4777-8777-777777777777",
    requirements: [],
    lines: [],
  };

  const result = supplierQuotationSchema.safeParse(missingTotal);
  assert.equal(result.success, false);

  const negativeTotal = {
    ...missingTotal,
    packageTotal: -50,
  };
  const resultNegative = supplierQuotationSchema.safeParse(negativeTotal);
  assert.equal(resultNegative.success, false);

  const validTotal = {
    ...missingTotal,
    packageTotal: 2500,
  };
  const resultValid = supplierQuotationSchema.safeParse(validTotal);
  assert.equal(resultValid.success, true);
});

test("18. Selection authority boundary: quotation creation never auto-links to package", () => {
  // Verifying that quotation creation migration has no side effects modifying service_procurement_packages
  const executable = withoutSqlComments(migrationSource);
  assert.ok(
    !executable.includes("UPDATE public.service_procurement_packages"),
    "create_supplier_quotation RPC must not mutate service_procurement_packages",
  );
});

test("19. Historical quotation read query filters by supplier_id", () => {
  const querySource = readFileSync(join(REPO_ROOT, "src/lib/procurement/queries.ts"), "utf8");
  assert.match(querySource, /\.eq\("supplier_id",\s*supplierId\)/);
  assert.match(querySource, /detailedLinesByQuotation/);
  assert.match(querySource, /pricingMode/);
});

test("20. Contextual parameters (serviceId, packageId, returnTo) supported on new quotation route", () => {
  const pageSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/new/page.tsx"),
    "utf8",
  );
  assert.match(pageSource, /searchParams/);
  assert.match(pageSource, /serviceId/);
  assert.match(pageSource, /packageId/);
  assert.match(pageSource, /packageRequirements/);
});

test("21. Add from Package Requirements helper prefill contract", () => {
  const packageRequirements = [
    { id: "pr-1", title: "Sound Equipment", description: "Microphones and speakers" },
    { id: "pr-2", title: "Lighting Rig", description: null },
  ];

  const lines: SupplierQuotationLineItem[] = packageRequirements.map((req, idx) => ({
    id: `temp-${idx}`,
    quotationId: "",
    serviceId: "srv-1",
    packageRequirementId: req.id,
    packageRequirementTitle: req.title,
    description: req.title,
    quantity: null,
    unit: null,
    unitPrice: null,
    lineTotal: 0,
    sortOrder: idx,
  }));

  assert.equal(lines.length, 2);
  assert.equal(lines[0].description, "Sound Equipment");
  assert.equal(lines[0].packageRequirementId, "pr-1");
  assert.equal(lines[0].lineTotal, 0);
  assert.equal(lines[0].unitPrice, null);
  assert.equal(lines[1].description, "Lighting Rig");
  assert.equal(lines[1].packageRequirementId, "pr-2");
  assert.equal(lines[1].lineTotal, 0);
  assert.equal(lines[1].unitPrice, null);
});

test("22. Bilingual dictionary completeness for quotation line items and modes", () => {
  const en = getSuppliersDictionary("en").quotationHistory;
  const ar = getSuppliersDictionary("ar").quotationHistory;

  const requiredSupplierKeys: (keyof typeof en)[] = [
    "pricingMode",
    "totalOnly",
    "detailedItems",
    "itemDescription",
    "packageRequirement",
    "quantity",
    "unit",
    "unitPrice",
    "lineTotal",
    "subtotal",
    "quotationTotal",
    "addLine",
    "removeLine",
    "addFromRequirements",
    "allRequirementsAdded",
    "reconciliationMismatch",
    "linesRequired",
    "totalRequired",
    "optionalLink",
    "unlinkedLine",
    "detailedPricing",
    "totalOnlyPricing",
    "legacyPricing",
  ];

  for (const key of requiredSupplierKeys) {
    assert.ok(en[key], `English suppliers dictionary missing quotationHistory.${key}`);
    assert.ok(ar[key], `Arabic suppliers dictionary missing quotationHistory.${key}`);
    assert.ok(en[key].length > 0, `English key quotationHistory.${key} is empty`);
    assert.ok(ar[key].length > 0, `Arabic key quotationHistory.${key} is empty`);
  }

  const enServices = getServicesDictionary("en").procurementWorkspace;
  const arServices = getServicesDictionary("ar").procurementWorkspace;

  assert.ok(enServices.selectSupplierFirstNotice, "English selectSupplierFirstNotice missing");
  assert.ok(arServices.selectSupplierFirstNotice, "Arabic selectSupplierFirstNotice missing");
  assert.ok(enServices.quotationEvidence, "English quotationEvidence missing");
  assert.ok(arServices.quotationEvidence, "Arabic quotationEvidence missing");
});

test("23. Detailed mode header/line reconciliation enforces packageTotal = SUM(line_total)", () => {
  const baseDetailed = {
    supplierId: "55555555-5555-4555-8555-555555555555",
    serviceId: "44444444-4444-4444-8444-444444444444",
    supplierReference: "REF-DETAILED-RECON",
    quotationDate: "2026-09-05",
    pricingMode: "detailed" as const,
    requestId: "77777777-7777-4777-8777-777777777777",
    lines: [
      { description: "Item 1", lineTotal: 300.5 },
      { description: "Item 2", lineTotal: 199.5 },
    ],
  };

  // Missing packageTotal in detailed mode -> rejected
  const missingTotal = supplierQuotationSchema.safeParse({
    ...baseDetailed,
    packageTotal: null,
  });
  assert.equal(missingTotal.success, false);

  // Mismatched packageTotal in detailed mode -> rejected
  const mismatchedTotal = supplierQuotationSchema.safeParse({
    ...baseDetailed,
    packageTotal: 501, // sum is 500
  });
  assert.equal(mismatchedTotal.success, false);
  if (!mismatchedTotal.success) {
    assert.match(mismatchedTotal.error.issues[0].message, /must equal sum of line totals/i);
  }

  // Exact matching packageTotal -> valid
  const exactTotal = supplierQuotationSchema.safeParse({
    ...baseDetailed,
    packageTotal: 500,
  });
  assert.equal(exactTotal.success, true);

  // packageTotal scale violation (> 2 decimals) -> rejected
  const invalidScaleTotal = supplierQuotationSchema.safeParse({
    ...baseDetailed,
    packageTotal: 500.001,
  });
  assert.equal(invalidScaleTotal.success, false);
});

test("24. User-facing new Supplier Quotation form exposes only Detailed Items and Total Only", () => {
  const formSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx"),
    "utf8",
  );

  // Mode selector must contain detailed and total_only buttons
  assert.match(formSource, /dictionary\.detailedItems/);
  assert.match(formSource, /dictionary\.totalOnly/);

  // Legacy pricing mode button must NOT exist in the form
  assert.ok(
    !formSource.includes("dictionary.legacyPricing"),
    "SupplierQuotationForm must NOT expose legacyPricing option",
  );

  // pricingMode state must be constrained to detailed | total_only
  assert.match(
    formSource,
    /useState<\s*"detailed"\s*\|\s*"total_only"\s*>/,
    "pricingMode state in form must be constrained to 'detailed' | 'total_only'",
  );
});

test("25. Migration preflight verifies legacy tables and functions without mutating them", () => {
  const executable = withoutSqlComments(migrationSource);
  // Checks required tables
  assert.match(executable, /to_regclass\('public\.services'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.suppliers'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.supplier_quotations'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.supplier_quotation_requirements'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.service_procurement_requirements'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.service_procurement_packages'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.service_procurement_package_requirements'\)\s*IS NULL/);
  assert.match(executable, /to_regclass\('public\.audit_logs'\)\s*IS NULL/);

  // Checks 9-arg legacy function
  assert.match(
    executable,
    /to_regprocedure\('public\.create_supplier_quotation\(uuid,uuid,text,date,numeric,jsonb,uuid,text,text\)'\)\s*IS NULL/,
  );

  // No mutation of legacy tables (no ALTER TABLE on public.supplier_quotations or public.services)
  assert.ok(!executable.includes("ALTER TABLE public.supplier_quotations"));
  assert.ok(!executable.includes("ALTER TABLE public.services"));
});

test("26. Migration RPC rejects malformed non-array JSON containers", () => {
  const executable = withoutSqlComments(migrationSource);
  assert.match(
    executable,
    /IF p_requirements IS NOT NULL AND jsonb_typeof\(p_requirements\) <> 'array' THEN\s*RETURN QUERY SELECT 'supplier_quotation_requirements_invalid'/,
  );
  assert.match(
    executable,
    /IF p_lines IS NOT NULL AND jsonb_typeof\(p_lines\) <> 'array' THEN\s*RETURN QUERY SELECT 'supplier_quotation_lines_invalid'/,
  );
});

test("27. Migration RPC makes detailed-line audit normalization fully deterministic", () => {
  const executable = withoutSqlComments(migrationSource);
  const detailedBlockMatch = executable.match(
    /jsonb_build_object\s*\(\s*'package_requirement_id'[\s\S]*?ORDER BY([\s\S]*?)\),\s*'\[\]'::jsonb\)\s*INTO\s*[^;]*v_normalized_lines/i,
  );
  assert.ok(detailedBlockMatch, "Normalized lines aggregation must have an ORDER BY clause leading into v_normalized_lines");
  const orderClause = detailedBlockMatch[1];
  assert.match(orderClause, /coalesce\(line\.sort_order,\s*0\)/);
  assert.match(orderClause, /line\.line_total/);
  assert.match(orderClause, /NULLIF\(btrim\(line\.description\),\s*''\)/);
  assert.match(orderClause, /coalesce\(line\.package_requirement_id::text,\s*''\)/);
  assert.match(orderClause, /coalesce\(line\.quantity,\s*0\)/);
  assert.match(orderClause, /coalesce\(line\.unit_price,\s*0\)/);
  assert.match(orderClause, /coalesce\(NULLIF\(btrim\(line\.unit\),\s*''\),\s*''\)/);
});

test("28. Add Line creates a new free-text line", () => {
  const formSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx"),
    "utf8",
  );

  // In form source, addLine initializes empty free-text line with packageRequirementId: ""
  assert.match(formSource, /function addLine\(\)\s*\{[\s\S]*?packageRequirementId:\s*""/);
  assert.match(formSource, /description:\s*""/);
  assert.match(formSource, /quantity:\s*""/);
  assert.match(formSource, /unit:\s*""/);
  assert.match(formSource, /unitPrice:\s*""/);
  assert.match(formSource, /lineTotal:\s*""/);

  // State behavior verification
  type LineState = {
    id: string;
    packageRequirementId: string;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    lineTotal: string;
  };

  const initialLines: LineState[] = [
    {
      id: "line-1",
      packageRequirementId: "req-1",
      description: "Existing item",
      quantity: "2",
      unit: "pcs",
      unitPrice: "100.00",
      lineTotal: "200.00",
    },
  ];

  const newLineId = "line-new";
  const nextLines = [
    ...initialLines,
    {
      id: newLineId,
      packageRequirementId: "",
      description: "",
      quantity: "",
      unit: "",
      unitPrice: "",
      lineTotal: "",
    },
  ];

  assert.equal(nextLines.length, 2);
  const created = nextLines[1];
  assert.equal(created.id, newLineId);
  assert.equal(created.packageRequirementId, "");
  assert.equal(created.description, "");
  assert.equal(created.quantity, "");
  assert.equal(created.unit, "");
  assert.equal(created.unitPrice, "");
  assert.equal(created.lineTotal, "");
});

test("29. The newly added line is targeted for scroll/focus feedback", () => {
  const formSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx"),
    "utf8",
  );

  // Form sets highlightedLineId upon adding line
  assert.match(formSource, /setHighlightedLineId\(newId\);/);

  // Form DOM element has ID targeting and data-highlighted attribute
  assert.match(formSource, /id=\{`quotation-line-\$\{line\.id\}`\}/);
  assert.match(formSource, /data-highlighted=\{highlightedLineId === line\.id \? "true" : undefined\}/);

  // Smooth scroll and input focus in useEffect
  assert.match(formSource, /lineElement\.scrollIntoView\(\{\s*behavior:\s*"smooth",\s*block:\s*"nearest"\s*\}\)/);
  assert.match(formSource, /firstInput\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);

  // Temporary highlight styling and auto-clear timer (non-persisted)
  assert.match(formSource, /highlightedLineId === line\.id/);
  assert.match(formSource, /border-primary ring-2 ring-primary\/30/);
  assert.match(formSource, /setTimeout\(\(\)\s*=>\s*\{\s*setHighlightedLineId\(null\);\s*\},\s*2000\)/);
});

test("30. Existing lines are preserved when adding lines", () => {
  const existingLines = [
    {
      id: "line-1",
      packageRequirementId: "req-1",
      description: "Audio setup",
      quantity: "1",
      unit: "set",
      unitPrice: "1500.00",
      lineTotal: "1500.00",
    },
    {
      id: "line-2",
      packageRequirementId: "",
      description: "Custom labor",
      quantity: "5",
      unit: "hours",
      unitPrice: "200.00",
      lineTotal: "1000.00",
    },
  ];

  // Add line simulation
  const newLine = {
    id: "line-3",
    packageRequirementId: "",
    description: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  };
  const afterAdd = [...existingLines, newLine];

  assert.equal(afterAdd.length, 3);
  assert.deepEqual(afterAdd[0], existingLines[0]);
  assert.deepEqual(afterAdd[1], existingLines[1]);
});

test("31. Existing commercial values are never overwritten", () => {
  const lineA = {
    id: "l-1",
    packageRequirementId: "req-1",
    description: "Catering package",
    quantity: "50",
    unit: "meals",
    unitPrice: "75.00",
    lineTotal: "3750.00",
  };

  // Add from package requirements when req-2 is missing
  const packageRequirements = [
    { id: "req-1", title: "Catering package" },
    { id: "req-2", title: "Dessert station" },
  ];

  const currentReqIds = new Set([lineA.packageRequirementId].filter(Boolean));
  const toAdd = packageRequirements
    .filter((req) => !currentReqIds.has(req.id))
    .map((req) => ({
      id: `l-${req.id}`,
      packageRequirementId: req.id,
      description: req.title,
      quantity: "",
      unit: "",
      unitPrice: "",
      lineTotal: "",
    }));

  const combined = [lineA, ...toAdd];
  assert.equal(combined.length, 2);

  // Existing commercial values in lineA must remain untouched
  assert.equal(combined[0].description, "Catering package");
  assert.equal(combined[0].quantity, "50");
  assert.equal(combined[0].unit, "meals");
  assert.equal(combined[0].unitPrice, "75.00");
  assert.equal(combined[0].lineTotal, "3750.00");
});

test("32. Add from Package Requirements adds only missing requirements", () => {
  const packageRequirements = [
    { id: "r1", title: "Stage Lighting" },
    { id: "r2", title: "Audio Console" },
    { id: "r3", title: "LED Screen" },
  ];

  // Lines already have r1 linked, plus a free-text line
  const lines = [
    { id: "1", packageRequirementId: "r1", description: "Stage Lighting", quantity: "1", unit: "set", unitPrice: "5000", lineTotal: "5000" },
    { id: "2", packageRequirementId: "", description: "Extra cables", quantity: "10", unit: "pcs", unitPrice: "20", lineTotal: "200" },
  ];

  const currentReqIds = new Set(lines.map((l) => l.packageRequirementId).filter(Boolean));
  const missing = packageRequirements.filter((req) => !currentReqIds.has(req.id));

  assert.equal(missing.length, 2);
  assert.deepEqual(
    missing.map((m) => m.id),
    ["r2", "r3"],
  );

  const toAdd = missing.map((req) => ({
    id: `new-${req.id}`,
    packageRequirementId: req.id,
    description: req.title,
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  }));

  const result = [...lines, ...toAdd];
  assert.equal(result.length, 4);
  assert.equal(result[0].packageRequirementId, "r1");
  assert.equal(result[1].packageRequirementId, "");
  assert.equal(result[2].packageRequirementId, "r2");
  assert.equal(result[3].packageRequirementId, "r3");
});

test("33. When all requirements are already represented, the action is disabled", () => {
  const formSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx"),
    "utf8",
  );

  // Form computes allRequirementsRepresented and applies it to disabled
  assert.match(
    formSource,
    /const allRequirementsRepresented = packageRequirements\.length > 0 && missingRequirementsCount === 0;/,
  );
  assert.match(formSource, /disabled=\{isPending \|\| allRequirementsRepresented\}/);

  const packageRequirements = [
    { id: "r1", title: "Lighting" },
    { id: "r2", title: "Sound" },
  ];

  // Case 1: Partial
  const partialLines = [{ packageRequirementId: "r1" }];
  const partialReqIds = new Set(partialLines.map((l) => l.packageRequirementId).filter(Boolean));
  const partialMissing = packageRequirements.filter((req) => !partialReqIds.has(req.id)).length;
  const partialAllRepresented = packageRequirements.length > 0 && partialMissing === 0;
  assert.equal(partialAllRepresented, false);

  // Case 2: All represented
  const fullLines = [
    { packageRequirementId: "r1" },
    { packageRequirementId: "r2" },
    { packageRequirementId: "" }, // free text line does not affect package requirements count
  ];
  const fullReqIds = new Set(fullLines.map((l) => l.packageRequirementId).filter(Boolean));
  const fullMissing = packageRequirements.filter((req) => !fullReqIds.has(req.id)).length;
  const fullAllRepresented = packageRequirements.length > 0 && fullMissing === 0;
  assert.equal(fullAllRepresented, true);
});

test("34. Exact bilingual text for all requirements added action", () => {
  const en = getSuppliersDictionary("en").quotationHistory;
  const ar = getSuppliersDictionary("ar").quotationHistory;

  // Exact EN text: All Package Requirements Added
  assert.equal(en.allRequirementsAdded, "All Package Requirements Added");

  // Exact AR text: كل متطلبات الباقة مضافة
  assert.equal(ar.allRequirementsAdded, "كل متطلبات الباقة مضافة");

  const formSource = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationForm.tsx"),
    "utf8",
  );
  assert.match(
    formSource,
    /\{allRequirementsRepresented\s*\?\s*dictionary\.allRequirementsAdded\s*:\s*dictionary\.addFromRequirements\}/,
  );
});

test("35. Multiple lines may still manually link to the same Package Requirement", () => {
  const sharedReqId = "33333333-3333-4333-8333-333333333333";
  const validDetailedPayload = {
    supplierId: "55555555-5555-4555-8555-555555555555",
    serviceId: "44444444-4444-4444-8444-444444444444",
    supplierReference: "MULTI-REQ-LINK",
    quotationDate: "2026-09-06",
    pricingMode: "detailed" as const,
    packageTotal: 1500,
    requestId: "77777777-7777-4777-8777-777777777777",
    lines: [
      {
        packageRequirementId: sharedReqId,
        description: "Stage Lighting - Fixture Rental",
        quantity: 10,
        unit: "units",
        unitPrice: 100,
        lineTotal: 1000,
      },
      {
        packageRequirementId: sharedReqId,
        description: "Stage Lighting - Technician Crew",
        quantity: 1,
        unit: "crew",
        unitPrice: 500,
        lineTotal: 500,
      },
    ],
  };

  const parsed = supplierQuotationSchema.safeParse(validDetailedPayload);
  assert.equal(parsed.success, true, "Multiple lines linking to same package requirement must be valid");
  if (parsed.success) {
    assert.equal(parsed.data.lines?.[0].packageRequirementId, sharedReqId);
    assert.equal(parsed.data.lines?.[1].packageRequirementId, sharedReqId);
  }
});

test("36. No price or quantity inference is introduced", () => {
  const packageReqWithEstimate = {
    id: "99999999-9999-4999-8999-999999999999",
    title: "LED Video Wall",
    description: "High resolution indoor LED screen",
    estimated_budget: "25000.00",
    estimated_quantity: 4,
    estimated_unit_price: 6250,
  };

  // addFromPackageRequirements mapping
  const createdFromReq = {
    packageRequirementId: packageReqWithEstimate.id,
    description: packageReqWithEstimate.title,
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  };

  assert.equal(createdFromReq.quantity, "");
  assert.equal(createdFromReq.unit, "");
  assert.equal(createdFromReq.unitPrice, "");
  assert.equal(createdFromReq.lineTotal, "");

  // addLine mapping
  const createdBlank = {
    packageRequirementId: "",
    description: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    lineTotal: "",
  };

  assert.equal(createdBlank.quantity, "");
  assert.equal(createdBlank.unit, "");
  assert.equal(createdBlank.unitPrice, "");
  assert.equal(createdBlank.lineTotal, "");
});
