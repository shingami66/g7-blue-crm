"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { SERVICE_TASK_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RpcArgument } from "@/lib/supabase/rpc-argument";
import type { ServiceTaskActionResult, ServiceTaskErrorCode } from "./service-task-contract";
import {
  searchActiveServiceTaskAssignees,
  type ServiceTaskAssigneesResult,
} from "./service-task-queries";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const nullableDescriptionSchema = z.string().nullable().optional();

const createTaskSchema = z.object({
  serviceId: uuidSchema,
  title: z.string().trim().min(1),
  description: nullableDescriptionSchema,
  assigneeUserId: uuidSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
}).strict();

const taskChangesSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: nullableDescriptionSchema,
  assigneeUserId: uuidSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
}).strict();

const updateTaskSchema = z.object({
  serviceId: uuidSchema,
  taskId: uuidSchema,
  changes: taskChangesSchema,
}).strict();

const transitionTaskSchema = z.object({
  serviceId: uuidSchema,
  taskId: uuidSchema,
  toStatus: z.enum(["in_progress", "completed"]),
}).strict();
const assigneeSearchSchema = z.string().trim().max(80).optional();
const taskRpcRowSchema = z.object({
  id: uuidSchema,
  service_id: uuidSchema,
}).passthrough();

const DATABASE_ERROR_CODES: ReadonlyArray<[string, ServiceTaskErrorCode]> = [
  ["service_task_actor_required", "INVALID_INPUT"],
  ["service_task_service_required", "INVALID_INPUT"],
  ["service_task_service_not_found", "SERVICE_NOT_FOUND"],
  ["service_task_service_closed", "SERVICE_CLOSED"],
  ["service_task_title_required", "TITLE_REQUIRED"],
  ["service_task_title_invalid", "TITLE_INVALID"],
  ["service_task_assignee_invalid", "ASSIGNEE_INVALID"],
  ["service_task_assignee_inactive_or_missing", "ASSIGNEE_UNAVAILABLE"],
  ["service_task_identity_required", "INVALID_INPUT"],
  ["service_task_changes_invalid", "TASK_CHANGES_INVALID"],
  ["service_task_due_date_invalid", "DUE_DATE_INVALID"],
  ["service_task_not_found", "TASK_NOT_FOUND"],
  ["service_task_completed_read_only", "TASK_READ_ONLY"],
  ["service_task_update_conflict", "TASK_CONFLICT"],
  ["service_task_status_invalid", "INVALID_INPUT"],
  ["service_task_status_transition_invalid", "INVALID_TRANSITION"],
  ["service_task_active_assignee_required", "ACTIVE_ASSIGNEE_REQUIRED"],
  ["service_task_transition_conflict", "TASK_CONFLICT"],
];

function mapDatabaseError(error: unknown): ServiceTaskErrorCode {
  const message =
    typeof error === "object" && error !== null && "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";
  return DATABASE_ERROR_CODES.find(([databaseCode]) => message.includes(databaseCode))?.[1]
    ?? "GENERIC_FAILURE";
}

function mapCaughtError(error: unknown): ServiceTaskErrorCode {
  if (error instanceof UnauthorizedError) return "UNAUTHORIZED";
  if (error instanceof ForbiddenError) return "FORBIDDEN";
  return "GENERIC_FAILURE";
}

function hasExpectedTaskResponse(data: unknown, serviceId: string, taskId?: string): boolean {
  const parsed = taskRpcRowSchema.safeParse(data);
  return parsed.success &&
    parsed.data.service_id === serviceId &&
    (taskId === undefined || parsed.data.id === taskId);
}

function invalidInput(): ServiceTaskActionResult {
  return { success: false, code: "INVALID_INPUT" };
}

export async function searchServiceTaskAssignees(
  input: unknown,
): Promise<ServiceTaskAssigneesResult> {
  const parsed = assigneeSearchSchema.safeParse(input);
  if (!parsed.success) return { status: "error", assignees: [] };
  return searchActiveServiceTaskAssignees(parsed.data ?? "");
}

