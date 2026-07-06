import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getLocale } from "@/lib/i18n/locales";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import EditServiceForm from "./EditServiceForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = getLocale();
  const dictionary = getServicesDictionary(locale);
  const { id } = await params;

  let service;

  try {
    await requirePermission("services:write");
    service = await getServiceById(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.states.editForbidden}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.serviceDataLoadError}</p>
        </div>
      </div>
    );
  }

  if (!service) {
    notFound();
  }

  if (service.status !== "Inquiry" && service.status !== "Quoted") {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex items-center gap-4 py-4">
          <Link
            href={`/services/${service.id}`}
            className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
              {dictionary.editPage.blockedTitle}
            </h2>
            <p dir="ltr" className="text-on-surface-variant text-[14px]">
              {service.serviceNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded-lg text-[14px] max-w-3xl">
          {dictionary.editPage.blockedMessage.replace("{status}", dictionary.serviceStatuses[service.status])}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <EditServiceForm service={service} dictionary={dictionary} />
    </div>
  );
}
