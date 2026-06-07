import type { Customer } from "@/types/customer";
import type { CustomerRow } from "./types";

/**
 * Maps a Supabase `customers` row to the frontend `Customer` shape.
 *
 * Key differences:
 * - `projects_count` (number)  →  `projects` (number)
 * - `revenue` (numeric)        →  `revenue` (formatted string, e.g. "SAR 1,200.00")
 */
export function mapRowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    company: row.company,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    city: row.city,
    status: row.status,
    projects: row.projects_count,
    revenue: formatRevenue(row.revenue),
  };
}

/** Formats a numeric revenue value to a display string (e.g. SAR 1,200.00). */
function formatRevenue(amount: number): string {
  if (amount === 0) return "SAR 0";
  if (amount >= 1_000_000) {
    return `SAR ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `SAR ${(amount / 1_000).toFixed(0)}K`;
  }
  return `SAR ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