export async function createServiceTask(input: unknown): Promise<ServiceTaskActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return invalidInput();

  try {
    const user = await requirePermission(SERVICE_TASK_PERMISSIONS.write);
    const { data, error } = await createAdminClient().rpc("create_service_task_atomic", {
      p_actor_id: user.clerk_user_id,
      p_assignee_user_id: (parsed.data.assigneeUserId ?? null) as unknown as RpcArgument<
        "create_service_task_atomic",
        "p_assignee_user_id"
      >,
      p_description: (parsed.data.description ?? null) as unknown as RpcArgument<
        "create_service_task_atomic",
        "p_description"
      >,
      p_due_date: (parsed.data.dueDate ?? null) as unknown as RpcArgument<
        "create_service_task_atomic",
        "p_due_date"
      >,
      p_service_id: parsed.data.serviceId,
      p_title: parsed.data.title,
    });

    if (error) {
      const code = mapDatabaseError(error);
      console.error("[createServiceTask] RPC failed:", code);
      return { success: false, code };
    }
    if (!hasExpectedTaskResponse(data, parsed.data.serviceId)) {
      console.error("[createServiceTask] RPC failed: service_task_response_invalid");
      return { success: false, code: "GENERIC_FAILURE" };
    }

    revalidatePath("/services/" + parsed.data.serviceId);
    return { success: true };
  } catch (error) {
    return { success: false, code: mapCaughtError(error) };
  }
}

export async function updateServiceTaskFields(input: unknown): Promise<ServiceTaskActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return invalidInput();

  const changeKeys = Object.keys(parsed.data.changes);
  if (changeKeys.length === 0) {
    return { success: false, code: "TASK_CHANGES_INVALID" };
  }

  const changes: Record<string, string | null> = {};
  if (parsed.data.changes.title !== undefined) changes.title = parsed.data.changes.title;
  if (parsed.data.changes.description !== undefined) changes.description = parsed.data.changes.description;
  if (parsed.data.changes.assigneeUserId !== undefined) {
    changes.assignee_user_id = parsed.data.changes.assigneeUserId;
  }
  if (parsed.data.changes.dueDate !== undefined) {
    changes.due_date = parsed.data.changes.dueDate;
  }

  try {
    const user = await requirePermission(SERVICE_TASK_PERMISSIONS.write);
    const { data, error } = await createAdminClient().rpc("update_service_task_fields_atomic", {
      p_actor_id: user.clerk_user_id,
      p_changes: changes,
      p_service_id: parsed.data.serviceId,
      p_task_id: parsed.data.taskId,
    });

    if (error) {
      const code = mapDatabaseError(error);
      console.error("[updateServiceTaskFields] RPC failed:", code);
      return { success: false, code };
    }
    if (!hasExpectedTaskResponse(data, parsed.data.serviceId, parsed.data.taskId)) {
      console.error("[updateServiceTaskFields] RPC failed: service_task_response_invalid");
      return { success: false, code: "GENERIC_FAILURE" };
    }

    revalidatePath("/services/" + parsed.data.serviceId);
    return { success: true };
  } catch (error) {
    return { success: false, code: mapCaughtError(error) };
  }
}

export async function transitionServiceTaskStatus(input: unknown): Promise<ServiceTaskActionResult> {
  const parsed = transitionTaskSchema.safeParse(input);
  if (!parsed.success) return invalidInput();

  try {
    const user = await requirePermission(SERVICE_TASK_PERMISSIONS.write);
    const { data, error } = await createAdminClient().rpc("transition_service_task_status_atomic", {
      p_actor_id: user.clerk_user_id,
      p_service_id: parsed.data.serviceId,
      p_task_id: parsed.data.taskId,
      p_to_status: parsed.data.toStatus,
    });

    if (error) {
      const code = mapDatabaseError(error);
      console.error("[transitionServiceTaskStatus] RPC failed:", code);
      return { success: false, code };
    }
    if (!hasExpectedTaskResponse(data, parsed.data.serviceId, parsed.data.taskId)) {
      console.error("[transitionServiceTaskStatus] RPC failed: service_task_response_invalid");
      return { success: false, code: "GENERIC_FAILURE" };
    }

    revalidatePath("/services/" + parsed.data.serviceId);
    return { success: true };
  } catch (error) {
    return { success: false, code: mapCaughtError(error) };
  }
}
