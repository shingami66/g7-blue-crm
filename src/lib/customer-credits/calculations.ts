export interface InvoiceReceivableCalculationInput {
  grossIssuedAmount: number;
  creditAdjustmentAmount: number;
  creditApplicationAmount?: number;
  settledAmount: number;
}

export interface InvoiceReceivableCalculation {
  grossIssuedAmount: number;
  creditAdjustmentAmount: number;
  creditApplicationAmount: number;
  netReceivableAmount: number;
  settledAmount: number;
  outstandingAmount: number;
  customerCreditAmount: number;
}

function sarCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function sarAmount(cents: number): number {
  return cents / 100;
}

/**
 * Display-side reconciliation for the persisted W7C read model.
 * PostgreSQL RPC/view logic remains authoritative for financial writes.
 */
export function calculateInvoiceReceivable(
  input: InvoiceReceivableCalculationInput,
): InvoiceReceivableCalculation {
  const grossIssuedCents = Math.max(0, sarCents(input.grossIssuedAmount));
  const creditAdjustmentCents = Math.min(
    grossIssuedCents,
    Math.max(0, sarCents(input.creditAdjustmentAmount)),
  );
  const settledCents = Math.max(0, sarCents(input.settledAmount));
  const creditApplicationCents = Math.min(
    grossIssuedCents - creditAdjustmentCents,
    Math.max(0, sarCents(input.creditApplicationAmount ?? 0)),
  );
  const netReceivableCents = grossIssuedCents - creditAdjustmentCents - creditApplicationCents;

  return {
    grossIssuedAmount: sarAmount(grossIssuedCents),
    creditAdjustmentAmount: sarAmount(creditAdjustmentCents),
    creditApplicationAmount: sarAmount(creditApplicationCents),
    netReceivableAmount: sarAmount(netReceivableCents),
    settledAmount: sarAmount(settledCents),
    outstandingAmount: sarAmount(Math.max(netReceivableCents - settledCents, 0)),
    customerCreditAmount: sarAmount(Math.max(settledCents - netReceivableCents, 0)),
  };
}
