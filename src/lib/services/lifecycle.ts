import type { ServiceStatus } from "@/types/service";

export const SERVICE_LIFECYCLE_COMMERCIAL_STATES = [
  "inquiry",
  "quoted",
  "approved",
  "cancelled",
] as const;
export type ServiceLifecycleCommercialState =
  (typeof SERVICE_LIFECYCLE_COMMERCIAL_STATES)[number];

export const SERVICE_LIFECYCLE_PAYMENT_STATES = [
  "unassessed",
  "unpaid",
  "partial",
  "settled",
  "inconsistent",
] as const;
export type ServiceLifecyclePaymentState =
  (typeof SERVICE_LIFECYCLE_PAYMENT_STATES)[number];

export const SERVICE_LIFECYCLE_READINESS_STATES = [
  "unassessed",
  "blocked",
  "ready",
  "not_applicable",
] as const;
export type ServiceLifecycleReadinessState =
  (typeof SERVICE_LIFECYCLE_READINESS_STATES)[number];

export const SERVICE_LIFECYCLE_EXECUTION_STATES = [
  "not_started",
  "in_progress",
  "ended",
  "not_applicable",
] as const;
export type ServiceLifecycleExecutionState =
  (typeof SERVICE_LIFECYCLE_EXECUTION_STATES)[number];

export const SERVICE_LIFECYCLE_COMPLETION_STATES = [
  "pending",
  "confirmed",
  "not_applicable",
] as const;
export type ServiceLifecycleCompletionState =
  (typeof SERVICE_LIFECYCLE_COMPLETION_STATES)[number];

export const SERVICE_LIFECYCLE_CLOSE_STATES = ["open", "closed"] as const;
export type ServiceLifecycleCloseState =
  (typeof SERVICE_LIFECYCLE_CLOSE_STATES)[number];

export const SERVICE_LIFECYCLE_GATE_BASES = [
  "settled_payment",
  "authorized_credit",
] as const;
export type ServiceLifecycleGateBasis =
  (typeof SERVICE_LIFECYCLE_GATE_BASES)[number];

export type ServiceLifecycleStateSource = "projection" | "legacy_fallback";

export interface ServiceLifecycleState {
  serviceId: string;
  legacyStatus: ServiceStatus;
  commercialState: ServiceLifecycleCommercialState;
  paymentState: ServiceLifecyclePaymentState;
  readinessState: ServiceLifecycleReadinessState;
  executionState: ServiceLifecycleExecutionState;
  completionState: ServiceLifecycleCompletionState;
  closeState: ServiceLifecycleCloseState;
  startGateBasis: ServiceLifecycleGateBasis | null;
  stateVersion: number;
  source: ServiceLifecycleStateSource;
}
export function mapLegacyServiceStatus(
  serviceId: string,
  legacyStatus: ServiceStatus,
): ServiceLifecycleState {
  return {
    serviceId,
    legacyStatus,
    commercialState:
      legacyStatus === "Cancelled"
        ? "cancelled"
        : legacyStatus === "Inquiry"
          ? "inquiry"
          : legacyStatus === "Quoted"
            ? "quoted"
            : "approved",
    paymentState: "unassessed",
    readinessState:
      legacyStatus === "Cancelled"
        ? "not_applicable"
        : legacyStatus === "In Progress" || legacyStatus === "Completed"
          ? "ready"
          : "unassessed",
    executionState:
      legacyStatus === "Cancelled"
        ? "not_applicable"
        : legacyStatus === "In Progress"
          ? "in_progress"
          : legacyStatus === "Completed"
            ? "ended"
            : "not_started",
    completionState:
      legacyStatus === "Cancelled"
        ? "not_applicable"
        : legacyStatus === "Completed"
          ? "confirmed"
          : "pending",
    closeState: "open",
    startGateBasis: null,
    stateVersion: 0,
    source: "legacy_fallback",
  };
}
