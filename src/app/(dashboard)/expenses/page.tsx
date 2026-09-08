import { checkPermission } from "@/lib/auth/permissions";
import { EXPENSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  getOwnExpensesAccountabilityList,
  getEligibleServicesForExpenseSelector,
} from "@/lib/expenses/queries";
import type {
  ExpenseAccountabilitySummary,
  ExpenseServiceOption,
} from "@/lib/expenses/types";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [canReadOwn, canReadBroad, canSubmitOwn] = await Promise.all([
    checkPermission(EXPENSE_PERMISSIONS.readOwn),
    checkPermission(EXPENSE_PERMISSIONS.read),
    checkPermission(EXPENSE_PERMISSIONS.submitOwn),
  ]);

  const canRead = canReadOwn || canReadBroad;
  if (!canRead) {
    return (
      <ExpensesClient
        canRead={false}
        canSubmitOwn={false}
        myExpenses={[]}
        eligibleServices={[]}
        loadError={null}
      />
    );
  }

  let myExpenses: ExpenseAccountabilitySummary[] = [];
  let eligibleServices: ExpenseServiceOption[] = [];
  let loadError: string | null = null;

  try {
    const [expensesData, servicesData] = await Promise.all([
      getOwnExpensesAccountabilityList({ limit: 100 }),
      canSubmitOwn
        ? getEligibleServicesForExpenseSelector().catch(() => [])
        : Promise.resolve([]),
    ]);
    myExpenses = expensesData;
    eligibleServices = servicesData;
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Failed to load expenses";
  }

  return (
    <ExpensesClient
      canRead={true}
      canSubmitOwn={canSubmitOwn}
      myExpenses={myExpenses}
      eligibleServices={eligibleServices}
      loadError={loadError}
    />
  );
}
