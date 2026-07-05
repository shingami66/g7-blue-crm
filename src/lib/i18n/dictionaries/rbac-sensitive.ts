export interface RbacSensitiveDictionary {
  internalOnly: {
    allocationNotes: string;
    bookingNotes: string;
    margin: string;
  };
  supplierCosts: {
    estimatedTotalCost: string;
    estimatedUnitCost: string;
    rateCardSnapshot: string;
  };
}

// Intentionally type-only in Foundation-1 until reviewed, permission-safe copy is approved.
