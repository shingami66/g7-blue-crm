"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { blacklistSupplier, unblacklistSupplier } from "@/lib/suppliers/actions";
import type { Supplier } from "@/types/supplier";
import Button from "@/components/ui/Button";
import {
  formatSupplierCopy,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";

export default function SupplierBlacklistActions({
  supplier,
  dictionary,
}: {
  supplier: Supplier;
  dictionary: SuppliersDictionary["blacklist"];
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
        setActionError(result.error ?? dictionary.blacklistFailed);
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
        setActionError(result.error ?? dictionary.unblacklistFailed);
      }
    });
  }

  const isBlacklisted = supplier.status === "blacklisted";

  return (
    <>
      {!isBlacklisted ? (
        <Button
          type="button"
          onClick={() => {
            setActionError(null);
            setShowBlacklistModal(true);
          }}
          size="sm"
          variant="ghost"
        >
          <ShieldAlert size={14} />
          {dictionary.blacklist}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => {
            setActionError(null);
            setShowUnblacklistModal(true);
          }}
          size="sm"
          variant="ghost"
        >
          <ShieldCheck size={14} />
          {dictionary.removeBlacklist}
        </Button>
      )}

      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-error">
                <AlertTriangle size={24} />
                <h3 className="text-[20px] leading-[28px] font-semibold">
                  {dictionary.blacklistTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlacklistModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={dictionary.cancel}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[14px] text-on-surface-variant mb-6">
              {formatSupplierCopy(dictionary.blacklistBody, {
                name: supplier.name,
              })}
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleBlacklist} className="space-y-4">
              <div>
                <label
                  htmlFor="reason"
                  className="block text-[13px] font-medium text-on-surface mb-1"
                >
                  {dictionary.reasonLabel} <span className="text-error">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  rows={3}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-error resize-none"
                  placeholder={dictionary.reasonPlaceholder}
                  dir="auto"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowBlacklistModal(false)}
                  variant="ghost"
                >
                  {dictionary.cancel}
                </Button>
                <Button type="submit" loading={isPending} variant="danger">
                  {isPending ? dictionary.blacklisting : dictionary.confirmBlacklist}
                </Button>
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
                  {dictionary.unblacklistTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUnblacklistModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={dictionary.cancel}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[14px] text-on-surface-variant mb-6">
              {formatSupplierCopy(dictionary.unblacklistBody, {
                name: supplier.name,
              })}
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleUnblacklist} className="space-y-4">
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowUnblacklistModal(false)}
                  variant="ghost"
                >
                  {dictionary.cancel}
                </Button>
                <Button type="submit" loading={isPending} variant="primary">
                  {isPending ? dictionary.processing : dictionary.confirmUnblacklist}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
