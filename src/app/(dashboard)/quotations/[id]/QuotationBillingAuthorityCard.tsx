import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import type { QuotationBillingAuthorityViewModel } from "@/lib/quotations/billing-authority";

export default function QuotationBillingAuthorityCard({
  authority,
  dictionary,
}: {
  authority: QuotationBillingAuthorityViewModel;
  dictionary: QuotationsDictionary;
}) {
  const copy = dictionary.detail.billingAuthority;
  const showsLiveAuthority =
    authority.authorityMode === "active_abs" ||
    authority.authorityMode === "legacy_quotation";
  const title =
    authority.authorityMode === "active_abs"
      ? copy.activeAbsTitle
      : authority.authorityMode === "historical_abs_only"
        ? copy.historicalTitle
        : authority.authorityMode === "legacy_quotation"
          ? copy.legacyTitle
          : authority.authorityMode === "no_authority"
            ? copy.noAuthorityTitle
            : copy.unavailableTitle;
  const notice =
    authority.authorityMode === "active_abs"
      ? copy.activeAbsNotice
      : authority.authorityMode === "historical_abs_only"
        ? copy.historicalNotice
        : authority.authorityMode === "legacy_quotation"
          ? copy.legacyNotice
          : authority.authorityMode === "no_authority"
            ? copy.noAuthorityNotice
            : copy.unavailableNotice;
  const formatMoney = (amount: number | null) =>
    amount == null
      ? copy.amountUnavailable
      : formatSarAmount(dictionary.locale, amount);

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">
          {dictionary.detail.sections.billingAuthority}
        </h3>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div>
          <div className="text-[14px] font-semibold text-on-surface">
            {title}
          </div>
          <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
            {notice}
          </p>
          {!authority.isCurrentQuotationAuthoritySource &&
          authority.authorityMode !== "unavailable" ? (
            <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
              {copy.differentQuotationNotice}
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyDetail
            label={copy.sourceQuotationTotal}
            value={formatMoney(authority.sourceQuotationTotal)}
          />
          {showsLiveAuthority ? (
            <>
              <MoneyDetail
                label={copy.billingCeiling}
                value={formatMoney(authority.billingCeiling)}
              />
              <MoneyDetail
                label={copy.invoiceExposure}
                value={formatMoney(authority.invoiceExposure)}
              />
              <MoneyDetail
                label={copy.remainingBillable}
                value={formatMoney(authority.remainingBillable)}
                note={authority.fullyAllocated ? copy.fullyAllocated : null}
              />
            </>
          ) : null}
        </dl>

        {authority.serviceBillingHref ? (
          <Link
            href={authority.serviceBillingHref}
            className="inline-flex w-fit items-center gap-2 text-[14px] font-semibold text-primary hover:underline"
          >
            {copy.openServiceBilling}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function MoneyDetail({
  label,
  value,
  note = null,
}: {
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface p-3">
      <dt className="text-[12px] text-on-surface-variant">{label}</dt>
      <dd dir="ltr" className="mt-1 font-medium tabular-nums text-on-surface">
        {value}
      </dd>
      {note ? (
        <div className="mt-1 text-[12px] font-medium text-on-surface-variant">
          {note}
        </div>
      ) : null}
    </div>
  );
}
