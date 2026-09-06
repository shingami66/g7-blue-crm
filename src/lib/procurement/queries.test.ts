import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const SUPPLIER_ID = "22222222-2222-4222-8222-222222222222";
const QUOTATION_ID = "33333333-3333-4333-8333-333333333333";
const REQUIREMENT_ONE_ID = "44444444-4444-4444-8444-444444444444";
const REQUIREMENT_TWO_ID = "55555555-5555-4555-8555-555555555555";
const DOCUMENT_ID = "66666666-6666-4666-8666-666666666666";

const requestedTables: string[] = [];

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
    createAdminClient: () => ({
      from(table: string) {
        requestedTables.push(table);
        const resultByTable: Record<string, { data: unknown[]; error: null }> = {
          supplier_quotations: {
            data: [{
              id: QUOTATION_ID,
              supplier_id: SUPPLIER_ID,
              service_id: SERVICE_ID,
              supplier_reference: "SUP-42",
              quotation_date: "2026-08-20",
              package_total: "1500.00",
              currency: "SAR",
              recorded_at: "2026-08-20T10:00:00Z",
              recorded_by: "actor-1",
              updated_at: "2026-08-20T10:00:00Z",
              updated_by: "actor-1",
              source_candidate_requirement_id: null,
              source_candidate_supplier_id: null,
            }],
            error: null,
          },
          supplier_quotation_requirements: {
            data: [
              {
                quotation_id: QUOTATION_ID,
                requirement_id: REQUIREMENT_ONE_ID,
                service_id: SERVICE_ID,
                line_summary: "Two ushers for the welcome desk.",
                line_amount: "800.00",
                line_evidence_ref: "legacy-candidate-page-1",
                created_at: "2026-08-20T10:00:00Z",
                created_by: "actor-1",
              },
              {
                quotation_id: QUOTATION_ID,
                requirement_id: REQUIREMENT_TWO_ID,
                service_id: SERVICE_ID,
                line_summary: "One coordinator for the closing session.",
                line_amount: null,
                line_evidence_ref: null,
                created_at: "2026-08-20T10:00:00Z",
                created_by: "actor-1",
              },
            ],
            error: null,
          },
          service_procurement_requirements: {
            data: [
              {
                id: REQUIREMENT_ONE_ID,
                service_id: SERVICE_ID,
                requirement: "Welcome desk ushers",
                sourcing_path: "source",
                selection_status: "selected",
                selected_supplier_id: SUPPLIER_ID,
              },
              {
                id: REQUIREMENT_TWO_ID,
                service_id: SERVICE_ID,
                requirement: "Closing session coordinator",
                sourcing_path: "source",
                selection_status: "open",
                selected_supplier_id: null,
              },
            ],
            error: null,
          },
          services: {
            data: [{
              id: SERVICE_ID,
              service_number: "SVC-42",
              service_title: "Annual gathering",
              event_name: "Welcome event",
              status: "Approved",
              deleted_at: null,
            }],
            error: null,
          },
          supplier_quotation_documents: {
            data: [{
              quotation_id: QUOTATION_ID,
              document_id: DOCUMENT_ID,
              attached_by: "actor-1",
              attached_at: "2026-08-20T10:01:00Z",
            }],
            error: null,
          },
          business_documents: {
            data: [{
              id: DOCUMENT_ID,
              original_filename: "supplier-quote.pdf",
              mime_type: "application/pdf",
              file_size: 2048,
            }],
            error: null,
          },
        };
        const result = resultByTable[table] ?? { data: [], error: null };
        const query = {
          select() { return query; },
          eq() { return query; },
          in() { return query; },
          is() { return query; },
          order() { return query; },
          then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
            return Promise.resolve(result).then(resolve, reject);
          },
        };
        return query;
      },
    }),
  },
});

const { getSupplierQuotationHistoryBySupplierId } = await import("./queries.ts");

test("Supplier quotation history maps one first-class header to many requirement lines and documents", async () => {
  requestedTables.length = 0;

  const result = await getSupplierQuotationHistoryBySupplierId(SUPPLIER_ID, {
    includeDocuments: true,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.quotations.length, 1);
  assert.deepEqual(result.quotations[0], {
    id: QUOTATION_ID,
    supplierId: SUPPLIER_ID,
    serviceId: SERVICE_ID,
    serviceNumber: "SVC-42",
    serviceTitle: "Annual gathering",
    eventName: "Welcome event",
    serviceStatus: "Approved",
    serviceDeleted: false,
    supplierReference: "SUP-42",
    quotationDate: "2026-08-20",
    packageTotal: 1500,
    currency: "SAR",
    pricingMode: "legacy",
    recordedAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-08-20T10:00:00Z",
    sourceCandidateRequirementId: null,
    sourceCandidateSupplierId: null,
    requirements: [
      {
        requirementId: REQUIREMENT_ONE_ID,
        requirement: "Welcome desk ushers",
        lineSummary: "Two ushers for the welcome desk.",
        lineAmount: 800,
        legacyEvidenceRef: "legacy-candidate-page-1",
      },
      {
        requirementId: REQUIREMENT_TWO_ID,
        requirement: "Closing session coordinator",
        lineSummary: "One coordinator for the closing session.",
        lineAmount: null,
        legacyEvidenceRef: null,
      },
    ],
    lines: [],
    documents: [{
      documentId: DOCUMENT_ID,
      originalFilename: "supplier-quote.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
      attachedAt: "2026-08-20T10:01:00Z",
    }],
  });
  assert.equal(requestedTables.includes("service_procurement_candidates"), false);
  assert.equal(requestedTables.includes("supplier_quotations"), true);
  assert.equal(requestedTables.includes("supplier_quotation_requirements"), true);
  assert.equal(requestedTables.includes("supplier_quotation_documents"), true);
});
