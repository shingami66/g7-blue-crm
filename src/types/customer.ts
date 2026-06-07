import { Address, AuditFields } from "./common";

export type CustomerStatus = "active" | "inactive" | "lead";

export interface Customer {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  status: CustomerStatus;
  projects: number;
  revenue: string;
}
