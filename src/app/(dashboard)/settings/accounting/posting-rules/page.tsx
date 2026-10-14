import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, listAccountingAccounts, listAccountingPostingRules } from "@/lib/accounting/queries";
import type { AccountingAccountVersion, AccountingPostingRuleVersion } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingPostingRulesDictionary } from "@/lib/i18n/dictionaries/accounting-posting-rules";
import PostingRulesClient, { type PostingRulesPageState } from "./PostingRulesClient";

export default async function AccountingPostingRulesPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingPostingRulesDictionary(locale);
  let state: PostingRulesPageState = "dependency-failure";
  let rules: AccountingPostingRuleVersion[] = [];
  let accounts: AccountingAccountVersion[] = [];
  let canManage = false;

  try {
    canManage = await checkPermission("accounting:manage_chart");
    if (canManage) {
      // Chart managers can use both independently authorized lists without setup-status access.
      [rules, accounts] = await Promise.all([listAccountingPostingRules(), listAccountingAccounts()]);
      state = "ready";
    } else {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else {
        [rules, accounts] = await Promise.all([listAccountingPostingRules(), listAccountingAccounts()]);
        state = "ready";
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) state = "access-denied";
    else if (error instanceof AuthDependencyError) state = "dependency-failure";
    else state = "dependency-failure";
  }

  return (
    <main className="mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col gap-6" dir={getDirection(locale)}>
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <PostingRulesClient locale={locale} state={state} rules={rules} accounts={accounts} canManage={canManage} />
    </main>
  );
}
