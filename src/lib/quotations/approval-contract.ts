import { z } from "zod";

export const quotationApprovalIdSchema = z.string().uuid();

export const quotationApprovalActivationRpcParamsSchema = z
  .object({
    p_quotation_id: z.string().uuid(),
    p_actor_id: z.string().trim().min(1),
    p_actor_role: z.string().trim().min(1),
  })
  .strict();

const nullableUuid = z.string().uuid().nullable();
const nullableMoney = z.number().finite().nullable();

export const quotationApprovalActivationRpcResultSchema = z
  .object({
    error_code: z.string().nullable(),
    quotation_id: nullableUuid,
    quotation_number: z.string().min(1).nullable(),
    service_id: nullableUuid,
    quotation_status: z.string().min(1).nullable(),
    approved_at: z.string().min(1).nullable(),
    approved_billing_scope_id: nullableUuid,
    scope_version: z.number().int().positive().nullable(),
    accepted_subtotal: nullableMoney,
    accepted_vat_amount: nullableMoney,
    accepted_grand_total: nullableMoney,
    abs_status: z.string().min(1).nullable(),
    abs_activated_at: z.string().min(1).nullable(),
    quotation_approved: z.boolean(),
    abs_activated: z.boolean(),
    idempotent_replay: z.boolean(),
  })
  .strict();

export type QuotationApprovalActivationRpcParams = z.infer<
  typeof quotationApprovalActivationRpcParamsSchema
>;

export type QuotationApprovalActivationRpcResult = z.infer<
  typeof quotationApprovalActivationRpcResultSchema
>;

export type QuotationApprovalActor = {
  clerk_user_id: string;
  role: string;
};

export type QuotationApprovalActivationData =
  QuotationApprovalActivationRpcResult & {
    idempotent: boolean;
  };

export type QuotationApprovalActivationRpcResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

export type QuotationApprovalActivationInvoker = (
  params: QuotationApprovalActivationRpcParams,
) => Promise<QuotationApprovalActivationRpcResponse>;

export const QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES = {
  quotation_not_found: "Quotation not found or already deleted.",
  quotation_service_lifecycle_ineligible:
    "Quotation approval is unavailable because the Service is no longer eligible.",
  quotation_not_approvable:
    "Only draft or sent quotations can be approved.",
  quotation_approval_conflict:
    "An approved quotation already exists for this Service.",
  quotation_internal_authority_inconsistent:
    "Quotation approval is blocked because its internal billing authority is inconsistent. No changes were made.",
  quotation_financial_total_mismatch:
    "Quotation totals or line items are inconsistent with the billing-authority contract. No changes were made.",
  scope_discount_not_supported:
    "Quotation approval is blocked because discounted quotations are not supported by the current billing-authority contract.",
  quotation_approval_concurrency_conflict:
    "Quotation approval changed concurrently. Please refresh and try again.",
  quotation_approval_actor_invalid:
    "The approving user could not be verified.",
} as const;

const GENERIC_QUOTATION_APPROVAL_ERROR =
  "Failed to approve quotation and activate internal billing authority. Please try again.";

export function buildQuotationApprovalActivationRpcParams(
  quotationId: string,
  actor: QuotationApprovalActor,
): QuotationApprovalActivationRpcParams {
  return quotationApprovalActivationRpcParamsSchema.parse({
    p_quotation_id: quotationId,
    p_actor_id: actor.clerk_user_id,
    p_actor_role: actor.role,
  });
}

export function parseQuotationApprovalActivationRpcResult(
  value: unknown,
): QuotationApprovalActivationRpcResult | null {
  const parsed = quotationApprovalActivationRpcResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function mapQuotationApprovalActivationError(
  errorCode: string | null | undefined,
): string {
  if (!errorCode) return GENERIC_QUOTATION_APPROVAL_ERROR;

  return (
    QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES[
      errorCode as keyof typeof QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES
    ] ?? GENERIC_QUOTATION_APPROVAL_ERROR
  );
}

function isSuccessfulQuotationApprovalActivation(
  result: QuotationApprovalActivationRpcResult,
): boolean {
  return (
    result.error_code === null &&
    result.quotation_approved &&
    result.abs_activated &&
    result.quotation_status === "approved" &&
    result.abs_status === "approved" &&
    result.quotation_id !== null &&
    result.service_id !== null &&
    result.approved_billing_scope_id !== null &&
    result.scope_version !== null &&
    result.approved_at !== null &&
    result.abs_activated_at !== null &&
    result.accepted_subtotal !== null &&
    result.accepted_vat_amount !== null &&
    result.accepted_grand_total !== null
  );
}

export async function executeQuotationApprovalActivation(input: {
  quotationId: unknown;
  actor: QuotationApprovalActor;
  invoke: QuotationApprovalActivationInvoker;
}): Promise<
  | { success: true; data: QuotationApprovalActivationData }
  | { success: false; error: string }
> {
  const quotationId = quotationApprovalIdSchema.safeParse(input.quotationId);
  if (!quotationId.success) {
    return { success: false, error: "Invalid quotation identifier." };
  }

  let params: QuotationApprovalActivationRpcParams;
  try {
    params = buildQuotationApprovalActivationRpcParams(
      quotationId.data,
      input.actor,
    );
  } catch {
    return {
      success: false,
      error: QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES.quotation_approval_actor_invalid,
    };
  }

  let response: QuotationApprovalActivationRpcResponse;
  try {
    response = await input.invoke(params);
  } catch {
    return { success: false, error: GENERIC_QUOTATION_APPROVAL_ERROR };
  }

  if (response.error) {
    return { success: false, error: GENERIC_QUOTATION_APPROVAL_ERROR };
  }

  if (!Array.isArray(response.data) || response.data.length !== 1) {
    return { success: false, error: GENERIC_QUOTATION_APPROVAL_ERROR };
  }

  const result = parseQuotationApprovalActivationRpcResult(response.data[0]);
  if (!result) {
    return { success: false, error: GENERIC_QUOTATION_APPROVAL_ERROR };
  }

  if (result.error_code !== null) {
    return {
      success: false,
      error: mapQuotationApprovalActivationError(result.error_code),
    };
  }

  if (!isSuccessfulQuotationApprovalActivation(result)) {
    return { success: false, error: GENERIC_QUOTATION_APPROVAL_ERROR };
  }

  return {
    success: true,
    data: {
      ...result,
      idempotent: result.idempotent_replay,
    },
  };
}
