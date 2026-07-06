"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import type { Service } from "@/types/service";
import { updateService } from "@/lib/services/actions";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { isolateBidiText } from "@/lib/i18n/bidi";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";

interface EditServiceFormProps {
  service: Service;
  dictionary: ServicesDictionary;
}

export default function EditServiceForm({ service, dictionary }: EditServiceFormProps) {
  const router = useRouter();
  const { back, push } = useGlobalNavigationPending();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceTitle, setServiceTitle] = useState(service.serviceTitle || "");
  const [eventName, setEventName] = useState(service.eventName || "");
  const [eventType, setEventType] = useState(service.eventType || "");
  const [eventStartDate, setEventStartDate] = useState(service.eventStartDate || "");
  const [eventEndDate, setEventEndDate] = useState(service.eventEndDate || "");
  const [eventLocation, setEventLocation] = useState(service.eventLocation || "");
  const [description, setDescription] = useState(service.description || "");
  const [estimatedBudget, setEstimatedBudget] = useState(service.estimatedBudget != null ? String(service.estimatedBudget) : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serviceTitle.trim()) {
      setError(dictionary.form.validation.serviceTitleRequired);
      return;
    }

    if (eventEndDate && !eventStartDate) {
      setError(dictionary.form.validation.startDateRequiredWhenEndDateSet);
      return;
    }

    if (eventStartDate && eventEndDate) {
      if (new Date(eventEndDate) < new Date(eventStartDate)) {
        setError(dictionary.form.validation.endDateBeforeStartDate);
        return;
      }
    }

    const parsedBudget = estimatedBudget.trim() === "" ? undefined : Number(estimatedBudget);
    if (parsedBudget !== undefined) {
      if (!Number.isFinite(parsedBudget)) {
        setError(dictionary.form.validation.estimatedBudgetInvalid);
        return;
      }
      if (parsedBudget < 0) {
        setError(dictionary.form.validation.estimatedBudgetNegative);
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      service_title: serviceTitle.trim(),
      event_name: eventName.trim() || undefined,
      event_type: eventType.trim() || undefined,
      event_start_date: eventStartDate || undefined,
      event_end_date: eventEndDate || undefined,
      event_location: eventLocation.trim() || undefined,
      description: description.trim() || undefined,
      estimated_budget: parsedBudget,
    };

    try {
      const result = await updateService(service.id, payload);

      if (result.success) {
        router.push(`/services/${service.id}`);
        router.refresh();
      } else {
        setError(result.error || dictionary.form.validation.failedToUpdate);
        setIsSubmitting(false);
      }
    } catch {
      setError(dictionary.form.validation.unexpectedError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => back()}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            {dictionary.form.editTitle}
          </h2>
          <p dir="ltr" className="text-on-surface-variant text-[14px]">
            {isolateBidiText(`${service.serviceNumber} - ${dictionary.form.editSubtitle}`)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded-lg text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">{dictionary.form.basicDetails}</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.customer}</label>
              <div dir="auto" className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface-variant cursor-not-allowed">
                {isolateBidiText(
                  `${service.customer?.company || dictionary.form.placeholders.unknownCustomer}${service.customer?.contact ? ` (${service.customer.contact})` : ""}`,
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.serviceTitle}</label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder={dictionary.form.placeholders.serviceTitle}
                dir="auto"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.description}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={dictionary.form.placeholders.description}
                dir="auto"
                rows={3}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-2 border-t border-surface-variant pt-4">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.estimatedBudget}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder={dictionary.form.placeholders.estimatedBudget}
                dir="ltr"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">{dictionary.form.eventInformationOptional}</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.eventName}</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder={dictionary.form.placeholders.eventName}
                dir="auto"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.eventType}</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder={dictionary.form.placeholders.eventType}
                dir="auto"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.eventLocation}</label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder={dictionary.form.placeholders.eventLocation}
                dir="auto"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.startDate}</label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  dir="ltr"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.labels.endDate}</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  dir="ltr"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => push(`/services/${service.id}`)}
            className="px-6 py-2 bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {dictionary.form.buttons.cancel}
          </button>
          <Button
            type="submit"
            loading={isSubmitting}
          >
            <Save size={18} />
            {dictionary.form.buttons.saveChanges}
          </Button>
        </div>
      </form>
    </div>
  );
}
