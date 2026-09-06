import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test, { mock } from "node:test";
import type {
  BusinessDocumentFile,
  BusinessDocumentMimeType,
} from "./storage.ts";

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export default {}", shortCircuit: true };
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

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}

type DocumentRow = Record<string, unknown>;
type Scenario = {
  authError: "unauthorized" | "forbidden" | null;
  uploadError: { message: string } | null;
  removeError: { message: string } | null;
  metadataError: { message: string } | null;
  metadataDeleteError: { message: string } | null;
  metadataDeleteRejects: boolean;
  linkError: { message: string } | null;
  linkDeleteError: { message: string } | null;
  linkDeleteRejects: boolean;
  removeRejects: boolean;
  document: DocumentRow | null;
  serviceExists: boolean;
  documentLinkedToService: boolean;
};

const state: {
  scenario: Scenario;
  permissionCalls: string[];
  uploadCalls: Array<{ path: string; body: Blob; options: Record<string, unknown> }>;
  removeCalls: string[][];
  signedUrlCalls: string[];
  downloadCalls: string[];
  metadataInserts: DocumentRow[];
  metadataDeleteCalls: number;
  linkInserts: DocumentRow[];
  linkDeleteCalls: number;
  cleanupEvents: string[];
} = {
  scenario: {
    authError: null,
    uploadError: null,
    removeError: null,
    metadataError: null,
    metadataDeleteError: null,
    metadataDeleteRejects: false,
    linkError: null,
    linkDeleteError: null,
    linkDeleteRejects: false,
    removeRejects: false,
    document: null,
    serviceExists: true,
    documentLinkedToService: true,
  },
  permissionCalls: [],
  uploadCalls: [],
  removeCalls: [],
  signedUrlCalls: [],
  downloadCalls: [],
  metadataInserts: [],
  metadataDeleteCalls: 0,
  linkInserts: [],
  linkDeleteCalls: 0,
  cleanupEvents: [],
};

function resetScenario(overrides: Partial<Scenario> = {}) {
  state.scenario = {
    authError: null,
    uploadError: null,
    removeError: null,
    metadataError: null,
    metadataDeleteError: null,
    metadataDeleteRejects: false,
    linkError: null,
    linkDeleteError: null,
    linkDeleteRejects: false,
    removeRejects: false,
    document: null,
    serviceExists: true,
    documentLinkedToService: true,
    ...overrides,
  };
  state.permissionCalls = [];
  state.uploadCalls = [];
  state.removeCalls = [];
  state.signedUrlCalls = [];
  state.downloadCalls = [];
  state.metadataInserts = [];
  state.metadataDeleteCalls = 0;
  state.linkInserts = [];
  state.linkDeleteCalls = 0;
  state.cleanupEvents = [];
}

function queryResult(result: { data?: unknown; error?: unknown }, rejection?: Error) {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    is: () => query,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => {
      const settled = rejection ? Promise.reject(rejection) : Promise.resolve(result);
      return settled.then(resolve, reject);
    },
  };
  return query;
}

