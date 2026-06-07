/**
 * Customer types for the data layer.
 *
 * - `CustomerRow` mirrors the Supabase `customers` table exactly (snake_case).
 * - `Customer` is the existing frontend shape re-exported from @/types.
 */

export type { Customer, CustomerStatus } from "@/types/customer";

/** Raw row shape returned by Supabase for the `customers` table. */
export interface CustomerRow {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  status: "active" | "inactive" | "lead";
  projects_count: number;
  revenue: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}
