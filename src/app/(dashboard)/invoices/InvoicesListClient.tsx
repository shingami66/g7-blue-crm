"use client";

import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import StatusBadge from "@/components/ui/StatusBadge";
import ModuleSearchControl from "@/components/ui/ModuleSearchControl";
import DenseTableIconAction from "@/components/ui/DenseTableIconAction";
import { ListInlineError } from "@/components/ui/ListPendingState";
import Button from "@/components/ui/Button";
import { useListNavigation } from "@/components/ui/useListNavigation";
import { Download, Filter, Eye, Printer, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getInvoiceDocumentLabelDisplay,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  type InvoicesDictionary,
} from "@/lib/i18n/dictionaries/invoices";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";
import PendingLink from "@/components/ui/PendingLink";
import type { InvoiceListPagination, InvoiceListQuery, InvoiceSearchMode } from "@/lib/invoices/types";
import type { EligibleInvoiceService, InvoiceChooserLoadStatus } from "@/lib/invoices/eligible-service-selector";
import CreateInvoiceChooser from "./CreateInvoiceChooser";
import { loadEligibleInvoiceServicesAction } from "./actions";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import { cleanBusinessYearParam, getCurrentBusinessYear } from "@/lib/business-year";

const invoiceStatusBadgeVariant = {
  draft: "draft",
  sent: "sent",
  paid: "approved",
  partial: "pending",
  overdue: "overdue",
  cancelled: "rejected",
  voided: "rejected",
} as const satisfies Record<InvoiceStatus, "draft" | "sent" | "approved" | "pending" | "overdue" | "rejected">;

const INVOICE_COLUMN_WIDTHS = [
  "w-[14%]",
  "w-[12%]",
  "w-[14%]",
  "w-[17%]",
  "w-[11%]",
  "w-[14%]",
  "w-[8%]",
  "w-[5%]",
  "w-[5%]",
] as const;

const INVOICE_COLUMN_ALIGNMENTS = [
  "text-start",
  "text-start",
  "text-start",
  "text-start",
  "text-start",
  "text-end",
  "text-start",
  "text-center",
  "text-center",
] as const;

interface InvoicesListClientProps {
  initialInvoices: Invoice[];
  pagination: InvoiceListPagination;
  query: InvoiceListQuery;
  loadError?: "invoices_load_failed";
  canCreateInvoiceChooser: boolean;
  dictionary: InvoicesDictionary;
}

function invoiceListHref(query: InvoiceListQuery, page = 1) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const year = cleanBusinessYearParam(query.year ?? getCurrentBusinessYear());
  if (year) params.set("year", year);
  if (query.pageSize && query.pageSize !== LIST_PAGE_SIZES[0]) params.set("pageSize", String(query.pageSize));
  const search = sanitizeSearchTerm(query.search ?? "");
  if (query.searchMode && search) {
    params.set("searchMode", query.searchMode);
    params.set("search", search);
  }
  if (query.status) params.set("status", query.status);
  const encoded = params.toString();
  return encoded ? `/invoices?${encoded}` : "/invoices";
}