function createMockClient() {
  return {
    from(table: string) {
      if (table === "services") {
        return {
          select: () => queryResult({ data: state.scenario.serviceExists ? { id: "11111111-1111-4111-8111-111111111111" } : null, error: null }),
        };
      }

      if (table === "business_document_links") {
        return {
          select: () => queryResult({
            data: state.scenario.documentLinkedToService
              ? { document_id: documentId, service_id: serviceId }
              : null,
            error: null,
          }),
          insert: (value: DocumentRow) => {
            state.linkInserts.push(value);
            return queryResult({ data: state.scenario.linkError ? null : { ...value, created_at: "2026-09-01T00:00:00.000Z" }, error: state.scenario.linkError });
          },
          delete: () => {
            state.linkDeleteCalls += 1;
            state.cleanupEvents.push("link-delete");
            if (state.scenario.linkDeleteRejects) {
              return queryResult({}, new Error("link cleanup rejected"));
            }
            return queryResult({ error: state.scenario.linkDeleteError });
          },
        };
      }

      return {
        select: () => queryResult({ data: state.scenario.document, error: null }),
        insert: (value: DocumentRow) => {
          state.metadataInserts.push(value);
          const data = state.scenario.metadataError
            ? null
            : {
                ...value,
                created_at: "2026-09-01T00:00:00.000Z",
                updated_at: "2026-09-01T00:00:00.000Z",
              };
          return queryResult({ data, error: state.scenario.metadataError });
        },
        delete: () => {
          state.metadataDeleteCalls += 1;
          state.cleanupEvents.push("metadata-delete");
          if (state.scenario.metadataDeleteRejects) {
            return queryResult({}, new Error("metadata cleanup rejected"));
          }
          return queryResult({ error: state.scenario.metadataDeleteError });
        },
      };
    },
    storage: {
      from() {
        return {
          upload: async (path: string, body: Blob, options: Record<string, unknown>) => {
            state.uploadCalls.push({ path, body, options });
            return { data: state.scenario.uploadError ? null : { path }, error: state.scenario.uploadError };
          },
          remove: async (paths: string[]) => {
            state.removeCalls.push(paths);
            state.cleanupEvents.push("object-remove");
            if (state.scenario.removeRejects) {
              throw new Error("object cleanup rejected");
            }
            return { data: paths.map((path) => ({ name: path })), error: state.scenario.removeError };
          },
          createSignedUrl: async (path: string) => {
            state.signedUrlCalls.push(path);
            return { data: { signedUrl: `https://private.example/signed/${path}` }, error: null };
          },
          download: async (path: string) => {
            state.downloadCalls.push(path);
            return { data: new Blob(["original-bytes"], { type: "application/pdf" }), error: null };
          },
        };
      },
    },
  };
}

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
  },
});

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      state.permissionCalls.push(permission);
      if (state.scenario.authError === "unauthorized") throw new TestUnauthorizedError("Sign in required");
      if (state.scenario.authError === "forbidden") throw new TestForbiddenError("Permission denied");
      return { clerk_user_id: "clerk_test_user", role: "admin" };
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: createMockClient,
  },
});

const storage = await import("./storage.ts");
const actions = await import("./actions.ts");

function file(name: string, type: string, bytes: Uint8Array): BusinessDocumentFile {
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}

