import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomerById } from "@/lib/customers/queries";
import { getServicesByCustomerId } from "@/lib/services/queries";
import type { Customer } from "@/types/customer";
import type { Service } from "@/types/service";

export const dynamic = "force-dynamic";

const SERVICE_STATUS_VARIANT_MAP = {
  "Inquiry": "inquiry",
  "Quoted": "quoted",
  "Approved": "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  "Completed": "completed",
  "Cancelled": "cancelled",
} as const satisfies Record<Service["status"], ComponentProps<typeof StatusBadge>["variant"]>;

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let customer: Customer | null = null;

  try {
    await requirePermission("customers:read");
    customer = await getCustomerById(id);
  } catch (error) {
    return renderLoadError(
      error,
      "You do not have permission to view customers.",
      "We couldn't load the customer at this time. Please try again later."
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
      "You do not have permission to view services for this customer.",
      "We couldn't load the related services at this time. Please try again later."
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/customers"
            className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
            aria-label="Back to customers"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary">
                {formatNullable(customer.company)}
              </h2>
              <StatusBadge variant={customer.status}>
                {formatCustomerStatus(customer.status)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
              Customer ID: {formatNullable(customer.id)}
            </p>
          </div>
        </div>
      </div>

      <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
          <h3 className="font-semibold text-primary">Customer Profile</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem label="Company">
            {formatNullable(customer.company)}
          </DetailItem>
          <DetailItem label="Primary Contact">
            {formatNullable(customer.contact)}
          </DetailItem>
          <DetailItem label="City">
            <span className="inline-flex items-center gap-2">
              <MapPin size={16} className="text-on-surface-variant" />
              {formatNullable(customer.city)}
            </span>
          </DetailItem>
          <DetailItem label="Email">
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail size={16} />
                {customer.email}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label="Phone">
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Phone size={16} />
                {customer.phone}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label="Status">
            {formatCustomerStatus(customer.status)}
          </DetailItem>
          <DetailItem label="Projects">
            {formatNullable(customer.projects)}
          </DetailItem>
          <DetailItem label="Revenue">
            {formatNullable(customer.revenue)}
          </DetailItem>
        </dl>
      </section>

      <section>
        <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold text-primary">Related Services</h3>
            <p className="text-[14px] leading-[20px] text-on-surface-variant">
              Services linked to this customer.
            </p>
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant">
            {services.length} {services.length === 1 ? "service" : "services"}
          </div>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-xl">
            <p className="text-on-surface-variant text-[14px] leading-[20px]">
              No services are linked to this customer yet.
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              "Service Number",
              "Service Title / Event Name",
              "Event Date",
              "Status",
              "Budget",
            ]}
          >
            {services.map((service) => (
              <tr
                key={service.id}
                className="hover:bg-surface-container-low/50 transition-colors"
              >
                <td className="px-4 py-4 font-mono font-semibold">
                  <Link
                    href={`/services/${service.id}`}
                    className="text-primary hover:underline"
                  >
                    {formatNullable(service.serviceNumber)}
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/services/${service.id}`}
                    className="font-semibold text-on-surface hover:text-primary hover:underline"
                  >
                    {formatNullable(service.serviceTitle)}
                  </Link>
                  <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                    {formatNullable(service.eventName)}
                  </div>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {formatEventDate(service)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge variant={SERVICE_STATUS_VARIANT_MAP[service.status]}>
                    {service.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-4 font-semibold text-on-surface">
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

function renderLoadError(error: unknown, forbiddenMessage: string, genericMessage: string) {
  if (error instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (error instanceof ForbiddenError) {
    return <ErrorState title="Access Denied" message={forbiddenMessage} />;
  }

  return <ErrorState title="Something went wrong" message={genericMessage} />;
}

function formatNullable(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

function formatCustomerStatus(status: Customer["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatEventDate(service: Service) {
  if (service.eventStartDate && service.eventEndDate) {
    return `${service.eventStartDate} - ${service.eventEndDate}`;
  }

  return service.eventStartDate || service.eventEndDate || "—";
}
