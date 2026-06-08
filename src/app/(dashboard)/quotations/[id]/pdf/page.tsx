import { notFound, redirect } from "next/navigation";
import { getQuotationById } from "@/lib/quotations/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { settingsData } from "@/lib/data/settings";
import PrintButton from "./PrintButton";

export default async function QuotationPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requirePermission("quotations:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="p-8 text-error font-semibold">
          Access Denied: You do not have permission to view this quotation.
        </div>
      );
    }
    throw error;
  }

  const quotation = await getQuotationById(id);

  if (!quotation) {
    notFound();
  }

  // Extremely basic number to words logic for the placeholder
  const amountInWords = "System generated totals shown as values.";

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "0.00";
    return val.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  return (
    <div className="bg-surface-dim py-8 text-on-surface flex justify-center items-start min-h-screen font-sans">
      <div className="no-print fixed top-4 right-4 z-50">
        <PrintButton />
      </div>

      {/* A4 Document Canvas */}
      <div className="a4-page p-[40px] flex flex-col relative bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-start border-b-2 border-primary-container pb-6 mb-8">
          <div className="flex flex-col gap-2 max-w-[50%]">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2">
              {settingsData.company.name.substring(0, 2).toUpperCase() || "G7"}
            </div>
            <div>
              <h1 className="text-[20px] leading-[28px] font-semibold text-primary-container">
                {settingsData.company.name}
              </h1>
            </div>
          </div>
          <div className="text-right flex flex-col gap-1 text-[14px] text-on-surface-variant">
            <p className="text-[12px] font-semibold text-on-surface uppercase mb-1">
              Headquarters
            </p>
            <p className="whitespace-pre-line">{settingsData.company.address}</p>
            <div className="mt-2 text-[12px]">
              <p>
                <span className="font-semibold text-on-surface">CR:</span> {settingsData.legal.cr}
              </p>
              <p>
                <span className="font-semibold text-on-surface">VAT:</span> {settingsData.legal.vat}
              </p>
            </div>
            <div className="mt-2 text-[12px]">
              <p>{settingsData.company.email}</p>
              <p>{settingsData.company.phone}</p>
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
              <div className="font-semibold text-on-surface">{quotation.quotationNumber}</div>
              <div className="text-on-surface-variant">Issue Date:</div>
              <div className="text-on-surface">{quotation.date}</div>
              <div className="text-on-surface-variant">Valid Until:</div>
              <div className="text-on-surface">{quotation.validUntil || "-"}</div>
              <div className="text-on-surface-variant">Prepared By:</div>
              <div className="text-on-surface">System Generated</div>
            </div>
          </div>

          {/* Right: Client & Event Details */}
          <div className="bg-surface p-4 rounded border border-outline-variant">
            <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
              Client & Event Information
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <div className="text-on-surface-variant">Client:</div>
              <div className="font-semibold text-on-surface">{quotation.customer?.company || "Unknown Company"}</div>
              {quotation.customer?.contact && (
                <>
                  <div className="text-on-surface-variant mt-2">Contact:</div>
                  <div className="text-on-surface mt-2">{quotation.customer.contact}</div>
                </>
              )}
              <div className="text-on-surface-variant mt-2">Event Name:</div>
              <div className="text-on-surface font-semibold mt-2">{quotation.event}</div>
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
                  VAT {quotation.vatRate}%
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
                    <div className="text-[12px] text-on-surface-variant whitespace-pre-wrap">
                      {item.details}
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top text-[12px]">{item.category}</td>
                  <td className="py-4 px-2 align-top text-center">{item.qty}</td>
                  <td className="py-4 px-2 align-top text-right">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="py-4 px-2 align-top text-right text-[12px] text-on-surface-variant">
                    {formatMoney(item.vat)}
                  </td>
                  <td className="py-4 px-2 align-top text-right font-medium">
                    {formatMoney(item.total)}
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
                Note
              </p>
              <p className="text-[14px] font-medium text-on-surface">{amountInWords}</p>
            </div>
          </div>

          {/* Totals Grid */}
          <div className="w-[300px]">
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Subtotal:</span>
              <span className="text-on-surface">
                {formatMoney(quotation.subtotal)} SAR
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Discount:</span>
              <span className="text-on-surface">
                {formatMoney(quotation.discount)} SAR
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">Total VAT ({quotation.vatRate}%):</span>
              <span className="text-on-surface">
                {formatMoney(quotation.vatAmount)} SAR
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-primary-container text-[20px] font-semibold text-primary-container mt-2">
              <span>Grand Total:</span>
              <span>{formatMoney(quotation.grandTotal)} SAR</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-12">
          <h4 className="text-[12px] font-semibold text-primary-container uppercase mb-2">
            Terms & Conditions
          </h4>
          <p className="text-[12px] text-on-surface-variant whitespace-pre-wrap">
            {settingsData.finance.terms}
          </p>
        </div>

        {/* Signatures Section */}
        <div className="mt-auto pt-8 border-t border-outline-variant flex justify-between px-4">
          <div className="w-1/4 text-center">
            <div className="h-20 flex items-end justify-center mb-2">
              <span className="font-[cursive] text-2xl text-primary-container opacity-80">
                System
              </span>
            </div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">Prepared By</p>
              <p className="text-[12px] text-on-surface-variant">System Generated</p>
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
              <p className="text-[12px] text-on-surface-variant">{settingsData.company.name}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[12px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
          <div className="flex justify-center gap-8 mb-2">
            <p>
              <span className="font-semibold text-on-surface">Bank:</span> {settingsData.bank.name}
            </p>
            <p>
              <span className="font-semibold text-on-surface">Account Name:</span> {settingsData.bank.accountName}
            </p>
            <p>
              <span className="font-semibold text-on-surface">IBAN:</span> {settingsData.bank.iban}
            </p>
          </div>
          <p>This is a system generated document. Page 1 of 1.</p>
        </footer>
      </div>
    </div>
  );
}
