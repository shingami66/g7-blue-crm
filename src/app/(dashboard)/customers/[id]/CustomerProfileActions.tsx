"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { updateCustomer } from "@/lib/customers/actions";
import type { CustomersDictionary } from "@/lib/i18n/dictionaries/customers";
import type { Customer } from "@/types/customer";
import Button from "@/components/ui/Button";
import {
  CustomerCoreFields,
  CustomerOfficialBillingFields,
} from "../CustomerFormFields";

export default function CustomerProfileActions({
  customer,
  canWrite,
  dictionary,
}: {
  customer: Customer;
  canWrite: boolean;
  dictionary: CustomersDictionary;
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
        setActionError(getLocalizedActionError(result.error, dictionary));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setActionError(null);
          setShowEditModal(true);
        }}
        size="sm"
        className="h-9 min-h-9 whitespace-nowrap"
      >
        <span className="inline-flex items-center gap-2">
          <Pencil size={16} aria-hidden="true" />
          {dictionary.actions.editProfile}
        </span>
      </Button>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                {dictionary.actions.editProfile}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-on-surface-variant hover:text-primary"
                aria-label={dictionary.actions.closeEditCustomerProfile}
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
              <CustomerCoreFields customer={customer} dictionary={dictionary} />
              <CustomerOfficialBillingFields customer={customer} dictionary={dictionary} />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  size="sm"
                >
                  {dictionary.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  loading={isPending}
                  size="sm"
                >
                  {dictionary.actions.saveChanges}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function getLocalizedActionError(
  error: string | undefined,
  dictionary: CustomersDictionary,
): string {
  if (error === "Unauthorized") return dictionary.states.unauthorized;
  if (error === "Forbidden") return dictionary.states.forbidden;
  if (error === "Validation failed") return dictionary.states.validationFailed;
  return error ? dictionary.states.actionFailed : dictionary.states.unknownError;
}
