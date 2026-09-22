"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { CustomerCreditsDictionary } from "@/lib/i18n/dictionaries/customer-credits";
import {
  applyCustomerCreditAction,
  recordCustomerInternalCreditAdjustmentAction,
  refundCustomerCreditAction,
} from "@/lib/customer-credits/actions";
import type {
  CustomerCreditAdjustmentBalance,
  CustomerInvoiceReceivableBalance,
  CustomerRefundMethod,
} from "@/lib/customer-credits/types";

type Props = {
  invoice: CustomerInvoiceReceivableBalance;
  creditAdjustments: CustomerCreditAdjustmentBalance[];
  eligibleInvoices: CustomerInvoiceReceivableBalance[];
  canCreateCredit: boolean;
  canSettleCredit: boolean;
  dictionary: CustomerCreditsDictionary;
};

type FormProps = {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function Form({ children, onSubmit }: FormProps) {
  return <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-outline-variant bg-surface p-3">{children}</form>;
}

function inputClass() {
  return "mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-[12px] text-on-surface";
}

function currentLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function CustomerCreditActions({
  invoice,
  creditAdjustments,
  eligibleInvoices,
  canCreateCredit,
  canSettleCredit,
  dictionary,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReasonCode, setCreditReasonCode] = useState<keyof CustomerCreditsDictionary["reasonCodes"]>("invoice_correction");
  const [creditReason, setCreditReason] = useState("");
  const [sourceCreditId, setSourceCreditId] = useState(creditAdjustments.find((item) => item.availableAmount > 0)?.creditAdjustmentId ?? "");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<CustomerRefundMethod>("bank_transfer");
  const [refundReference, setRefundReference] = useState("");
  const [targetInvoiceId, setTargetInvoiceId] = useState(eligibleInvoices[0]?.invoiceId ?? "");
  const [applicationAmount, setApplicationAmount] = useState("");
  const [applicationReason, setApplicationReason] = useState("");

  function submitCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creditReason.trim().length < 5) {
      setNotice(dictionary.states.reasonRequired);
      return;
    }
    startTransition(async () => {
      const result = await recordCustomerInternalCreditAdjustmentAction({
        customerId: invoice.customerId,
        serviceId: invoice.serviceId,
        invoiceId: invoice.invoiceId,
        amount: creditAmount,
        reasonCode: creditReasonCode,
        reason: creditReason,
        effectiveDate: currentLocalDate(),
        requestId: crypto.randomUUID(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setCreditAmount("");
      setCreditReason("");
      setNotice(dictionary.states.success);
      router.refresh();
    });
  }

  function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refundReason.trim().length < 5 || !sourceCreditId) {
      setNotice(dictionary.states.reasonRequired);
      return;
    }
    startTransition(async () => {
      const result = await refundCustomerCreditAction({
        customerId: invoice.customerId,
        sourceCreditAdjustmentId: sourceCreditId,
        amount: refundAmount,
        businessDate: currentLocalDate(),
        reason: refundReason,
        refundMethod,
        reference: refundReference,
        requestId: crypto.randomUUID(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setRefundAmount("");
      setRefundReason("");
      setRefundReference("");
      setNotice(dictionary.states.success);
      router.refresh();
    });
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (applicationReason.trim().length < 5 || !sourceCreditId || !targetInvoiceId) {
      setNotice(dictionary.states.reasonRequired);
      return;
    }
    startTransition(async () => {
      const result = await applyCustomerCreditAction({
        customerId: invoice.customerId,
        sourceCreditAdjustmentId: sourceCreditId,
        targetInvoiceId,
        amount: applicationAmount,
        businessDate: currentLocalDate(),
        reason: applicationReason,
        requestId: crypto.randomUUID(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setApplicationAmount("");
      setApplicationReason("");
      setNotice(dictionary.states.success);
      router.refresh();
    });
  }

  const availableCredits = creditAdjustments.filter((item) => item.availableAmount > 0);
  const hasActions = canCreateCredit || (canSettleCredit && availableCredits.length > 0);
  if (!hasActions) return null;

  return (
    <section className="mt-4 border-t border-surface-variant pt-4" aria-label={dictionary.title}>
      <h3 className="text-[14px] font-semibold text-on-surface">{dictionary.title}</h3>
      {notice && <p className="mt-2 rounded-lg border border-outline-variant bg-surface-container-low p-2 text-[12px] text-on-surface" role="status">{notice}</p>}

      {canCreateCredit && invoice.invoiceStatus !== "draft" && (
        <Form onSubmit={submitCredit}>
          <div className="text-[12px] font-semibold text-on-surface">{dictionary.actions.createCredit}</div>
          <label className="block text-[12px] text-on-surface-variant">
            {dictionary.fields.amount}
            <input required inputMode="decimal" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className={inputClass()} dir="ltr" />
          </label>
          <label className="block text-[12px] text-on-surface-variant">
            {dictionary.fields.reasonCode}
            <select value={creditReasonCode} onChange={(event) => setCreditReasonCode(event.target.value as typeof creditReasonCode)} className={inputClass()}>
              {(Object.keys(dictionary.reasonCodes) as Array<keyof CustomerCreditsDictionary["reasonCodes"]>).map((code) => <option key={code} value={code}>{dictionary.reasonCodes[code]}</option>)}
            </select>
          </label>
          <label className="block text-[12px] text-on-surface-variant">
            {dictionary.fields.reason}
            <textarea required minLength={5} value={creditReason} onChange={(event) => setCreditReason(event.target.value)} className={inputClass()} rows={2} dir="auto" />
          </label>
          <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-on-primary disabled:opacity-50">{dictionary.actions.submit}</button>
        </Form>
      )}

      {canSettleCredit && availableCredits.length > 0 && (
        <>
          <Form onSubmit={submitRefund}>
            <div className="text-[12px] font-semibold text-on-surface">{dictionary.actions.refund}</div>
            <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.source}
              <select value={sourceCreditId} onChange={(event) => setSourceCreditId(event.target.value)} className={inputClass()} dir="ltr">
                {availableCredits.map((credit) => <option key={credit.creditAdjustmentId} value={credit.creditAdjustmentId}>{isolateBidiText(credit.invoiceId)} · {formatSarAmount(dictionary.locale, credit.availableAmount)}</option>)}
              </select>
            </label>
            <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.amount}<input required inputMode="decimal" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className={inputClass()} dir="ltr" /></label>
            <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.method}
              <select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as CustomerRefundMethod)} className={inputClass()}>{(Object.keys(dictionary.methods) as CustomerRefundMethod[]).map((method) => <option key={method} value={method}>{dictionary.methods[method]}</option>)}</select>
            </label>
            <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.reference}<input value={refundReference} onChange={(event) => setRefundReference(event.target.value)} className={inputClass()} /></label>
            <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.reason}<textarea required minLength={5} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} className={inputClass()} rows={2} dir="auto" /></label>
            <button type="submit" disabled={isPending} className="rounded-lg border border-primary px-3 py-2 text-[12px] font-semibold text-primary disabled:opacity-50">{dictionary.actions.submit}</button>
          </Form>

          {eligibleInvoices.length > 0 ? (
            <Form onSubmit={submitApplication}>
              <div className="text-[12px] font-semibold text-on-surface">{dictionary.actions.apply}</div>
              <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.target}
                <select value={targetInvoiceId} onChange={(event) => setTargetInvoiceId(event.target.value)} className={inputClass()} dir="ltr">
                  {eligibleInvoices.map((target) => <option key={target.invoiceId} value={target.invoiceId}>{isolateBidiText(target.invoiceNumber)} · {formatSarAmount(dictionary.locale, target.outstandingAmount)}</option>)}
                </select>
              </label>
              <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.amount}<input required inputMode="decimal" value={applicationAmount} onChange={(event) => setApplicationAmount(event.target.value)} className={inputClass()} dir="ltr" /></label>
              <label className="block text-[12px] text-on-surface-variant">{dictionary.fields.reason}<textarea required minLength={5} value={applicationReason} onChange={(event) => setApplicationReason(event.target.value)} className={inputClass()} rows={2} dir="auto" /></label>
              <button type="submit" disabled={isPending} className="rounded-lg border border-primary px-3 py-2 text-[12px] font-semibold text-primary disabled:opacity-50">{dictionary.actions.submit}</button>
            </Form>
          ) : <p className="mt-3 text-[12px] text-on-surface-variant">{dictionary.states.noEligibleInvoice}</p>}
        </>
      )}
    </section>
  );
}
