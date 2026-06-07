import {
  Users,
  FileText,
  Receipt,
  FolderKanban,
  DollarSign,
  CreditCard,
  UserPlus,
  FilePlus,
  ReceiptText,
  FolderPlus,
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";

const recentQuotations = [
  { client: "Saudi Aramco Events", value: "SAR 125,000", status: "pending" as const },
  { client: "Riyadh Season Setup", value: "SAR 850,000", status: "approved" as const },
  { client: "Jeddah Corniche Logistics", value: "SAR 45,000", status: "rejected" as const },
  { client: "NEOM Phase 1 Transport", value: "SAR 2,100,000", status: "pending" as const },
];

const upcomingProjects = [
  { name: "Logistics Hub Alpha", date: "Oct 15, 2023", manager: "A. Rahman" },
  { name: "Expo 2030 Prep", date: "Nov 01, 2023", manager: "S. Ahmed" },
  { name: "Red Sea Resupply", date: "Nov 20, 2023", manager: "F. Khalid" },
  { name: "VIP Convoy Sec.", date: "Dec 05, 2023", manager: "M. Hassan" },
];

export default function DashboardPage() {
  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-[28px] leading-[36px] tracking-[-0.01em] font-semibold text-primary">
          Executive Dashboard
        </h2>
        <p className="text-[14px] leading-[20px] text-on-surface-variant mt-2">
          Welcome back. Here is your overview for today.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* KPI Cards */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Total Customers"
            value="1,248"
            trend="up"
            trendLabel="+12% this month"
            icon={Users}
          />
          <KpiCard
            label="Active Quotations"
            value="342"
            trend="up"
            trendLabel="+5% this week"
            icon={FileText}
          />
          <KpiCard
            label="Pending Invoices"
            value="89"
            trend="down"
            trendLabel="-2% this week"
            icon={Receipt}
          />
          <KpiCard
            label="Active Projects"
            value="56"
            trend="flat"
            trendLabel="Steady"
            icon={FolderKanban}
          />
          <KpiCard
            label="Monthly Revenue"
            value="SAR 2.4M"
            trend="up"
            trendLabel="+18% vs last month"
            icon={DollarSign}
          />
          <KpiCard
            label="Pending Payments"
            value="SAR 450K"
            trend="warning"
            trendLabel="Requires attention"
            icon={CreditCard}
          />
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl border border-surface-variant p-8 flex flex-col">
          <h3 className="text-[20px] leading-[28px] font-semibold text-primary border-b border-surface-variant pb-2 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-4 flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <UserPlus size={18} />
              New Customer
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <FilePlus size={18} />
              New Quotation
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <ReceiptText size={18} />
              New Invoice
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <FolderPlus size={18} />
              New Project
            </button>
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-variant flex justify-between items-center">
            <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
              Recent Quotations
            </h3>
            <Link
              href="/quotations"
              className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Client
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Value
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {recentQuotations.map((q, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface">{q.client}</td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {q.value}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge variant={q.status}>
                        {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Projects */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-variant flex justify-between items-center">
            <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
              Upcoming Projects
            </h3>
            <Link
              href="/projects"
              className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Project Name
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Start Date
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Manager
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {upcomingProjects.map((p, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface font-medium">
                      {p.name}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {p.date}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {p.manager}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
