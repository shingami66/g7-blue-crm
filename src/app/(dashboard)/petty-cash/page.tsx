import { checkPermission } from "@/lib/auth/permissions";
import { PETTY_CASH_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getPettyCashCustodianOptions, getPettyCashFundsList } from "@/lib/expenses/queries";
import type { PettyCashCustodianOption, PettyCashFund } from "@/lib/expenses/types";
import PettyCashClient from "./PettyCashClient";

export const dynamic = "force-dynamic";

export default async function PettyCashPage() {
  const [canRead, canManage] = await Promise.all([
    checkPermission(PETTY_CASH_PERMISSIONS.read),
    checkPermission(PETTY_CASH_PERMISSIONS.manage),
  ]);

  if (!canRead) {
    return <PettyCashClient canRead={false} canManage={false} funds={[]} custodians={[]} loadError={false} />;
  }

  let funds: PettyCashFund[] = [];
  let custodians: PettyCashCustodianOption[] = [];
  let loadError = false;
  try {
    [funds, custodians] = await Promise.all([
      getPettyCashFundsList(),
      canManage ? getPettyCashCustodianOptions() : Promise.resolve([]),
    ]);
  } catch {
    loadError = true;
  }

  return <PettyCashClient canRead canManage funds={funds} custodians={custodians} loadError={loadError} />;
}
