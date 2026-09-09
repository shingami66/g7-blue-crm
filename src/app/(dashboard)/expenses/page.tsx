import { checkPermission, getCurrentAppUser } from "@/lib/auth/permissions";
import { EXPENSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  getExpensesAccountabilityList,
  getOwnExpensesAccountabilityList,
  getEligibleServicesForExpenseSelector,
} from "@/lib/expenses/queries";
import type {
  ExpenseAccountabilitySummary,
  ExpenseServiceOption,
  ExpenseRowCapabilities,
} from "@/lib/expenses/types";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

function buildExpenseRowCapabilities(
  expenses: ExpenseAccountabilitySummary[],
  currentUser: Awaited<ReturnType<typeof getCurrentAppUser>>,
  canFinanceReview: boolean,
  canApproveExpense: boolean,
): Record<string, ExpenseRowCapabilities> {
  const isOwnerDecisionRole =
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant" ||
    currentUser?.role === "manager";

  return Object.fromEntries(
    expenses.map((expense) => {
      const isSubmitted = expense.status === "submitted";
      const isReviewed = Boolean(expense.finance_reviewed_at);
      const canReviewThisRow = canFinanceReview && isSubmitted && !isReviewed;
      const canApproveThisRow =
        canApproveExpense && isOwnerDecisionRole && isSubmitted && isReviewed;
      const canRejectThisRow =
        canApproveThisRow && expense.submitted_by !== currentUser?.id;

      return [
        expense.id,
        {
          canFinanceReview: canReviewThisRow,
          canApprove: canApproveThisRow,
          canReject: canRejectThisRow,
        },
      ];
    }),
  );
}

export default async function ExpensesPage() {
  const [currentUser, canReadOwn, canReadBroad, canSubmitOwn, canFinanceReview, canApproveExpense] =
    await Promise.all([
      getCurrentAppUser(),
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
        rowCapabilities={{}}
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

  const rowCapabilities = buildExpenseRowCapabilities(
    [...myExpenses, ...expenses],
    currentUser,
    canFinanceReview,
    canApproveExpense,
  );

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
      rowCapabilities={rowCapabilities}
    />
  );
}
