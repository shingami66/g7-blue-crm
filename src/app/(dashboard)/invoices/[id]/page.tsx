import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CalendarDays, FileText, Printer, Receipt, UserRound, Wallet } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getInvoiceDocumentLabelDisplay,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  getInvoicesDictionary,
} from "@/lib/i18n/dictionaries/invoices";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import { UiDateRangeText, UiDateText } from "@/components/i18n/UiDateText";
import { getInvoiceById } from "@/lib/invoices/queries";
import { getServiceById } from "@/lib/services/queries";
import type { QuotationItem } from "@/lib/quotations/types";
import { IssueInvoiceAction } from "../IssueInvoiceAction";
import { RecordPaymentAction } from "./RecordPaymentAction";
import RecordNavigation from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getInvoiceRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

export const dynamic = "force-dynamic";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const invoiceStatusBadgeVariant: Record<
  "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "voided",
  StatusBadgeVariant
> = {
  draft: "draft",
  sent: "sent",
  paid: "approved",
  partial: "pending",
  overdue: "overdue",
  cancelled: "rejected",
  voided: "rejected",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function formatDate(locale: Locale, value: string | null | undefined, fallback = "—") {
  if (!value) {
    return fallback;
  }
  return <UiDateText locale={locale} value={value} options={{ fallback }} />;
}

function formatAmount(locale: Locale, value: number | null | undefined) {
  return formatSarAmount(locale, value ?? 0);
}

function formatQuantity(locale: Locale, value: number | null | undefined) {
  return formatUiNumber(locale, value ?? 0, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function Field({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
        {label}
      </div>
      <div className="text-[14px] text-on-surface font-medium" dir={dir}>
        {value}
      </div>
    </div>
  );
}

function buildSettlementSummary(status: string, amountPaid: number, balanceDue: number, dictionary: ReturnType<typeof getInvoicesDictionary>) {
  if (status === "draft") {
    return dictionary.detail.settlement.draft;
  }

  if (status === "paid" || balanceDue <= 0) {
    return dictionary.detail.settlement.fullyPaid;
  }

  if (amountPaid > 0) {
    return dictionary.detail.settlement.partiallyPaid;
  }

  return dictionary.detail.settlement.outstanding;
}

function readLineItems(snapshotQuotation: Record<string, unknown> | null) {
  if (!snapshotQuotation || !Array.isArray(snapshotQuotation.items)) {
    return [] as Array<QuotationItem | Record<string, unknown>>;
  }

  return snapshotQuotation.items.filter(
    (item): item is QuotationItem | Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/invoices");
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getInvoicesDictionary(locale);

  try {
    await requirePermission("invoices:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.detail.states.detailForbidden}</p>
          </div>
        </div>
      );
    }

    throw error;
  }

  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const recordNavigation = await getInvoiceRecordNavigation(id, invoice.invoice_number);
  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  const canIssueInvoice = invoice.status === "draft"
    ? await checkPermission(INVOICE_PERMISSIONS.write)
    : false;
  const canRecordPayment =
    !["draft", "cancelled", "voided"].includes(invoice.status) &&
    (invoice.balance_due ?? 0) > 0 &&
    invoice.service_id !== null &&
    (await checkPermission("payments:write"));
  const canReadServices = invoice.service_id ? await checkPermission("services:read") : false;
  const service = canReadServices && invoice.service_id ? await getServiceById(invoice.service_id) : null;

  const buyer = asRecord(invoice.snapshot_buyer);
  const snapshotQuotation = asRecord(invoice.snapshot_quotation);
  const quotationNumber =
    readString(snapshotQuotation?.quotationNumber) ??
    readString(snapshotQuotation?.quotation_number);
  const lineItems = readLineItems(snapshotQuotation);
  const finalInvoiceSettlement = asRecord(snapshotQuotation?.final_invoice_settlement);
  const approvedQuotationTotal =
    readFiniteNumber(snapshotQuotation?.grand_total) ??
    readFiniteNumber(finalInvoiceSettlement?.approved_quotation_total);
  const previousInvoicesTotal = readFiniteNumber(finalInvoiceSettlement?.active_prior_invoice_total);
  const customerName =
    readString(buyer?.name) ??
    readString(buyer?.legalName) ??
    invoice.customer ??
    dictionary.detail.states.unknownBuyer;
  const legalName = readString(buyer?.legalName);
  const contactName = readString(buyer?.contactName);
  const email = readString(buyer?.email) ?? readString(buyer?.billingEmail);
  const phone = readString(buyer?.phone);
  const address = readString(asRecord(buyer?.address)?.display);
  const paymentStatus = buildSettlementSummary(
    invoice.status,
    invoice.amount_paid ?? 0,
    invoice.balance_due ?? 0,
    dictionary,
  );
  const serviceEventDates =
    service?.eventStartDate && service?.eventEndDate ? (
      <UiDateRangeText
        locale={locale}
        start={service.eventStartDate}
        end={service.eventEndDate}
      />
    ) : service?.eventStartDate ? (
      <UiDateText locale={locale} value={service.eventStartDate} />
    ) : service?.eventEndDate ? (
      <UiDateText locale={locale} value={service.eventEndDate} />
    ) : null;
  const hasServiceDetails = Boolean(
    service?.serviceNumber ||
      service?.serviceTitle ||
      service?.eventName ||
      service?.eventType ||
      serviceEventDates ||
      service?.eventLocation,
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <PendingLink
            href={returnTo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors"
            aria-label={dictionary.detail.actions.backToInvoices}
            title={dictionary.detail.actions.backToInvoices}
          >
            <LocaleBackIcon size={18} />
          </PendingLink>
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight" dir="ltr">
                {isolateBidiText(invoice.invoice_number || invoice.id)}
              </h1>
              <StatusBadge variant={invoiceStatusBadgeVariant[invoice.status]}>
                {getInvoiceStatusLabel(dictionary.locale, invoice.status)}
              </StatusBadge>
            </div>
            <p className="text-[14px] text-on-surface-variant" dir="auto">
              {getInvoiceDocumentLabelDisplay(
                locale,
                invoice.document_label,
                dictionary.detail.states.unavailable,
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <RecordNavigation basePath="/invoices" recordType={dictionary.detail.labels.invoiceNumber} navigation={recordNavigation} dictionary={recordNavigationDictionary} returnTo={returnTo} />
          <Link
            href={`/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
          >
            <Printer size={18} />
            {dictionary.detail.actions.printPdf}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.overview}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label={dictionary.detail.labels.invoiceNumber}
                value={isolateBidiText(invoice.invoice_number || invoice.id)}
                dir="ltr"
              />
              <Field label={dictionary.detail.labels.status} value={getInvoiceStatusLabel(dictionary.locale, invoice.status)} />
              <Field
                label={dictionary.detail.labels.invoiceType}
                value={invoice.invoice_type ? getInvoiceTypeLabel(locale, invoice.invoice_type) : "—"}
              />
              <Field
                label={dictionary.detail.labels.documentLabel}
                value={getInvoiceDocumentLabelDisplay(locale, invoice.document_label)}
                dir="auto"
              />
              <Field
                label={dictionary.detail.labels.issueDate}
                value={formatDate(locale, invoice.issued_at ?? invoice.created_at)}
              />
              <Field
                label={dictionary.detail.labels.createdDate}
                value={formatDate(locale, invoice.created_at)}
              />
              {(invoice.voided_at || invoice.status === "voided") && (
                <Field
                  label={dictionary.detail.labels.voidedDate}
                  value={formatDate(locale, invoice.voided_at)}
                />
              )}
              {invoice.void_reason && (
                <Field label={dictionary.detail.labels.voidReason} value={invoice.void_reason} dir="auto" />
              )}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <UserRound size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.customer}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={dictionary.detail.labels.customerName} value={customerName} dir="auto" />
              {legalName && <Field label={dictionary.detail.labels.legalName} value={legalName} dir="auto" />}
              {contactName && <Field label={dictionary.detail.labels.contactName} value={contactName} dir="auto" />}
              {email && <Field label={dictionary.detail.labels.email} value={email} dir="ltr" />}
              {phone && <Field label={dictionary.detail.labels.phone} value={phone} dir="ltr" />}
              {address && <Field label={dictionary.detail.labels.address} value={address} dir="auto" />}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.serviceEvent}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {hasServiceDetails ? (
                <>
                  <Field
                    label={dictionary.detail.labels.serviceNumber}
                    value={service?.serviceNumber ? isolateBidiText(service.serviceNumber) : "—"}
                    dir="ltr"
                  />
                  <Field label={dictionary.detail.labels.serviceTitle} value={service?.serviceTitle || "—"} dir="auto" />
                  {service?.eventName && <Field label={dictionary.detail.labels.eventName} value={service.eventName} dir="auto" />}
                  {service?.eventType && <Field label={dictionary.detail.labels.eventType} value={service.eventType} dir="auto" />}
                  {serviceEventDates && <Field label={dictionary.detail.labels.eventDates} value={serviceEventDates} dir="ltr" />}
                  {service?.eventLocation && (
                    <Field label={dictionary.detail.labels.eventLocation} value={service.eventLocation} dir="auto" />
                  )}
                </>
              ) : (
                <div className="md:col-span-2 rounded-lg border border-dashed border-outline-variant bg-surface p-4 text-[14px] text-on-surface-variant">
                  {dictionary.detail.states.serviceUnavailable}
                </div>
              )}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Receipt size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.quotation}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {quotationNumber ? (
                <div className="md:col-span-2">
                  <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                    {dictionary.detail.labels.quotationReference}
                  </div>
                  <Link
                    href={`/quotations/${invoice.approved_quotation_id}`}
                    className="text-[14px] font-medium text-primary hover:underline"
                    dir="ltr"
                  >
                    {isolateBidiText(quotationNumber)}
                  </Link>
                </div>
              ) : (
                <div className="md:col-span-2 rounded-lg border border-dashed border-outline-variant bg-surface p-4 text-[14px] text-on-surface-variant">
                  {dictionary.detail.states.unavailable}
                </div>
              )}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.lineItems}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase w-12">#</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                      {dictionary.detail.labels.description}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-center w-20">
                      {dictionary.detail.labels.qty}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-36">
                      {dictionary.detail.labels.unitPrice}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-24">
                      {dictionary.detail.labels.vat}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right w-36">
                      {dictionary.detail.labels.lineTotal}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px]">
                  {lineItems.length > 0 ? (
                    lineItems.map((item, index) => {
                      const itemRecord = asRecord(item);
                      const description = readString(itemRecord?.description) ?? dictionary.detail.states.unavailable;
                      const details = readString(itemRecord?.details);
                      const qty = readFiniteNumber(itemRecord?.qty);
                      const unitPrice =
                        readFiniteNumber(itemRecord?.unitPrice) ?? readFiniteNumber(itemRecord?.unit_price);
                      const vat = readFiniteNumber(itemRecord?.vat);
                      const total = readFiniteNumber(itemRecord?.total);

                      return (
                        <tr key={`${invoice.id}-line-${index}`}>
                          <td className="px-4 py-4 text-on-surface-variant align-top tabular-nums" dir="ltr">
                            {formatUiNumber(locale, index + 1)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="font-medium text-on-surface" dir="auto">
                              {description}
                            </p>
                            {details && (
                              <p className="text-[12px] text-on-surface-variant mt-1 whitespace-pre-wrap" dir="auto">
                                {details}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center text-on-surface align-top tabular-nums" dir="ltr">
                            {qty !== null ? formatQuantity(locale, qty) : "—"}
                          </td>
                          <td className="px-4 py-4 text-right text-on-surface align-top tabular-nums" dir="ltr">
                            {unitPrice !== null ? formatAmount(locale, unitPrice) : "—"}
                          </td>
                          <td className="px-4 py-4 text-right text-on-surface-variant align-top tabular-nums" dir="ltr">
                            {invoice.vat_mode === "not_registered"
                              ? dictionary.detail.states.notApplied
                              : vat !== null
                                ? `${formatUiNumber(locale, vat, { maximumFractionDigits: 2 })}%`
                                : "—"}
                          </td>
                          <td className="px-4 py-4 text-right text-on-surface font-medium align-top tabular-nums" dir="ltr">
                            {total !== null ? formatAmount(locale, total) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                        {dictionary.detail.states.noLineItems}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Wallet size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.totals}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] text-on-surface-variant">{dictionary.detail.labels.subtotal}</span>
                <span className="text-[14px] font-medium text-on-surface tabular-nums" dir="ltr">
                  {formatAmount(locale, invoice.subtotal)}
                </span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-on-surface-variant">{dictionary.detail.labels.discount}</span>
                  <span className="text-[14px] font-medium text-on-surface tabular-nums" dir="ltr">
                    -{formatAmount(locale, invoice.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] text-on-surface-variant">{dictionary.detail.labels.vatAmount}</span>
                <span className="text-[14px] font-medium text-on-surface tabular-nums" dir="ltr">
                  {invoice.vat_mode === "not_registered"
                    ? dictionary.detail.states.notApplied
                    : formatAmount(locale, invoice.vat_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-surface-variant">
                <span className="text-[16px] font-semibold text-on-surface">{dictionary.detail.labels.grandTotal}</span>
                <span className="text-[16px] font-semibold text-primary tabular-nums" dir="ltr">
                  {formatAmount(locale, invoice.grand_total)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] text-on-surface-variant">{dictionary.detail.labels.amountPaid}</span>
                <span className="text-[14px] font-medium text-on-surface tabular-nums" dir="ltr">
                  {formatAmount(locale, invoice.amount_paid)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] text-on-surface-variant">{dictionary.detail.labels.balanceDue}</span>
                <span className="text-[14px] font-semibold text-on-surface tabular-nums" dir="ltr">
                  {formatAmount(locale, invoice.balance_due)}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Receipt size={16} className="text-primary" />
              <h2 className="font-semibold text-primary">{dictionary.detail.sections.settlement}</h2>
            </div>
            <div className="p-6 space-y-4">
              <Field label={dictionary.detail.labels.paymentStatus} value={paymentStatus} dir="auto" />
              {approvedQuotationTotal !== null && (
                <Field
                  label={dictionary.detail.labels.approvedQuotationTotal}
                  value={formatAmount(locale, approvedQuotationTotal)}
                  dir="ltr"
                />
              )}
              {previousInvoicesTotal !== null && (
                <Field
                  label={dictionary.detail.labels.previousInvoices}
                  value={formatAmount(locale, previousInvoicesTotal)}
                  dir="ltr"
                />
              )}
              <Field
                label={dictionary.detail.labels.invoiceType}
                value={getInvoiceTypeLabel(locale, invoice.invoice_type)}
                dir="auto"
              />
              {canIssueInvoice && (
                <div className="pt-4 border-t border-surface-variant">
                  <IssueInvoiceAction invoiceId={invoice.id} dictionary={dictionary.issueAction} />
                </div>
              )}
              {canRecordPayment && (
                <div className="pt-4 border-t border-surface-variant">
                  <RecordPaymentAction
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.invoice_number || invoice.id}
                    balanceDue={invoice.balance_due ?? 0}
                    dictionary={dictionary.paymentModal}
                    buttonLabel={dictionary.list.actions.recordPayment}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
