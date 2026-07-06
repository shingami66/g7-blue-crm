import { notFound, redirect } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomerById } from "@/lib/customers/queries";
import { getServicesByCustomerId } from "@/lib/services/queries";
import { getLocale } from "@/lib/i18n/locales";
import {
  getCustomersDictionary,
  type CustomersDictionary,
} from "@/lib/i18n/dictionaries/customers";
import type { Customer } from "@/types/customer";
import type { Service } from "@/types/service";
import CustomerProfileActions from "./CustomerProfileActions";

export const dynamic = "force-dynamic";

const SERVICE_STATUS_VARIANT_MAP = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const satisfies Record<Service["status"], ComponentProps<typeof StatusBadge>["variant"]>;

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = getLocale();
  const dictionary = getCustomersDictionary(locale);
  const { id } = await params;
  let customer: Customer | null = null;
  let canWrite = false;

  try {
    await requirePermission("customers:read");
    customer = await getCustomerById(id);
    canWrite = await checkPermission("customers:write");
  } catch (error) {
    return renderLoadError(
      error,
      dictionary.states.customerForbidden,
      dictionary.states.customerLoadError,
      dictionary
    );
  }

  if (!customer) {
    notFound();
  }

  let services: Service[] = [];

  try {
    await requirePermission("services:read");
    services = await getServicesByCustomerId(customer.id);
  } catch (error) {
    return renderLoadError(
      error,
      dictionary.states.customerServicesForbidden,
      dictionary.states.relatedServicesLoadError,
      dictionary
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <PendingLink
            href="/customers"
            className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
            aria-label={dictionary.profile.backToCustomers}
          >
            <ArrowLeft size={18} />
          </PendingLink>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary">
                {formatNullable(customer.company)}
              </h2>
              <StatusBadge variant={customer.status}>
                {dictionary.customerStatuses[customer.status]}
              </StatusBadge>
            </div>
            <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
              {dictionary.profile.customerNumber}: <span dir="ltr">{formatNullable(customer.customerNumber)}</span>
            </p>
          </div>
        </div>
        <CustomerProfileActions customer={customer} canWrite={canWrite} dictionary={dictionary} />
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
            {formatNullable(customer.company)}
          </DetailItem>
          <DetailItem label={dictionary.profile.primaryContact}>
            {formatNullable(customer.contact)}
          </DetailItem>
          <DetailItem label={dictionary.list.report.columns.city}>
            <span className="inline-flex items-center gap-2">
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
            {dictionary.customerStatuses[customer.status]}
          </DetailItem>
          <DetailItem label={dictionary.profile.servicesCount}>
            {formatNullable(customer.servicesCount)}
          </DetailItem>
          <DetailItem label={dictionary.profile.totalQuotedAmount}>
            <span dir="ltr">
              {customer.totalQuotedAmount !== undefined && customer.totalQuotedAmount !== null
                ? `SAR ${customer.totalQuotedAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                : "—"}
            </span>
          </DetailItem>
        </dl>
      </section>

      <OfficialBillingDetails customer={customer} dictionary={dictionary} />

      <section>
        <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold text-primary">{dictionary.profile.relatedServices}</h3>
            <p className="text-[14px] leading-[20px] text-on-surface-variant">
              {dictionary.profile.relatedServicesSubtitle}
            </p>
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant">
            {dictionary.profile.totalServices}: <span dir="ltr">{services.length}</span>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-xl">
            <p className="text-on-surface-variant text-[14px] leading-[20px]">
              {dictionary.states.noRelatedServices}
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              dictionary.profile.serviceTable.serviceNumber,
              dictionary.profile.serviceTable.serviceTitle,
              dictionary.profile.serviceTable.eventDate,
              dictionary.profile.serviceTable.status,
              dictionary.profile.serviceTable.budget,
            ]}
          >
            {services.map((service) => (
              <tr
                key={service.id}
                className="hover:bg-surface-container-low/50 transition-colors"
              >
                <td dir="ltr" className="px-4 py-4 font-mono font-semibold">
                  <PendingLink
                    href={`/services/${service.id}`}
                    className="text-primary hover:underline"
                  >
                    {formatNullable(service.serviceNumber)}
                  </PendingLink>
                </td>
                <td className="px-4 py-4">
                  <PendingLink
                    href={`/services/${service.id}`}
                    className="font-semibold text-on-surface hover:text-primary hover:underline"
                  >
                    {formatNullable(service.serviceTitle)}
                  </PendingLink>
                  <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                    {formatNullable(service.eventName)}
                  </div>
                </td>
                <td dir="ltr" className="px-4 py-4 text-on-surface-variant">
                  {formatEventDate(service)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge variant={SERVICE_STATUS_VARIANT_MAP[service.status]}>
                    {service.status}
                  </StatusBadge>
                </td>
                <td dir="ltr" className="px-4 py-4 font-semibold text-on-surface">
                  {service.estimatedBudget != null
                    ? `${Number(service.estimatedBudget).toLocaleString("en-SA")} SAR`
                    : "—"}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
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
            {formatNullable(customer.legalName)}
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
            {formatNullable(customer.paymentTerms)}
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

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function renderLoadError(
  error: unknown,
  forbiddenMessage: string,
  genericMessage: string,
  dictionary: CustomersDictionary
) {
  if (error instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (error instanceof ForbiddenError) {
    return <ErrorState title={dictionary.states.accessDenied} message={forbiddenMessage} />;
  }

  return <ErrorState title={dictionary.states.genericError} message={genericMessage} />;
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
  const parts = [customer.financeContactName, customer.financeContactPhone].filter(Boolean);

  return parts.length > 0 ? <span dir="ltr">{parts.join(" / ")}</span> : "—";
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

  return parts.length > 0 ? parts.join(", ") : "—";
}

function formatEventDate(service: Service) {
  if (service.eventStartDate && service.eventEndDate) {
    return `${service.eventStartDate} - ${service.eventEndDate}`;
  }

  return service.eventStartDate || service.eventEndDate || "—";
}
