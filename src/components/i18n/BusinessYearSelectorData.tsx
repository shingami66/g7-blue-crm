import "server-only";

import BusinessYearSelector from "./BusinessYearSelector";
import { getBusinessYearOptions } from "@/lib/business-year-options";
import { getBusinessYearPreference } from "@/lib/business-year-preference";

export default async function BusinessYearSelectorData() {
  const [years, preferredYear] = await Promise.all([
    getBusinessYearOptions(),
    getBusinessYearPreference(),
  ]);

  return <BusinessYearSelector years={years} preferredYear={preferredYear} />;
}
