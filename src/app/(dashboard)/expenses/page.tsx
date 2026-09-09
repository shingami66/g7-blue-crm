import { checkPermission } from "@/lib/auth/permissions";
import { EXPENSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  getExpensesAccountabilityList,
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
  const [canReadOwn, canReadBroad, canSubmitOwn, canFinanceReview, canApproveExpense] = await Promise.all([
    checkPermission(EXPENSE_PERMISSIONS.readOwn),
    checkPermission(EXPENSE_PERMISSIONS.read),
    checkPermission(EXPENSE_PERMISSIONS.submitOwn),
    checkPermission(EXPENSE_PERMISSIONS.financeReview),
    checkPermission(EXPENSE_PERMISSIONS.approve),
  ]);

  const canRead = canReadOwn || canReadBroad;
  if (!canRead) {
    return (
      <ExpensesClient
        canRead={false}
        canReadOwn={false}
        canReadBroad={false}
        canSubmitOwn={false}
        myExpenses={[]}
        expenses={[]}
        eligibleServices={[]}
        loadError={false}
        canFinanceReview={false}
        canApproveExpense={false}
      />
    );
  }

  let myExpenses: ExpenseAccountabilitySummary[] = [];
  let expenses: ExpenseAccountabilitySummary[] = [];
  let eligibleServices: ExpenseServiceOption[] = [];
  let loadError = false;

  try {
    const [myExpensesData, expensesData, servicesData] = await Promise.all([
      canReadOwn
        ? getOwnExpensesAccountabilityList({ limit: 100 })
        : Promise.resolve([] as ExpenseAccountabilitySummary[]),
      canReadBroad
        ? getExpensesAccountabilityList({ limit: 100 })
        : Promise.resolve([] as ExpenseAccountabilitySummary[]),
      canSubmitOwn
        ? getEligibleServicesForExpenseSelector().catch(() => [])
        : Promise.resolve([]),
    ]);
    myExpenses = myExpensesData;
    expenses = expensesData;
    eligibleServices = servicesData;
  } catch {
    loadError = true;
  }

  return (
    <ExpensesClient
      canRead={true}
      canReadOwn={canReadOwn}
      canReadBroad={canReadBroad}
      canSubmitOwn={canSubmitOwn}
      myExpenses={myExpenses}
      expenses={expenses}
      eligibleServices={eligibleServices}
      loadError={loadError}
      canFinanceReview={canFinanceReview}
      canApproveExpense={canApproveExpense}
    />
  );
}
