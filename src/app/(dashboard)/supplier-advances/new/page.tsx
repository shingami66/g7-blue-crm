import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import { getSupplierAdvanceCommitmentOptions } from "@/lib/supplier-advances/queries";
import SupplierAdvanceAuthorizationForm from "../SupplierAdvanceAuthorizationForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierAdvancePage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const [locale, canAuthorize] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.authorize),
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  const isRtl = locale === "ar";
  const renderErrorState = (returnHref: string, title: string, message: string, role: "alert" | "status") => (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0">
      <PageFrame variant="form">
        <PageLocation
          breadcrumbs={{
            label: dictionary.title,
            items: [
              { label: dictionary.title, href: "/supplier-advances" },
              { label: dictionary.authorizeAdvance, current: true },
            ],
          }}
          returnControl={<RecordBackButton href={returnHref} locale={locale} variant="labeled" />}
        />
        <PageHeader variant="composed" title={dictionary.authorizeAdvance} />
        <StateCard title={title} message={message} role={role} />
      </PageFrame>
    </div>
  );
  if (!canAuthorize) return renderErrorState("/supplier-advances", dictionary.states.accessDenied, dictionary.states.accessDenied, "status");
  const params = await searchParams;
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeRecordReturnTo(returnToParam, "/supplier-advances");
  let commitments: Awaited<ReturnType<typeof getSupplierAdvanceCommitmentOptions>> = [];
  let state: "accessDenied" | "loadError" | null = null;
  try {
    commitments = await getSupplierAdvanceCommitmentOptions();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state === "accessDenied") return renderErrorState("/supplier-advances", dictionary.states.accessDenied, dictionary.states.accessDenied, "status");
  if (state === "loadError") return renderErrorState(returnTo, dictionary.states.loadError, dictionary.states.loadError, "alert");
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0">
      <PageFrame variant="form">
        <PageLocation
          breadcrumbs={{
            label: dictionary.title,
            items: [
              { label: dictionary.title, href: "/supplier-advances" },
              { label: dictionary.authorizeAdvance, current: true },
            ],
          }}
          returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.backToList} />}
        />
        <PageHeader variant="composed" title={dictionary.authorizeAdvance} />
      {commitments.length === 0 ? (
        <section role="status" data-testid="supplier-advance-no-commitments" className="flex flex-col items-start gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-on-surface">{dictionary.states.noCommitments}</h2>
        </section>
      ) : (
        <SupplierAdvanceAuthorizationForm commitments={commitments} dictionary={dictionary} requestId={randomUUID()} returnTo={returnTo} />
      )}
      </PageFrame>
    </div>
  );
}

function StateCard({ title, message, role }: { title: string; message: string; role?: "alert" | "status" }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div role={role} aria-labelledby={role ? "supplier-advance-create-state-title" : undefined} className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 id={role ? "supplier-advance-create-state-title" : undefined} className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
