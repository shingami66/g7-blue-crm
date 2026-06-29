"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { blacklistSupplier, unblacklistSupplier } from "@/lib/suppliers/actions";
import type { Supplier } from "@/types/supplier";

export default function SupplierBlacklistActions({
  supplier,
}: {
  supplier: Supplier;
}) {
  const router = useRouter();
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showUnblacklistModal, setShowUnblacklistModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleBlacklist(formData: FormData) {
    setActionError(null);
    const reason = formData.get("reason") as string;

    startTransition(async () => {
      const result = await blacklistSupplier({ id: supplier.id, reason });

      if (result.success) {
        setShowBlacklistModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? "Failed to blacklist supplier");
      }
    });
  }

  async function handleUnblacklist() {
    setActionError(null);

    startTransition(async () => {
      const result = await unblacklistSupplier({ id: supplier.id });

      if (result.success) {
        setShowUnblacklistModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? "Failed to unblacklist supplier");
      }
    });
  }

  const isBlacklisted = supplier.status === "blacklisted";

  return (
    <>
      {!isBlacklisted ? (
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setShowBlacklistModal(true);
          }}
          className="text-[12px] font-medium text-error hover:underline px-2 py-1 rounded hover:bg-error-container/30 transition-colors flex items-center gap-1"
        >
          <ShieldAlert size={14} />
          Blacklist
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setShowUnblacklistModal(true);
          }}
          className="text-[12px] font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-primary-container/30 transition-colors flex items-center gap-1"
        >
          <ShieldCheck size={14} />
          Remove Blacklist
        </button>
      )}

      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-error">
                <AlertTriangle size={24} />
                <h3 className="text-[20px] leading-[28px] font-semibold">
                  Blacklist Supplier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlacklistModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[14px] text-on-surface-variant mb-6">
              You are about to blacklist <span className="font-semibold text-on-surface">{supplier.name}</span>. This will prevent any future business operations with them. Please provide a mandatory reason.
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleBlacklist} className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-[13px] font-medium text-on-surface mb-1">
                  Reason for Blacklisting <span className="text-error">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  rows={3}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-error resize-none"
                  placeholder="Provide a detailed reason..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlacklistModal(false)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface text-[14px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-error hover:bg-error/90 text-on-error rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? "Blacklisting..." : "Confirm Blacklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUnblacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck size={24} />
                <h3 className="text-[20px] leading-[28px] font-semibold">
                  Remove Blacklist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUnblacklistModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[14px] text-on-surface-variant mb-6">
              You are about to remove the blacklist status for <span className="font-semibold text-on-surface">{supplier.name}</span>. Their status will be set to inactive, and they will be eligible for business operations again.
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleUnblacklist} className="space-y-4">
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUnblacklistModal(false)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface text-[14px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Remove Blacklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
