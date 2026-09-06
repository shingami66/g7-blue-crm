import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_REQUIREMENT_ID = "66666666-6666-4666-8666-666666666666";
const SUPPLIER_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";
const SECOND_REQUEST_ID = "77777777-7777-4777-8777-777777777777";
const QUOTATION_ID = "88888888-8888-4888-8888-888888888888";
const SECOND_QUOTATION_ID = "99999999-9999-4999-8999-999999999999";
const DOCUMENT_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_DOCUMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type State = {
  rpcResults: Record<string, unknown[]>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  permissionCalls: string[];
  preflightCalls: unknown[];
  preflightError: unknown;
  uploadCalls: Array<Record<string, unknown>>;
  cleanupCalls: Array<{ documentId: string; serviceId: string; linkPurpose: string }>;
  signedUrlCalls: Array<Record<string, unknown>>;
  auditAttachment: Record<string, unknown> | null;
  auditQueryError: { message: string } | null;
};

let active: State = freshState();
let denyPermission = false;

function freshState(): State {
  return {
    rpcResults: {},
    rpcCalls: [],
    permissionCalls: [],
    preflightCalls: [],
    preflightError: null,
    uploadCalls: [],
    cleanupCalls: [],
    signedUrlCalls: [],
    auditAttachment: null,
    auditQueryError: null,
  };
}

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

function queryFor(table: string) {
  const filters: Record<string, unknown> = {};
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return chain;
    },
    maybeSingle: async () => {
      if (table === "audit_logs") return { data: active.auditAttachment, error: active.auditQueryError };
      if (table === "supplier_quotation_documents") {
        if (filters.document_id !== DOCUMENT_ID || filters.quotation_id !== QUOTATION_ID) {
          return { data: null, error: null };
        }
        return { data: { quotation_id: QUOTATION_ID, document_id: DOCUMENT_ID }, error: null };
      }
      if (table === "supplier_quotations") return { data: { service_id: SERVICE_ID }, error: null };
      return { data: null, error: null };
    },
  };
  return chain;
}

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
    }
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

mock.module("@/lib/auth/errors", {
  namedExports: { ForbiddenError: TestForbiddenError, UnauthorizedError: TestUnauthorizedError },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      active.permissionCalls.push(permission);
      if (denyPermission) throw new TestForbiddenError("denied");
      return { clerk_user_id: "server-derived-actor", role: "manager" };
    },
  },
});
mock.module("@/lib/documents/storage", {
  namedExports: {
    cleanupUploadedPrivateBusinessDocument: async (
      document: { id: string },
      link: { serviceId: string; linkPurpose: string },
    ) => {
      active.cleanupCalls.push({ documentId: document.id, ...link });
      return true;
    },
    preflightPrivateBusinessDocumentUpload: async (file: unknown) => {
      active.permissionCalls.push("documents:write");
      active.preflightCalls.push(file);
      if (active.preflightError) throw active.preflightError;
    },
    uploadPrivateBusinessDocument: async (input: Record<string, unknown>) => {
      active.uploadCalls.push(input);
      const documentId = active.uploadCalls.length === 1 ? DOCUMENT_ID : SECOND_DOCUMENT_ID;
      return { id: documentId, object_path: `business-documents/${documentId}.pdf` };
    },
    createPrivateBusinessDocumentUrlForService: async (input: Record<string, unknown>) => {
      active.signedUrlCalls.push(input);
      return { signedUrl: "https://example.invalid/private-document", expiresInSeconds: 300 };
    },
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        active.rpcCalls.push({ name, args });
        return { data: active.rpcResults[name]?.shift() ?? [], error: null };
      },
      from: (table: string) => queryFor(table),
    }),
  },
});

const {
  createSupplierQuotationDocumentViewUrl,
  recordSupplierQuotationEvidence,
} = await import("./actions.ts");

function quotationResult(quotationId = QUOTATION_ID, idempotentReplay = false) {
  return [{
    error_code: null,
    quotation_id: quotationId,
    supplier_id: SUPPLIER_ID,
    service_id: SERVICE_ID,
    line_count: 2,
    idempotent_replay: idempotentReplay,
  }];
}

function quotationInput(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: SUPPLIER_ID,
    serviceId: SERVICE_ID,
    supplierReference: "SUP-Q-17",
    quotationDate: "2026-09-02",
    packageTotal: "5000.00",
    requirements: [
      {
        requirementId: REQUIREMENT_ID,
        lineSummary: "LED screen package",
        lineAmount: "3000.00",
      },
      {
        requirementId: SECOND_REQUIREMENT_ID,
        lineSummary: "Sound package",
        lineAmount: "",
      },
    ],
    requestId: REQUEST_ID,
    ...overrides,
  };
}

test("supplier quotation creation writes one header with multiple requirement lines", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult()];

  const result = await recordSupplierQuotationEvidence(quotationInput());

  assert.equal(result.success, true);
  assert.deepEqual(active.rpcCalls.map((call) => call.name), ["create_supplier_quotation"]);
  assert.equal(active.rpcCalls[0]?.args.p_supplier_reference, "SUP-Q-17");
  assert.equal(active.rpcCalls[0]?.args.p_package_total, 5000);
  assert.deepEqual(active.rpcCalls[0]?.args.p_requirements, [
    {
      requirement_id: REQUIREMENT_ID,
      line_summary: "LED screen package",
      line_amount: 3000,
    },
    {
      requirement_id: SECOND_REQUIREMENT_ID,
      line_summary: "Sound package",
      line_amount: null,
    },
  ]);
  assert.equal(active.rpcCalls.some((call) => call.name.includes("candidate")), false);
});

