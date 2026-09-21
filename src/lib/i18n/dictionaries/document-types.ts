import type { InvoiceType } from "../../../types/invoice";

export interface DocumentTypeDictionary {
  invoiceType: Record<InvoiceType, string>;
}

export const documentTypeDictionaryEn: DocumentTypeDictionary = {
  invoiceType: {
    deposit: "Deposit",
    progress: "Progress",
    final: "Final",
  },
};
