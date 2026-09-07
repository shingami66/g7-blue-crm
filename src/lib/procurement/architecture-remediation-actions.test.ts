import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

// External authorization/session and RPC boundaries are controlled here. These
// exercise real action/schema code; they do not claim PostgreSQL execution.
const ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT = "22222222-2222-4222-8222-222222222222";
const REQUEST = "33333333-3333-4333-8333-333333333333";
let denied = false;
let result: Record<string, unknown> = {};
let calls: Array<{ name: string; args: Record<string, unknown> }> = [];
let permissions: string[] = [];
class ForbiddenError extends Error {}
class UnauthorizedError extends Error {}
function reset(row: Record<string, unknown> = {}) {
  denied = false; result = row; calls = []; permissions = [];
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
mock.module("@/lib/auth/errors", { namedExports: { ForbiddenError, UnauthorizedError } });
mock.module("@/lib/auth/permissions", { namedExports: {
  requirePermission: async (permission: string) => {
    permissions.push(permission);
    if (denied) throw new ForbiddenError();
    return { clerk_user_id: "authenticated-reviewer", role: "manager" };
  },
} });
mock.module("@/lib/supabase/admin", { namedExports: {
  createAdminClient: () => ({ rpc: async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args }); return { data: [result], error: null };
  } }),
} });
mock.module("@/lib/documents/storage", { namedExports: {
  cleanupUploadedPrivateBusinessDocument: async () => { throw new Error("unexpected document call"); },
  createPrivateBusinessDocumentUrlForService: async () => { throw new Error("unexpected document call"); },
  preflightPrivateBusinessDocumentUpload: async () => { throw new Error("unexpected document call"); },
  uploadPrivateBusinessDocument: async () => { throw new Error("unexpected document call"); },
} });
const { setProcurementPackageRequirements } = await import("./package-actions.ts");
const { reviewServiceReceipt, transitionApprovedCommitment, correctServiceReceipt } = await import("./commitment-receipt-actions.ts");

test("package setter passes retained IDs and leaves new identities to persistence", async () => {
  reset({ error_code: null, package_id: ID, requirement_count: 2, idempotent_replay: false });
  const value = await setProcurementPackageRequirements({ packageId: ID, serviceId: ID, requestId: REQUEST,
    requirements: [{ id: REQUIREMENT, title: "Retained, edited" }, { title: "New scope" }] });
  assert.equal(value.success, true);
  assert.deepEqual(permissions, ["supplier_costing:write"]);
  assert.equal(calls[0].name, "set_procurement_package_requirements");
  const requirements = calls[0].args.p_requirements as Array<Record<string, unknown>>;
  assert.equal(requirements[0].id, REQUIREMENT);
  assert.equal(requirements[1].id, null);
  assert.equal(calls[0].args.p_actor_id, "authenticated-reviewer");
});

for (const acceptanceStatus of ["ACCEPTED", "ACCEPTED_WITH_CONDITIONS", "REJECTED"] as const) {
  test(`receipt ${acceptanceStatus} propagates authoritative self-review denial`, async () => {
    reset({ error_code: "service_receipt_self_review_forbidden" });
    const value = await reviewServiceReceipt({ receiptId: ID, acceptanceStatus, conditionsNotes: "Review notes", requestId: REQUEST });
    assert.deepEqual(value, { success: false, code: "service_receipt_self_review_forbidden", error: "service_receipt_self_review_forbidden" });
    assert.deepEqual(permissions, ["service_receipts:accept"]);
    assert.equal(calls[0].args.p_actor_id, "authenticated-reviewer");
    assert.equal(calls[0].args.p_actor_role, "manager");
    assert.equal(calls[0].args.p_acceptance_status, acceptanceStatus);
  });
}

