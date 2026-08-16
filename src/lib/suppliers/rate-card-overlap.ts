import type { ServiceUsagePeriod } from "./rate-card-types";

export type RateCardOverlapCandidate = {
  id?: string;
  supplierId: string;
  category: string | null | undefined;
  itemName: string;
  unit: string;
  pricingBasis?: string | null | undefined;
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
  pricingBasis?: string | null;
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
    && normalized(left.pricingBasis) === normalized(right.pricingBasis)
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
    pricingBasis: conflict.pricingBasis ?? null,
    currency: conflict.currency,
    validFrom: conflict.validFrom,
    validTo: conflict.validTo ?? null,
  } : null;
}

export function isRateCardApplicableForUsagePeriod(
  rateCard: { validFrom: string; validTo: string | null | undefined; status?: string; isDeleted?: boolean },
  usagePeriod?: ServiceUsagePeriod | null,
): boolean {
  if (rateCard.status && rateCard.status !== "active") return false;
  if (rateCard.isDeleted) return false;
  if (!rateCard.validFrom) return false;

  const usageStart = typeof usagePeriod?.startDate === "string" ? usagePeriod.startDate.trim() : null;
  if (!usageStart) {
    return false;
  }

  const usageEnd = typeof usagePeriod?.endDate === "string" && usagePeriod.endDate.trim() !== ""
    ? usagePeriod.endDate.trim()
    : usageStart;

  if (usageEnd < usageStart) {
    return false;
  }

  // Single-date or multi-date period requires valid_from <= usageStart
  if (rateCard.validFrom > usageStart) {
    return false;
  }

  // Rate card valid_to (if specified) must cover through usageEnd (inclusive)
  if (rateCard.validTo !== null && rateCard.validTo !== undefined && rateCard.validTo !== "" && rateCard.validTo < usageEnd) {
    return false;
  }

  return true;
}
