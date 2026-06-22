"use client";

import { Printer } from "lucide-react";
import { useParams, notFound } from "next/navigation";
import { invoicesData } from "@/lib/data/invoices";
import { settingsData } from "@/lib/data/settings";

export default function InvoicePdfPage() {
  const params = useParams();
  const id = params.id as string;
  const invoice = invoicesData.find((i) => i.id === id);

  if (!invoice) {
    notFound();
  }

  const amountInWords = "One Hundred Seventy-Seven Thousand, One Hundred Saudi Riyals Only.";

  return (
    <div className="bg-surface py-8 text-on-surface font-sans antialiased min-h-screen flex justify-center items-start">
      {/* Print Button (Hidden on print) */}
      <div className="fixed top-4 right-4 z-50 no-print">
        <button
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded shadow hover:bg-primary-container transition-colors font-semibold text-[14px]"
          onClick={() => window.print()}
        >
          <Printer size={18} />
          <span>Print Invoice</span>
        </button>
      </div>

      {/* A4 Document Wrapper */}
      <div className="a4-page bg-surface-container-lowest p-[40px]">
        {/* Header */}
        <header className="flex justify-between items-start border-b border-surface-variant pb-8 mb-8">
          <div className="flex items-center gap-4">
            <img
              src="/brand/G7_BLUE_Events_Icon_White_BG.png"
              alt="G7 BLUE Logo"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-[24px] leading-[32px] font-semibold text-primary tracking-tight">
                {settingsData.company.name}
              </h1>
              {settingsData.company.brandName && (
                <p className="text-[14px] font-medium text-primary tracking-wide mt-1">
                  {settingsData.company.brandName}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-[12px]">
            <p className="font-semibold text-on-surface mb-1 text-[14px] uppercase">
              Headquarters
            </p>
            <p className="whitespace-pre-line text-on-surface-variant">{settingsData.company.address}</p>
            <p className="text-on-surface-variant mt-2">
              <strong className="font-semibold text-on-surface">Entity Unified No:</strong> {settingsData.legal.entityUnifiedNumber}
            </p>
            <p className="text-on-surface-variant">
              <strong className="font-semibold text-on-surface">TIN / الرقم المميز:</strong> {settingsData.legal.tin}
            </p>
            <p className="text-on-surface-variant">
              <strong className="font-semibold text-on-surface">Tax/VAT Status:</strong> Not registered
            </p>
            <div className="mt-2 text-on-surface-variant">
              <p>{settingsData.company.email}</p>
              <p>{settingsData.company.phone}</p>
            </div>
          </div>
        </header>

        {/* Invoice Title & Meta */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-[36px] font-bold text-primary uppercase tracking-tight">
              Commercial Invoice
            </h2>
            <div className="border border-outline-variant p-2 rounded bg-surface w-28 h-24 flex items-center justify-center flex-col text-center">
              <span className="text-[9px] text-outline leading-tight uppercase font-semibold">
                Commercial<br />Preview
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            {/* Billed To */}
            <div>
              <h3 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-2 border-b border-surface-variant pb-1">
                Billed To
              </h3>
              <p className="text-[20px] font-semibold text-on-surface mb-1">
                {invoice.customer}
              </p>
              <p className="text-[14px] text-on-surface-variant">789 Tech Boulevard, Digital City</p>
              <p className="text-[14px] text-on-surface-variant">Riyadh 12345, Saudi Arabia</p>
              <p className="text-[14px] text-on-surface-variant mt-3">
                <strong className="font-semibold text-on-surface">Attn:</strong> Finance Department
              </p>
              <p className="text-[14px] text-on-surface-variant">
                <strong className="font-semibold text-on-surface">Customer Tax Details:</strong> Not captured
              </p>
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-2 border-b border-surface-variant pb-1">
                Invoice Details
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-[14px]">
                <span className="text-on-surface-variant">Invoice Number:</span>
                <span className="font-semibold text-on-surface text-right font-mono tracking-tight">{invoice.id}</span>
                <span className="text-on-surface-variant">Issue Date:</span>
                <span className="text-on-surface text-right">{invoice.date}</span>
                <span className="text-on-surface-variant">Due Date:</span>
                <span className="text-on-surface text-right">{invoice.dueDate}</span>
                <span className="text-on-surface-variant">Related Quotation:</span>
                <span className="text-on-surface text-right">{invoice.relatedQuote}</span>
                <span className="text-on-surface-variant mt-2">Status:</span>
                <div className="text-right mt-2">
                  <span className={`inline-block px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${invoice.status === 'paid' ? 'bg-status-completed-bg text-status-completed-text' :
                      invoice.status === 'overdue' ? 'bg-error-container text-on-error-container' :
                        'bg-surface-variant text-on-surface'
                    }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-10 flex-grow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-y border-outline-variant">
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase w-12">#</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase">Description</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-20">Qty</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-32">
                  Unit Price<br /><span className="text-[10px] font-normal">(SAR)</span>
                </th>
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-24">Tax/VAT</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-32">
                  Total<br /><span className="text-[10px] font-normal">(SAR)</span>
                </th>
              </tr>
            </thead>
            <tbody className="align-top border-b border-surface-variant text-[14px]">
              {invoice.items && invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-surface-variant/50">
                  <td className="py-4 px-4 text-on-surface">{i + 1}</td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-on-surface">{item.description}</p>
                    <p className="text-on-surface-variant text-[12px] mt-1">{item.details}</p>
                  </td>
                  <td className="py-4 px-4 text-on-surface text-right">{item.qty}</td>
                  <td className="py-4 px-4 text-on-surface text-right">
                    {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-on-surface text-right">
                    Not applied
                  </td>
                  <td className="py-4 px-4 text-on-surface text-right font-medium">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    No line items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Payment Info */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Payment Instructions */}
          <div className="pt-2">
            <h3 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-3 border-b border-surface-variant pb-1">
              Payment Instructions
            </h3>
            <div className="bg-surface p-4 rounded border border-outline-variant/50">
              <p className="text-[12px] font-semibold text-primary mb-2">Bank Transfer Details</p>
              <div className="grid grid-cols-[100px_1fr] gap-y-1 text-[12px]">
                <span className="text-on-surface-variant">Bank Name:</span>
                <span className="font-semibold text-on-surface">{settingsData.bank.name}</span>
                <span className="text-on-surface-variant">Account Name:</span>
                <span className="font-semibold text-on-surface">{settingsData.bank.accountName}</span>
                <span className="text-on-surface-variant">Account No:</span>
                <span className="font-semibold text-on-surface">{settingsData.bank.accountNo}</span>
                <span className="text-on-surface-variant">IBAN:</span>
                <span className="font-semibold text-on-surface tracking-wider">{settingsData.bank.iban}</span>
              </div>
            </div>
          </div>

          {/* Financial Totals */}
          <div>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-on-surface-variant">Invoice Amount</span>
                <span className="text-on-surface">
                  {invoice.amount} SAR
                </span>
              </div>
              <div className="flex justify-between items-center text-[14px] border-b border-surface-variant pb-3">
                <span className="text-on-surface-variant">Tax/VAT</span>
                <span className="text-on-surface">
                  Not applied
                </span>
              </div>
              <div className="flex justify-between items-center py-2 bg-surface px-3 -mx-3">
                <span className="text-[20px] font-semibold text-primary">Total Amount</span>
                <span className="text-[20px] font-semibold text-primary">{invoice.amount} SAR</span>
              </div>
              <div className="flex justify-between items-center text-[14px] pt-2">
                <span className="text-on-surface-variant">Amount Paid</span>
                <span className="text-on-surface">0.00 SAR</span>
              </div>
              <div className="flex justify-between items-center text-[14px] border-t border-surface-variant pt-3 mt-1">
                <span className="font-semibold text-on-surface">Balance Due</span>
                <span className="font-semibold text-on-error-container bg-error-container px-2 py-1 rounded-sm">
                  {invoice.amount} SAR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mb-12 border-l-4 border-primary pl-4 py-1 bg-surface-container-low">
          <p className="text-[10px] font-semibold text-on-surface-variant uppercase">Amount in Words</p>
          <p className="text-[14px] text-primary font-medium italic mt-1">{amountInWords}</p>
        </div>

        {/* Signatures */}
        <div className="mt-auto grid grid-cols-2 gap-12 pt-12">
          <div>
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase mb-8">Prepared By</p>
            <div className="border-b border-outline-variant w-48 mb-2"></div>
            <p className="text-[14px] text-on-surface">Finance Department</p>
            <p className="text-[12px] text-on-surface-variant">G7 BLUE</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase mb-4">
              Company Stamp & Signature
            </p>
            {/* Stamp Placeholder */}
            <div className="w-32 h-32 border-2 border-primary/20 rounded-full flex items-center justify-center relative mb-2">
              <div className="text-center rotate-[-15deg]">
                <span className="block text-[10px] font-bold text-primary/40 tracking-widest uppercase">G7 Blue</span>
                <span className="block text-[8px] text-primary/40 uppercase mt-1">Official Stamp</span>
              </div>
            </div>
            <div className="border-b border-outline-variant w-48 mb-2"></div>
            <p className="text-[14px] text-on-surface">Authorized Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-surface-variant flex justify-between items-center text-[12px] text-on-surface-variant">
          <p>For any inquiries regarding this invoice, please contact {settingsData.company.email} or call {settingsData.company.phone}.</p>
          <p className="font-semibold">Page 1 of 1</p>
        </footer>
      </div>
    </div>
  );
}
