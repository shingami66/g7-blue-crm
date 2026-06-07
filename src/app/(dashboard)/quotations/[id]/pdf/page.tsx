"use client";

import { Printer } from "lucide-react";
import { useParams, notFound } from "next/navigation";
import { quotationsData } from "@/lib/data/quotations";

export default function QuotationPdfPage() {
  const params = useParams();
  const id = params.id as string;
  const quotation = quotationsData.find((q) => q.id === id);

  if (!quotation) {
    notFound();
  }

  const subtotal = parseFloat(quotation.amount.replace(/,/g, "")) / 1.15;
  const vat = parseFloat(quotation.amount.replace(/,/g, "")) - subtotal;

  // Extremely basic number to words logic for the placeholder
  const amountInWords = "One Hundred Sixty-Two Thousand, Seven Hundred Twenty-Five Saudi Riyals Only.";

  return (
    <div className="bg-surface-dim py-8 text-on-surface flex justify-center items-start min-h-screen font-sans">
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          className="bg-primary-container text-on-primary text-[12px] font-semibold px-4 py-2 rounded shadow hover:bg-primary transition-colors flex items-center gap-2"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print PDF
        </button>
      </div>

      {/* A4 Document Canvas */}
      <div className="a4-page p-[40px] flex flex-col relative bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-start border-b-2 border-primary-container pb-6 mb-8">
          <div className="flex flex-col gap-2 max-w-[50%]">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2">
              G7
            </div>
            <div>
              <h1 className="text-[20px] leading-[28px] font-semibold text-primary-container">
                G7 BLUE
              </h1>
              <p className="text-[12px] font-semibold text-secondary uppercase tracking-widest mt-1">
                Enterprise Logistics & Event Management
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col gap-1 text-[14px] text-on-surface-variant">
            <p className="text-[12px] font-semibold text-on-surface uppercase mb-1">
              Headquarters
            </p>
            <p>King Fahd Road, Olaya District</p>
            <p>Riyadh 12211, Saudi Arabia</p>
            <div className="mt-2 text-[12px]">
              <p>
                <span className="font-semibold text-on-surface">CR:</span> 1010123456
              </p>
              <p>
                <span className="font-semibold text-on-surface">VAT:</span> 300123456700003
              </p>
            </div>
            <div className="mt-2 text-[12px]">
              <p>contact@g7blue.com.sa</p>
              <p>+966 11 234 5678</p>
              <p>www.g7blue.com.sa</p>
            </div>
          </div>
        </header>

        {/* Document Title */}
        <div className="mb-8">
          <h2 className="text-[36px] font-bold text-primary-container tracking-tight">
            QUOTATION
          </h2>
        </div>

        {/* Meta Information Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          {/* Left: Quotation Details */}
          <div className="bg-surface p-4 rounded border border-outline-variant">
            <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
              Document Details
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <div className="text-on-surface-variant">Quote No:</div>
              <div className="font-semibold text-on-surface">{quotation.id}</div>
              <div className="text-on-surface-variant">Issue Date:</div>
              <div className="text-on-surface">{quotation.date}</div>
              <div className="text-on-surface-variant">Valid Until:</div>
              <div className="text-on-surface">{quotation.validUntil}</div>
              <div className="text-on-surface-variant">Prepared By:</div>
              <div className="text-on-surface">Ahmed Al-Faisal (Senior AM)</div>
            </div>
          </div>

          {/* Right: Client & Event Details */}
          <div className="bg-surface p-4 rounded border border-outline-variant">
            <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
              Client & Event Information
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <div className="text-on-surface-variant">Client:</div>
              <div className="font-semibold text-on-surface">{quotation.customer}</div>
              <div className="text-on-surface-variant mt-2">Event Name:</div>
              <div className="text-on-surface font-semibold mt-2">{quotation.event}</div>
              <div className="text-on-surface-variant">Location:</div>
              <div className="text-on-surface">Riyadh International Convention Center</div>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="mb-10 flex-grow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-y border-outline-variant">
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-8">
                  #
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase">
                  Service Description
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-24">
                  Category
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">
                  Qty
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-28 text-right">
                  Unit Price
                  <br />
                  <span className="text-[10px] text-on-surface-variant font-normal">
                    SAR
                  </span>
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-20 text-right">
                  VAT 15%
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-32 text-right">
                  Total
                  <br />
                  <span className="text-[10px] text-on-surface-variant font-normal">
                    SAR
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-on-surface">
              {quotation.items.map((item, i) => (
                <tr key={i} className="border-b border-outline-variant/50">
                  <td className="py-4 px-2 align-top text-on-surface-variant">
                    {i + 1}
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="font-semibold mb-1">{item.description}</div>
                    <div className="text-[12px] text-on-surface-variant">
                      {item.details}
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top text-[12px]">{item.category}</td>
                  <td className="py-4 px-2 align-top text-center">{item.qty}</td>
                  <td className="py-4 px-2 align-top text-right">
                    {item.unitPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-2 align-top text-right text-[12px] text-on-surface-variant">
                    {item.vat.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-2 align-top text-right font-medium">
                    {item.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              {quotation.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    No line items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-between items-start mb-12">
          {/* Amount in Words */}
          <div className="w-1/2 pr-8">
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/50">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
                Amount in Words
              </p>
              <p className="text-[14px] font-medium text-on-surface">{amountInWords}</p>
            </div>
          </div>

          {/* Totals Grid */}
          <div className="w-[300px]">
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Subtotal:</span>
              <span className="text-on-surface">
                {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Discount:</span>
              <span className="text-on-surface">0.00 SAR</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Total VAT (15%):</span>
              <span className="text-on-surface">
                {vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-primary-container text-[20px] font-semibold text-primary-container mt-2">
              <span>Grand Total:</span>
              <span>{quotation.amount} SAR</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-12">
          <h4 className="text-[12px] font-semibold text-primary-container uppercase mb-2">
            Terms & Conditions
          </h4>
          <ul className="list-disc list-inside text-[12px] text-on-surface-variant space-y-1">
            <li>This quotation is valid for 7 days from the issue date.</li>
            <li>
              Payment Terms: 50% advance payment upon confirmation to secure booking,
              50% balance due 7 days prior to event setup.
            </li>
            <li>
              Any additional requirements requested on-site will be billed separately.
            </li>
            <li>
              Cancellation within 14 days of the event date will incur a 50% cancellation fee.
            </li>
            <li>
              All prices are inclusive of 15% VAT strictly in accordance with ZATCA regulations.
            </li>
          </ul>
        </div>

        {/* Signatures Section */}
        <div className="mt-auto pt-8 border-t border-outline-variant flex justify-between px-4">
          <div className="w-1/4 text-center">
            <div className="h-20 flex items-end justify-center mb-2">
              <span className="font-[cursive] text-2xl text-primary-container opacity-80">
                Ahmed F.
              </span>
            </div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">Prepared By</p>
              <p className="text-[12px] text-on-surface-variant">Ahmed Al-Faisal</p>
            </div>
          </div>
          <div className="w-1/4 text-center">
            <div className="h-20 flex items-end justify-center mb-2"></div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">Client Approval</p>
              <p className="text-[12px] text-on-surface-variant">Signature & Date</p>
            </div>
          </div>
          <div className="w-1/4 text-center">
            <div className="h-20 flex items-center justify-center mb-2">
              <div className="w-16 h-16 rounded-full border-2 border-primary-container/20 flex items-center justify-center text-[10px] text-primary-container/40 uppercase text-center leading-tight transform -rotate-12">
                Company
                <br />
                Stamp
                <br />
                Here
              </div>
            </div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">Official Stamp</p>
              <p className="text-[12px] text-on-surface-variant">G7 BLUE</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[12px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
          <div className="flex justify-center gap-8 mb-2">
            <p>
              <span className="font-semibold text-on-surface">Bank:</span> Al Rajhi Bank
            </p>
            <p>
              <span className="font-semibold text-on-surface">Account Name:</span> G7 BLUE Events Co.
            </p>
            <p>
              <span className="font-semibold text-on-surface">IBAN:</span> SA98 8000 0123 4567 8901 2345
            </p>
          </div>
          <p>This is a system generated document. Page 1 of 1.</p>
        </footer>
      </div>
    </div>
  );
}
