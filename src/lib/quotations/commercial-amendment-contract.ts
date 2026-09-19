import { z } from "zod";

const actorSchema = z.object({
  clerk_user_id: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(100),
});

export const approvedCommercialAmendmentCreationSchema = z
  .object({
    source_quotation_id: z.string().uuid(),
    amendment_reason: z.string().trim().min(1).max(500),
    mutation_key: z.string().trim().min(1).max(200),
  })
  .strict();

export const approvedCommercialAmendmentApprovalSchema = z
  .object({
    source_quotation_id: z.string().uuid(),
    successor_quotation_id: z.string().uuid(),
    mutation_key: z.string().trim().min(1).max(200),
  })
  .strict();

const nullableUuid = z.string().uuid().nullable();
const nullableNumber = z.number().finite().nullable();
const nullableString = z.string().min(1).nullable();

export const approvedCommercialAmendmentCreationRpcResultSchema = z
  .object({
    error_code: z.string().nullable(),
    source_quotation_id: nullableUuid,
    successor_quotation_id: nullableUuid,
    quotation_number: nullableString,
    quotation_family_id: nullableUuid,
    revision_number: z.number().int().positive().nullable(),
    service_id: nullableUuid,
    created: z.boolean(),
    idempotent_replay: z.boolean(),
  })
  .strict();

export const approvedCommercialAmendmentApprovalRpcResultSchema = z
  .object({
    error_code: z.string().nullable(),
    source_quotation_id: nullableUuid,
    successor_quotation_id: nullableUuid,
    source_scope_id: nullableUuid,
    successor_scope_id: nullableUuid,
    service_id: nullableUuid,
    source_scope_version: z.number().int().positive().nullable(),
    successor_scope_version: z.number().int().positive().nullable(),
    previous_ceiling: nullableNumber,
    successor_ceiling: nullableNumber,
    lifetime_invoice_total: nullableNumber,
    approved_at: nullableString,
    quotation_status: nullableString,
    abs_status: nullableString,
    quotation_approved: z.boolean(),
    abs_activated: z.boolean(),
    idempotent_replay: z.boolean(),
  })
  .strict();

export type CommercialAmendmentActor = z.infer<typeof actorSchema>;
export type ApprovedCommercialAmendmentCreationRpcResult = z.infer<
  typeof approvedCommercialAmendmentCreationRpcResultSchema
>;
export type ApprovedCommercialAmendmentApprovalRpcResult = z.infer<
  typeof approvedCommercialAmendmentApprovalRpcResultSchema
>;

type RpcResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

export type ApprovedCommercialAmendmentData =
  | (ApprovedCommercialAmendmentCreationRpcResult & { idempotent: boolean })
  | (ApprovedCommercialAmendmentApprovalRpcResult & { idempotent: boolean });

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Invalid commercial amendment request.",
  quotation_not_found: "Quotation not found or already deleted.",
  quotation_not_current_approved: "This quotation is no longer the current approved authority.",
  quotation_service_lifecycle_ineligible: "Commercial amendment is unavailable because the Service is no longer eligible.",
  quotation_amendment_successor_exists: "This approved quotation already has a commercial amendment successor.",
  quotation_amendment_successor_conflict: "A different commercial amendment successor already exists.",
  quotation_amendment_noop: "The amendment does not change the approved commercial scope.",
  quotation_financial_total_mismatch: "The quotation totals or line items are inconsistent. No changes were made.",
  quotation_internal_authority_inconsistent: "The current billing authority is inconsistent. No changes were made.",
  scope_successor_ceiling_below_invoiced: "The revised billing ceiling cannot be below Service-lifetime invoiced exposure.",
  w2c_discount_currency_unsupported: "The quotation discount currency is not supported by the current billing contract.",
  mutation_key_conflict: "This amendment request identity was already used with different details.",
};

const GENERIC_ERROR = "Commercial amendment could not be completed. Please try again.";

function mapError(errorCode: string | null | undefined): string {
  return (errorCode && ERROR_MESSAGES[errorCode]) || GENERIC_ERROR;
}

function oneRow(data: unknown): unknown | null {
  return Array.isArray(data) && data.length === 1 ? data[0] : null;
}

export async function executeCreateApprovedCommercialAmendment(input: {
  value: unknown;
  actor: CommercialAmendmentActor;
  invoke: (params: Record<string, string>) => Promise<RpcResponse>;
}): Promise<
  | { success: true; data: ApprovedCommercialAmendmentData }
  | { success: false; code: "INVALID_INPUT" | "AMENDMENT_FAILED"; error: string }
> {
  const parsed = approvedCommercialAmendmentCreationSchema.safeParse(input.value);
  const actor = actorSchema.safeParse(input.actor);
  if (!parsed.success || !actor.success) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid commercial amendment request." };
  }

  let response: RpcResponse;
  try {
    response = await input.invoke({
      p_source_quotation_id: parsed.data.source_quotation_id,
      p_amendment_reason: parsed.data.amendment_reason,
      p_mutation_key: parsed.data.mutation_key,
      p_actor_id: actor.data.clerk_user_id,
      p_actor_role: actor.data.role,
    });
  } catch {
    return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  }

  if (response.error) return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  const result = approvedCommercialAmendmentCreationRpcResultSchema.safeParse(oneRow(response.data));
  if (!result.success || result.data.error_code) {
    return {
      success: false,
      code: "AMENDMENT_FAILED",
      error: mapError(result.success ? result.data.error_code : null),
    };
  }
  if (!result.data.created || !result.data.successor_quotation_id || !result.data.service_id) {
    return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  }
  return { success: true, data: { ...result.data, idempotent: result.data.idempotent_replay } };
}

export async function executeApproveApprovedCommercialAmendment(input: {
  value: unknown;
  actor: CommercialAmendmentActor;
  invoke: (params: Record<string, string>) => Promise<RpcResponse>;
}): Promise<
  | { success: true; data: ApprovedCommercialAmendmentData }
  | { success: false; code: "INVALID_INPUT" | "AMENDMENT_FAILED"; error: string }
> {
  const parsed = approvedCommercialAmendmentApprovalSchema.safeParse(input.value);
  const actor = actorSchema.safeParse(input.actor);
  if (!parsed.success || !actor.success) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid commercial amendment request." };
  }

  let response: RpcResponse;
  try {
    response = await input.invoke({
      p_source_quotation_id: parsed.data.source_quotation_id,
      p_successor_quotation_id: parsed.data.successor_quotation_id,
      p_mutation_key: parsed.data.mutation_key,
      p_actor_id: actor.data.clerk_user_id,
      p_actor_role: actor.data.role,
    });
  } catch {
    return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  }

  if (response.error) return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  const result = approvedCommercialAmendmentApprovalRpcResultSchema.safeParse(oneRow(response.data));
  if (!result.success || result.data.error_code) {
    return {
      success: false,
      code: "AMENDMENT_FAILED",
      error: mapError(result.success ? result.data.error_code : null),
    };
  }
  if (!result.data.quotation_approved || !result.data.abs_activated || !result.data.service_id) {
    return { success: false, code: "AMENDMENT_FAILED", error: GENERIC_ERROR };
  }
  return { success: true, data: { ...result.data, idempotent: result.data.idempotent_replay } };
}
