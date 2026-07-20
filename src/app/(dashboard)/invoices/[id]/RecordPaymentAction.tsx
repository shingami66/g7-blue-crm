"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { RecordPaymentModal } from "../RecordPaymentModal";
import type { InvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";

type RecordPaymentActionProps = {
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  dictionary: InvoicesDictionary["paymentModal"];
  buttonLabel: string;
};

export function RecordPaymentAction({
  invoiceId,
  invoiceNumber,
  balanceDue,
  dictionary,
  buttonLabel,
}: RecordPaymentActionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        className="w-full"
        variant="primary"
      >
        {buttonLabel}
      </Button>
      {isOpen && (
        <RecordPaymentModal
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          balanceDue={balanceDue}
          onClose={() => setIsOpen(false)}
          dictionary={dictionary}
        />
      )}
    </>
  );
}