test("multiple historical quotations for the same requirements remain separate records", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult(), quotationResult(SECOND_QUOTATION_ID)];

  const first = await recordSupplierQuotationEvidence(quotationInput());
  const second = await recordSupplierQuotationEvidence(quotationInput({
    supplierReference: "SUP-Q-18",
    requestId: SECOND_REQUEST_ID,
  }));

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.deepEqual(active.rpcCalls.map((call) => call.name), [
    "create_supplier_quotation",
    "create_supplier_quotation",
  ]);
  assert.equal(active.rpcCalls[0]?.args.p_supplier_id, SUPPLIER_ID);
  assert.equal(active.rpcCalls[1]?.args.p_supplier_reference, "SUP-Q-18");
});

test("supplier quotation rejects a document authorization failure before quotation mutation", async () => {
  active = freshState();
  active.preflightError = new TestForbiddenError("document access denied");

  const result = await recordSupplierQuotationEvidence(quotationInput({
    files: [{ name: "quote.pdf", type: "application/pdf", size: 4 }],
  }));

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.code, "FORBIDDEN");
  assert.deepEqual(active.permissionCalls, ["supplier_costing:write", "documents:write"]);
  assert.equal(active.rpcCalls.length, 0);
});

test("supplier quotation attaches multiple preserved originals through one bounded RPC", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult()];
  active.rpcResults.attach_supplier_quotation_documents = [[{
    error_code: null,
    quotation_id: QUOTATION_ID,
    service_id: SERVICE_ID,
    document_count: 2,
    idempotent_replay: false,
  }]];

  const result = await recordSupplierQuotationEvidence(quotationInput({
    files: [
      { name: "quote.pdf", type: "application/pdf", size: 4 },
      { name: "terms.pdf", type: "application/pdf", size: 4 },
    ],
  }));

  assert.equal(result.success, true);
  assert.equal(active.uploadCalls.length, 2);
  assert.deepEqual(active.rpcCalls.map((call) => call.name), [
    "create_supplier_quotation",
    "attach_supplier_quotation_documents",
  ]);
  assert.deepEqual(active.rpcCalls[1]?.args.p_document_ids, [DOCUMENT_ID, SECOND_DOCUMENT_ID]);
  assert.equal(active.uploadCalls[0]?.link && (active.uploadCalls[0].link as { serviceId: string }).serviceId, SERVICE_ID);
});

test("supplier quotation cleans up all uploaded originals when the relation RPC fails", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult()];
  active.rpcResults.attach_supplier_quotation_documents = [[{
    error_code: "supplier_quotation_document_unavailable",
    quotation_id: QUOTATION_ID,
    service_id: SERVICE_ID,
    document_count: 2,
    idempotent_replay: false,
  }]];

  const result = await recordSupplierQuotationEvidence(quotationInput({
    files: [
      { name: "quote.pdf", type: "application/pdf", size: 4 },
      { name: "terms.pdf", type: "application/pdf", size: 4 },
    ],
  }));

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.code, "supplier_quotation_document_unavailable");
  assert.deepEqual(active.cleanupCalls, [
    { documentId: DOCUMENT_ID, serviceId: SERVICE_ID, linkPurpose: "supplier_quotation" },
    { documentId: SECOND_DOCUMENT_ID, serviceId: SERVICE_ID, linkPurpose: "supplier_quotation" },
  ]);
});

test("supplier quotation preserves uploaded originals when attachment outcome is indeterminate", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult()];
  active.rpcResults.attach_supplier_quotation_documents = [[]];
  active.auditQueryError = { message: "audit read unavailable" };

  const result = await recordSupplierQuotationEvidence(quotationInput({
    files: [{ name: "quote.pdf", type: "application/pdf", size: 4 }],
  }));

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.code, "supplier_quotation_document_outcome_unknown");
  assert.equal(active.cleanupCalls.length, 0);
});

test("supplier quotation file replay reuses audited originals without another upload", async () => {
  active = freshState();
  active.rpcResults.create_supplier_quotation = [quotationResult(QUOTATION_ID, true)];
  active.auditAttachment = {
    details: {
      payload: { quotation_id: QUOTATION_ID, document_ids: [DOCUMENT_ID, SECOND_DOCUMENT_ID] },
    },
  };

  const result = await recordSupplierQuotationEvidence(quotationInput({
    files: [{ name: "quote.pdf", type: "application/pdf", size: 4 }],
  }));

  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.documentIds, [DOCUMENT_ID, SECOND_DOCUMENT_ID]);
  assert.equal(active.uploadCalls.length, 0);
  assert.deepEqual(active.rpcCalls.map((call) => call.name), ["create_supplier_quotation"]);
});

test("supplier quotation document view uses the first-class quotation relation and permission guard", async () => {
  active = freshState();

  const allowed = await createSupplierQuotationDocumentViewUrl({
    quotationId: QUOTATION_ID,
    documentId: DOCUMENT_ID,
  });
  assert.equal(allowed.success, true);
  assert.deepEqual(active.signedUrlCalls[0], { documentId: DOCUMENT_ID, serviceId: SERVICE_ID });

  const mismatched = await createSupplierQuotationDocumentViewUrl({
    quotationId: QUOTATION_ID,
    documentId: SECOND_DOCUMENT_ID,
  });
  assert.equal(mismatched.success, false);
  if (!mismatched.success) assert.equal(mismatched.code, "supplier_quotation_document_not_found");

  denyPermission = true;
  const denied = await createSupplierQuotationDocumentViewUrl({
    quotationId: QUOTATION_ID,
    documentId: DOCUMENT_ID,
  });
  assert.equal(denied.success, false);
  if (!denied.success) assert.equal(denied.code, "FORBIDDEN");
  denyPermission = false;
});
