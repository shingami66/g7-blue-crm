/**
 * Server Action Contract for Invoice Creation
 * This file is a design artifact, not an implementation file.
 */

export interface CreateInvoiceRequest {
  quotationId: string;
  serviceId: string;
  invoiceType: 'deposit' | 'final';
  // Flexible manual deposit amount. Ignored or validated by server for 'final' type.
  requestedAmount?: number;
}

export interface CreateInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

// Ensure the server action signature looks like:
// export async function createInvoiceAction(payload: CreateInvoiceRequest): Promise<CreateInvoiceResponse>
