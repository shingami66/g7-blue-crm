export const SERVICE_TASK_STATUSES = [
  "open",
  "in_progress",
  "completed",
] as const;

export type ServiceTaskStatus = (typeof SERVICE_TASK_STATUSES)[number];

export type ServiceTaskErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_CLOSED"
  | "TITLE_REQUIRED"
  | "TITLE_INVALID"
  | "ASSIGNEE_INVALID"
  | "ASSIGNEE_UNAVAILABLE"
  | "TASK_CHANGES_INVALID"
  | "DUE_DATE_INVALID"
  | "TASK_NOT_FOUND"
  | "TASK_READ_ONLY"
  | "INVALID_TRANSITION"
  | "ACTIVE_ASSIGNEE_REQUIRED"
  | "TASK_CONFLICT"
  | "GENERIC_FAILURE";

export type ServiceTaskActionResult =
  | { success: true }
  | { success: false; code: ServiceTaskErrorCode };

export function isServiceTaskStatus(value: string): value is ServiceTaskStatus {
  return (SERVICE_TASK_STATUSES as readonly string[]).includes(value);
}

export function isClosedServiceStatus(status: string): boolean {
  return status === "Completed" || status === "Cancelled";
}
