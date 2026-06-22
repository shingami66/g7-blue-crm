import { notFound, redirect } from "next/navigation";
import { getQuotationById } from "@/lib/quotations/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
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

  // Extract snapshots
  const seller = quotation.snapshotSeller;
  const buyer = quotation.snapshotBuyer;

  if (!seller || !buyer) {
    return (
      <div className="p-8 text-error font-semibold">
        Error: Document snapshot data is missing.
      </div>
    );
  }

  // Extremely basic number to words logic for the placeholder
  const amountInWords = "System generated totals shown as values.";

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "0.00";
    return val.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };
  const formatQuantity = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "0";
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="quotation-print-page bg-surface-dim py-8 text-on-surface flex justify-center items-start min-h-screen font-sans">
      <div className="no-print fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <PrintButton />
        <div className="bg-surface-container-high text-on-surface-variant text-[12px] p-3 rounded shadow-sm max-w-xs border border-outline-variant/30 text-right">
          For best PDF output: use A4 paper, enable Background graphics, and disable browser Headers and footers if they appear in the print preview.
        </div>
      </div>

      {/* A4 Document Canvas */}
      <div className="quotation-print-document a4-page p-[40px] flex flex-col relative bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-start border-b-2 border-primary-container pb-6 mb-8">
          <div className="flex flex-col gap-2 max-w-[50%]">
            <img
              src="/brand/G7_BLUE_Events_Icon_White_BG.png"
              alt="G7 BLUE Logo"
              className="w-16 h-16 object-contain mb-2"
            />
            <div>
              <h1 className="text-[20px] leading-[28px] font-semibold text-primary-container">
                {seller.legalNameEn}
              </h1>
              {seller.brandName && (
                <p className="text-[14px] font-medium text-primary tracking-wide">
                  {seller.brandName}
                </p>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col gap-1 text-[14px] text-on-surface-variant">
            <p className="text-[12px] font-semibold text-on-surface uppercase mb-1">
              Headquarters
            </p>
            <p className="whitespace-pre-line">{seller.address.display}</p>
            <div className="mt-2 text-[12px]">
              {seller.entityUnifiedNumber && (
                <p>
                  <span className="font-semibold text-on-surface">Entity Unified No:</span> {seller.entityUnifiedNumber}
                </p>
              )}
              {seller.tin && (
                <p>
                  <span className="font-semibold text-on-surface">TIN / الرقم المميز:</span> {seller.tin}
                </p>
              )}
              <p>
                <span className="font-semibold text-on-surface">Tax/VAT Status:</span> Not registered
              </p>
            </div>
            <div className="mt-2 text-[12px]">
              {seller.officialEmail && <p>{seller.officialEmail}</p>}
              {seller.officialPhone && <p>{seller.officialPhone}</p>}
            </div>
          </div>
        </header>

        {/* Document Title */}
        <div className="quotation-print-title mb-8">
          <h2 className="text-[36px] font-bold text-primary-container tracking-tight">
            QUOTATION
          </h2>
        </div>

        {/* Meta Information Grid */}
        <div className="quotation-print-meta grid grid-cols-2 gap-8 mb-10">
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
              <div className="font-semibold text-on-surface">{buyer.name || buyer.legalName || "Unknown Company"}</div>
              {buyer.contactName && (
                <>
                  <div className="text-on-surface-variant mt-2">Contact:</div>
                  <div className="text-on-surface mt-2">{buyer.contactName}</div>
                </>
              )}
              <div className="text-on-surface-variant mt-2">Event Name:</div>
              <div className="text-on-surface font-semibold mt-2">{quotation.event}</div>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="quotation-print-services mb-10 flex-grow">
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
                  Tax/VAT
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
                  <td className="py-4 px-2 align-top text-center">{formatQuantity(item.qty)}</td>
                  <td className="py-4 px-2 align-top text-right">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="py-4 px-2 align-top text-right text-[12px] text-on-surface-variant">
                    {/* TODO CS-B: show item.vat from the document snapshot when VAT registration is enabled. */}
                    Not applied
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
        <div className="quotation-print-summary flex justify-between items-start mb-12">
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
              <span className="text-on-surface-variant">Tax/VAT:</span>
              <span className="text-on-surface">
                Not applied
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-primary-container text-[20px] font-semibold text-primary-container mt-2">
              <span>Grand Total:</span>
              <span>{formatMoney(quotation.grandTotal)} SAR</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="quotation-print-terms mb-12">
          <h4 className="text-[12px] font-semibold text-primary-container uppercase mb-2">
            Terms & Conditions
          </h4>
          <p className="text-[12px] text-on-surface-variant whitespace-pre-wrap">
            {seller.terms}
          </p>
        </div>

        {/* Signatures Section */}
        <div className="quotation-print-signatures mt-auto pt-8 border-t border-outline-variant flex justify-between px-4">
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
              <p className="text-[12px] text-on-surface-variant">{seller.legalNameEn}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="quotation-print-footer mt-12 text-center text-[12px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
          <div className="flex justify-center gap-8 mb-2">
            <p>
              <span className="font-semibold text-on-surface">Bank:</span> {seller.bank.bankName}
            </p>
            <p>
              <span className="font-semibold text-on-surface">Account Name:</span> {seller.bank.accountName}
            </p>
            <p>
              <span className="font-semibold text-on-surface">IBAN:</span> {seller.bank.iban}
            </p>
          </div>
          <p>This is a system generated document. Page 1 of 1.</p>
        </footer>
      </div>
    </div>
  );
}
