import { notFound, redirect } from "next/navigation";
import { getInvoiceById } from "@/lib/invoices/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import PrintButton from "./PrintButton";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer, QuotationItem } from "@/lib/quotations/types";

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readRecordNumber(record: Record<string, unknown> | null, key: string): number | null {
  return record ? readFiniteNumber(record[key]) : null;
}

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
    terms?: unknown;
    validityDays?: number;
  } | null;

  const documentRuleTerms = normalizeStringList(documentRules?.terms);
  const documentNotes = typeof documentRules?.notes === "string" ? documentRules.notes.trim() : "";
  const shouldShowNotes = documentNotes.length > 0 && documentNotes !== "Not available";
  const snapshotQuotationRecord = asRecord(invoice.snapshot_quotation);
  const finalInvoiceSettlement = asRecord(snapshotQuotationRecord?.final_invoice_settlement);
  const approvedQuotationTotal =
    readRecordNumber(snapshotQuotationRecord, "grand_total") ??
    readRecordNumber(finalInvoiceSettlement, "approved_quotation_total");
  const previousInvoicesTotal = readRecordNumber(finalInvoiceSettlement, "active_prior_invoice_total");

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
    <div className="bg-surface py-4 print:py-0 text-on-surface font-sans antialiased min-h-screen flex justify-center items-start">
      {/* Print Button & Help (Hidden on print) */}
      <div className="fixed top-4 right-4 z-50 no-print flex flex-col items-end gap-2">
        <PrintButton />
        <div className="bg-surface-container-high text-on-surface-variant text-[12px] p-3 rounded shadow-sm max-w-xs border border-outline-variant/30 text-right">
          For best PDF output: use A4 paper, enable Background graphics, and disable browser Headers and footers if they appear in the print preview.
        </div>
      </div>

      {/* A4 Document Wrapper */}
      <div className="a4-page bg-surface-container-lowest p-[28px] print:p-[22px] relative">
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
          <header className="flex justify-between items-start border-b-2 border-primary-container pb-3 mb-5 break-inside-avoid">
            <div className="flex flex-col gap-1.5 max-w-[50%]">
              <img
                src="/brand/G7_BLUE_Events_Icon_White_BG.png"
                alt="G7 BLUE Logo"
                className="w-12 h-12 object-contain mb-1"
              />
              <div>
                <h1 className="text-[18px] leading-[24px] font-semibold text-primary-container">
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
          <div className="mb-6">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-[30px] font-bold text-primary-container uppercase tracking-tight">
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
              <div className="bg-surface p-3 rounded border border-outline-variant">
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
              <div className="bg-surface p-3 rounded border border-outline-variant">
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
          <div className="mb-6 flex-grow">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-y border-outline-variant">
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase w-8">#</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase">Description</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">Qty</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-28">
                    Unit Price<br /><span className="text-[10px] text-on-surface-variant font-normal">({invoice.currency})</span>
                  </th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-20">Tax/VAT</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-32">
                    Total<br /><span className="text-[10px] text-on-surface-variant font-normal">({invoice.currency})</span>
                  </th>
                </tr>
              </thead>
              <tbody className="align-top border-b border-surface-variant text-[14px]">
                {items.length > 0 ? items.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/50">
                    <td className="py-2 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-2">
                      <p className="font-semibold text-on-surface">{item.description}</p>
                      <p className="text-on-surface-variant text-[12px] mt-1 whitespace-pre-wrap">{item.details}</p>
                    </td>
                    <td className="py-2 px-2 text-on-surface text-center">{formatQuantity(item.qty)}</td>
                    <td className="py-2 px-2 text-on-surface text-right">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-on-surface-variant text-[12px] text-right">
                      {invoice.vat_mode === "not_registered" ? "Not applied" : `${item.vat}%`}
                    </td>
                    <td className="py-2 px-2 text-on-surface text-right font-medium">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                )) : (
                  <tr className="border-b border-outline-variant/50">
                    <td className="py-2 px-2 text-on-surface-variant">1</td>
                    <td className="py-2 px-2">
                      <p className="font-semibold text-on-surface">{invoice.invoice_type === "deposit" ? "Deposit Payment" : "Final Settlement"}</p>
                      <p className="text-on-surface-variant text-[12px] mt-1">For services related to Quotation {snapshotQuotation?.quotationNumber || invoice.relatedQuote || "-"}</p>
                    </td>
                    <td className="py-2 px-2 text-on-surface text-center">1</td>
                    <td className="py-2 px-2 text-on-surface text-right">
                      {formatMoney(invoice.grand_total)}
                    </td>
                    <td className="py-2 px-2 text-on-surface-variant text-[12px] text-right">
                      {invoice.vat_mode === "not_registered" ? "Not applied" : `${invoice.vat_rate}%`}
                    </td>
                    <td className="py-2 px-2 text-on-surface text-right font-medium">
                      {formatMoney(invoice.grand_total)}
                    </td>
                  </tr>
                )}
                {items.length === 0 && !invoice.grand_total && (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-on-surface-variant">
                      No line items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Payment Info */}
          <div className="grid grid-cols-2 gap-8 mb-6 break-inside-avoid">
            {/* Payment Instructions */}
            <div>
              <h3 className="text-[12px] font-semibold text-primary-container uppercase mb-3 border-b border-outline-variant pb-1">
                Payment Instructions
              </h3>
              <div className="bg-surface p-3 rounded border border-outline-variant">
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
              <div className="space-y-2 break-inside-avoid">
                {approvedQuotationTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Approved Quotation Total</span>
                    <span className="text-on-surface">
                      {formatMoney(approvedQuotationTotal)} {invoice.currency}
                    </span>
                  </div>
                )}
                {previousInvoicesTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Previous Invoices / Deposits</span>
                    <span className="text-on-surface">
                      {formatMoney(previousInvoicesTotal)} {invoice.currency}
                    </span>
                  </div>
                )}
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
                <div className="flex justify-between items-center py-1.5 bg-surface px-3 -mx-3">
                  <span className="text-[20px] font-semibold text-primary-container">Total Amount</span>
                  <span className="text-[20px] font-semibold text-primary-container">{formatMoney(invoice.grand_total)} {invoice.currency}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] pt-1">
                  <span className="text-on-surface-variant">Amount Paid</span>
                  <span className="text-on-surface">{formatMoney(invoice.amount_paid)} {invoice.currency}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] border-t border-outline-variant pt-2 mt-1">
                  <span className="font-semibold text-on-surface">Balance Due</span>
                  <span className="font-semibold text-on-error-container bg-error-container px-2 py-1 rounded-sm">
                    {formatMoney(invoice.balance_due)} {invoice.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(shouldShowNotes || documentRuleTerms.length > 0) && (
            <div className="mb-4 border-l-2 border-primary-container pl-3 py-1">
              {shouldShowNotes && (
                <div>
                  <p className="text-[9px] font-semibold text-on-surface-variant uppercase leading-tight">Notes</p>
                  <p className="text-[11px] leading-tight text-on-surface font-medium mt-0.5 whitespace-pre-wrap">
                    {documentNotes}
                  </p>
                </div>
              )}
              {documentRuleTerms.length > 0 && (
                <div className={shouldShowNotes ? "mt-1.5" : ""}>
                  <p className="text-[9px] font-semibold text-on-surface-variant uppercase leading-tight mb-0.5">Terms</p>
                  <ul className="list-disc pl-3 text-[10px] leading-tight text-on-surface space-y-0.5">
                    {documentRuleTerms.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-2 pt-1.5 border-t border-outline-variant/30 text-[9px] leading-tight text-on-surface-variant">
            <div className="grid grid-cols-2 gap-4 mb-1">
              <p>
                <span className="font-semibold text-on-surface">Prepared By:</span> System Generated | System generated document
              </p>
              <p className="text-right">
                <span className="font-semibold text-on-surface">Official Stamp:</span> {seller.legalNameEn}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
