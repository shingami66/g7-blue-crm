import type { ServiceStatus } from "../../types/service";

export type ServiceInvoiceLifecycleError =
  | "service_lifecycle_unavailable"
  | "service_not_eligible_for_deposit"
  | "service_not_eligible_for_final";

export type ServiceInvoiceLifecycleDecision = {
  status: ServiceStatus | null;
  canCreateDeposit: boolean;
  canCreateFinal: boolean;
  depositDenial: ServiceInvoiceLifecycleError | null;
  finalDenial: ServiceInvoiceLifecycleError | null;
};

type LifecycleAllowance = {
  deposit: boolean;
  final: boolean;
};

const SERVICE_INVOICE_LIFECYCLE_MATRIX: Record<
  ServiceStatus,
  LifecycleAllowance
> = {
  Inquiry: { deposit: true, final: true },
  Quoted: { deposit: true, final: true },
  Approved: { deposit: true, final: true },
  "Deposit Paid": { deposit: false, final: true },
  "In Progress": { deposit: false, final: true },
  Completed: { deposit: false, final: false },
  Cancelled: { deposit: false, final: false },
};

const SERVICE_STATUS_SET = new Set<string>(
  Object.keys(SERVICE_INVOICE_LIFECYCLE_MATRIX),
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnValue(value: object, propertyName: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
  return descriptor !== undefined && "value" in descriptor;
}

function unavailableDecision(): ServiceInvoiceLifecycleDecision {
  return {
    status: null,
    canCreateDeposit: false,
    canCreateFinal: false,
    depositDenial: "service_lifecycle_unavailable",
    finalDenial: "service_lifecycle_unavailable",
  };
}

export function getServiceInvoiceLifecycleDecision(
  evidence: unknown,
): ServiceInvoiceLifecycleDecision {
  if (
    !isPlainObject(evidence) ||
    !hasOwnValue(evidence, "status") ||
    !hasOwnValue(evidence, "deletedAt") ||
    evidence.deletedAt !== null ||
    typeof evidence.status !== "string" ||
    !SERVICE_STATUS_SET.has(evidence.status)
  ) {
    return unavailableDecision();
  }

  const status = evidence.status as ServiceStatus;
  const allowance = SERVICE_INVOICE_LIFECYCLE_MATRIX[status];

  return {
    status,
    canCreateDeposit: allowance.deposit,
    canCreateFinal: allowance.final,
    depositDenial: allowance.deposit
      ? null
      : "service_not_eligible_for_deposit",
    finalDenial: allowance.final ? null : "service_not_eligible_for_final",
  };
}
