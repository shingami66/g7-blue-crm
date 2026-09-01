"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createServiceSchema, updateServiceSchema } from "./schemas";
import type {
  CreatedServiceResult,
  UpdateServiceInput,
} from "./types";
import { getServiceById } from "./queries";
import type {
  ServiceLifecycleGateBasis,
  ServiceLifecycleState,
} from "./lifecycle";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  code?: ServiceActionErrorCode;
  data?: T;
};

export type ServiceActionErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CUSTOMER_UNAVAILABLE"
  | "STATUS_CHANGE_DEFERRED"
  | "STATUS_CONFLICT"
  | "MUTATION_KEY_CONFLICT"
  | "NO_FIELDS"
  | "TRANSITION_BLOCKED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_STATUS_TRANSITION_INELIGIBLE"
  | "SERVICE_FINANCIAL_EXECUTION_BLOCKED"
  | "SERVICE_FINANCIAL_CANCELLATION_BLOCKED"
  | "SERVICE_CANCELLATION_REASON_REQUIRED"
  | "SERVICE_LIFECYCLE_PAYMENT_REQUIRED"
  | "SERVICE_LIFECYCLE_READINESS_REQUIRED"
  | "SERVICE_LIFECYCLE_CREDIT_NOT_AUTHORIZED"
  | "SERVICE_LIFECYCLE_REOPEN_FORBIDDEN"
  | "SERVICE_TRANSITION_FAILED"
  | "GENERIC_FAILURE";

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function serviceUpdatePayload(
  serviceInput: UpdateServiceInput,
  clerkUserId: string
): Database["public"]["Tables"]["services"]["Update"] {
  const updates: Database["public"]["Tables"]["services"]["Update"] = {
    updated_by: clerkUserId,
  };
  const allowedFields = [
    "service_title",
    "event_name",
    "event_type",
    "event_start_date",
    "event_end_date",
    "event_location",
    "description",
    "estimated_budget",
    "cancellation_reason",
  ] as const;

  for (const fieldName of allowedFields) {
    const fieldValue = serviceInput[fieldName];
    if (fieldValue !== undefined) (updates as Record<string, unknown>)[fieldName] = fieldValue;
  }

  return updates;
}

async function validateServiceCanBeDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  serviceId: string
): Promise<ActionResult> {
  const { data: serviceRow, error: serviceError } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (serviceError) {
    console.error("[validateServiceCanBeDeleted] Service lookup error:", serviceError.message);
    return { success: false, error: "Failed to delete service. Please try again." };
  }

  if (!serviceRow) {
    return { success: false, error: "Service not found." };
  }

  const { count: linkedQuotationCount, error: quotationError } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true })
    .eq("service_id", serviceId)
    .eq("is_deleted", false);

  if (quotationError) {
    console.error("[validateServiceCanBeDeleted] Quotation lookup error:", quotationError.message);
    return { success: false, error: "Failed to delete service. Please try again." };
  }

  if ((linkedQuotationCount ?? 0) > 0) {
    return { success: false, error: "This service cannot be deleted because it has linked quotations." };
  }

  return { success: true };
}

