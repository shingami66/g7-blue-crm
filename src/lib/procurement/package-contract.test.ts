import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createProcurementPackageSchema,
  packageRequirementInputSchema,
  procurementMethodSchema,
  procurementPackageStatusSchema,
  selectProcurementPackageSupplierSchema,
  setProcurementPackageRequirementsSchema,
  updateProcurementPackageMetadataSchema,
} from "./package-schemas.ts";
import {
  COMMON_REQUIREMENT_CATALOG,
  getCommonRequirementCatalog,
  PROCUREMENT_METHODS,
  PROCUREMENT_PACKAGE_STATUSES,
} from "./package-types.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const migrationSource = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260904100000_w4_procurement_package_foundation.sql"),
  "utf8",
);
const legacyW4Migration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260901061855_w4_procurement_requirement_sourcing.sql"),
  "utf8",
);
const quotationMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260902090000_w4_first_class_supplier_quotations.sql"),
  "utf8",
);
const commitmentMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260902110000_l1_d07_commitment_receipt.sql"),
  "utf8",
);

function withoutSqlComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

test("Package belongs to exactly one Service", () => {
  const executable = withoutSqlComments(migrationSource);

  // Schema check: table has service_id NOT NULL with foreign key
  assert.match(
    executable,
    /service_id uuid NOT NULL REFERENCES public\.services\(id\) ON DELETE RESTRICT/,
  );
  assert.match(
    executable,
    /CONSTRAINT service_procurement_packages_id_service_key UNIQUE \(id, service_id\)/,
  );

  // Validation check: package creation requires a valid service UUID
  const validServiceId = "00000000-0000-4000-8000-000000000001";
  const validRequestId = "00000000-0000-4000-8000-000000000002";

  const valid = createProcurementPackageSchema.safeParse({
    serviceId: validServiceId,
    name: "Technical Production",
    requestId: validRequestId,
  });
  assert.equal(valid.success, true);

  const missingService = createProcurementPackageSchema.safeParse({
    name: "Technical Production",
    requestId: validRequestId,
  });
  assert.equal(missingService.success, false);

  const invalidService = createProcurementPackageSchema.safeParse({
    serviceId: "not-a-uuid",
    name: "Technical Production",
    requestId: validRequestId,
  });
  assert.equal(invalidService.success, false);

  // Metadata update schema validation
  const validUpdate = updateProcurementPackageMetadataSchema.safeParse({
    packageId: "00000000-0000-4000-8000-000000000010",
    serviceId: validServiceId,
    name: "Updated Package Name",
    description: "Scope description",
    procurementMethod: "rental",
    requestId: validRequestId,
  });
  assert.equal(validUpdate.success, true);
});

test("Package supports multiple requirements and custom requirement text", () => {
  const executable = withoutSqlComments(migrationSource);

  assert.match(executable, /CREATE TABLE public\.service_procurement_package_requirements/);
  assert.match(
    executable,
    /FOREIGN KEY \(package_id, service_id\)\s+REFERENCES public\.service_procurement_packages\(id, service_id\)\s+ON DELETE CASCADE/,
  );
  assert.match(
    executable,
    /title text NOT NULL/,
  );

  // Requirement text is NOT constrained to a closed enum in database
  assert.match(executable, /char_length\(btrim\(title\)\) BETWEEN 1 AND 2000/);

  // Schema validation supports 0, 1, or many requirements
  const serviceId = "00000000-0000-4000-8000-000000000001";
  const packageId = "00000000-0000-4000-8000-000000000010";
  const requestId = "00000000-0000-4000-8000-000000000099";

  // Zero requirements
  const zeroReqs = createProcurementPackageSchema.safeParse({
    serviceId,
    name: "Empty Package",
    requirements: [],
    requestId,
  });
  assert.equal(zeroReqs.success, true);

  // Multiple requirements with both curated catalog keys and authentic custom text
  const multipleReqs = setProcurementPackageRequirementsSchema.safeParse({
    packageId,
    serviceId,
    requirements: [
      {
        requirementKey: "stage",
        title: "Stage 8x6m with Black Skirting",
        specifications: "Heavy duty modular risers, 60cm height",
        sortOrder: 0,
      },
      {
        requirementKey: "led_screens",
        title: "LED Screens P2.6 Indoor",
        specifications: "12x4m curved main display",
        sortOrder: 1,
      },
      {
        title: "Bespoke Acrylic Lectern with G7 Emblem",
        specifications: "Fully custom requirement without standard taxonomy key",
        sortOrder: 2,
      },
      {
        title: "Emergency Power Cutover Switchboard",
        sortOrder: 3,
      },
    ],
    requestId,
  });
  assert.equal(multipleReqs.success, true);
  if (multipleReqs.success) {
    assert.equal(multipleReqs.data.requirements.length, 4);
    assert.equal(multipleReqs.data.requirements[2]?.requirementKey, undefined);
    assert.equal(multipleReqs.data.requirements[2]?.title, "Bespoke Acrylic Lectern with G7 Emblem");
  }
});

