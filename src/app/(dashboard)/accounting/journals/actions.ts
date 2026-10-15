"use server";

import { findAccountingServiceByNumber } from "@/lib/accounting/journal-operations-queries";

export async function lookupJournalService(serviceNumber: string) {
  return findAccountingServiceByNumber(serviceNumber);
}
