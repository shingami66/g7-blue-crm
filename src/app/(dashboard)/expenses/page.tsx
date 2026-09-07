import { checkPermission } from "@/lib/auth/permissions";
import { EXPENSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getExpensesAccountabilityList } from "@/lib/expenses/queries";
import type { ExpenseAccountabilitySummary } from "@/lib/expenses/types";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const canRead = await checkPermission(EXPENSE_PERMISSIONS.read);
  if (!canRead) {
    return <ExpensesClient canRead={false} expenses={[]} loadError={null} />;
  }

  let expenses: ExpenseAccountabilitySummary[] = [];
  let loadError: string | null = null;

  try {
    expenses = await getExpensesAccountabilityList({ limit: 50 });
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Failed to load expenses";
  }

  return <ExpensesClient canRead={true} expenses={expenses} loadError={loadError} />;
}
