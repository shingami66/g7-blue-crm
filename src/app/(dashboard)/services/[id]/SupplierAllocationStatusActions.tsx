"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { transitionSupplierAllocationStatus } from "@/lib/supplier-allocations/actions";
import type { SupplierAllocationStatus } from "@/lib/supplier-allocations/types";

type SupplierAllocationStatusActionsProps = {
  allocationId: string;
  status: SupplierAllocationStatus;
};

const STATUS_ACTIONS: Record<
  "draft" | "planned",
  { label: string; loadingLabel: string; nextStatus: "planned" | "selected" }
> = {
  draft: {
    label: "Mark Planned",
    loadingLabel: "Saving...",
    nextStatus: "planned",
  },
  planned: {
    label: "Select Supplier",
    loadingLabel: "Selecting...",
    nextStatus: "selected",
  },
};

export default function SupplierAllocationStatusActions({
  allocationId,
  status,
}: SupplierAllocationStatusActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status === "selected") {
    return (
      <span className="text-[12px] font-semibold text-primary">
        Selected allocation
      </span>
    );
  }

  if (status === "cancelled") {
    return null;
  }

  const action = STATUS_ACTIONS[status];

  function handleTransition() {
    setError(null);

    startTransition(async () => {
      const result = await transitionSupplierAllocationStatus(
        allocationId,
        action.nextStatus
      );

      if (result.success) {
        router.refresh();
        return;
      }

      setError(result.error || "Failed to update allocation status.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={status === "draft" ? "outline" : "primary"}
        loading={isPending}
        onClick={handleTransition}
      >
        {isPending ? action.loadingLabel : action.label}
      </Button>
      {error ? (
        <p className="max-w-[220px] text-right text-[12px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
