import { notFound, redirect } from "next/navigation";
import { getQuotationById } from "@/lib/quotations/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import {
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentQuantity,
  getDocumentDictionary,
  resolveDocumentLocale,
} from "@/lib/documents/locale";
import { getDirection } from "@/lib/i18n/direction";
import PrintButton from "./PrintButton";
import DocumentLocaleSelect from "@/components/documents/DocumentLocaleSelect";

export default async function QuotationPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
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

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const documentLocale = resolveDocumentLocale(resolvedSearchParams);
  const documentDirection = getDirection(documentLocale);
  const dictionary = getDocumentDictionary(documentLocale);
  const sellerName = documentLocale === "ar"
    ? seller.legalNameAr || seller.legalNameEn
    : seller.legalNameEn || seller.legalNameAr;
  const documentCurrency = seller.currency?.trim() || null;

  const formatMoney = (val: number | null | undefined) => {
    return formatDocumentAmount(val, documentLocale);
  };
  const formatQuantity = (val: number | null | undefined) => {
    return formatDocumentQuantity(val, documentLocale);
  };
  const formatAmountWithCurrency = (val: number | null | undefined) =>
    `${formatMoney(val)}${documentCurrency ? ` ${documentCurrency}` : ""}`;

  return (
    <div
      lang={documentLocale}
      dir={documentDirection}
      className={`quotation-print-page document-${documentDirection} bg-surface-dim py-8 text-on-surface flex justify-center items-start min-h-screen font-sans`}
    >
      <div className="no-print fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <DocumentLocaleSelect
          value={documentLocale}
          labels={dictionary.locale}
          id="quotationPrintLanguage"
        />
        <PrintButton label={dictionary.common.print} loadingLabel={dictionary.common.preparingPrint} />
        <div className="bg-surface-container-high text-on-surface-variant text-[12px] p-3 rounded shadow-sm max-w-xs border border-outline-variant/30 text-right">
           {dictionary.common.printHelp}
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
            <p className="whitespace-pre-line">{seller.address.display}</p>
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
                <span className="font-semibold text-on-surface">{dictionary.common.taxStatus}</span> {dictionary.common.notRegistered}
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
            {dictionary.quotation.title}
          </h2>
        </div>

        {/* Meta Information Grid */}
        <div className="quotation-print-meta grid grid-cols-2 gap-8 mb-10">
          {/* Left: Quotation Details */}
          <div className="bg-surface p-4 rounded border border-outline-variant">
            <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
              {dictionary.quotation.documentDetails}
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <div className="text-on-surface-variant">{dictionary.quotation.quotationNumber}</div>
              <div className="font-semibold text-on-surface" dir="ltr">{quotation.quotationNumber}</div>
              <div className="text-on-surface-variant">{dictionary.common.issueDate}</div>
              <div className="text-on-surface" dir="ltr">{formatDocumentDate(quotation.date, documentLocale)}</div>
              <div className="text-on-surface-variant">{dictionary.quotation.validUntil}</div>
              <div className="text-on-surface" dir="ltr">{formatDocumentDate(quotation.validUntil, documentLocale)}</div>
            </div>
          </div>

          {/* Right: Client & Event Details */}
          <div className="bg-surface p-4 rounded border border-outline-variant">
            <h3 className="text-[12px] font-semibold text-primary-container uppercase border-b border-outline-variant pb-2 mb-3">
              {dictionary.quotation.clientEvent}
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
              <div className="text-on-surface-variant">{dictionary.quotation.client}</div>
              <div className="font-semibold text-on-surface" dir="auto">{buyer.name || buyer.legalName || dictionary.common.unknownCompany}</div>
              {buyer.contactName && (
                <>
                  <div className="text-on-surface-variant mt-2">{dictionary.quotation.contact}</div>
                  <div className="text-on-surface mt-2" dir="auto">{buyer.contactName}</div>
                </>
              )}
              <div className="text-on-surface-variant mt-2">{dictionary.quotation.eventName}</div>
              <div className="text-on-surface font-semibold mt-2" dir="auto">{quotation.event}</div>
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
                  {dictionary.quotation.serviceDescription}
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-24">
                  {dictionary.quotation.category}
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-16 text-center">
                  {dictionary.quotation.qty}
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-28 text-right">
                  {dictionary.quotation.unitPrice}
                  <br />
                  <span className="text-[10px] text-on-surface-variant font-normal">
                     <span dir="ltr">{documentCurrency || dictionary.common.notAvailable}</span>
                  </span>
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-20 text-right">
                  {dictionary.quotation.taxVat}
                </th>
                <th className="py-3 px-2 text-[12px] font-semibold text-on-surface uppercase w-32 text-right">
                  {dictionary.quotation.total}
                  <br />
                  <span className="text-[10px] text-on-surface-variant font-normal">
                    <span dir="ltr">{documentCurrency || dictionary.common.notAvailable}</span>
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
                    <div className="font-semibold mb-1" dir="auto">{item.description}</div>
                  </td>
                  <td className="py-4 px-2 align-top text-[12px]">{item.category}</td>
                  <td className="py-4 px-2 align-top text-center"><span dir="ltr" className="document-bidi-number">{formatQuantity(item.qty)}</span></td>
                  <td className="py-4 px-2 align-top text-right">
                    <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(item.unitPrice)}</span>
                  </td>
                  <td className="py-4 px-2 align-top text-right text-[12px] text-on-surface-variant">
                    {/* TODO CS-B: show item.vat from the document snapshot when VAT registration is enabled. */}
                    {dictionary.common.notApplied}
                  </td>
                  <td className="py-4 px-2 align-top text-right font-medium">
                     <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(item.total)}</span>
                  </td>
                </tr>
              ))}
              {quotation.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    {dictionary.quotation.noLineItems}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="quotation-print-summary flex justify-end items-start mb-12">
          {/* Totals Grid */}
          <div className="w-[300px]">
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">{dictionary.quotation.subtotal}</span>
              <span className="text-on-surface">
                 <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(quotation.subtotal)}</span>
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">{dictionary.quotation.discount}</span>
              <span className="text-on-surface">
                 <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(quotation.discount)}</span>
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/30 text-[14px]">
              <span className="text-on-surface-variant">{dictionary.quotation.taxVat}:</span>
              <span className="text-on-surface">
                {dictionary.common.notApplied}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-primary-container text-[20px] font-semibold text-primary-container mt-2">
              <span>{dictionary.quotation.grandTotal}</span>
                <span dir="ltr" className="document-bidi-number">{formatAmountWithCurrency(quotation.grandTotal)}</span>
            </div>
          </div>
        </div>

        {seller.terms?.trim() && (
          <section className="quotation-print-terms mb-8 border-t border-outline-variant pt-4">
            <h3 className="text-[13px] font-semibold text-on-surface mb-2">
              {dictionary.quotation.termsAndConditions}
            </h3>
            <p className="whitespace-pre-line text-[13px] text-on-surface-variant" dir="auto">
              {seller.terms}
            </p>
          </section>
        )}

        {/* Signatures Section */}
        <div className="quotation-print-signatures mt-auto pt-8 border-t border-outline-variant flex justify-around px-4">
          <div className="w-1/3 text-center">
            <div className="h-20 flex items-end justify-center mb-2"></div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">{dictionary.common.clientApproval}</p>
              <p className="text-[12px] text-on-surface-variant">{dictionary.common.signatureDate}</p>
            </div>
          </div>
          <div className="w-1/3 text-center">
            <div className="h-20 flex items-center justify-center mb-2">
              <div className="w-16 h-16 rounded-full border-2 border-primary-container/20 flex items-center justify-center text-[10px] text-primary-container/40 uppercase text-center leading-tight transform -rotate-12">
                {dictionary.common.companyStamp}
              </div>
            </div>
            <div className="border-t border-outline-variant pt-2">
              <p className="text-[12px] font-semibold text-on-surface">{dictionary.common.officialStamp}</p>
              <p className="text-[12px] text-on-surface-variant" dir="auto">{sellerName}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="quotation-print-footer mt-12 text-center text-[12px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
          <div className="flex justify-center gap-8 mb-2">
            <p>
              <span className="font-semibold text-on-surface">{dictionary.common.bank}</span> {seller.bank.bankName}
            </p>
            <p>
              <span className="font-semibold text-on-surface">{dictionary.common.accountName}</span> {seller.bank.accountName}
            </p>
            <p>
              <span className="font-semibold text-on-surface">{dictionary.common.iban}</span> {seller.bank.iban}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