test("Curated requirement catalog provides common categories without forcing a closed enum", () => {
  const catalog = getCommonRequirementCatalog();
  assert.ok(catalog.length >= 20);
  assert.equal(catalog.length, COMMON_REQUIREMENT_CATALOG.length);

  const categories = new Set(catalog.map((item) => item.category));
  assert.deepEqual(Array.from(categories).sort(), [
    "decor",
    "furniture",
    "hospitality",
    "operations",
    "technical",
  ]);

  // Catalog items include bilingual titles
  const stage = catalog.find((item) => item.key === "stage");
  assert.ok(stage);
  assert.equal(stage.titleEn, "Stage");
  assert.equal(stage.titleAr, "مسرح");

  // Custom requirement text without a catalog key parses cleanly
  const customReq = packageRequirementInputSchema.safeParse({
    title: "Completely Unique Event Installation",
    specifications: "Custom engineering spec",
  });
  assert.equal(customReq.success, true);
});

test("Package has at most one selected supplier and supplier can serve multiple Packages", () => {
  const executable = withoutSqlComments(migrationSource);

  // Single nullable selected_supplier_id on package table
  assert.match(
    executable,
    /selected_supplier_id uuid REFERENCES public\.suppliers\(id\) ON DELETE RESTRICT/,
  );

  // No UNIQUE constraint on selected_supplier_id
  assert.doesNotMatch(executable, /UNIQUE\s*\(\s*selected_supplier_id\s*\)/i);

  // Selection schema accepts exactly one supplierId
  const packageId = "00000000-0000-4000-8000-000000000010";
  const serviceId = "00000000-0000-4000-8000-000000000001";
  const supplierId = "00000000-0000-4000-8000-000000000020";
  const requestId = "00000000-0000-4000-8000-000000000099";

  const selection = selectProcurementPackageSupplierSchema.safeParse({
    packageId,
    serviceId,
    supplierId,
    selectionReason: "Preferred audio-visual contractor with demonstrated capacity",
    requestId,
  });
  assert.equal(selection.success, true);

  // Two different packages selecting the same supplier is supported
  const package2Id = "00000000-0000-4000-8000-000000000011";
  const selection2 = selectProcurementPackageSupplierSchema.safeParse({
    packageId: package2Id,
    serviceId,
    supplierId, // same supplier
    selectionReason: "Also contracted for furniture package",
    requestId,
  });
  assert.equal(selection2.success, true);
});

test("Optional selected Supplier Quotation relationship and cross-supplier mismatch protection", () => {
  const executable = withoutSqlComments(migrationSource);

  // Selected quotation column is nullable
  assert.match(executable, /selected_supplier_quotation_id uuid/);

  // Compound foreign key ensures quotation belongs to BOTH the same service AND the same supplier
  assert.match(
    executable,
    /FOREIGN KEY \(selected_supplier_quotation_id, service_id, selected_supplier_id\)\s+REFERENCES public\.supplier_quotations\(id, service_id, supplier_id\)\s+ON DELETE RESTRICT/,
  );

  // Selection consistency check ensures quotation cannot be set without a supplier
  assert.match(
    executable,
    /selected_supplier_quotation_id IS NULL\s+OR selected_supplier_id IS NOT NULL/,
  );

  // RPC checks for quotation mismatch
  assert.match(executable, /procurement_package_quotation_mismatch/);

  // Schema: selection without quotation is valid
  const packageId = "00000000-0000-4000-8000-000000000010";
  const serviceId = "00000000-0000-4000-8000-000000000001";
  const supplierId = "00000000-0000-4000-8000-000000000020";
  const quotationId = "00000000-0000-4000-8000-000000000030";
  const requestId = "00000000-0000-4000-8000-000000000099";

  const withoutQuotation = selectProcurementPackageSupplierSchema.safeParse({
    packageId,
    serviceId,
    supplierId,
    requestId,
  });
  assert.equal(withoutQuotation.success, true);
  if (withoutQuotation.success) {
    assert.equal(withoutQuotation.data.supplierQuotationId, undefined);
  }

  const withQuotation = selectProcurementPackageSupplierSchema.safeParse({
    packageId,
    serviceId,
    supplierId,
    supplierQuotationId: quotationId,
    selectionReason: "Best commercial package matching quotation Q-002",
    requestId,
  });
  assert.equal(withQuotation.success, true);
  if (withQuotation.success) {
    assert.equal(withQuotation.data.supplierQuotationId, quotationId);
  }
});

