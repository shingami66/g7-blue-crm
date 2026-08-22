import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomer360 } from "@/lib/customer-360/queries";
import Customer360Workspace from "./Customer360Workspace";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import {
  getCustomerStatusLabel,
  getCustomersDictionary,
  type CustomersDictionary,
} from "@/lib/i18n/dictionaries/customers";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import type { Customer } from "@/types/customer";
import CustomerProfileActions from "./CustomerProfileActions";
import { getCustomer360Dictionary } from "@/lib/i18n/dictionaries/customer-360";
import RecordNavigationSlot from "@/components/records/RecordNavigationSlot";
import { RecordNavigationPlaceholder } from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getCustomerRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getCustomersDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/customers");
  let workspace: Awaited<ReturnType<typeof getCustomer360>>;
  let canWrite = false;

  try {
    workspace = await getCustomer360(id);
    if (workspace.status === "not_found") {
      notFound();
    }
    if (workspace.status === "error") {
      return renderLoadError(
        new Error(workspace.error),
        dictionary.states.customerForbidden,
        dictionary.states.customerLoadError,
        sharedStates.accessDenied.title,
        sharedStates.genericError.title,
      );
    }
    canWrite = await checkPermission("customers:write");
  } catch (error) {
    return renderLoadError(
      error,
      dictionary.states.customerForbidden,
      dictionary.states.customerLoadError,
      sharedStates.accessDenied.title,
      sharedStates.genericError.title,
    );
  }

  if (workspace.status !== "ready") {
    notFound();
  }

  if (workspace.data.services.status === "forbidden") {
    return renderLoadError(
      new Error("services_forbidden"),
      dictionary.states.customerServicesForbidden,
      dictionary.states.relatedServicesLoadError,
      sharedStates.accessDenied.title,
      sharedStates.genericError.title,
    );
  }
  if (workspace.data.services.status === "error") {
    return renderLoadError(
      new Error("services_load_failed"),
      dictionary.states.customerServicesForbidden,
      dictionary.states.relatedServicesLoadError,
      sharedStates.accessDenied.title,
      sharedStates.genericError.title,
    );
  }

  const { customer } = workspace.data;
  const customer360Dictionary = getCustomer360Dictionary(locale);
  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <PendingLink
            href={returnTo}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={dictionary.profile.backToCustomers}
          >
            <LocaleBackIcon size={16} />
          </PendingLink>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary">
                <span dir="auto">{formatNullable(customer.company)}</span>
              </h2>
              <StatusBadge variant={customer.status}>
                {getCustomerStatusLabel(locale, customer.status)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
              {dictionary.profile.customerNumber}: <span dir="ltr">{formatNullable(customer.customerNumber)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Suspense
            fallback={
              <RecordNavigationPlaceholder
                recordType={dictionary.profile.customerNumber}
                dictionary={recordNavigationDictionary}
                state="loading"
              />
            }
          >
            <RecordNavigationSlot
              loadNavigation={() => getCustomerRecordNavigation(id, customer.customerNumber)}
              basePath="/customers"
              recordType={dictionary.profile.customerNumber}
              dictionary={recordNavigationDictionary}
              returnTo={returnTo}
              pendingLabel={dictionary.list.actions.opening}
            />
          </Suspense>
          <CustomerProfileActions customer={customer} canWrite={canWrite} dictionary={dictionary} />
        </div>
      </div>

      <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
          <h3 className="font-semibold text-primary">{dictionary.profile.customerProfile}</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem label={dictionary.profile.customerNumber}>
            <span dir="ltr">{formatNullable(customer.customerNumber)}</span>
          </DetailItem>
          <DetailItem label={dictionary.list.table.company}>
            <span dir="auto">{formatNullable(customer.company)}</span>
          </DetailItem>
          <DetailItem label={dictionary.profile.primaryContact}>
            <span dir="auto">{formatNullable(customer.contact)}</span>
          </DetailItem>
          <DetailItem label={dictionary.list.report.columns.city}>
            <span dir="auto" className="inline-flex items-center gap-2">
              <MapPin size={16} className="text-on-surface-variant" />
              {formatNullable(customer.city)}
            </span>
          </DetailItem>
          <DetailItem label={dictionary.list.report.columns.email}>
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                dir="ltr"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail size={16} />
                {customer.email}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label={dictionary.list.report.columns.phone}>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                dir="ltr"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Phone size={16} />
                {customer.phone}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label={dictionary.list.table.status}>
            {getCustomerStatusLabel(locale, customer.status)}
          </DetailItem>
          <DetailItem label={dictionary.profile.servicesCount}>
            <span dir="ltr" className="tabular-nums">
              {formatUiNumber(locale, customer.servicesCount)}
            </span>
          </DetailItem>
          <DetailItem label={dictionary.profile.totalQuotedAmount}>
            <span dir="ltr" className="tabular-nums">
              {customer.totalQuotedAmount !== undefined && customer.totalQuotedAmount !== null
                ? formatSarAmount(locale, customer.totalQuotedAmount)
                : "—"}
            </span>
          </DetailItem>
        </dl>
      </section>

      <OfficialBillingDetails customer={customer} dictionary={dictionary} />

      <Customer360Workspace
        data={workspace.data}
        locale={locale}
        dictionary={customer360Dictionary}
        returnTo={returnTo}
      />

    </div>
  );
}
function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-on-surface font-medium">{children}</dd>
    </div>
  );
}

