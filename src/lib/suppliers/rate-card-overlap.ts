export type RateCardOverlapCandidate = {
  id?: string;
  supplierId: string;
  category: string | null | undefined;
  itemName: string;
  unit: string;
  currency: string;
  validFrom: string;
  validTo: string | null | undefined;
  status?: "active" | "inactive";
  isDeleted?: boolean;
};

export type RateCardConflict = {
  itemName: string;
  category: string | null;
  unit: string;
  currency: string;
  validFrom: string;
  validTo: string | null;
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function sameIdentity(left: RateCardOverlapCandidate, right: RateCardOverlapCandidate) {
  return left.supplierId === right.supplierId
    && normalized(left.category) === normalized(right.category)
    && normalized(left.itemName) === normalized(right.itemName)
    && normalized(left.unit) === normalized(right.unit)
    && normalized(left.currency) === normalized(right.currency);
}

function rangesOverlap(left: RateCardOverlapCandidate, right: RateCardOverlapCandidate) {
  const leftEndsBeforeRightStarts = left.validTo !== null && left.validTo !== undefined && left.validTo < right.validFrom;
  const rightEndsBeforeLeftStarts = right.validTo !== null && right.validTo !== undefined && right.validTo < left.validFrom;
  return !leftEndsBeforeRightStarts && !rightEndsBeforeLeftStarts;
}

export function findRateCardOverlap(
  candidate: RateCardOverlapCandidate,
  existing: RateCardOverlapCandidate[],
): RateCardConflict | null {
  const conflict = existing.find((row) => (!candidate.id || row.id !== candidate.id) && row.isDeleted !== true && row.status === "active" && sameIdentity(candidate, row) && rangesOverlap(candidate, row));
  return conflict ? {
    itemName: conflict.itemName,
    category: conflict.category ?? null,
    unit: conflict.unit,
    currency: conflict.currency,
    validFrom: conflict.validFrom,
    validTo: conflict.validTo ?? null,
  } : null;
}
