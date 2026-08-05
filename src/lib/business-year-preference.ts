import "server-only";

import { cookies } from "next/headers";
import {
  BUSINESS_YEAR_COOKIE,
  getCurrentBusinessYear,
  normalizeBusinessYear,
  type BusinessYear,
} from "./business-year";

export async function getBusinessYearPreference(
  currentYear = getCurrentBusinessYear(),
): Promise<BusinessYear> {
  const value = (await cookies()).get(BUSINESS_YEAR_COOKIE)?.value;
  return normalizeBusinessYear(value, currentYear);
}