function OfficialBillingDetails({
  customer,
  dictionary,
}: {
  customer: Customer;
  dictionary: CustomersDictionary;
}) {
  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">{dictionary.profile.officialBillingDetails}</h3>
      </div>
      {customer.customerType === "individual" ? (
        <div className="p-6 space-y-3">
          <dl>
            <DetailItem label={dictionary.form.officialBilling.customerType}>
              {dictionary.customerTypes.individual}
            </DetailItem>
          </dl>
          <p className="text-[14px] leading-[20px] text-on-surface-variant">
            {dictionary.form.officialBilling.individualHint}
          </p>
        </div>
      ) : (
        <dl className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem label={dictionary.form.officialBilling.customerType}>
            {formatCustomerType(customer.customerType, dictionary)}
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.legalName}>
            <span dir="auto">{formatNullable(customer.legalName)}</span>
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.crNumber}>
            <span dir="ltr">{formatNullable(customer.commercialRegistrationNumber)}</span>
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.vatNumber}>
            <span dir="ltr">{formatNullable(customer.vatNumber)}</span>
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.billingEmail}>
            {customer.billingEmail ? (
              <a
                href={`mailto:${customer.billingEmail}`}
                dir="ltr"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail size={16} />
                {customer.billingEmail}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.financeContactName}>
            {formatFinanceContact(customer)}
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.paymentTerms}>
            <span dir="auto">{formatNullable(customer.paymentTerms)}</span>
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.poRequired}>
            {customer.poRequired ? dictionary.booleans.yes : dictionary.booleans.no}
          </DetailItem>
          <DetailItem label={dictionary.form.officialBilling.nationalAddress}>
            {formatNationalAddress(customer)}
          </DetailItem>
        </dl>
      )}
    </section>
  );
}

function renderLoadError(
  error: unknown,
  forbiddenMessage: string,
  genericMessage: string,
  accessDeniedTitle: string,
  genericErrorTitle: string,
) {
  if (error instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (error instanceof ForbiddenError) {
    return (
      <SharedAuthenticatedStatePanel
        title={accessDeniedTitle}
        message={forbiddenMessage}
      />
    );
  }

  return (
    <SharedAuthenticatedStatePanel
      title={genericErrorTitle}
      message={genericMessage}
      role="alert"
    />
  );
}

function formatNullable(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

function formatCustomerType(
  customerType: Customer["customerType"],
  dictionary: CustomersDictionary
) {
  if (!customerType) return "—";

  return dictionary.customerTypes[customerType];
}

function formatFinanceContact(customer: Customer) {
  if (!customer.financeContactName && !customer.financeContactPhone) {
    return "—";
  }

  return (
    <span dir="auto">
      {customer.financeContactName}
      {customer.financeContactName && customer.financeContactPhone ? " / " : null}
      {customer.financeContactPhone ? <span dir="ltr">{customer.financeContactPhone}</span> : null}
    </span>
  );
}

function formatNationalAddress(customer: Customer) {
  const parts = [
    customer.nationalAddressBuildingNumber,
    customer.nationalAddressStreet,
    customer.nationalAddressDistrict,
    customer.nationalAddressCity,
    customer.nationalAddressPostalCode,
    customer.nationalAddressAdditionalNumber,
    customer.nationalAddressCountry,
  ].filter(Boolean);

  return parts.length > 0 ? <span dir="auto">{parts.join(", ")}</span> : "—";
}
