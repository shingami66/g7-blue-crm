import { checkPermission } from "@/lib/auth/permissions";
import { PETTY_CASH_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getPettyCashCustodianOptions, getPettyCashExpensesByFund, getPettyCashFundDetailById } from "@/lib/expenses/queries";
import type { PettyCashCustodianOption, PettyCashExpenseSummary, PettyCashFund, PettyCashTransaction } from "@/lib/expenses/types";
import PettyCashDetailClient from "./PettyCashDetailClient";

export const dynamic = "force-dynamic";

export default async function PettyCashFundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [canRead, canManage, canTransact] = await Promise.all([
    checkPermission(PETTY_CASH_PERMISSIONS.read),
    checkPermission(PETTY_CASH_PERMISSIONS.manage),
    checkPermission(PETTY_CASH_PERMISSIONS.transact),
  ]);
  if (!canRead) return <PettyCashDetailClient canRead={false} canManage={false} canTransact={false} fund={null} transactions={[]} expenses={[]} custodians={[]} loadError={false} />;

  let fund: PettyCashFund | null = null;
  let transactions: PettyCashTransaction[] = [];
  let expenses: PettyCashExpenseSummary[] = [];
  let custodians: PettyCashCustodianOption[] = [];
  let loadError = false;
  try {
    const [detail, fundExpenses, fundCustodians] = await Promise.all([
      getPettyCashFundDetailById(id),
      getPettyCashExpensesByFund(id),
      canManage ? getPettyCashCustodianOptions() : Promise.resolve([]),
    ]);
    fund = detail.fund;
    transactions = detail.transactions;
    expenses = fundExpenses;
    custodians = fundCustodians;
  } catch {
    loadError = true;
  }

  return <PettyCashDetailClient canRead canManage={canManage} canTransact={canTransact} fund={fund} transactions={transactions} expenses={expenses} custodians={custodians} loadError={loadError} />;
}
