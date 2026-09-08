import { checkPermission } from "@/lib/auth/permissions";
import { CASH_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  getOwnCashAdvancesList,
  getCashAdvancesList,
  getEligibleServicesForExpenseSelector,
  enrichCashAdvancesBatch,
} from "@/lib/expenses/queries";
import type {
  EnrichedCashAdvance,
  ExpenseServiceOption,
} from "@/lib/expenses/types";
import AdvancesClient from "./AdvancesClient";

export const dynamic = "force-dynamic";

export default async function AdvancesPage() {
  const [canReadOwn, canReadBroad, canSubmitOwn] = await Promise.all([
    checkPermission(CASH_ADVANCE_PERMISSIONS.readOwn),
    checkPermission(CASH_ADVANCE_PERMISSIONS.read),
    checkPermission(CASH_ADVANCE_PERMISSIONS.submitOwn),
  ]);

  const canRead = canReadOwn || canReadBroad;
  if (!canRead) {
    return (
      <AdvancesClient
        canRead={false}
        canReadOwn={false}
        canReadBroad={false}
        canSubmitOwn={false}
        myAdvances={[]}
        allAdvances={[]}
        eligibleServices={[]}
        loadError={null}
      />
    );
  }

  let myAdvances: EnrichedCashAdvance[] = [];
  let allAdvances: EnrichedCashAdvance[] = [];
  let eligibleServices: ExpenseServiceOption[] = [];
  let loadError: string | null = null;

  try {
    const [rawMyAdvances, rawAllAdvances, servicesData] = await Promise.all([
      canReadOwn
        ? getOwnCashAdvancesList({ limit: 100 })
        : Promise.resolve([]),
      canReadBroad
        ? getCashAdvancesList({ limit: 100 })
        : Promise.resolve([]),
      canSubmitOwn
        ? getEligibleServicesForExpenseSelector().catch(() => [])
        : Promise.resolve([]),
    ]);

    const [enrichedMy, enrichedAll] = await Promise.all([
      enrichCashAdvancesBatch(rawMyAdvances),
      enrichCashAdvancesBatch(rawAllAdvances),
    ]);

    myAdvances = enrichedMy;
    allAdvances = enrichedAll;
    eligibleServices = servicesData;
  } catch {
    console.error("[AdvancesPage] Failed to load cash advances");
    loadError = "load_failed";
  }

  return (
    <AdvancesClient
      canRead={true}
      canReadOwn={canReadOwn}
      canReadBroad={canReadBroad}
      canSubmitOwn={canSubmitOwn}
      myAdvances={myAdvances}
      allAdvances={allAdvances}
      eligibleServices={eligibleServices}
      loadError={loadError}
    />
  );
}