test("Package status model strictly enforces draft, selected, cancelled and rejects premature committed status", () => {
  const executable = withoutSqlComments(migrationSource);

  // 1. Array contract: exactly draft, selected, cancelled
  assert.deepEqual(Array.from(PROCUREMENT_PACKAGE_STATUSES), ["draft", "selected", "cancelled"]);

  // 2. Schema validation: only draft, selected, cancelled are valid
  assert.equal(procurementPackageStatusSchema.safeParse("draft").success, true);
  assert.equal(procurementPackageStatusSchema.safeParse("selected").success, true);
  assert.equal(procurementPackageStatusSchema.safeParse("cancelled").success, true);

  // Premature "committed" status is strictly rejected
  const committedCheck = procurementPackageStatusSchema.safeParse("committed");
  assert.equal(committedCheck.success, false);

  // Other invalid states are rejected
  assert.equal(procurementPackageStatusSchema.safeParse("approved").success, false);
  assert.equal(procurementPackageStatusSchema.safeParse("in_progress").success, false);
  assert.equal(procurementPackageStatusSchema.safeParse("done").success, false);
  assert.equal(procurementPackageStatusSchema.safeParse("").success, false);

  // 3. Database migration check constraint: status IN ('draft', 'selected', 'cancelled')
  assert.match(
    executable,
    /CONSTRAINT service_procurement_packages_status_check CHECK \(\s*status IN \('draft', 'selected', 'cancelled'\)\s*\)/,
  );

  // "committed" is completely absent from the migration check constraints and RPCs
  assert.doesNotMatch(executable, /'committed'/);
  assert.doesNotMatch(executable, /procurement_package_committed_locked/);

  // Selection consistency check only recognizes draft, selected, cancelled
  assert.match(executable, /status = 'draft'/);
  assert.match(executable, /status = 'selected'/);
  assert.match(executable, /status = 'cancelled'/);
  assert.doesNotMatch(executable, /status IN \('selected', 'committed'\)/);
});

test("Normalized procurement method accepts rental, purchase, service, null and rejects overbroad legacy methods", () => {
  const executable = withoutSqlComments(migrationSource);

  // 1. Array contract: exactly rental, purchase, service
  assert.deepEqual(Array.from(PROCUREMENT_METHODS), ["rental", "purchase", "service"]);

  // 2. Schema validation: method schema accepts valid methods
  assert.equal(procurementMethodSchema.safeParse("rental").success, true);
  assert.equal(procurementMethodSchema.safeParse("purchase").success, true);
  assert.equal(procurementMethodSchema.safeParse("service").success, true);

  // Rejects all legacy, synonymous, and comparison/sourcing values
  const rejectedMethods = ["make", "rent", "buy", "source", "sole_source", "emergency", "other", ""];
  for (const method of rejectedMethods) {
    const res = procurementMethodSchema.safeParse(method);
    assert.equal(res.success, false, `Method "${method}" must be rejected`);
  }

  // 3. Package creation and metadata update schemas accept rental, purchase, service, null, and undefined
  const serviceId = "00000000-0000-4000-8000-000000000001";
  const packageId = "00000000-0000-4000-8000-000000000010";
  const requestId = "00000000-0000-4000-8000-000000000099";

  for (const validMethod of ["rental", "purchase", "service", null, undefined] as const) {
    const createRes = createProcurementPackageSchema.safeParse({
      serviceId,
      name: `Package with ${validMethod}`,
      procurementMethod: validMethod,
      requestId,
    });
    assert.equal(createRes.success, true, `createProcurementPackageSchema must accept method ${validMethod}`);

    const updateRes = updateProcurementPackageMetadataSchema.safeParse({
      packageId,
      serviceId,
      name: `Updated package ${validMethod}`,
      procurementMethod: validMethod,
      requestId,
    });
    assert.equal(updateRes.success, true, `updateProcurementPackageMetadataSchema must accept method ${validMethod}`);
  }

  // Package creation and metadata update schemas reject legacy methods
  for (const rejectedMethod of rejectedMethods) {
    const createRes = createProcurementPackageSchema.safeParse({
      serviceId,
      name: "Invalid Package",
      procurementMethod: rejectedMethod,
      requestId,
    });
    assert.equal(createRes.success, false, `createProcurementPackageSchema must reject method ${rejectedMethod}`);

    const updateRes = updateProcurementPackageMetadataSchema.safeParse({
      packageId,
      serviceId,
      name: "Invalid Package",
      procurementMethod: rejectedMethod,
      requestId,
    });
    assert.equal(updateRes.success, false, `updateProcurementPackageMetadataSchema must reject method ${rejectedMethod}`);
  }

  // 4. Database migration check constraint enforces normalized methods only
  assert.match(
    executable,
    /CONSTRAINT service_procurement_packages_procurement_method_check CHECK \(\s*procurement_method IS NULL\s+OR procurement_method IN \('rental', 'purchase', 'service'\)\s*\)/,
  );

  // 5. RPC upsert_procurement_package validates against normalized methods
  assert.match(
    executable,
    /v_procurement_method NOT IN \('rental', 'purchase', 'service'\)/,
  );
  assert.doesNotMatch(
    executable,
    /'make'|'rent'|'buy'|'sole_source'|'emergency'/,
  );
});