export default function InvoicesListClient({
  initialInvoices,
  pagination,
  query,
  loadError,
  canCreateInvoiceChooser,
  dictionary,
}: InvoicesListClientProps) {
  const locale = dictionary.locale;
  const stateKey = `${query.searchMode ?? ""}|${query.search ?? ""}|${query.status ?? ""}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const [isInvoiceChooserOpen, setIsInvoiceChooserOpen] = useState(false);
  const [eligibleServices, setEligibleServices] = useState<EligibleInvoiceService[]>([]);
  const [eligibleServicesLoadStatus, setEligibleServicesLoadStatus] = useState<InvoiceChooserLoadStatus>("loading");
  const createInvoiceTriggerRef = useRef<HTMLButtonElement>(null);
  const chooserLoadRequestRef = useRef(0);
  const activeMode = query.searchMode;
  const searchModes = [
    { value: "invoiceNumber", label: dictionary.list.filters.searchModes.invoiceNumber, placeholder: dictionary.list.filters.searchPlaceholders.invoiceNumber },
    { value: "customer", label: dictionary.list.filters.searchModes.customer, placeholder: dictionary.list.filters.searchPlaceholders.customer },
  ] as const;

  function updateQuery(next: Partial<InvoiceListQuery>, kind: "navigation" | "search" = "navigation") {
    navigate(invoiceListHref({ ...query, ...next }, 1), "replace", kind);
  }

  const closeInvoiceChooser = useCallback(() => {
    chooserLoadRequestRef.current += 1;
    setIsInvoiceChooserOpen(false);
  }, []);

  async function openInvoiceChooser() {
    const requestId = chooserLoadRequestRef.current + 1;
    chooserLoadRequestRef.current = requestId;
    setEligibleServices([]);
    setEligibleServicesLoadStatus("loading");
    setIsInvoiceChooserOpen(true);

    try {
      const result = await loadEligibleInvoiceServicesAction();
      if (chooserLoadRequestRef.current !== requestId) return;
      setEligibleServices(result.services);
      setEligibleServicesLoadStatus(result.status);
    } catch {
      if (chooserLoadRequestRef.current !== requestId) return;
      setEligibleServices([]);
      setEligibleServicesLoadStatus("error");
    }
  }

  const returnTo = invoiceListHref(query, pagination.page);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canCreateInvoiceChooser && (
          <Button asChild size="sm">
            <button
              ref={createInvoiceTriggerRef}
              type="button"
              onClick={() => void openInvoiceChooser()}
            >
              <Plus size={16} aria-hidden="true" />
              {dictionary.list.invoiceChooser.createInvoice}
            </button>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <button type="button">
            <Download size={16} />
            {dictionary.list.export}
          </button>
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-busy={isPending || undefined}>
          <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant bg-surface-bright p-4">
            <ModuleSearchControl
              mode={activeMode}
              modes={searchModes}
              query={query.search ?? ""}
              modeLabel={dictionary.list.filters.searchModeLabel}
              submitLabel={common.labels.search}
              pendingLabel={common.states.searching}
              clearLabel={common.actions.clear}
              isPending={isPending}
              isSearchPending={isSearchPending}
              selectModeLabel={common.labels.select}
              disabledPlaceholder={common.labels.searchTypeFirst}
              onSubmit={(mode, search) => updateQuery({ searchMode: mode as InvoiceSearchMode, search: search || undefined }, "search")}
              onModeChange={(mode) => { if (!mode) updateQuery({ searchMode: undefined, search: undefined }); }}
            />
            <div className="relative shrink-0">
              <select value={query.status ?? "all"} disabled={isPending} onChange={(event) => updateQuery({ status: event.target.value === "all" ? undefined : event.target.value })} aria-label={dictionary.list.filters.allStatuses} className="appearance-none rounded-lg border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
                <option value="all">{dictionary.list.filters.allStatuses}</option>
                <option value="paid">{dictionary.list.filters.paid}</option>
                <option value="overdue">{dictionary.list.filters.overdue}</option>
                <option value="draft">{dictionary.statuses.draft}</option>
                <option value="sent">{dictionary.statuses.sent}</option>
                <option value="partial">{dictionary.statuses.partial}</option>
                <option value="cancelled">{dictionary.statuses.cancelled}</option>
                <option value="voided">{dictionary.statuses.voided}</option>
              </select>
              <Filter size={14} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            </div>
          </div>

          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            paginationMode="bounded"
            isPending={isPending}
            onPageChange={(page) => navigate(invoiceListHref(query, page), "push")}
            onPageSizeChange={(pageSize: ListPageSize) => updateQuery({ pageSize })}
          />

          <div className="relative min-h-0 flex-1 overflow-auto">
            {loadError ? <ListInlineError message={dictionary.states.invoicesLoadError} retryLabel={sharedStates.retry.tryAgain} onRetry={refresh} pending={isPending} /> : <table className="w-full min-w-[1060px] table-fixed border-collapse text-start">
              <colgroup>
                {INVOICE_COLUMN_WIDTHS.map((width, index) => <col key={index} className={width} />)}
              </colgroup>
              <thead><tr className="border-b border-surface-variant bg-surface-container-low">
                {[dictionary.list.table.invoice, dictionary.list.table.type, dictionary.list.table.document, dictionary.list.table.customer, dictionary.list.table.issueDate, dictionary.list.table.amountSar, dictionary.list.table.status, dictionary.list.table.preview, dictionary.list.table.printPdf].map((header, index) => <th key={header} className={`px-4 py-3 text-[12px] font-semibold uppercase text-on-surface-variant ${INVOICE_COLUMN_ALIGNMENTS[index]}`}>{header}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {initialInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-surface-container-low/50">
                    <td className="px-4 py-4 font-mono font-semibold text-primary"><span dir="ltr" className="inline-block whitespace-nowrap">{isolateBidiText(invoice.invoice_number || invoice.id)}</span></td>
                    <td className="px-4 py-4 text-on-surface">{invoice.invoice_type ? getInvoiceTypeLabel(locale, invoice.invoice_type) : "—"}</td>
                    <td className="px-4 py-4 text-on-surface"><span dir="auto">{getInvoiceDocumentLabelDisplay(locale, invoice.document_label)}</span></td>
                    <td className="px-4 py-4 font-medium text-on-surface"><span dir="auto">{invoice.customer}</span></td>
                    <td className="px-4 py-4 text-on-surface-variant"><UiDateText locale={locale} value={invoice.issued_at ?? invoice.created_at} /></td>
                    <td className="px-4 py-4 text-end font-semibold text-on-surface tabular-nums"><span dir="ltr" className="inline-block whitespace-nowrap">{formatSarAmount(locale, invoice.grand_total)}</span></td>
                    <td className="px-4 py-4"><StatusBadge variant={invoiceStatusBadgeVariant[invoice.status]}>{getInvoiceStatusLabel(dictionary.locale, invoice.status)}</StatusBadge></td>
                    <td className="px-4 py-4 text-center"><PendingLink href={`/invoices/${invoice.id}?returnTo=${encodeURIComponent(returnTo)}`} pendingLabel={dictionary.list.navigationPending} aria-label={`${dictionary.list.table.preview} ${invoice.invoice_number || invoice.id}`} title={`${dictionary.list.table.preview} ${invoice.invoice_number || invoice.id}`} className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40"><Eye size={17} /></PendingLink></td>
                    <td className="px-4 py-4 text-center"><div className="grid place-items-center"><DenseTableIconAction label={dictionary.list.table.printPdf} onClick={() => window.open(`/invoices/${invoice.id}/pdf`, "_blank", "noopener,noreferrer")}><Printer size={16} aria-hidden="true" /></DenseTableIconAction></div></td>
                  </tr>
                ))}
                {!loadError && initialInvoices.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">{pagination.total === 0 && !query.search && !query.status ? dictionary.list.table.noInvoices : dictionary.list.table.noFilteredInvoices}</td></tr>}
              </tbody>
            </table>}
          </div>
        </div>
      </div>
      {isInvoiceChooserOpen && <CreateInvoiceChooser services={eligibleServices} loadStatus={eligibleServicesLoadStatus} dictionary={dictionary} triggerRef={createInvoiceTriggerRef} onClose={closeInvoiceChooser} />}
    </div>
  );
}
