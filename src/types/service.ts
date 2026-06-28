export const SERVICE_STATUSES = [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export interface ServiceStatusTransitionAction {
  status: ServiceStatus;
  label: string;
  description: string;
  blockedReason: string | null;
  requiresCancellationReason: boolean;
}

export interface ServiceStatusTransitionState {
  currentStatus: ServiceStatus;
  isTerminal: boolean;
  actions: ServiceStatusTransitionAction[];
}

export interface ServiceCustomerSummary {
  company: string;
  contact: string;
  customerNumber?: string;
}

export interface Service {
  id: string;
  serviceNumber: string;
  customerId: string;
  customer?: ServiceCustomerSummary;
  serviceTitle: string;
  eventName: string | null;
  eventType: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  eventLocation: string | null;
  description: string | null;
  estimatedBudget: number | null;
  status: ServiceStatus;
  salesOwnerId: string | null;
  cancellationReason: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}
