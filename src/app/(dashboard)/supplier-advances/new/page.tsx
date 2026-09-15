import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import PendingLink from "@/components/ui/PendingLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import { getSupplierAdvanceCommitmentOptions } from "@/lib/supplier-advances/queries";
import SupplierAdvanceAuthorizationForm from "../SupplierAdvanceAuthorizationForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierAdvancePage() {
  const [locale, canAuthorize] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.authorize),
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  if (!canAuthorize) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let commitments: Awaited<ReturnType<typeof getSupplierAdvanceCommitmentOptions>> = [];
  let stateMessage: string | null = null;
  try {
    commitments = await getSupplierAdvanceCommitmentOptions();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    stateMessage = error instanceof ForbiddenError ? dictionary.states.accessDenied : dictionary.states.loadError;
  }
  if (stateMessage) return <StateCard title={dictionary.title} message={stateMessage} />;
  const isRtl = locale === "ar";
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5 pb-12">
      <div>
        <PendingLink href="/supplier-advances" pendingLabel={dictionary.backToList} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">
          {isRtl ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
          <span>{dictionary.backToList}</span>
        </PendingLink>
        <h1 className="mt-3 text-[24px] font-semibold text-primary">{dictionary.authorizeAdvance}</h1>
      </div>
      {commitments.length === 0 && <p className="rounded-lg border border-surface-variant bg-surface-container-low px-4 py-3 text-[13px] text-on-surface-variant">{dictionary.states.noCommitments}</p>}
      <SupplierAdvanceAuthorizationForm commitments={commitments} dictionary={dictionary} requestId={randomUUID()} />
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
