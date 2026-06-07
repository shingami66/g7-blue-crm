"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { quotationsData } from "@/lib/data/quotations";
import StatusBadge from "@/components/ui/StatusBadge";
import { ArrowLeft, Printer, Send, CheckCircle2, XCircle, FileEdit } from "lucide-react";
import Link from "next/link";

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const quotation = quotationsData.find((q) => q.id === id);

  if (!quotation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight">
                {quotation.id}
              </h2>
              <StatusBadge variant={quotation.status as any}>
                {quotation.status.charAt(0).toUpperCase() +
                  quotation.status.slice(1)}
              </StatusBadge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low text-[14px] font-semibold transition-colors">
            <FileEdit size={18} />
            Edit
          </button>
          <Link
            href={`/quotations/${quotation.id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
          >
            <Printer size={18} />
            Generate PDF
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors">
            <Send size={18} />
            Send to Client
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main details) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Info Card */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">Details</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  Client
                </div>
                <div className="text-on-surface font-medium">
                  {quotation.customer}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  Event Name
                </div>
                <div className="text-on-surface font-medium">
                  {quotation.event}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  Issue Date
                </div>
                <div className="text-on-surface font-medium">{quotation.date}</div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  Valid Until
                </div>
                <div className="text-on-surface font-medium">
                  {quotation.validUntil}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase w-12">
                      #
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                      Service
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-center w-16">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                      Unit (SAR)
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                      Total (SAR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px]">
                  {quotation.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4 text-on-surface-variant align-top">
                        {i + 1}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-on-surface mb-1">
                          {item.description}
                        </div>
                        <div className="text-[12px] text-on-surface-variant leading-relaxed">
                          {item.details}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-on-surface align-top">
                        {item.qty}
                      </td>
                      <td className="px-4 py-4 text-right text-on-surface align-top">
                        {item.unitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-on-surface align-top">
                        {item.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                  {quotation.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-on-surface-variant"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Summary & Actions) */}
        <div className="flex flex-col gap-6">
          {/* Financial Summary */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">Financial Summary</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[14px] text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>
                    {(
                      parseFloat(quotation.amount.replace(/,/g, "")) / 1.15
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                    SAR
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-on-surface-variant">
                  <span>VAT (15%)</span>
                  <span>
                    {(
                      parseFloat(quotation.amount.replace(/,/g, "")) -
                      parseFloat(quotation.amount.replace(/,/g, "")) / 1.15
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                    SAR
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-on-surface-variant">
                  <span>Discount</span>
                  <span>0.00 SAR</span>
                </div>
                <div className="border-t border-surface-variant pt-3 mt-3 flex justify-between">
                  <span className="font-semibold text-[18px] text-primary">
                    Total
                  </span>
                  <span className="font-semibold text-[18px] text-primary">
                    {quotation.amount} SAR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Approvals */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">Update Status</h3>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button className="flex items-center justify-center gap-2 w-full py-2 bg-status-completed-bg text-status-completed-text rounded-lg text-[14px] font-semibold hover:opacity-90 transition-opacity">
                <CheckCircle2 size={18} />
                Mark as Approved
              </button>
              <button className="flex items-center justify-center gap-2 w-full py-2 bg-error-container text-on-error-container rounded-lg text-[14px] font-semibold hover:opacity-90 transition-opacity">
                <XCircle size={18} />
                Mark as Rejected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