function supportedFile(type: BusinessDocumentMimeType, name = "evidence.pdf") {
  if (type === "application/pdf") return file(name, type, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]));
  if (type === "image/jpeg") return file(name, type, new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
  return file(name, type, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

const documentId = "11111111-1111-4111-8111-111111111111";
const serviceId = "22222222-2222-4222-8222-222222222222";

function persistedDocument(overrides: DocumentRow = {}): DocumentRow {
  return {
    id: documentId,
    bucket_id: "business-evidence",
    object_path: `business-documents/${documentId}.pdf`,
    original_filename: "evidence.pdf",
    mime_type: "application/pdf",
    file_size: 6,
    document_type: "supplier_quote",
    purpose: "Supplier quotation evidence",
    uploaded_by: "clerk_test_user",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

async function assertDocumentError(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) =>
    error instanceof storage.BusinessDocumentError && error.code === code,
  );
}

test("supported document signatures are accepted and retain their declared MIME type", async () => {
  const cases: Array<[BusinessDocumentMimeType, string]> = [
    ["application/pdf", "evidence.pdf"],
    ["image/jpeg", "evidence.jpg"],
    ["image/png", "evidence.png"],
  ];

  for (const [mimeType, filename] of cases) {
    const result = await storage.validateBusinessDocumentFile(supportedFile(mimeType, filename));
    assert.equal(result.mimeType, mimeType);
    assert.equal(result.originalFilename, filename);
    assert.ok(result.fileSize > 0);
  }
});

test("unsupported, empty, oversized, unsafe, and content-mismatched files are rejected", async () => {
  await assertDocumentError(storage.validateBusinessDocumentFile(file("evidence.txt", "text/plain", new Uint8Array([1]))), "unsupported_document_type");
  await assertDocumentError(storage.validateBusinessDocumentFile(file("evidence.pdf", "application/pdf", new Uint8Array())), "document_file_empty");
  await assertDocumentError(storage.validateBusinessDocumentFile({
    ...supportedFile("application/pdf"),
    size: storage.BUSINESS_DOCUMENT_MAX_BYTES + 1,
  }), "document_file_too_large");
  await assertDocumentError(storage.validateBusinessDocumentFile(supportedFile("application/pdf", "../evidence.pdf")), "unsafe_document_filename");
  await assertDocumentError(storage.validateBusinessDocumentFile(file("evidence.pdf", "application/pdf", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))), "document_file_type_mismatch");
});

test("document upload preflight authorizes and validates before storage access", async () => {
  resetScenario({ authError: "forbidden" });
  await assert.rejects(
    storage.preflightPrivateBusinessDocumentUpload(supportedFile("application/pdf")),
    (error: unknown) => error instanceof TestForbiddenError,
  );
  assert.deepEqual(state.permissionCalls, ["documents:write"]);
  assert.equal(state.uploadCalls.length, 0);

  resetScenario();
  await assertDocumentError(
    storage.preflightPrivateBusinessDocumentUpload(file("evidence.txt", "text/plain", new Uint8Array([1]))),
    "unsupported_document_type",
  );
  assert.deepEqual(state.permissionCalls, ["documents:write"]);
  assert.equal(state.uploadCalls.length, 0);

  resetScenario();
  await storage.preflightPrivateBusinessDocumentUpload(supportedFile("application/pdf"));
  assert.deepEqual(state.permissionCalls, ["documents:write"]);
  assert.equal(state.uploadCalls.length, 0);
});

test("generated object paths are document-ID based and reject traversal-shaped IDs", () => {
  assert.equal(
    storage.buildBusinessDocumentObjectPath(documentId, "application/pdf"),
    `business-documents/${documentId}.pdf`,
  );
  assert.equal(storage.isSafeBusinessDocumentObjectPath(`business-documents/${documentId}.pdf`), true);
  assert.equal(storage.isSafeBusinessDocumentObjectPath("business-documents/../evidence.pdf"), false);
  assert.throws(() => storage.buildBusinessDocumentObjectPath("../../evidence", "application/pdf"), /path is invalid/);
});

test("authorized upload uses a private generated path and stores consistent metadata", async () => {
  resetScenario();

  const result = await storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "supplier_quote",
    purpose: "Supplier quotation evidence",
  });

  assert.equal(state.permissionCalls[0], "documents:write");
  assert.equal(state.uploadCalls.length, 1);
  assert.equal(state.uploadCalls[0].options.upsert, false);
  assert.match(state.uploadCalls[0].path, /^business-documents\/[0-9a-f-]+\.pdf$/);
  assert.equal(state.uploadCalls[0].body.type, "application/pdf");
  assert.equal(state.metadataInserts[0].bucket_id, "business-evidence");
  assert.equal(state.metadataInserts[0].object_path, state.uploadCalls[0].path);
  assert.equal(state.metadataInserts[0].original_filename, "evidence.pdf");
  assert.equal(state.metadataInserts[0].file_size, 6);
  assert.equal(result.object_path, state.uploadCalls[0].path);
  assert.equal(result.mime_type, "application/pdf");
});

test("optional Service linkage validates the target and records a narrow reusable link", async () => {
  resetScenario();

  await storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "service_evidence",
    purpose: "Service evidence",
    link: { serviceId, linkPurpose: "supporting_evidence" },
  });

  assert.equal(state.linkInserts.length, 1);
  assert.equal(state.linkInserts[0].service_id, serviceId);
  assert.equal(state.linkInserts[0].link_purpose, "supporting_evidence");
});

test("metadata failure attempts object cleanup and returns a safe failure", async () => {
  resetScenario({ metadataError: { message: "database unavailable" } });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "supplier_quote",
    purpose: "Supplier quotation evidence",
  }), "document_metadata_write_failed");

  assert.equal(state.uploadCalls.length, 1);
  assert.deepEqual(state.removeCalls, [[state.uploadCalls[0].path]]);
  assert.equal(state.metadataDeleteCalls, 1);
});

