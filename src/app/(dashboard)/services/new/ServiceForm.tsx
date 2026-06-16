"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import type { Customer } from "@/types/customer";
import { createService } from "@/lib/services/actions";

interface ServiceFormProps {
  customers: Customer[];
}

export default function ServiceForm({ customers }: ServiceFormProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a valid, active customer.");
      return;
    }

    if (!serviceTitle.trim()) {
      setError("Service title is required.");
      return;
    }

    if (eventEndDate && !eventStartDate) {
      setError("Event start date is required when end date is set.");
      return;
    }

    if (eventStartDate && eventEndDate) {
      if (new Date(eventEndDate) < new Date(eventStartDate)) {
        setError("Event end date must not be before start date.");
        return;
      }
    }

    const parsedBudget = estimatedBudget.trim() === "" ? undefined : Number(estimatedBudget);
    if (parsedBudget !== undefined) {
      if (!Number.isFinite(parsedBudget)) {
        setError("Estimated budget must be a valid number.");
        return;
      }
      if (parsedBudget < 0) {
        setError("Estimated budget must not be negative.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      customer_id: customerId,
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
      const result = await createService(payload);

      if (result.success) {
        router.push("/services");
        router.refresh();
      } else {
        setError(result.error || "Failed to create service.");
        setIsSubmitting(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            New Service
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            Create a new service or event booking.
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
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">Basic Details</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} {c.contact ? `(${c.contact})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Service Title</label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder="e.g. Wedding Photography, Corporate Setup"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Service details..."
                rows={3}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-2 border-t border-surface-variant pt-4">
              <label className="text-[14px] font-semibold text-on-surface">Estimated Budget (SAR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">Event Information (Optional)</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Annual Tech Conference 2026"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Event Type</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. Wedding, Exhibition, Corporate"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Event Location</label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Venue name or address"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Start Date</label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">End Date</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => router.push("/services")}
            className="px-6 py-2 bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSubmitting ? "Creating..." : "Create Service"}
          </button>
        </div>
      </form>
    </div>
  );
}