test("authorized reviewer success is preserved at the action boundary", async () => {
  reset({ error_code: null, receipt_id: ID, service_id: ID, supplier_id: ID, commitment_id: ID, acceptance_status: "ACCEPTED", idempotent_replay: false });
  const value = await reviewServiceReceipt({ receiptId: ID, acceptanceStatus: "ACCEPTED", requestId: REQUEST });
  assert.equal(value.success, true);
  if (value.success) assert.equal(value.data.acceptanceStatus, "ACCEPTED");
});

test("permission denial prevents receipt, package, correction and reopen RPCs", async () => {
  for (const [action, input, permission] of [
    [reviewServiceReceipt, { receiptId: ID, acceptanceStatus: "REJECTED", requestId: REQUEST }, "service_receipts:accept"],
    [transitionApprovedCommitment, { commitmentId: ID, action: "reopen", reason: "Receipt error", requestId: REQUEST }, "procurement_commitments:lifecycle"],
    [correctServiceReceipt, {}, "service_receipts:correct"],
    [setProcurementPackageRequirements, {}, "supplier_costing:write"],
  ] as const) {
    reset(); denied = true;
    const value = await action(input);
    assert.equal(value.success, false);
    if (!value.success) assert.equal(value.code, "FORBIDDEN");
    assert.deepEqual(permissions, [permission]); assert.equal(calls.length, 0);
  }
});

test("reopening preserves lifecycle authority, reason and idempotency request", async () => {
  reset({ error_code: null, commitment_id: ID, service_id: ID, commitment_status: "open", authorized_amount: "100.00", open_commitment_amount: "0.00", idempotent_replay: true });
  const value = await transitionApprovedCommitment({ commitmentId: ID, action: "reopen", reason: " Correct receipt evidence ", requestId: REQUEST });
  assert.equal(value.success, true);
  assert.deepEqual(permissions, ["procurement_commitments:lifecycle"]);
  assert.deepEqual(calls[0], { name: "transition_approved_commitment", args: { p_commitment_id: ID, p_action: "reopen", p_reason: "Correct receipt evidence", p_request_id: REQUEST, p_actor_id: "authenticated-reviewer", p_actor_role: "manager" } });
  if (value.success) { assert.equal(value.data.idempotent, true); assert.equal(value.data.openCommitmentAmount, 0); }
});

test("reopen rejects a missing reason before calling persistence", async () => {
  reset(); const value = await transitionApprovedCommitment({ commitmentId: ID, action: "reopen", reason: " ", requestId: REQUEST });
  assert.equal(value.success, false); assert.equal(calls.length, 0);
});

test("cancelled commitment denial and unsafe error text remain sanitized", async () => {
  for (const [raw, expected] of [["approved_commitment_reopen_ineligible", "approved_commitment_reopen_ineligible"], ["internal detail: credential-like payload", "PROCUREMENT_COMMITMENT_WRITE_FAILED"]]) {
    reset({ error_code: raw });
    const value = await transitionApprovedCommitment({ commitmentId: ID, action: "reopen", reason: "Correction", requestId: REQUEST });
    assert.equal(value.success, false); if (!value.success) assert.equal(value.code, expected);
  }
});


test("governed correction preserves self-review denial and successful correction result", async () => {
  const input = { receiptId: ID, correctedAcceptanceStatus: "ACCEPTED", correctedReceivedAmount: 80, correctionReason: "Correct measured value", requestId: REQUEST };
  reset({ error_code: "service_receipt_self_review_forbidden" });
  const deniedResult = await correctServiceReceipt(input);
  assert.equal(deniedResult.success, false);
  if (!deniedResult.success) assert.equal(deniedResult.code, "service_receipt_self_review_forbidden");
  reset({ error_code: null, receipt_id: ID, service_id: ID, supplier_id: ID, commitment_id: ID, acceptance_status: "ACCEPTED", received_amount: "80.00", idempotent_replay: false });
  const value = await correctServiceReceipt(input);
  assert.equal(value.success, true);
  if (value.success) assert.equal(value.data.receivedAmount, 80);
  assert.deepEqual(permissions, ["service_receipts:correct"]);
});
