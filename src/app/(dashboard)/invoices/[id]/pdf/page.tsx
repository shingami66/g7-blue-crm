import { notFound, redirect } from "next/navigation";
import { getInvoiceById } from "@/lib/invoices/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import PrintButton from "./PrintButton";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer } from "@/lib/quotations/types";

/* INVOICE_PDF_SNAPSHOT_CLASSIFIER_START */
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

function readNonBlankString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readRecordString(record: Record<string, unknown> | null, key: string): string | null {
  return record ? readNonBlankString(record[key]) : null;
}

type SnapshotInvoiceItem = {
  description: string | null;
  qty: number | null;
  unitPrice: number | null;
  total: number | null;
};

function normalizeSnapshotInvoiceItem(value: unknown): SnapshotInvoiceItem | null {
  const item = asRecord(value);
  if (!item) {
    return null;
  }

  return {
    description: readNonBlankString(item.description),
    qty: readFiniteNumber(item.qty),
    unitPrice: readFiniteNumber(item.unit_price) ?? readFiniteNumber(item.unitPrice),
    total: readFiniteNumber(item.total),
  };
}

type SnapshotClassification =
  | "full_quotation"
  | "active_scope"
  | "synthetic_deposit"
  | "synthetic_final"
  | "ambiguous";

function hasOwnRecordField(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasAnyActiveScopeMarker(record: Record<string, unknown>) {
  return [
    "approvedBillingScopeId",
    "approvedBillingScopeAcceptedGrandTotal",
    "sourceQuotationId",
  ].some((key) => hasOwnRecordField(record, key));
}

function hasActiveScopeMarkers(record: Record<string, unknown>) {
  return (
    readNonBlankString(record.approvedBillingScopeId) !== null &&
    readSupportedSnapshotNumber(record.approvedBillingScopeAcceptedGrandTotal) !== null &&
    readNonBlankString(record.sourceQuotationId) !== null
  );
}

function readSupportedSnapshotNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readOwnRecordValue(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function readStoredItemNumber(item: Record<string, unknown>, snakeCaseKey: string, camelCaseKey?: string) {
  const hasSnakeCaseKey = hasOwnRecordField(item, snakeCaseKey);
  const hasCamelCaseKey = camelCaseKey ? hasOwnRecordField(item, camelCaseKey) : false;
  if (hasSnakeCaseKey === hasCamelCaseKey) {
    return null;
  }

  return readSupportedSnapshotNumber(readOwnRecordValue(item, hasSnakeCaseKey ? snakeCaseKey : camelCaseKey!));
}

function hasRequiredSnapshotItemFields(item: Record<string, unknown>, requireDetails: boolean) {
  const details = readOwnRecordValue(item, "details");
  return (
    readNonBlankString(readOwnRecordValue(item, "description")) !== null &&
    (!requireDetails || (hasOwnRecordField(item, "details") && (details === null || typeof details === "string"))) &&
    readStoredItemNumber(item, "qty") !== null &&
    readStoredItemNumber(item, "unit_price", "unitPrice") !== null &&
    readStoredItemNumber(item, "vat") !== null &&
    readStoredItemNumber(item, "total") !== null
  );
}

function hasSyntheticSettlementTopLevelInvariants(record: Record<string, unknown>) {
  return (
    readNonBlankString(record.quotation_id) !== null &&
    readNonBlankString(record.quotation_number) !== null &&
    readNonBlankString(record.service_id) !== null &&
    readNonBlankString(record.customer_id) !== null &&
    readNonBlankString(record.sourceQuotationId) === readNonBlankString(record.quotation_id) &&
    readNonBlankString(record.status) !== null
  );
}

function isSyntheticSettlementRow(
  item: Record<string, unknown>,
  description: "Deposit Payment" | "Final Settlement",
  record: Record<string, unknown>,
  invoiceType: string,
) {
  const unitPrice = readStoredItemNumber(item, "unit_price", "unitPrice");
  const quotationNumber = readOwnRecordValue(record, "quotation_number");
  const expectedInvoiceType = description === "Deposit Payment" ? "deposit" : "final";

  return (
    hasSyntheticSettlementTopLevelInvariants(record) &&
    invoiceType === expectedInvoiceType &&
    readNonBlankString(readOwnRecordValue(item, "description")) === description &&
    readNonBlankString(readOwnRecordValue(item, "details")) ===
      (typeof quotationNumber === "string" && quotationNumber.trim() !== "" ? `For services related to Quotation ${quotationNumber}` : null) &&
    readStoredItemNumber(item, "qty") === 1 &&
    unitPrice !== null &&
    readStoredItemNumber(item, "vat") === 0 &&
    readStoredItemNumber(item, "total") === unitPrice &&
    readSupportedSnapshotNumber(record.subtotal) === unitPrice &&
    readSupportedSnapshotNumber(record.vat_amount) === 0 &&
    readSupportedSnapshotNumber(record.grand_total) === unitPrice &&
    readSupportedSnapshotNumber(record.discount) !== null &&
    readSupportedSnapshotNumber(record.vat_rate) !== null
  );
}

function hasSyntheticSettlementIdentity(
  item: Record<string, unknown>,
  description: "Deposit Payment" | "Final Settlement",
  record: Record<string, unknown>,
) {
  const quotationNumber = readOwnRecordValue(record, "quotation_number");
  return (
    hasSyntheticSettlementTopLevelInvariants(record) &&
    readNonBlankString(readOwnRecordValue(item, "description")) === description &&
    readNonBlankString(readOwnRecordValue(item, "details")) ===
      (typeof quotationNumber === "string" && quotationNumber.trim() !== "" ? `For services related to Quotation ${quotationNumber}` : null)
  );
}

function hasFullQuotationSnapshotInvariants(record: Record<string, unknown>, items: unknown[]) {
  return (
    !hasAnyActiveScopeMarker(record) &&
    readNonBlankString(record.quotation_id) !== null &&
    readNonBlankString(record.quotation_number) !== null &&
    readNonBlankString(record.service_id) !== null &&
    readNonBlankString(record.customer_id) !== null &&
    readSupportedSnapshotNumber(record.subtotal) !== null &&
    readSupportedSnapshotNumber(record.discount) !== null &&
    readSupportedSnapshotNumber(record.vat_rate) !== null &&
    readSupportedSnapshotNumber(record.vat_amount) !== null &&
    readSupportedSnapshotNumber(record.grand_total) !== null &&
    items.length > 0 &&
    items.every((value) => {
      const item = asRecord(value);
      return item !== null && hasRequiredSnapshotItemFields(item, true);
    })
  );
}

function classifySnapshotQuotation(record: Record<string, unknown> | null, invoiceType: string): SnapshotClassification {
  if (!record || !Array.isArray(record.items)) {
    return "ambiguous";
  }

  const { items } = record;
  if (hasFullQuotationSnapshotInvariants(record, items)) {
    return "full_quotation";
  }

  if (!hasActiveScopeMarkers(record) || items.length === 0) {
    return "ambiguous";
  }

  const itemRecords = items.map(asRecord);
  if (itemRecords.some((item) => item === null)) {
    return "ambiguous";
  }

  const [onlyItem] = itemRecords;
  if (items.length === 1 && onlyItem && isSyntheticSettlementRow(onlyItem, "Deposit Payment", record, invoiceType)) {
    return "synthetic_deposit";
  }

  if (items.length === 1 && onlyItem && hasSyntheticSettlementIdentity(onlyItem, "Deposit Payment", record)) {
    return "ambiguous";
  }

  if (items.length === 1 && onlyItem && isSyntheticSettlementRow(onlyItem, "Final Settlement", record, invoiceType)) {
    return "synthetic_final";
  }

  if (items.length === 1 && onlyItem && hasSyntheticSettlementIdentity(onlyItem, "Final Settlement", record)) {
    return "ambiguous";
  }

  const hasScopeRowInvariants = itemRecords.every((item) => {
    if (!item) {
      return false;
    }

    return (
      hasRequiredSnapshotItemFields(item, true)
    );
  });

  return hasScopeRowInvariants ? "active_scope" : "ambiguous";
}
/* INVOICE_PDF_SNAPSHOT_CLASSIFIER_END */

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
  const bankDetails = invoice.snapshot_bank_details as { bankName?: string; accountName?: string; accountNo?: string; iban?: string } | null;
  const snapshotQuotationRecord = asRecord(invoice.snapshot_quotation);
  const snapshotClassification = classifySnapshotQuotation(snapshotQuotationRecord, invoice.invoice_type);
  const snapshotItems = Array.isArray(snapshotQuotationRecord?.items)
    ? snapshotQuotationRecord.items
    : [];
  const items = (
    snapshotClassification === "full_quotation" || snapshotClassification === "active_scope"
      ? snapshotItems
      : []
  )
    .map(normalizeSnapshotInvoiceItem)
    .filter((item): item is SnapshotInvoiceItem => item !== null);
  const finalInvoiceSettlement = asRecord(snapshotQuotationRecord?.final_invoice_settlement);
  const fullQuotationTotal =
    snapshotClassification === "full_quotation"
      ? readRecordNumber(snapshotQuotationRecord, "grand_total")
      : null;
  const approvedQuotationTotal =
    invoice.invoice_type === "final"
      ? readRecordNumber(finalInvoiceSettlement, "approved_quotation_total") ?? fullQuotationTotal
      : fullQuotationTotal;
  const approvedBillingScopeTotal =
    invoice.invoice_type === "deposit" && snapshotClassification === "active_scope"
      ? readRecordNumber(snapshotQuotationRecord, "approvedBillingScopeAcceptedGrandTotal")
      : null;
  const previousInvoicesTotal =
    invoice.invoice_type === "final"
      ? readRecordNumber(finalInvoiceSettlement, "service_lifetime_exposure") ??
        readRecordNumber(finalInvoiceSettlement, "active_prior_invoice_total")
      : null;

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

  const formatQuantityOrUnavailable = (val: number | null | undefined) =>
    val === null || val === undefined ? "Not available" : formatQuantity(val);

  const documentCurrency =
    readRecordString(snapshotQuotationRecord, "currency") ??
    readNonBlankString(seller.currency);
  const formatAmountWithCurrency = (val: number | null | undefined) =>
    `${formatMoney(val)}${documentCurrency ? ` ${documentCurrency}` : ""}`;
  const formatItemAmountWithCurrency = (val: number | null | undefined) =>
    val === null || val === undefined ? "Not available" : formatAmountWithCurrency(val);
  const relatedQuoteNumber =
    readNonBlankString(invoice.relatedQuoteNumber) ??
    readRecordString(snapshotQuotationRecord, "quotation_number") ??
    readRecordString(snapshotQuotationRecord, "quotationNumber");
  const summaryLabel =
    invoice.invoice_type === "deposit"
      ? "Deposit Summary"
      : invoice.invoice_type === "final"
        ? "Final Settlement Summary"
        : "Invoice Summary";
  const invoiceAmountLabel =
    invoice.invoice_type === "deposit"
      ? "Deposit Amount"
      : invoice.invoice_type === "final"
        ? "Final Amount Due"
        : "Total Amount";
  const itemHeading =
    snapshotClassification === "active_scope"
      ? "Approved Service Scope"
      : "Approved Quotation Items";
  const itemDescription =
    snapshotClassification === "active_scope"
      ? "Accepted service scope items connected to this Invoice."
      : "Full approved service items connected to this Invoice.";

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
      <div className="a4-page invoice-print-document bg-surface-container-lowest p-[28px] print:p-[22px] relative">
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
          <div className="mb-6 invoice-print-title">
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

            <div className="grid grid-cols-2 gap-8 invoice-print-meta">
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
                  {relatedQuoteNumber && (
                    <>
                      <span className="text-on-surface-variant">Related Quote:</span>
                      <span className="text-on-surface">{relatedQuoteNumber}</span>
                    </>
                  )}
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

          {/* Render only positively classified historical itemization. */}
          {items.length > 0 && (
            <div className="mb-6 flex-grow invoice-print-items">
              <h3 className="text-[12px] font-semibold text-primary-container uppercase mb-1 border-b border-outline-variant pb-1">
                {itemHeading}
              </h3>
              <p className="text-[11px] text-on-surface-variant mb-3">
                {itemDescription}
              </p>
              <table className="w-full text-left border-collapse invoice-print-item-table">
              <thead>
                <tr className="bg-surface-container-low border-y border-outline-variant">
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase w-8">#</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase">Description</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">Qty</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-24">Unit Price</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-28">Line Total</th>
                </tr>
              </thead>
              <tbody className="align-top border-b border-surface-variant text-[14px]">
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/50">
                    <td className="py-2 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-2">
                      <p className="font-semibold text-on-surface">{item.description || "Not available"}</p>
                    </td>
                    <td className="py-2 px-2 text-on-surface text-center">{formatQuantityOrUnavailable(item.qty)}</td>
                    <td className="py-2 px-2 text-on-surface text-right">
                      {formatItemAmountWithCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-on-surface text-right font-medium">
                      {formatItemAmountWithCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}

          {/* Summary & Payment Info */}
          <div className="grid grid-cols-2 gap-8 mb-6 invoice-print-summary">
            {/* Payment Instructions */}
            <div className="invoice-print-payment-instructions">
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
            <div className="invoice-print-summary-totals">
              <h3 className="text-[12px] font-semibold text-primary-container uppercase mb-3 border-b border-outline-variant pb-1">
                {summaryLabel}
              </h3>
              <div className="space-y-2 break-inside-avoid">
                {approvedBillingScopeTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Approved Billing Scope Total</span>
                    <span className="text-on-surface">
                      {formatAmountWithCurrency(approvedBillingScopeTotal)}
                    </span>
                  </div>
                )}
                {approvedQuotationTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Approved Quotation Total</span>
                    <span className="text-on-surface">
                      {formatAmountWithCurrency(approvedQuotationTotal)}
                    </span>
                  </div>
                )}
                {previousInvoicesTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Previous Invoices / Deposits</span>
                    <span className="text-on-surface">
                      {formatAmountWithCurrency(previousInvoicesTotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="text-on-surface">
                    {formatAmountWithCurrency(invoice.subtotal)}
                  </span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">Discount</span>
                    <span className="text-on-surface">
                      -{formatAmountWithCurrency(invoice.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[14px] border-b border-outline-variant/50 pb-3">
                  <span className="text-on-surface-variant">Tax/VAT</span>
                  <span className="text-on-surface">
                    {invoice.vat_mode === "not_registered" ? "Not applied" : formatAmountWithCurrency(invoice.vat_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 bg-surface px-3 -mx-3">
                  <span className="text-[20px] font-semibold text-primary-container">{invoiceAmountLabel}</span>
                  <span className="text-[20px] font-semibold text-primary-container">{formatAmountWithCurrency(invoice.grand_total)}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] pt-1">
                  <span className="text-on-surface-variant">Amount Paid</span>
                  <span className="text-on-surface">{formatAmountWithCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] border-t border-outline-variant pt-2 mt-1">
                  <span className="font-semibold text-on-surface">Balance Due</span>
                  <span className="font-semibold text-on-error-container bg-error-container px-2 py-1 rounded-sm">
                    {formatAmountWithCurrency(invoice.balance_due)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-2 pt-1.5 border-t border-outline-variant/30 text-[9px] leading-tight text-on-surface-variant invoice-print-footer">
            <p className="text-right">
              <span className="font-semibold text-on-surface">Official Stamp:</span> {seller.legalNameEn}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
