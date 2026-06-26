"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ServiceStatus } from "@/types/service";
import { SERVICE_STATUSES } from "@/types/service";
import { updateServiceStatusAction } from "@/lib/services/actions";

interface ServiceStatusControlProps {
  serviceId: string;
  currentStatus: ServiceStatus;
}

export default function ServiceStatusControl({
  serviceId,
  currentStatus,
}: ServiceStatusControlProps) {
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  const handleSave = () => {
    if (selectedStatus === currentStatus) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateServiceStatusAction(serviceId, { status: selectedStatus });

      if (result.success) {
        setSuccess(true);
        router.refresh();
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update status");
      }
    });
  };

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6 mb-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
        <h3 className="font-semibold text-primary">Manual Status Control</h3>
      </div>
      <div className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="w-full md:w-64 flex flex-col gap-1.5">
          <label htmlFor="service-status-select" className="text-[13px] font-semibold text-on-surface">
            Change Status
          </label>
          <select
            id="service-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ServiceStatus)}
            disabled={isPending}
            className="w-full h-[40px] px-3 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {SERVICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || selectedStatus === currentStatus}
          className="h-[40px] px-5 bg-primary text-on-primary font-semibold text-[14px] rounded-lg hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving..." : "Save Status"}
        </button>

        {error && (
          <div className="text-[13px] text-error h-[40px] flex items-center">
            {error}
          </div>
        )}

        {success && (
          <div className="text-[13px] text-emerald-600 font-medium h-[40px] flex items-center">
            Status updated successfully!
          </div>
        )}
      </div>
    </div>
  );
}
