import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getQuotationById, getQuotationByIdResult } from "@/lib/quotations/queries";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import CommercialAmendmentWorkspace from "./CommercialAmendmentWorkspace";

export const dynamic = "force-dynamic";

export default async function CommercialAmendmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);
  let quotationResult: Awaited<ReturnType<typeof getQuotationByIdResult>> = { status: "not_found" };
  let authError: unknown = null;

  try {
    await requirePermission("quotations:read");
    quotationResult = await getQuotationByIdResult(id);
  } catch (error) {
    authError = error;
  }

  if (authError instanceof UnauthorizedError) redirect("/sign-in");
  if (authError instanceof ForbiddenError) {
    return <div className="p-8 text-error">{dictionary.states.accessDenied}</div>;
  }
  if (authError || quotationResult.status === "error") {
    return <div className="p-8 text-error">{dictionary.states.genericError}</div>;
  }
  if (quotationResult.status === "not_found") {
    return <div className="p-8 text-on-surface-variant">{dictionary.amendment.workspaceNotFound}</div>;
  }

  const quotation = quotationResult.quotation;
  if (quotation.status !== "draft" || !quotation.revisionOfQuotationId || !quotation.isApprovedCommercialAmendment) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-primary">{dictionary.amendment.workspaceLocked}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.editStates.lockedMessage}</p>
        <Link href={`/quotations/${quotation.id}`} className="mt-5 font-semibold text-primary hover:underline">{dictionary.editStates.backToQuotations}</Link>
      </div>
    );
  }

  const predecessor = await getQuotationById(quotation.revisionOfQuotationId);
  if (!predecessor || predecessor.status !== "approved") {
    return <div className="p-8 text-on-surface-variant">{dictionary.amendment.workspaceNotFound}</div>;
  }

  const [canWrite, canApprove] = await Promise.all([
    checkPermission("quotations:write"),
    checkPermission("quotations:approve"),
  ]);
  return (
    <CommercialAmendmentWorkspace
      quotation={quotation}
      predecessor={predecessor}
      dictionary={dictionary}
      canWrite={canWrite}
      canApprove={canApprove}
    />
  );
}