test("Package selection does NOT create a Commitment or accounting record", () => {
  const executable = withoutSqlComments(migrationSource);

  // No insert, trigger, or call into approved_commitments
  assert.doesNotMatch(executable, /INSERT INTO public\.approved_commitments/i);
  assert.doesNotMatch(executable, /create_approved_commitment/i);
  assert.doesNotMatch(executable, /accounts_payable|vendor_bills|purchase_orders/i);

  // Package status transitions: draft -> selected (never committed)
  assert.match(executable, /status = 'selected'/);
  assert.match(executable, /status IN \('draft', 'selected', 'cancelled'\)/);
  assert.doesNotMatch(executable, /status = 'committed'/);
});

test("Legacy W4 candidate and requirement persistence is not destructively removed", () => {
  const executable = withoutSqlComments(migrationSource);

  // No DROP of legacy tables
  assert.doesNotMatch(executable, /DROP TABLE/i);
  assert.doesNotMatch(executable, /DROP FUNCTION/i);
  assert.doesNotMatch(executable, /ALTER TABLE public\.service_procurement_requirements DROP/i);
  assert.doesNotMatch(executable, /ALTER TABLE public\.service_procurement_candidates DROP/i);

  // Preflight verifies legacy tables exist before running
  assert.match(executable, /to_regclass\('public\.service_procurement_requirements'\) IS NULL/);
  assert.match(executable, /to_regclass\('public\.service_procurement_candidates'\) IS NULL/);

  // Legacy requirement optional linkage is supported via legacy_requirement_id
  assert.match(
    executable,
    /legacy_requirement_id uuid REFERENCES public\.service_procurement_requirements\(id\) ON DELETE SET NULL/,
  );

  // Cross-migration verification: legacy tables and commitments remain unchanged
  assert.match(legacyW4Migration, /CREATE TABLE public\.service_procurement_requirements/);
  assert.match(legacyW4Migration, /CREATE TABLE public\.service_procurement_candidates/);
  assert.match(quotationMigration, /CREATE TABLE public\.supplier_quotations/);
  assert.match(commitmentMigration, /CREATE TABLE public\.approved_commitments/);
});

test("No comparison, ranking, scoring, or candidate evaluation semantics are introduced", () => {
  const executable = withoutSqlComments(migrationSource);

  assert.doesNotMatch(executable, /score|scoring|rank|ranking|evaluation_matrix|comparison_board/i);
  assert.doesNotMatch(executable, /winner|bid_winner|shortlist/i);
});

test("No duplicate quotation-document ownership or storage cloning is introduced", () => {
  const executable = withoutSqlComments(migrationSource);

  // No package_documents or duplicated document storage table
  assert.doesNotMatch(executable, /CREATE TABLE public\.service_procurement_package_documents/i);
  assert.doesNotMatch(executable, /CREATE TABLE public\.procurement_package_documents/i);

  // Packages reference supplier_quotations directly, which in turn owns the business_documents linkage
  assert.match(
    executable,
    /selected_supplier_quotation_id uuid/,
  );
});
