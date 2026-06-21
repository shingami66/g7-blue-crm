"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { updateCustomer } from "@/lib/customers/actions";
import type { Customer } from "@/types/customer";
import {
  CustomerCoreFields,
  CustomerOfficialBillingFields,
} from "../CustomerFormFields";

export default function CustomerProfileActions({
  customer,
  canWrite,
}: {
  customer: Customer;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canWrite) {
    return null;
  }

  async function saveCustomerProfile(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateCustomer(customer.id, formData);

      if (result.success) {
        setShowEditModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? "Unknown error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActionError(null);
          setShowEditModal(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] leading-[20px] font-semibold text-on-primary transition-colors hover:bg-primary-container"
      >
        <Pencil size={18} />
        Edit Profile
      </button>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                Edit Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-on-surface-variant hover:text-primary"
                aria-label="Close edit customer profile"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={saveCustomerProfile} className="space-y-4">
              <CustomerCoreFields customer={customer} />
              <CustomerOfficialBillingFields customer={customer} />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
