import { AuditFields } from "./common";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export type ProjectTaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface ProjectTask {
  completed: number;
  total: number;
}

export interface Project {
  id: string;
  customerId: string;
  quotationId?: string;
  name: string;
  client: string; // Used in UI currently, effectively same as customer
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: string;
  manager: string;
  tasks: ProjectTask;
}