test("upload failure still attempts object cleanup and leaves metadata untouched", async () => {
  resetScenario({ uploadError: { message: "storage unavailable" } });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "supplier_quote",
    purpose: "Supplier quotation evidence",
  }), "document_storage_upload_failed");

  assert.equal(state.metadataInserts.length, 0);
  assert.equal(state.removeCalls.length, 1);
});

test("successful full compensation removes the object after link and metadata cleanup", async () => {
  resetScenario({ linkError: { message: "link unavailable" } });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "service_evidence",
    purpose: "Service evidence",
    link: { serviceId, linkPurpose: "supporting_evidence" },
  }), "document_link_write_failed");

  assert.equal(state.metadataInserts.length, 1);
  assert.equal(state.linkInserts.length, 1);
  assert.equal(state.linkDeleteCalls, 1);
  assert.equal(state.metadataDeleteCalls, 1);
  assert.equal(state.removeCalls.length, 1);
  assert.deepEqual(state.cleanupEvents, ["link-delete", "metadata-delete", "object-remove"]);
});

test("cleanup failure is fail-closed instead of reporting a successful or ordinary upload failure", async () => {
  resetScenario({ uploadError: { message: "unknown upload outcome" }, removeError: { message: "cleanup unavailable" } });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "supplier_quote",
    purpose: "Supplier quotation evidence",
  }), "document_storage_cleanup_failed");
  assert.equal(state.removeCalls.length, 1);
});

test("metadata cleanup failure retains the object and fails closed", async () => {
  resetScenario({
    metadataError: { message: "metadata outcome unknown" },
    metadataDeleteError: { message: "metadata cleanup unavailable" },
  });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "supplier_quote",
    purpose: "Supplier quotation evidence",
  }), "document_storage_cleanup_failed");
  assert.equal(state.metadataDeleteCalls, 1);
  assert.equal(state.removeCalls.length, 0);
  assert.deepEqual(state.cleanupEvents, ["metadata-delete"]);
});

test("link cleanup failure retains the object and fails closed", async () => {
  resetScenario({
    linkError: { message: "link outcome unknown" },
    linkDeleteError: { message: "link cleanup unavailable" },
  });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "service_evidence",
    purpose: "Service evidence",
    link: { serviceId, linkPurpose: "supporting_evidence" },
  }), "document_storage_cleanup_failed");
  assert.equal(state.linkDeleteCalls, 1);
  assert.equal(state.metadataDeleteCalls, 1);
  assert.equal(state.removeCalls.length, 0);
  assert.deepEqual(state.cleanupEvents, ["link-delete", "metadata-delete"]);
});

test("rejected database cleanup retains the object and returns cleanup failure", async () => {
  resetScenario({
    linkError: { message: "link outcome unknown" },
    linkDeleteRejects: true,
    metadataDeleteRejects: true,
  });

  await assertDocumentError(storage.uploadPrivateBusinessDocument({
    file: supportedFile("application/pdf"),
    documentType: "service_evidence",
    purpose: "Service evidence",
    link: { serviceId, linkPurpose: "supporting_evidence" },
  }), "document_storage_cleanup_failed");
  assert.equal(state.linkDeleteCalls, 1);
  assert.equal(state.metadataDeleteCalls, 1);
  assert.equal(state.removeCalls.length, 0);
  assert.deepEqual(state.cleanupEvents, ["link-delete", "metadata-delete"]);
});

test("unauthenticated and forbidden upload/read stop before any privileged storage call", async () => {
  for (const authError of ["unauthorized", "forbidden"] as const) {
    resetScenario({ authError });

    const uploadResult = await actions.uploadServiceBusinessDocument({
      file: supportedFile("application/pdf"),
      documentType: "supplier_quote",
      purpose: "Supplier quotation evidence",
      serviceId,
      linkPurpose: "supporting_evidence",
    });
    const expected = authError === "unauthorized"
      ? { success: false, code: "UNAUTHORIZED", error: "Unauthorized" }
      : { success: false, code: "FORBIDDEN", error: "Forbidden" };
    assert.deepEqual(uploadResult, expected);

    const viewResult = await actions.createServiceBusinessDocumentViewUrl({ documentId, serviceId });
    assert.deepEqual(viewResult, expected);
    assert.equal(state.uploadCalls.length, 0);
    assert.equal(state.signedUrlCalls.length, 0);
  }
});