export async function createService(
  input: unknown
): Promise<ActionResult<CreatedServiceResult>> {
  try {
    const user = await requirePermission("services:write");
    const parsed = createServiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_service_atomic",
      {
        p_customer_id: parsed.data.customer_id,
        p_service_title: parsed.data.service_title,
        p_event_name: parsed.data.event_name ?? undefined,
        p_event_type: parsed.data.event_type ?? undefined,
        p_event_start_date: parsed.data.event_start_date ?? undefined,
        p_event_end_date: parsed.data.event_end_date ?? undefined,
        p_event_location: parsed.data.event_location ?? undefined,
        p_description: parsed.data.description ?? undefined,
        p_estimated_budget: parsed.data.estimated_budget ?? undefined,
        p_cancellation_reason: parsed.data.cancellation_reason ?? undefined,
        p_created_by: user.clerk_user_id,
        p_mutation_key: parsed.data.mutation_key,
      }
    );

    if (rpcError) {
      console.error("[createService] Supabase error:", rpcError.message);
      return { success: false, code: "GENERIC_FAILURE", error: "Failed to create service. Please try again." };
    }

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!row) {
      return { success: false, code: "GENERIC_FAILURE", error: "Failed to create service. Please try again." };
    }

    if (row.error_code) {
      switch (row.error_code) {
        case "customer_unavailable":
          return {
            success: false,
            code: "CUSTOMER_UNAVAILABLE",
            error: "Selected customer is unavailable. Please choose an active customer.",
          };
        case "mutation_key_conflict":
          return {
            success: false,
            code: "MUTATION_KEY_CONFLICT",
            error: "A service with this mutation key already exists with different details.",
          };
        case "invalid_service_input":
          return {
            success: false,
            code: "INVALID_INPUT",
            error: "Invalid service input. Please verify all required fields.",
          };
        case "number_generation_failed":
        default:
          return {
            success: false,
            code: "GENERIC_FAILURE",
            error: "Failed to create service. Please try again.",
          };
      }
    }

    revalidatePath("/services");
    return {
      success: true,
      data: {
        id: row.service_id,
        serviceNumber: row.service_number,
        isReplayed: row.is_replayed ?? false,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error("[createService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, code: "GENERIC_FAILURE", error: "An unexpected error occurred." };
  }
}

export async function updateService(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("services:write");

    const forbiddenFields = [
      "customer_id",
      "customerId",
      "service_number",
      "serviceNumber",
      "status",
      "created_by",
      "updated_by",
      "deleted_at",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ];

    if (input && typeof input === "object") {
      for (const field of forbiddenFields) {
        if (field in input) {
          return { success: false, code: "INVALID_INPUT", error: "This field cannot be edited." };
        }
      }
    }

    const parsed = updateServiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    }

    if (parsed.data.status !== undefined) {
      return { success: false, code: "STATUS_CHANGE_DEFERRED", error: "Service status changes are deferred." };
    }

    const currentService = await getServiceById(id);
    if (!currentService) {
      return { success: false, error: "Service not found." };
    }

    if (currentService.status !== "Inquiry" && currentService.status !== "Quoted") {
      return { success: false, code: "STATUS_CONFLICT", error: `Editing is not allowed when service status is ${currentService.status}.` };
    }

    const updates = serviceUpdatePayload(parsed.data, user.clerk_user_id);
    if (Object.keys(updates).length === 1) {
      return { success: false, code: "NO_FIELDS", error: "No fields to update." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, code: "NOT_FOUND", error: "Service not found." };
      }
      console.error("[updateService] Supabase error:", error.message);
      return { success: false, code: "GENERIC_FAILURE", error: "Failed to update service. Please try again." };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { success: true, data: { id } };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error("[updateService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, code: "GENERIC_FAILURE", error: "An unexpected error occurred." };
  }
}

