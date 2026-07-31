"use server";

import {
  getEligibleServicesForInvoiceChooser,
  type EligibleInvoiceServicesResult,
} from "@/lib/services/queries";

/** Permission-gated, read-only loading boundary for the navigation-only chooser. */
export async function loadEligibleInvoiceServicesAction(): Promise<EligibleInvoiceServicesResult> {
  return getEligibleServicesForInvoiceChooser();
}
