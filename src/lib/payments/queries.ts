import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToPaymentListItem } from "./mappers";
import type { PaymentListRow, PaymentsListResult } from "./types";

const PAYMENT_LIST_SELECT = `
  id,
  payment_number,
  invoice_id,
  customer_id,
  date,
  amount,
  method,
  reference,
  status,
  created_at,
  created_by,
  invoices (
    invoice_number,
    invoice_type,
    service_id,
    services (
      service_number,
      service_title
    )
  ),
  customers (
    company,
    contact
  )
`;

export async function getPaymentsList(): Promise<PaymentsListResult> {
  await requirePermission("payments:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_LIST_SELECT)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getPaymentsList] Supabase error:", error.message);
      return { payments: [], error: "payments_load_failed" };
    }

    return {
      payments: (data as unknown as PaymentListRow[]).map(mapRowToPaymentListItem),
    };
  } catch (err) {
    console.error("[getPaymentsList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { payments: [], error: "payments_load_failed" };
  }
}
