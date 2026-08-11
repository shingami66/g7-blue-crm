import { sumAuthoritativeMoney } from "./money.ts";

type ExposureFilterQuery = {
  eq(column: string, value: unknown): ExposureFilterQuery;
  is(column: string, value: unknown): ExposureFilterQuery;
  not(column: string, operator: string, value: unknown): ExposureFilterQuery;
};

type ApplicableInvoiceExposureRow = Record<string, unknown> & {
  id: string;
  grand_total: unknown;
};

export type ApplicableServiceInvoiceExposureResult =
  | {
      status: "success";
      exposure: number;
      rows: ApplicableInvoiceExposureRow[];
    }
  | { status: "unavailable"; rows?: ApplicableInvoiceExposureRow[] };

const EXPOSURE_RESULT_KEYS = ["data", "error"] as const;
const EXPOSURE_ROW_KEYS = ["id", "grand_total"] as const;

export function applyApplicableServiceInvoiceExposurePredicate(
  query: unknown,
  serviceId: string,
): unknown {
  return (query as ExposureFilterQuery)
    .eq("service_id", serviceId)
    .not("is_deleted", "is", true)
    .is("voided_at", null)
    .not("issued_at", "is", null)
    .not("status", "in", '("draft","voided","cancelled")');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnDataProperties(
  value: object,
  propertyNames: readonly string[],
): boolean {
  return propertyNames.every((propertyName) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
    return descriptor !== undefined && "value" in descriptor;
  });
}

export function parseApplicableServiceInvoiceExposureResult(
  value: unknown,
): ApplicableServiceInvoiceExposureResult {
  if (
    !isPlainObject(value) ||
    !hasOwnDataProperties(value, EXPOSURE_RESULT_KEYS) ||
    value.error !== null ||
    !Array.isArray(value.data)
  ) {
    return { status: "unavailable" };
  }

  const rows: ApplicableInvoiceExposureRow[] = [];
  for (const row of value.data) {
    if (
      !isPlainObject(row) ||
      !hasOwnDataProperties(row, EXPOSURE_ROW_KEYS) ||
      typeof row.id !== "string" ||
      row.id.trim().length === 0
    ) {
      return { status: "unavailable" };
    }

    rows.push(row as ApplicableInvoiceExposureRow);
  }

  const exposure = sumAuthoritativeMoney(
    rows.map((row) => row.grand_total),
  );
  return exposure == null
    ? { status: "unavailable", rows }
    : { status: "success", exposure, rows };
}
