import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupStatus, getAccountingInceptionOverview } from "@/lib/accounting/queries";
import { requireUser } from "@/lib/auth/permissions";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingInceptionPackageSummary } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import InceptionPackagesClient, { type InceptionPageState } from "./InceptionPackagesClient";

export default async function AccountingInceptionPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingInceptionDictionary(locale);
  let state: InceptionPageState = "dependency-failure";
  let packages: AccountingInceptionPackageSummary[] = [];
  let canManage = false;

  try {
    const actor = await requireUser();
    const [canView, canManageInception] = await Promise.all([
      resolveAccountingCapability(actor.id, "accounting:view"),
      resolveAccountingCapability(actor.id, "accounting:manage_inception"),
    ]);
    canManage = canManageInception;
    if (canView || canManageInception) {
      const overview = await getAccountingInceptionOverview();
      if (overview.state === "NOT_INITIALIZED") state = "not-initialized";
      else {
        packages = overview.packages;
        state = packages.length === 0 ? "empty" : "ready";
      }
    } else {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else state = "access-denied";
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
        <Link href="/settings/accounting" className="text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
        <h1 className="mt-3 text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <InceptionPackagesClient locale={locale} state={state} packages={packages} canManage={canManage} />
    </main>
  );
}
