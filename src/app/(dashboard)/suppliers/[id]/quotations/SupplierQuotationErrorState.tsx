import type { Locale } from "@/lib/i18n/locales";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageLocation from "@/components/navigation/PageLocation";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";

type SupplierQuotationErrorStateProps = {
  frameVariant: "form" | "record";
  locale: Locale;
  pageTitle: string;
  errorTitle: string;
  message: string;
  role: "alert" | "status";
  returnHref: string;
  returnLabel: string;
};

export default function SupplierQuotationErrorState({
  frameVariant,
  locale,
  pageTitle,
  errorTitle,
  message,
  role,
  returnHref,
  returnLabel,
}: SupplierQuotationErrorStateProps) {
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageFrame variant={frameVariant}>
        <PageLocation
          returnControl={(
            <RecordBackButton
              href={returnHref}
              locale={locale}
              label={returnLabel}
              variant="labeled"
            />
          )}
        />
        <PageHeader variant="composed" title={pageTitle} titleDir="auto" />
        <section
          role={role}
          aria-labelledby="supplier-quotation-error-heading"
          className="min-w-0 w-full max-w-3xl rounded-lg border border-surface-variant bg-surface-container-lowest p-5 sm:p-6"
        >
          <h2
            id="supplier-quotation-error-heading"
            className="break-words text-[16px] font-semibold text-primary"
          >
            {errorTitle}
          </h2>
          <p className="mt-2 min-w-0 break-words text-[14px] leading-5 text-on-surface-variant">
            {message}
          </p>
        </section>
      </PageFrame>
    </div>
  );
}
