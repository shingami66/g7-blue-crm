import { notFound, redirect } from "next/navigation";
import { getInvoiceById } from "@/lib/invoices/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import PrintButton from "./PrintButton";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer, QuotationItem } from "@/lib/quotations/types";

export default async function InvoicePdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requirePermission("invoices:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="p-8 text-error font-semibold">
          Access Denied: You do not have permission to view this invoice.
        </div>
      );
    }
    throw error;
  }

  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const seller = invoice.snapshot_seller as QuotationSnapshotSeller | null;
  const buyer = invoice.snapshot_buyer as QuotationSnapshotBuyer | null;
  const snapshotQuotation = invoice.snapshot_quotation as { items?: QuotationItem[]; quotationNumber?: string } | null;
  const items: QuotationItem[] = snapshotQuotation?.items || [];
  const bankDetails = invoice.snapshot_bank_details as { bankName?: string; accountName?: string; accountNo?: string; iban?: string } | null;
  const documentRules = invoice.snapshot_document_rules as {
    notes?: string;
    terms?: string[];
    validityDays?: number;
  } | null;

  if (!seller || !buyer) {
    return (
      <div className="p-8 text-error font-semibold">
        Error: Document snapshot data is missing.
      </div>
    );
  }



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

  const isDraft = invoice.status === "draft";
  const displayStatus = invoice.status === "sent" ? "Issued" : invoice.status;

  return (
    <div className="bg-surface py-8 text-on-surface font-sans antialiased min-h-screen flex justify-center items-start">
      {/* Print Button & Help (Hidden on print) */}
      <div className="fixed top-4 right-4 z-50 no-print flex flex-col items-end gap-2">
        <PrintButton />
        <div className="bg-surface-container-high text-on-surface-variant text-[12px] p-3 rounded shadow-sm max-w-xs border border-outline-variant/30 text-right">
          For best PDF output: use A4 paper, enable Background graphics, and disable browser Headers and footers if they appear in the print preview.
        </div>
      </div>

      {/* A4 Document Wrapper */}
      <div className="a4-page bg-surface-container-lowest p-[40px] relative">
        {/* Draft Watermark/Badge */}
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-5">
            <span className="text-[120px] font-bold text-outline uppercase transform -rotate-45">
              DRAFT PREVIEW
            </span>
          </div>
        )}

        <div className="relative z-10">
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
              <p className="whitespace-pre-line">{seller.address?.display || "Not available"}</p>
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
                  <span className="font-semibold text-on-surface">Tax/VAT Status:</span>{" "}
                  {invoice.vat_mode === "not_registered" ? "Not registered" : invoice.vat_mode}
                </p>
              </div>
              <div className="mt-2 text-[12px]">
                {seller.officialEmail && <p>{seller.officialEmail}</p>}
                {seller.officialPhone && <p>{seller.officialPhone}</p>}
              </div>
            </div>
          </header>

          {/* Invoice Title & Meta */}
          <div className="mb-10">
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-[36px] font-bold text-primary-container uppercase tracking-tight">
                {invoice.vat_mode === "not_registered" ? "Commercial Invoice" : invoice.document_label}
              </h2>
              {isDraft && (
                <div className="border-2 border-outline-variant p-2 rounded bg-surface w-28 h-24 flex items-center justify-center flex-col text-center shadow-sm">
                  <span className="text-[10px] text-outline leading-tight uppercase font-bold">
                    Commercial<br />Preview
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Billed To */}
              <div className="bg-surface p-4 rounded border border-outline-variant">
                <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
                  Billed To
                </h3>
                <p className="text-[18px] font-semibold text-on-surface mb-1">
                  {buyer.name || buyer.legalName || "Unknown Company"}
                </p>
                <p className="text-[14px] text-on-surface-variant whitespace-pre-line">
                  {buyer.address?.display || "Address not provided"}
                </p>
                {buyer.contactName && (
                  <p className="text-[14px] text-on-surface-variant mt-3">
                    <strong className="font-semibold text-on-surface">Attn:</strong> {buyer.contactName}
                  </p>
                )}
                <p className="text-[14px] text-on-surface-variant mt-1">
                  <strong className="font-semibold text-on-surface">Customer Tax Details:</strong> {buyer.vatNumber || "Not captured"}
                </p>
              </div>

              {/* Invoice Details */}
              <div className="bg-surface p-4 rounded border border-outline-variant">
                <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
                  Invoice Details
                </h3>
                <div className="grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
                  <span className="text-on-surface-variant">Invoice Number:</span>
                  <span className="font-semibold text-on-surface tracking-tight">{invoice.invoice_number}</span>
                  <span className="text-on-surface-variant">Type:</span>
                  <span className="text-on-surface uppercase text-[12px] font-medium">{invoice.invoice_type}</span>
                  <span className="text-on-surface-variant">Issue Date:</span>
                  <span className="text-on-surface">{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : (invoice.date || "-")}</span>
                  <span className="text-on-surface-variant">Related Quote:</span>
                  <span className="text-on-surface">{snapshotQuotation?.quotationNumber || invoice.relatedQuote || "-"}</span>
                  <span className="text-on-surface-variant mt-2">Status:</span>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${invoice.status === 'paid' ? 'bg-status-completed-bg text-status-completed-text' :
                        invoice.status === 'overdue' ? 'bg-error-container text-on-error-container' :
                          'bg-surface-variant text-on-surface'
                      }`}>
                      {displayStatus}
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
                <tr className="bg-surface-container-low border-y border-outline-variant">
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-8">#</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase">Description</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">Qty</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-28">
                    Unit Price<br /><span className="text-[10px] text-on-surface-variant font-normal">({invoice.currency})</span>
                  </th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-20">Tax/VAT</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-32">
                    Total<br /><span className="text-[10px] text-on-surface-variant font-normal">({invoice.currency})</span>
                  </th>
                </tr>
              </thead>
              <tbody className="align-top border-b border-surface-variant text-[14px]">
                {items.length > 0 ? items.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/50">
                    <td className="py-4 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-4 px-2">
                      <p className="font-semibold text-on-surface">{item.description}</p>
                      <p className="text-on-surface-variant text-[12px] mt-1 whitespace-pre-wrap">{item.details}</p>
                    </td>
                    <td className="py-4 px-2 text-on-surface text-center">{formatQuantity(item.qty)}</td>
                    <td className="py-4 px-2 text-on-surface text-right">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-4 px-2 text-on-surface-variant text-[12px] text-right">
                      {invoice.vat_mode === "not_registered" ? "Not applied" : `${item.vat}%`}
                    </td>
                    <td className="py-4 px-2 text-on-surface text-right font-medium">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                )) : (
                  <tr className="border-b border-outline-variant/50">
                    <td className="py-4 px-2 text-on-surface-variant">1</td>
                    <td className="py-4 px-2">
                      <p className="font-semibold text-on-surface">{invoice.invoice_type === "deposit" ? "Deposit Payment" : "Final Settlement"}</p>
                      <p className="text-on-surface-variant text-[12px] mt-1">For services related to Quotation {snapshotQuotation?.quotationNumber || invoice.relatedQuote || "-"}</p>
                    </td>
                    <td className="py-4 px-2 text-on-surface text-center">1</td>
                    <td className="py-4 px-2 text-on-surface text-right">
                      {formatMoney(invoice.grand_total)}
                    </td>
                    <td className="py-4 px-2 text-on-surface-variant text-[12px] text-right">
                      {invoice.vat_mode === "not_registered" ? "Not applied" : `${invoice.vat_rate}%`}
                    </td>
                    <td className="py-4 px-2 text-on-surface text-right font-medium">
                      {formatMoney(invoice.grand_total)}
                    </td>
                  </tr>
                )}
                {items.length === 0 && !invoice.grand_total && (
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
              <h3 className="text-[12px] font-semibold text-primary-container uppercase mb-3 border-b border-outline-variant pb-1">
                Payment Instructions
              </h3>
              <div className="bg-surface p-4 rounded border border-outline-variant">
                <p className="text-[12px] font-semibold text-primary mb-2">Bank Transfer Details</p>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-[12px]">
                  <span className="text-on-surface-variant">Bank Name:</span>
                  <span className="font-semibold text-on-surface">{bankDetails?.bankName || seller.bank?.bankName || "Not available"}</span>
                  <span className="text-on-surface-variant">Account Name:</span>
                  <span className="font-semibold text-on-surface">{bankDetails?.accountName || seller.bank?.accountName || "Not available"}</span>
                  <span className="text-on-surface-variant">Account No:</span>
                  <span className="font-semibold text-on-surface">{bankDetails?.accountNo || seller.bank?.accountNo || "Not available"}</span>
                  <span className="text-on-surface-variant">IBAN:</span>
                  <span className="font-semibold text-on-surface tracking-wider">{bankDetails?.iban || seller.bank?.iban || "Not available"}</span>
                </div>
              </div>
            </div>

            {/* Financial Totals */}
            <div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="text-on-surface">
                    {formatMoney(invoice.subtotal)} {invoice.currency}
                  </span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Discount</span>
                    <span className="text-on-surface">
                      -{formatMoney(invoice.discount_amount)} {invoice.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[14px] border-b border-outline-variant/50 pb-3">
                  <span className="text-on-surface-variant">Tax/VAT</span>
                  <span className="text-on-surface">
                    {invoice.vat_mode === "not_registered" ? "Not applied" : `${formatMoney(invoice.vat_amount)} ${invoice.currency}`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-surface px-3 -mx-3">
                  <span className="text-[20px] font-semibold text-primary-container">Total Amount</span>
                  <span className="text-[20px] font-semibold text-primary-container">{formatMoney(invoice.grand_total)} {invoice.currency}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] pt-2">
                  <span className="text-on-surface-variant">Amount Paid</span>
                  <span className="text-on-surface">{formatMoney(invoice.amount_paid)} {invoice.currency}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] border-t border-outline-variant pt-3 mt-1">
                  <span className="font-semibold text-on-surface">Balance Due</span>
                  <span className="font-semibold text-on-error-container bg-error-container px-2 py-1 rounded-sm">
                    {formatMoney(invoice.balance_due)} {invoice.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="mb-12 border-l-4 border-primary-container pl-4 py-2 bg-surface-container-low">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase">Notes</p>
            <p className="text-[14px] text-on-surface font-medium mt-1 whitespace-pre-wrap">
              {documentRules?.notes || "Not available"}
            </p>
            {documentRules?.terms && documentRules.terms.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-on-surface-variant uppercase mb-1">Terms</p>
                <ul className="list-disc pl-4 text-[12px] text-on-surface space-y-1">
                  {documentRules.terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-auto grid grid-cols-2 gap-12 pt-12 border-t border-outline-variant">
            <div className="text-center w-1/2">
              <div className="h-20 flex items-end justify-center mb-2">
                <span className="font-[cursive] text-2xl text-primary-container opacity-80">
                  System
                </span>
              </div>
              <div className="border-t border-outline-variant pt-2">
                <p className="text-[12px] font-semibold text-on-surface uppercase">Prepared By</p>
                <p className="text-[12px] text-on-surface-variant">System Generated</p>
              </div>
            </div>
            <div className="text-center w-1/2 ml-auto">
              <div className="h-20 flex items-center justify-center mb-2">
                <div className="w-16 h-16 rounded-full border-2 border-primary-container/20 flex items-center justify-center text-[10px] text-primary-container/40 uppercase text-center leading-tight transform -rotate-12">
                  Company<br />Stamp<br />Here
                </div>
              </div>
              <div className="border-t border-outline-variant pt-2">
                <p className="text-[12px] font-semibold text-on-surface uppercase">Official Stamp</p>
                <p className="text-[12px] text-on-surface-variant">{seller.legalNameEn}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-4 border-t border-outline-variant/30 text-center text-[12px] text-on-surface-variant">
            <div className="flex justify-center gap-8 mb-2">
              <p>
                <span className="font-semibold text-on-surface">Bank:</span> {bankDetails?.bankName || seller.bank?.bankName || "Not available"}
              </p>
              <p>
                <span className="font-semibold text-on-surface">Account Name:</span> {bankDetails?.accountName || seller.bank?.accountName || "Not available"}
              </p>
              <p>
                <span className="font-semibold text-on-surface">IBAN:</span> {bankDetails?.iban || seller.bank?.iban || "Not available"}
              </p>
            </div>
            <p>This is a system generated document. Page 1 of 1.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
