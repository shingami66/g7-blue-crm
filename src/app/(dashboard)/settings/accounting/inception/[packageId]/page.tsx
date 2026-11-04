import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupStatus, getAccountingInceptionPackage } from "@/lib/accounting/queries";
import { requireUser } from "@/lib/auth/permissions";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingInceptionPackageDetail } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";
import InceptionPackageDetailClient, { type InceptionDetailPageState } from "./InceptionPackageDetailClient";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";
import RecordBackButton from "@/components/navigation/RecordBackButton";

export default async function AccountingInceptionPackagePage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingInceptionDictionary(locale);
  const setupDictionary = getAccountingSetupDictionary(locale);
  const accountingLabel = (locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn).modules.accounting;
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
    <div dir={getDirection(locale)} className="min-w-0">
      <PageFrame variant="record">
        <PageLocation
          breadcrumbs={{
            label: accountingLabel,
            items: [
              { label: accountingLabel },
              { label: setupDictionary.title },
              { label: dictionary.accountingInceptionLabel, href: "/settings/accounting/inception" },
              { label: dictionary.packageDetailLabel, current: true },
            ],
          }}
          returnControl={<RecordBackButton href="/settings/accounting/inception" locale={locale} variant="labeled" label={dictionary.backToPackages} />}
        />
        <PageHeader
          variant="composed"
          title={dictionary.title}
          identifier={state === "ready" ? <bdi dir="ltr" className="break-all">{packageId}</bdi> : undefined}
        />
        <InceptionPackageDetailClient locale={locale} state={state} detail={detail} isCreator={isCreator} isReviewer={isReviewer} canManage={canManage} canPrepare={canPrepare} canPost={canPost} canView={canView} />
      </PageFrame>
    </div>
  );
}
