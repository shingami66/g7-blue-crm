import type { ServiceStatus } from "../../types/service";

export type ServiceInvoiceLifecycleError =
  | "service_lifecycle_unavailable"
  | "service_not_eligible_for_deposit"
  | "service_not_eligible_for_final";

export type ServiceInvoiceLifecycleDecision = {
  status: ServiceStatus | null;
  canCreateDeposit: boolean;
  canCreateFlexible: boolean;
  canCreateFinal: boolean;
  depositDenial: ServiceInvoiceLifecycleError | null;
  finalDenial: ServiceInvoiceLifecycleError | null;
};

type LifecycleAllowance = {
  deposit: boolean;
  flexible: boolean;
  final: boolean;
};

const SERVICE_INVOICE_LIFECYCLE_MATRIX: Record<
  ServiceStatus,
  LifecycleAllowance
> = {
  Inquiry: { deposit: true, flexible: true, final: true },
  Quoted: { deposit: true, flexible: true, final: true },
  Approved: { deposit: true, flexible: true, final: true },
  "Deposit Paid": { deposit: false, flexible: true, final: true },
  "In Progress": { deposit: false, flexible: true, final: true },
  Completed: { deposit: false, flexible: false, final: true },
  Cancelled: { deposit: false, flexible: false, final: false },
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
    canCreateFlexible: false,
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
    canCreateFlexible: allowance.flexible,
    canCreateFinal: allowance.final,
    depositDenial: allowance.deposit
      ? null
      : "service_not_eligible_for_deposit",
    finalDenial: allowance.final ? null : "service_not_eligible_for_final",
  };
}
