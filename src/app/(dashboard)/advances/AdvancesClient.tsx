"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCashAdvancesDictionary,
  getCashAdvanceStatusLabel,
  getCashAdvanceContextTypeLabel,
  type CashAdvancesDictionary,
} from "@/lib/i18n/dictionaries/cash-advances";
import type {
  EnrichedCashAdvance,
  ExpenseServiceOption,
  CashAdvanceStatus,
} from "@/lib/expenses/types";
import PendingLink from "@/components/ui/PendingLink";
import { CashAdvanceRequestModal } from "./CashAdvanceRequestModal";
import {
  Wallet,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface AdvancesClientProps {
  canRead: boolean;
  canReadOwn?: boolean;
  canReadBroad?: boolean;
  canSubmitOwn?: boolean;
  myAdvances?: EnrichedCashAdvance[];
  allAdvances?: EnrichedCashAdvance[];
  eligibleServices?: ExpenseServiceOption[];
  loadError: string | null;
  dictionary?: CashAdvancesDictionary;
}

export default function AdvancesClient({
  canRead,
  canReadOwn = true,
  canReadBroad = false,
  canSubmitOwn = false,
  myAdvances = [],
  allAdvances = [],
  eligibleServices = [],
  loadError,
  dictionary: dictionaryProp,
}: AdvancesClientProps) {
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getCashAdvancesDictionary(locale);
  const isRtl = locale === "ar";

  // Active Tab: "my" | "all"
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");

  // Filter state: status
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Success notice state
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-dismiss notice after 6 seconds
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // Filtered dataset
  const filteredList = useMemo(() => {
    const list =
      activeTab === "all" && canReadBroad
        ? allAdvances
        : canReadOwn
          ? myAdvances
          : [];
    if (statusFilter === "all") return list;
    return list.filter((item) => item.status === statusFilter);
  }, [activeTab, canReadBroad, allAdvances, canReadOwn, myAdvances, statusFilter]);

  if (!canRead) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-xl border border-error bg-error-container/40 p-6 text-on-error-container">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-error" />
            {dictionary.states.accessRestricted}
          </h2>
          <p className="mt-1 text-sm text-on-error-container">
            {dictionary.states.accessRestrictedMessage}
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: CashAdvanceStatus) => {
    switch (status) {
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "issued":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "settled":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      case "rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "cancelled":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "submitted":
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-primary" />
            {dictionary.header.title}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {dictionary.header.subtitle}
          </p>
        </div>

        {canSubmitOwn && (
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{dictionary.header.requestAdvance}</span>
          </button>
        )}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Load Error Alert */}
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {dictionary.states.noticePrefix} {loadError}
          </span>
        </div>
      )}

      {/* View Segmented Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4">
        {/* Tabs: My Advances vs All Advances (if authorized for broad read) */}
        {canReadBroad ? (
          <div className="inline-flex p-1 rounded-xl bg-surface-container-low border border-outline-variant">
            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "my"
                  ? "bg-surface-container-lowest text-on-surface shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {dictionary.tabs.myAdvances}
              <span className="ms-1.5 text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant">
                {myAdvances.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-surface-container-lowest text-on-surface shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {dictionary.tabs.allAdvances}
              <span className="ms-1.5 text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant">
                {allAdvances.length}
              </span>
            </button>
          </div>
        ) : (
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span>{dictionary.tabs.myAdvances}</span>
            <span className="text-xs font-normal text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              <span dir="ltr">{myAdvances.length}</span> {dictionary.table.recordsLoaded}
            </span>
          </h2>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="status-filter" className="text-xs font-medium text-on-surface-variant">
            {dictionary.filters.status}:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-outline-variant bg-surface px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">{dictionary.filters.allStatuses}</option>
            <option value="submitted">{dictionary.statuses.submitted}</option>
            <option value="approved">{dictionary.statuses.approved}</option>
            <option value="issued">{dictionary.statuses.issued}</option>
            <option value="settled">{dictionary.statuses.settled}</option>
            <option value="rejected">{dictionary.statuses.rejected}</option>
            <option value="cancelled">{dictionary.statuses.cancelled}</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredList.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-on-surface-variant space-y-3">
          <Wallet className="w-10 h-10 mx-auto opacity-30 text-on-surface-variant" />
          <p className="font-semibold text-sm text-on-surface">
            {dictionary.table.empty.noAdvances}
          </p>
          <p className="text-xs max-w-sm mx-auto text-on-surface-variant">
            {statusFilter !== "all"
              ? dictionary.table.empty.noAdvancesFilterDesc
              : activeTab === "all"
                ? dictionary.table.empty.allEmptyDesc
                : dictionary.table.empty.noAdvancesDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* MOBILE VIEW: Explicit Cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredList.map((adv) => (
              <div
                key={adv.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs space-y-3 hover:border-outline transition-colors"
              >
                {/* Advance Number & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="font-mono font-bold text-sm text-primary">
                    {adv.advance_number}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadgeClass(
                      adv.status,
                    )}`}
                  >
                    {getCashAdvanceStatusLabel(locale, adv.status)}
                  </span>
                </div>

                {/* Recipient info (shown in broad view) */}
                {activeTab === "all" && (
                  <div className="flex items-center gap-1.5 text-xs text-on-surface">
                    <User className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <span className="font-medium">
                      {adv.recipientName || dictionary.table.columns.recipient}
                    </span>
                  </div>
                )}

                {/* Context & Service */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {adv.context_type === "company" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <Building2 className="w-3 h-3" />
                      {getCashAdvanceContextTypeLabel(locale, adv.context_type)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Calendar className="w-3 h-3" />
                      {getCashAdvanceContextTypeLabel(locale, adv.context_type)}
                      {adv.serviceNumber && (
                        <span dir="ltr" className="font-mono font-bold ms-1">
                          ({adv.serviceNumber})
                        </span>
                      )}
                    </span>
                  )}
                  {adv.serviceTitle && (
                    <span className="text-[11px] text-on-surface-variant truncate max-w-[200px]">
                      {adv.serviceTitle}
                    </span>
                  )}
                </div>

                {/* Purpose */}
                <p className="text-xs text-on-surface line-clamp-2 leading-relaxed">
                  {adv.purpose}
                </p>

                {/* 4-Metric Financial Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/60 text-xs">
                  <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="text-[10px] text-on-surface-variant block">
                      {dictionary.accountability.amountIssued}
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-on-surface">
                      {Number(adv.amount_issued).toFixed(2)} {dictionary.accountability.currency}
                    </span>
                  </div>

                  <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="text-[10px] text-on-surface-variant block">
                      {dictionary.accountability.amountSpent}
                    </span>
                    <span dir="ltr" className="font-mono font-medium text-on-surface">
                      {Number(adv.amount_spent_settled).toFixed(2)}{" "}
                      {dictionary.accountability.currency}
                    </span>
                  </div>

                  <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="text-[10px] text-on-surface-variant block">
                      {dictionary.accountability.amountReturned}
                    </span>
                    <span dir="ltr" className="font-mono font-medium text-on-surface">
                      {Number(adv.amount_returned).toFixed(2)}{" "}
                      {dictionary.accountability.currency}
                    </span>
                  </div>

                  <div className="rounded-lg bg-primary-container/20 border border-primary/20 p-2">
                    <span className="text-[10px] text-primary font-semibold block">
                      {dictionary.accountability.remainingBalance}
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-primary">
                      {Number(adv.remaining_balance).toFixed(2)}{" "}
                      {dictionary.accountability.currency}
                    </span>
                  </div>
                </div>

                {/* Footer: Date & View Details Link */}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 text-xs">
                  <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span dir="ltr">{new Date(adv.requested_at).toLocaleDateString()}</span>
                  </span>

                  <PendingLink
                    href={`/advances/${adv.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>{dictionary.table.columns.viewDetails}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </PendingLink>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table (>= md) */}
          <div className="hidden md:block rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-start">
                      {dictionary.table.columns.advanceNumber}
                    </th>
                    {activeTab === "all" && (
                      <th className="px-4 py-3 text-start">
                        {dictionary.table.columns.recipient}
                      </th>
                    )}
                    <th className="px-4 py-3 text-start">{dictionary.table.columns.date}</th>
                    <th className="px-4 py-3 text-start">{dictionary.table.columns.context}</th>
                    <th className="px-4 py-3 text-start">{dictionary.table.columns.purpose}</th>
                    <th className="px-3 py-3 text-end">{dictionary.table.columns.issued}</th>
                    <th className="px-3 py-3 text-end">{dictionary.table.columns.spent}</th>
                    <th className="px-3 py-3 text-end">{dictionary.table.columns.returned}</th>
                    <th className="px-3 py-3 text-end">{dictionary.table.columns.remaining}</th>
                    <th className="px-4 py-3 text-center">{dictionary.table.columns.status}</th>
                    <th className="px-4 py-3 text-center">{dictionary.table.columns.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredList.map((adv) => (
                    <tr
                      key={adv.id}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      {/* Advance Number */}
                      <td className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">
                        <span dir="ltr">{adv.advance_number}</span>
                      </td>

                      {/* Recipient (broad view) */}
                      {activeTab === "all" && (
                        <td className="px-4 py-3 text-on-surface whitespace-nowrap font-medium">
                          {adv.recipientName || "—"}
                        </td>
                      )}

                      {/* Date */}
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        <span dir="ltr">
                          {new Date(adv.requested_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Context */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {adv.context_type === "company" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {getCashAdvanceContextTypeLabel(locale, adv.context_type)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {getCashAdvanceContextTypeLabel(locale, adv.context_type)}
                            {adv.serviceNumber && (
                              <span dir="ltr" className="font-mono font-semibold ms-1">
                                {adv.serviceNumber}
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Purpose */}
                      <td className="px-4 py-3 text-on-surface max-w-[200px] truncate" title={adv.purpose}>
                        {adv.purpose}
                      </td>

                      {/* Issued */}
                      <td className="px-3 py-3 font-mono text-end whitespace-nowrap text-on-surface">
                        <span dir="ltr">{Number(adv.amount_issued).toFixed(2)}</span>
                      </td>

                      {/* Spent */}
                      <td className="px-3 py-3 font-mono text-end whitespace-nowrap text-on-surface-variant">
                        <span dir="ltr">{Number(adv.amount_spent_settled).toFixed(2)}</span>
                      </td>

                      {/* Returned */}
                      <td className="px-3 py-3 font-mono text-end whitespace-nowrap text-on-surface-variant">
                        <span dir="ltr">{Number(adv.amount_returned).toFixed(2)}</span>
                      </td>

                      {/* Remaining */}
                      <td className="px-3 py-3 font-mono font-bold text-end whitespace-nowrap text-primary">
                        <span dir="ltr">{Number(adv.remaining_balance).toFixed(2)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadgeClass(
                            adv.status,
                          )}`}
                        >
                          {getCashAdvanceStatusLabel(locale, adv.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <PendingLink
                          href={`/advances/${adv.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-surface-container transition-colors"
                        >
                          <span>{dictionary.table.columns.viewDetails}</span>
                          {isRtl ? (
                            <ArrowLeft className="w-3 h-3" />
                          ) : (
                            <ArrowRight className="w-3 h-3" />
                          )}
                        </PendingLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Self-Service Request Modal */}
      {canSubmitOwn && (
        <CashAdvanceRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          eligibleServices={eligibleServices}
          onSuccessNotice={(msg) => setNotice(msg)}
          dictionary={dictionary}
        />
      )}
    </div>
  );
}
