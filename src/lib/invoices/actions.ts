"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createInvoiceSchema } from "./schemas";
import type { CreateInvoiceResult } from "./types";

export async function createInvoiceAction(input: unknown): Promise<CreateInvoiceResult> {
  try {
    await requirePermission("invoices:write");

    const parsed = createInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_invoice_input" };
    }

    // T015A skeleton: validation and RBAC pass.
    // DB write behavior is reserved for T015B.
    return { success: false, error: "invoice_creation_not_implemented_in_this_slice" };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createInvoiceAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
