import { notFound, redirect } from "next/navigation";
import { getInvoiceById } from "@/lib/invoices/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import PrintButton from "./PrintButton";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer } from "@/lib/quotations/types";
import {
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentQuantity,
  getInvoiceDocumentPresentation,
  getDocumentDictionary,
  resolveDocumentLocale,
} from "@/lib/documents/locale";
import { getDirection } from "@/lib/i18n/direction";
import DocumentLocaleSelect from "@/components/documents/DocumentLocaleSelect";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
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

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const documentLocale = resolveDocumentLocale(resolvedSearchParams);
  const documentDirection = getDirection(documentLocale);
  const dictionary = getDocumentDictionary(documentLocale);
  const invoicePresentation = getInvoiceDocumentPresentation(documentLocale, invoice.vat_mode);
  const sellerName = documentLocale === "ar"
    ? seller.legalNameAr || seller.legalNameEn
    : seller.legalNameEn || seller.legalNameAr;

  const formatMoney = (val: number | null | undefined) => {
    return formatDocumentAmount(val, documentLocale);
  };

  const formatQuantity = (val: number | null | undefined) => {
    return formatDocumentQuantity(val, documentLocale);
  };

  const formatQuantityOrUnavailable = (val: number | null | undefined) =>
    val === null || val === undefined ? dictionary.common.notAvailable : <span dir="ltr" className="document-bidi-number">{formatQuantity(val)}</span>;

  const documentCurrency =
    readRecordString(snapshotQuotationRecord, "currency") ??
    readNonBlankString(seller.currency);
  const formatAmountWithCurrency = (val: number | null | undefined) =>
    `${formatMoney(val)}${documentCurrency ? ` ${documentCurrency}` : ""}`;
  const formatItemAmountWithCurrency = (val: number | null | undefined) =>
    val === null || val === undefined ? dictionary.common.notAvailable : formatAmountWithCurrency(val);
  const relatedQuoteNumber =
    readNonBlankString(invoice.relatedQuoteNumber) ??
    readRecordString(snapshotQuotationRecord, "quotation_number") ??
    readRecordString(snapshotQuotationRecord, "quotationNumber");
  const summaryLabel =
    invoice.invoice_type === "deposit"
      ? dictionary.invoice.depositSummary
      : invoice.invoice_type === "final"
        ? dictionary.invoice.finalSummary
        : dictionary.invoice.invoiceSummary;
  const invoiceAmountLabel =
    invoice.invoice_type === "deposit"
      ? dictionary.invoice.depositAmount
      : invoice.invoice_type === "final"
        ? dictionary.invoice.finalAmountDue
        : dictionary.invoice.totalAmount;
  const itemHeading =
    snapshotClassification === "active_scope"
      ? dictionary.invoice.approvedServiceScope
      : dictionary.invoice.approvedQuotationItems;
  const itemDescription =
    snapshotClassification === "active_scope"
      ? dictionary.invoice.approvedServiceScopeDescription
      : dictionary.invoice.approvedQuotationItemsDescription;

  const isDraft = invoice.status === "draft";
  const displayStatus =
    invoice.status === "sent"
      ? dictionary.common.issued
      : invoice.status === "paid"
        ? dictionary.common.paid
        : invoice.status === "partial"
          ? dictionary.common.partial
          : invoice.status === "overdue"
            ? dictionary.common.overdue
            : invoice.status === "cancelled"
              ? dictionary.common.cancelled
              : invoice.status === "voided"
                ? dictionary.common.voided
                : invoice.status;

  return (
    <div
      lang={documentLocale}
      dir={documentDirection}
      className={`document-${documentDirection} bg-surface py-4 print:py-0 text-on-surface font-sans antialiased min-h-screen flex justify-center items-start`}
    >
      {/* Print Button & Help (Hidden on print) */}
      <div className="fixed top-4 right-4 z-50 no-print flex flex-col items-end gap-2">
        <DocumentLocaleSelect
          value={documentLocale}
          labels={dictionary.locale}
          id="invoicePrintLanguage"
        />
        <PrintButton label={dictionary.common.print} loadingLabel={dictionary.common.preparingPrint} />
        <div className="bg-surface-container-high text-on-surface-variant text-[12px] p-3 rounded shadow-sm max-w-xs border border-outline-variant/30 text-right">
          {dictionary.common.printHelp}
        </div>
      </div>

      {/* A4 Document Wrapper */}
      <div className="a4-page invoice-print-document bg-surface-container-lowest p-[28px] print:p-[22px] relative">
        {/* Draft Watermark/Badge */}
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-5">
            <span className="text-[120px] font-bold text-outline uppercase transform -rotate-45">
              {dictionary.common.draftPreview}
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
                  {sellerName}
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
                {dictionary.common.headquarters}
              </p>
              <p className="whitespace-pre-line">{seller.address?.display || dictionary.common.notAvailable}</p>
              <div className="mt-2 text-[12px]">
                {seller.entityUnifiedNumber && (
                  <p>
                    <span className="font-semibold text-on-surface">{dictionary.common.entityUnifiedNo}</span> {seller.entityUnifiedNumber}
                  </p>
                )}
                {seller.tin && (
                  <p>
                    <span className="font-semibold text-on-surface">{dictionary.common.tin}</span> {seller.tin}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-on-surface">{dictionary.common.taxStatus}</span>{" "}
                  {invoicePresentation.vatStatus}
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
                {invoicePresentation.title}
              </h2>
              {isDraft && (
                <div className="border-2 border-outline-variant p-2 rounded bg-surface w-28 h-24 flex items-center justify-center flex-col text-center shadow-sm">
                  <span className="text-[10px] text-outline leading-tight uppercase font-bold">
                    {dictionary.common.commercialPreview}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 invoice-print-meta">
              {/* Billed To */}
              <div className="bg-surface p-3 rounded border border-outline-variant">
                <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
                  {dictionary.invoice.billedTo}
                </h3>
                <p className="text-[18px] font-semibold text-on-surface mb-1">
                  {buyer.name || buyer.legalName || dictionary.common.unknownCompany}
                </p>
                <p className="text-[14px] text-on-surface-variant whitespace-pre-line">
                  {buyer.address?.display || dictionary.common.addressNotProvided}
                </p>
                {buyer.contactName && (
                  <p className="text-[14px] text-on-surface-variant mt-3">
                    <strong className="font-semibold text-on-surface">{dictionary.common.attn}</strong> {buyer.contactName}
                  </p>
                )}
                <p className="text-[14px] text-on-surface-variant mt-1">
                  <strong className="font-semibold text-on-surface">{dictionary.common.customerTaxDetails}</strong> {buyer.vatNumber || dictionary.common.notCaptured}
                </p>
              </div>

              {/* Invoice Details */}
              <div className="bg-surface p-3 rounded border border-outline-variant">
                <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
                  {dictionary.invoice.invoiceDetails}
                </h3>
                <div className="grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
                  <span className="text-on-surface-variant">{dictionary.common.invoiceNumber}</span>
                  <span className="font-semibold text-on-surface tracking-tight" dir="ltr">{invoice.invoice_number}</span>
                  <span className="text-on-surface-variant">{dictionary.common.type}</span>
                  <span className="text-on-surface uppercase text-[12px] font-medium">{invoice.invoice_type === "deposit" ? dictionary.invoice.deposit : dictionary.invoice.final}</span>
                  <span className="text-on-surface-variant">{dictionary.common.issueDate}</span>
                  <span className="text-on-surface" dir="ltr">{formatDocumentDate(invoice.issued_at || invoice.documentDate, documentLocale)}</span>
                  {relatedQuoteNumber && (
                    <>
                      <span className="text-on-surface-variant">{dictionary.common.relatedQuote}</span>
                      <span className="text-on-surface" dir="ltr">{relatedQuoteNumber}</span>
                    </>
                  )}
                  <span className="text-on-surface-variant mt-2">{dictionary.common.status}</span>
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
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase">{dictionary.invoice.description}</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">{dictionary.quotation.qty}</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-24">{dictionary.quotation.unitPrice}</th>
                  <th className="py-2 px-2 text-[12px] font-semibold text-on-surface uppercase text-right w-28">{dictionary.invoice.lineTotal}</th>
                </tr>
              </thead>
              <tbody className="align-top border-b border-surface-variant text-[14px]">
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/50">
                    <td className="py-2 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-2">
                      <p className="font-semibold text-on-surface" dir="auto">{item.description || dictionary.common.notAvailable}</p>
                    </td>
                    <td className="py-2 px-2 text-on-surface text-center">{formatQuantityOrUnavailable(item.qty)}</td>
                    <td className="py-2 px-2 text-on-surface text-right">
                      <span dir="ltr" className="document-bidi-number">{formatItemAmountWithCurrency(item.unitPrice)}</span>
                    </td>
                    <td className="py-2 px-2 text-on-surface text-right font-medium">
                      <span dir="ltr" className="document-bidi-number">{formatItemAmountWithCurrency(item.total)}</span>
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
                {dictionary.common.paymentInstructions}
              </h3>
              <div className="bg-surface p-3 rounded border border-outline-variant">
                <p className="text-[12px] font-semibold text-primary mb-2">{dictionary.common.bankTransferDetails}</p>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-[12px]">
                  <span className="text-on-surface-variant">{dictionary.common.bank}</span>
                  <span className="font-semibold text-on-surface" dir="auto">{bankDetails?.bankName || seller.bank?.bankName || dictionary.common.notAvailable}</span>
                  <span className="text-on-surface-variant">{dictionary.common.accountName}</span>
                  <span className="font-semibold text-on-surface" dir="auto">{bankDetails?.accountName || seller.bank?.accountName || dictionary.common.notAvailable}</span>
                  <span className="text-on-surface-variant">{dictionary.common.accountNo}</span>
                  <span className="font-semibold text-on-surface" dir="ltr">{bankDetails?.accountNo || seller.bank?.accountNo || dictionary.common.notAvailable}</span>
                  <span className="text-on-surface-variant">{dictionary.common.iban}</span>
                  <span className="font-semibold text-on-surface tracking-wider" dir="ltr">{bankDetails?.iban || seller.bank?.iban || dictionary.common.notAvailable}</span>
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
                    <span className="text-on-surface-variant">{dictionary.invoice.approvedBillingScopeTotal}</span>
                    <span className="text-on-surface">
                      <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(approvedBillingScopeTotal)}</span>
                    </span>
                  </div>
                )}
                {approvedQuotationTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">{dictionary.invoice.approvedQuotationTotal}</span>
                    <span className="text-on-surface">
                      <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(approvedQuotationTotal)}</span>
                    </span>
                  </div>
                )}
                {previousInvoicesTotal !== null && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">{dictionary.invoice.previousInvoices}</span>
                    <span className="text-on-surface">
                      <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(previousInvoicesTotal)}</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-on-surface-variant">{dictionary.invoice.subtotal}</span>
                  <span className="text-on-surface">
                    <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(invoice.subtotal)}</span>
                  </span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-on-surface-variant">{dictionary.invoice.discount}</span>
                    <span className="text-on-surface">
                      <span dir="ltr" className="document-bidi-number">-{formatAmountWithCurrency(invoice.discount_amount)}</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[14px] border-b border-outline-variant/50 pb-3">
                  <span className="text-on-surface-variant">{dictionary.invoice.taxVat}</span>
                  <span className="text-on-surface">
                    {invoice.vat_mode === "not_registered" ? dictionary.common.notApplied : <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(invoice.vat_amount)}</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 bg-surface px-3 -mx-3">
                  <span className="text-[20px] font-semibold text-primary-container">{invoiceAmountLabel}</span>
                  <span className="text-[20px] font-semibold text-primary-container"><span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(invoice.grand_total)}</span></span>
                </div>
                <div className="flex justify-between items-center text-[14px] pt-1">
                  <span className="text-on-surface-variant">{dictionary.common.amountPaid}</span>
                  <span className="text-on-surface"><span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(invoice.amount_paid)}</span></span>
                </div>
                <div className="flex justify-between items-center text-[14px] border-t border-outline-variant pt-2 mt-1">
                  <span className="font-semibold text-on-surface">{dictionary.common.balanceDue}</span>
                  <span className="font-semibold text-on-error-container bg-error-container px-2 py-1 rounded-sm">
                    <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(invoice.balance_due)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-2 pt-1.5 border-t border-outline-variant/30 text-[9px] leading-tight text-on-surface-variant invoice-print-footer">
            <p className="text-right">
              <span className="font-semibold text-on-surface">{dictionary.common.officialStamp}</span> {sellerName}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