export async function softDeleteService(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("services:write");
    const supabase = createAdminClient();
    const deleteValidationResult = await validateServiceCanBeDeleted(supabase, id);
    if (!deleteValidationResult.success) {
      return { success: false, error: deleteValidationResult.error };
    }

    // ERP-3 service-linked invoices/payments must extend this guard before service deletion is exposed.
    const { error } = await supabase
      .from("services")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Service not found." };
      }
      console.error("[softDeleteService] Supabase error:", error.message);
      return { success: false, error: "Failed to delete service. Please try again." };
    }

    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[softDeleteService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

type ServiceLifecycleRpcName =
  | "start_service_execution"
  | "complete_service"
  | "cancel_service";

const serviceLifecycleIdSchema = z.string().uuid();
const serviceLifecycleStatusSchema = z.enum([
  "Inquiry", "Quoted", "Approved", "Deposit Paid", "In Progress", "Completed", "Cancelled",
]);
const serviceLifecycleErrorSchema = z.enum([
  "service_actor_invalid", "service_not_found", "service_status_transition_ineligible",
  "service_deposit_invoice_missing", "service_deposit_invoice_ambiguous", "service_deposit_invoice_invalid",
  "service_deposit_invoice_not_paid", "service_deposit_payment_missing", "service_deposit_payment_inconsistent",
  "service_cancellation_reason_required", "service_cancellation_reason_too_long", "service_invoice_history_exists",
  "service_payment_history_exists", "service_billing_authority_unresolved",
  "service_transition_failed",
]).nullable();
const serviceLifecycleRpcRowSchema = z.object({
  error_code: serviceLifecycleErrorSchema,
  service_id: serviceLifecycleIdSchema.nullable(),
  service_status: serviceLifecycleStatusSchema.nullable(),
  idempotent_replay: z.boolean(),
}).strict();
const serviceLifecycleRpcResponseSchema = z.array(serviceLifecycleRpcRowSchema).length(1);

function mapServiceLifecycleRpcError(errorCode: string | null): ServiceActionErrorCode {
  switch (errorCode) {
    case "service_actor_invalid":
      return "INVALID_INPUT";
    case "service_not_found":
      return "SERVICE_NOT_FOUND";
    case "service_status_transition_ineligible":
      return "SERVICE_STATUS_TRANSITION_INELIGIBLE";
    case "service_deposit_invoice_missing":
    case "service_deposit_invoice_ambiguous":
    case "service_deposit_invoice_invalid":
    case "service_deposit_invoice_not_paid":
    case "service_deposit_payment_missing":
    case "service_deposit_payment_inconsistent":
      return "SERVICE_FINANCIAL_EXECUTION_BLOCKED";
    case "service_cancellation_reason_too_long":
    case "service_invoice_history_exists":
    case "service_payment_history_exists":
    case "service_billing_authority_unresolved":
      return "SERVICE_FINANCIAL_CANCELLATION_BLOCKED";
    case "service_cancellation_reason_required":
      return "SERVICE_CANCELLATION_REASON_REQUIRED";
    case "service_transition_failed":
    default:
      return "SERVICE_TRANSITION_FAILED";
  }
}

async function executeServiceLifecycleRpc(
  serviceId: string,
  rpcName: ServiceLifecycleRpcName,
  input: Record<string, string>,
): Promise<ActionResult<{ id: string; status?: string; idempotent?: boolean }>> {
  try {
    const user = await requirePermission("services:update_status");
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(rpcName, {
      p_service_id: serviceId,
      ...input,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    if (error) {
      console.error(`[${rpcName}] RPC error:`, error.message);
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }

    const parsedResponse = serviceLifecycleRpcResponseSchema.safeParse(data);
    if (!parsedResponse.success) {
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }
    const [row] = parsedResponse.data;
    if (row.error_code !== null) {
      return {
        success: false,
        code: mapServiceLifecycleRpcError(row.error_code),
        error: "The Service action is not available in its current state.",
      };
    }
    if (row.service_id !== serviceId || !row.service_status) {
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);
    return {
      success: true,
      data: { id: serviceId, status: row.service_status, idempotent: row.idempotent_replay },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error(`[${rpcName}] Unexpected error:`, err instanceof Error ? err.message : "Unknown");
    return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
  }
}

export async function startServiceExecution(serviceId: string) {
  if (!serviceLifecycleIdSchema.safeParse(serviceId).success) {
    return { success: false as const, code: "INVALID_INPUT" as const, error: "Invalid Service." };
  }
  return executeServiceLifecycleRpc(serviceId, "start_service_execution", {});
}

export async function completeService(serviceId: string) {
  if (!serviceLifecycleIdSchema.safeParse(serviceId).success) {
    return { success: false as const, code: "INVALID_INPUT" as const, error: "Invalid Service." };
  }
  return executeServiceLifecycleRpc(serviceId, "complete_service", {});
}

export async function cancelService(serviceId: string, reason: unknown) {
  if (!serviceLifecycleIdSchema.safeParse(serviceId).success) {
    return { success: false as const, code: "INVALID_INPUT" as const, error: "Invalid Service." };
  }
  const parsed = z.string().trim().min(1).max(1000).safeParse(reason);
  if (!parsed.success) {
    return {
      success: false as const,
      code: "INVALID_INPUT" as const,
      error: "A cancellation reason is required.",
    };
  }
  return executeServiceLifecycleRpc(serviceId, "cancel_service", { p_reason: parsed.data });
}

export type ServiceLifecycleAction =
  | "mark_ready"
  | "block_readiness"
  | "start"
  | "complete"
  | "close"
  | "reopen_delivery"
  | "reopen_closeout";

const serviceLifecycleActionSchema = z.enum([
  "mark_ready",
  "block_readiness",
  "start",
  "complete",
  "close",
  "reopen_delivery",
  "reopen_closeout",
]);
const serviceLifecycleGateBasisSchema = z.enum(["settled_payment", "authorized_credit"]);
const serviceLifecycleTargetErrorSchema = z.enum([
  "service_actor_invalid",
  "service_not_found",
  "service_lifecycle_unavailable",
  "service_lifecycle_action_invalid",
  "service_lifecycle_reason_required",
  "service_lifecycle_state_invalid",
  "service_lifecycle_payment_required",
  "service_lifecycle_readiness_required",
  "service_lifecycle_credit_not_authorized",
  "service_lifecycle_reopen_not_authorized",
  "service_lifecycle_transition_ineligible",
  "service_transition_failed",
]).nullable();
const serviceLifecycleTargetRowSchema = z.object({
  error_code: serviceLifecycleTargetErrorSchema,
  service_id: serviceLifecycleIdSchema.nullable(),
  legacy_status: serviceLifecycleStatusSchema.nullable(),
  commercial_state: z.enum(["inquiry", "quoted", "approved", "cancelled"]).nullable(),
  payment_state: z.enum(["unassessed", "unpaid", "partial", "settled", "inconsistent"]).nullable(),
  readiness_state: z.enum(["unassessed", "blocked", "ready", "not_applicable"]).nullable(),
  execution_state: z.enum(["not_started", "in_progress", "ended", "not_applicable"]).nullable(),
  completion_state: z.enum(["pending", "confirmed", "not_applicable"]).nullable(),
  close_state: z.enum(["open", "closed"]).nullable(),
  start_gate_basis: z.enum(["settled_payment", "authorized_credit"]).nullable(),
  state_version: z.number().nullable(),
  idempotent_replay: z.boolean(),
}).strict();
const serviceLifecycleTargetResponseSchema = z.array(serviceLifecycleTargetRowSchema).length(1);

function mapServiceLifecycleTargetError(errorCode: string | null): ServiceActionErrorCode {
  switch (errorCode) {
    case "service_actor_invalid":
    case "service_lifecycle_action_invalid":
    case "service_lifecycle_reason_required":
      return "INVALID_INPUT";
    case "service_not_found":
    case "service_lifecycle_unavailable":
      return "SERVICE_NOT_FOUND";
    case "service_lifecycle_payment_required":
      return "SERVICE_LIFECYCLE_PAYMENT_REQUIRED";
    case "service_lifecycle_readiness_required":
      return "SERVICE_LIFECYCLE_READINESS_REQUIRED";
    case "service_lifecycle_credit_not_authorized":
      return "SERVICE_LIFECYCLE_CREDIT_NOT_AUTHORIZED";
    case "service_lifecycle_reopen_not_authorized":
      return "SERVICE_LIFECYCLE_REOPEN_FORBIDDEN";
    case "service_lifecycle_state_invalid":
    case "service_lifecycle_transition_ineligible":
      return "SERVICE_STATUS_TRANSITION_INELIGIBLE";
    case "service_transition_failed":
    default:
      return "SERVICE_TRANSITION_FAILED";
  }
}

export async function transitionServiceLifecycle(
  serviceId: string,
  action: ServiceLifecycleAction,
  options: {
    reason?: unknown;
    gateBasis?: ServiceLifecycleGateBasis;
    requestId?: string;
  } = {},
): Promise<ActionResult<{ id: string; lifecycle: ServiceLifecycleState; idempotent: boolean }>> {
  if (!serviceLifecycleIdSchema.safeParse(serviceId).success) {
    return { success: false as const, code: "INVALID_INPUT" as const, error: "Invalid Service." };
  }

  const parsedAction = serviceLifecycleActionSchema.safeParse(action);
  if (!parsedAction.success) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid Service lifecycle action." };
  }

  const parsedReason = z.string().trim().min(1).max(1000).safeParse(options.reason);
  if (!parsedReason.success) {
    return { success: false, code: "INVALID_INPUT", error: "A lifecycle reason is required." };
  }

  const parsedGateBasis = options.gateBasis === undefined
    ? { success: true as const, data: undefined }
    : serviceLifecycleGateBasisSchema.safeParse(options.gateBasis);
  if (!parsedGateBasis.success) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid execution gate." };
  }

  const parsedRequestId = options.requestId === undefined
    ? { success: true as const, data: null }
    : z.string().uuid().safeParse(options.requestId);
  if (!parsedRequestId.success) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid request identifier." };
  }

  try {
    const user = await requirePermission("services:update_status");
    if (parsedAction.data.startsWith("reopen")) {
      await requirePermission("services:reopen");
    }
    if (parsedAction.data === "start" && parsedGateBasis.data === "authorized_credit") {
      await requirePermission("services:authorize_execution_credit");
    }

    const { data, error } = await createAdminClient().rpc("transition_service_lifecycle", {
      p_action: parsedAction.data,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
      p_gate_basis: parsedGateBasis.data ?? null,
      p_reason: parsedReason.data,
      p_request_id: parsedRequestId.data,
      p_service_id: serviceId,
    });

    if (error) {
      console.error("[transitionServiceLifecycle] RPC error:", error.message);
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }

    const parsedResponse = serviceLifecycleTargetResponseSchema.safeParse(data);
    if (!parsedResponse.success) {
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }

    const [row] = parsedResponse.data;
    if (row.error_code !== null) {
      return {
        success: false,
        code: mapServiceLifecycleTargetError(row.error_code),
        error: "The Service lifecycle action is not available in its current state.",
      };
    }

    if (
      row.service_id !== serviceId ||
      row.legacy_status === null ||
      row.commercial_state === null ||
      row.payment_state === null ||
      row.readiness_state === null ||
      row.execution_state === null ||
      row.completion_state === null ||
      row.close_state === null ||
      row.state_version === null
    ) {
      return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);
    return {
      success: true,
      data: {
        id: serviceId,
        idempotent: row.idempotent_replay,
        lifecycle: {
          serviceId,
          legacyStatus: row.legacy_status,
          commercialState: row.commercial_state,
          paymentState: row.payment_state,
          readinessState: row.readiness_state,
          executionState: row.execution_state,
          completionState: row.completion_state,
          closeState: row.close_state,
          startGateBasis: row.start_gate_basis,
          stateVersion: row.state_version,
          source: "projection",
        },
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error("[transitionServiceLifecycle] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, code: "SERVICE_TRANSITION_FAILED", error: "The Service action could not be completed." };
  }
}
