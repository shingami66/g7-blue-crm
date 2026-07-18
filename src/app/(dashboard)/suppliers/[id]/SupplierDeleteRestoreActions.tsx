"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RotateCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { deleteSupplier, restoreSupplier } from "@/lib/suppliers/actions";
import { formatSupplierCopy, type SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";

export default function SupplierDeleteRestoreActions({ supplierId, supplierName, isDeleted, dictionary }: { supplierId: string; supplierName: string; isDeleted: boolean; dictionary: SuppliersDictionary["deleteRestore"] }) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actionCopy = isDeleted ? dictionary.restore : dictionary.delete;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = isDeleted ? await restoreSupplier({ id: supplierId }) : await deleteSupplier({ id: supplierId });
      if (result.success) {
        setShowConfirmation(false);
        router.push("/suppliers");
        router.refresh();
        return;
      }
      setError(result.error ?? (isDeleted ? dictionary.restoreFailed : dictionary.deleteFailed));
    });
  }

  return <><Button type="button" variant={isDeleted ? "primary" : "danger"} size="sm" onClick={() => { setError(null); setShowConfirmation(true); }}>{isDeleted ? <RotateCcw size={14} /> : <Trash2 size={14} />}{actionCopy}</Button>{showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"><div className="w-full max-w-md rounded-lg border border-surface-variant bg-surface-container-lowest p-6 shadow-xl"><div className="mb-4 flex items-start justify-between gap-4"><div className="flex items-center gap-3 text-error"><AlertTriangle size={24} /><h3 className="text-[20px] font-semibold">{isDeleted ? dictionary.restoreTitle : dictionary.deleteTitle}</h3></div><button type="button" onClick={() => setShowConfirmation(false)} className="text-on-surface-variant hover:text-on-surface" aria-label={dictionary.cancel}><X size={20} /></button></div><p className="mb-6 text-[14px] text-on-surface-variant" dir="auto">{formatSupplierCopy(isDeleted ? dictionary.restoreBody : dictionary.deleteBody, { name: supplierName })}</p>{error && <div className="mb-4 rounded-lg border border-error/30 bg-error-container/30 p-3 text-[13px] text-error">{error}</div>}<div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setShowConfirmation(false)}>{dictionary.cancel}</Button><Button type="button" variant={isDeleted ? "primary" : "danger"} loading={isPending} onClick={submit}>{isDeleted ? dictionary.confirmRestore : dictionary.confirmDelete}</Button></div></div></div>}</>;
}
