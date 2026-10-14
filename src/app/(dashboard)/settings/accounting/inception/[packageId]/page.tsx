import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupStatus, getAccountingInceptionPackage } from "@/lib/accounting/queries";
import { requireUser } from "@/lib/auth/permissions";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingInceptionPackageDetail } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import InceptionPackageDetailClient, { type InceptionDetailPageState } from "./InceptionPackageDetailClient";

export default async function AccountingInceptionPackagePage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingInceptionDictionary(locale);
  let state: InceptionDetailPageState = "dependency-failure";
  let detail: AccountingInceptionPackageDetail | null = null;
  let isCreator = false;
  let isReviewer = false;
  let canManage = false;
  let canPrepare = false;
  let canPost = false;
  let canView = false;

  try {
    const actor = await requireUser();
    [canView, canManage] = await Promise.all([
      resolveAccountingCapability(actor.id, "accounting:view"),
      resolveAccountingCapability(actor.id, "accounting:manage_inception"),
    ]);
    if (canManage || canView) {
      [canPrepare, canPost] = await Promise.all([
        canManage ? resolveAccountingCapability(actor.id, "accounting:prepare_journal") : false,
        canManage ? resolveAccountingCapability(actor.id, "accounting:post_journal") : false,
      ]);
      detail = await getAccountingInceptionPackage(packageId);
      state = detail ? "ready" : "not-found";
      isCreator = detail?.version.created_by === actor.id;
      isReviewer = detail?.review?.reviewer_user_id === actor.id;
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
        <Link href="/settings/accounting/inception" className="text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToPackages}</Link>
        <h1 className="mt-3 text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 break-all text-sm text-on-surface-variant"><bdi dir="ltr">{packageId}</bdi></p>
      </header>
      <InceptionPackageDetailClient locale={locale} state={state} detail={detail} isCreator={isCreator} isReviewer={isReviewer} canManage={canManage} canPrepare={canPrepare} canPost={canPost} canView={canView} />
    </main>
  );
}