test("Service actions require the linked Service boundary and expose no generic document action", async () => {
  resetScenario({ document: persistedDocument(), documentLinkedToService: false });

  assert.equal("uploadBusinessDocument" in actions, false);
  assert.equal("createBusinessDocumentViewUrl" in actions, false);
  assert.equal("linkBusinessDocument" in actions, false);

  const result = await actions.createServiceBusinessDocumentViewUrl({ documentId, serviceId });
  assert.deepEqual(result, {
    success: false,
    code: "document_not_found",
    error: "The document was not found for this Service.",
  });
  assert.deepEqual(state.permissionCalls, ["services:read", "documents:read"]);
  assert.equal(state.signedUrlCalls.length, 0);
});

test("authorized private view URL and server download use metadata paths without public URL generation", async () => {
  resetScenario({ document: persistedDocument() });

  const view = await storage.createPrivateBusinessDocumentUrlForService({ documentId, serviceId });
  assert.equal(view.document.object_path, `business-documents/${documentId}.pdf`);
  assert.match(view.signedUrl, /^https:\/\/private\.example\/signed\//);
  assert.equal(view.expiresInSeconds, 300);

  const download = await storage.downloadPrivateBusinessDocumentForService({ documentId, serviceId });
  assert.equal(await download.data.text(), "original-bytes");
  assert.deepEqual(state.signedUrlCalls, [`business-documents/${documentId}.pdf`]);
  assert.deepEqual(state.downloadCalls, [`business-documents/${documentId}.pdf`]);
});

test("server-only storage boundary contains no client credential or public URL path", () => {
  const storageSource = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const adminSource = readFileSync(new URL("../supabase/admin.ts", import.meta.url), "utf8");
  const actionsSource = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

  assert.match(storageSource, /import ["']server-only["']/);
  assert.doesNotMatch(storageSource, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE/);
  assert.doesNotMatch(storageSource, /getPublicUrl/);
  assert.match(adminSource, /import ["']server-only["']/);
  assert.match(actionsSource, /^"use server";/);
  assert.doesNotMatch(actionsSource, /"use client"/);
});

test("migration and provisioning manifest keep the bucket private and application-owned", () => {
  const migrationSource = readFileSync(
    new URL("../../../supabase/migrations/20260901150000_shared_business_document_storage_foundation.sql", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(readFileSync(
    new URL("../../../supabase/business-evidence.bucket.json", import.meta.url),
    "utf8",
  )) as {
    bucketId: string;
    public: boolean;
    fileSizeLimitBytes: number;
    allowedMimeTypes: string[];
    objectPathPrefix: string;
  };
  const nextConfigSource = readFileSync(
    new URL("../../../next.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(migrationSource, /CREATE TABLE public\.business_documents/i);
  assert.match(migrationSource, /CREATE TABLE public\.business_document_links/i);
  assert.match(migrationSource, /service_id uuid NOT NULL REFERENCES public\.services\(id\) ON DELETE RESTRICT/i);
  assert.doesNotMatch(migrationSource, /entity_type|entity_id/i);
  assert.match(migrationSource, /ALTER TABLE public\.business_documents ENABLE ROW LEVEL SECURITY/i);
  assert.match(migrationSource, /ALTER TABLE public\.business_document_links ENABLE ROW LEVEL SECURITY/i);
  assert.match(migrationSource, /REVOKE ALL ON TABLE public\.business_documents FROM PUBLIC, anon, authenticated/i);
  assert.match(migrationSource, /GRANT ALL ON TABLE public\.business_documents TO service_role/i);
  assert.doesNotMatch(migrationSource, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+storage\./i);
  assert.match(nextConfigSource, /bodySizeLimit:\s*25 \* 1024 \* 1024 \+ 20 \* 1024/);

  assert.deepEqual(manifest, {
    bucketId: "business-evidence",
    public: false,
    fileSizeLimitBytes: 26214400,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    objectPathPrefix: "business-documents/",
    provisioning: "manual-supabase-dashboard",
  });
});
