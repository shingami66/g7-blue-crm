"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  BriefcaseBusiness,
  ShieldAlert,
  ChevronDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import PendingLink from "@/components/ui/PendingLink";
import {
  navigationDictionaryAr,
  navigationDictionaryEn,
  type NavigationDictionary,
} from "@/lib/i18n/dictionaries/navigation";

export type NavSectionKey =
  | "customersAndSales"
  | "operations"
  | "suppliersAndProcurement"
  | "billingAndPayments"
  | "expensesAndCosting"
  | "administration";

interface NavChildItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  key: NavSectionKey;
  title: string;
  icon: LucideIcon;
  children: NavChildItem[];
}

export function getSectionForPathname(pathname: string): NavSectionKey | null {
  if (pathname === "/dashboard" || pathname === "/reports") return null;
  if (
    pathname === "/customers" ||
    pathname.startsWith("/customers/") ||
    pathname === "/quotations" ||
    pathname.startsWith("/quotations/")
  ) {
    return "customersAndSales";
  }
  if (pathname === "/services" || pathname.startsWith("/services/")) {
    return "operations";
  }
  if (pathname === "/suppliers" || pathname.startsWith("/suppliers/")) {
    return "suppliersAndProcurement";
  }
  if (
    pathname === "/invoices" ||
    pathname.startsWith("/invoices/") ||
    pathname === "/payments" ||
    pathname.startsWith("/payments/")
  ) {
    return "billingAndPayments";
  }
  if (pathname === "/expenses" || pathname.startsWith("/expenses/")) {
    return "expensesAndCosting";
  }
  if (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return "administration";
  }
  return null;
}

export function isRouteActive(currentPathname: string, targetHref: string): boolean {
  if (targetHref === "/dashboard") {
    return currentPathname === "/dashboard";
  }
  return currentPathname === targetHref || currentPathname.startsWith(`${targetHref}/`);
}

export default function Sidebar({
  isAdmin = false,
  shellDirection = "ltr",
  currentPathname,
}: {
  isAdmin?: boolean;
  shellDirection?: "ltr" | "rtl";
  currentPathname?: string;
}) {
  const locale = useLocale();
  const dictionary: NavigationDictionary =
    locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn;
  const routerPathname = usePathname();
  const pathname = currentPathname ?? routerPathname;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<NavSectionKey | null>(() =>
    getSectionForPathname(pathname),
  );
  const lastPathnameRef = useRef(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const isRtl = shellDirection === "rtl";

  if (lastPathnameRef.current !== pathname) {
    lastPathnameRef.current = pathname;
    setExpandedSection(getSectionForPathname(pathname));
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !mobileOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  const toggleSection = (key: NavSectionKey) => {
    setExpandedSection((current) => (current === key ? null : key));
  };

  const sections: NavSection[] = [
    {
      key: "customersAndSales",
      title: dictionary.sections.customersAndSales,
      icon: Users,
      children: [
        {
          key: "customers",
          label: dictionary.modules.customers,
          href: "/customers",
          icon: Users,
        },
        {
          key: "quotations",
          label: dictionary.modules.quotations,
          href: "/quotations",
          icon: FileText,
        },
      ],
    },
    {
      key: "operations",
      title: dictionary.sections.operations,
      icon: BriefcaseBusiness,
      children: [
        {
          key: "services",
          label: dictionary.modules.services,
          href: "/services",
          icon: BriefcaseBusiness,
        },
      ],
    },
    {
      key: "suppliersAndProcurement",
      title: dictionary.sections.suppliersAndProcurement,
      icon: Package,
      children: [
        {
          key: "suppliers",
          label: dictionary.modules.suppliers,
          href: "/suppliers",
          icon: Package,
        },
      ],
    },
    {
      key: "billingAndPayments",
      title: dictionary.sections.billingAndPayments,
      icon: Receipt,
      children: [
        {
          key: "invoices",
          label: dictionary.modules.invoices,
          href: "/invoices",
          icon: Receipt,
        },
        {
          key: "payments",
          label: dictionary.modules.payments,
          href: "/payments",
          icon: CreditCard,
        },
      ],
    },
    {
      key: "expensesAndCosting",
      title: dictionary.sections.expensesAndCosting,
      icon: Wallet,
      children: [
        {
          key: "expenses",
          label: dictionary.modules.expenses,
          href: "/expenses",
          icon: Wallet,
        },
      ],
    },
  ];

  const adminSection: NavSection = {
    key: "administration",
    title: dictionary.sections.administration,
    icon: Settings,
    children: [
      {
        key: "settings",
        label: dictionary.modules.settings,
        href: "/settings",
        icon: Settings,
      },
      ...(isAdmin
        ? [
            {
              key: "users",
              label: dictionary.modules.users,
              href: "/admin/users",
              icon: ShieldAlert,
            },
          ]
        : []),
    ],
  };

  const renderSection = (section: NavSection) => {
    const isExpanded = expandedSection === section.key;
    const hasActiveChild = section.children.some((child) =>
      isRouteActive(pathname, child.href),
    );
    const SectionIcon = section.icon;

    return (
      <div key={section.key} className="flex flex-col">
        <button
          type="button"
          id={`nav-section-trigger-${section.key}`}
          aria-expanded={isExpanded}
          aria-controls={`nav-section-content-${section.key}`}
          onClick={() => toggleSection(section.key)}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-start w-full ${
            isExpanded || hasActiveChild
              ? "text-white bg-on-primary-fixed-variant/5"
              : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <SectionIcon
              size={20}
              className={isExpanded || hasActiveChild ? "opacity-100" : "opacity-70"}
              aria-hidden="true"
            />
            <span className="truncate">{section.title}</span>
          </div>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-200 ${
              isExpanded ? "rotate-180 text-white opacity-100" : "text-white/60 opacity-60"
            }`}
          />
        </button>

        <div
          id={`nav-section-content-${section.key}`}
          role="region"
          aria-labelledby={`nav-section-trigger-${section.key}`}
          hidden={!isExpanded}
          className={
            !isExpanded
              ? "hidden"
              : `flex flex-col gap-1 mt-1 ${isRtl ? "pr-4 pl-0" : "pl-4 pr-0"}`
          }
        >
          {section.children.map((child) => {
            const active = isRouteActive(pathname, child.href);
            const ChildIcon = child.icon;
            return (
              <PendingLink
                key={child.href}
                href={child.href}
                pendingLabel={child.label}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.03em] ${
                  active
                    ? `${isRtl ? "border-r-2" : "border-l-2"} border-tertiary-fixed text-white bg-on-primary-fixed-variant/10 font-semibold`
                    : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5 font-medium"
                }`}
              >
                <ChildIcon
                  size={16}
                  className={active ? "opacity-100" : "opacity-70"}
                  aria-hidden="true"
                />
                <span className="truncate">{child.label}</span>
              </PendingLink>
            );
          })}
        </div>
      </div>
    );
  };

  const navContent = (
    <>
      {/* Brand */}
      <div className="mb-5 flex justify-center">
        <style>{`
          @keyframes g7-brand-ring {
            0% {
              transform: rotate(0deg);
            }
            12.5%, 100% {
              transform: rotate(360deg);
            }
          }
          .g7-brand-ring {
            animation: g7-brand-ring 8s ease-in-out infinite;
            transform-origin: center;
          }
          @media (prefers-reduced-motion: reduce) {
            .g7-brand-ring {
              animation: none;
            }
          }
        `}</style>
        <div
          aria-label="G7 BLUE"
          className="relative flex h-14 w-14 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="g7-brand-ring absolute inset-0 rounded-full border border-primary-fixed-dim/50 border-l-transparent"
          />
          <div className="relative z-10 text-center">
            <div className="text-[1.75rem] font-bold leading-none tracking-[-0.08em] text-white">
              G7
            </div>
            <div className="mt-0.5 pl-[0.3em] text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-primary-fixed-dim">
              BLUE
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {/* Dashboard Standalone Link */}
        {(() => {
          const active = isRouteActive(pathname, "/dashboard");
          return (
            <PendingLink
              href="/dashboard"
              pendingLabel={dictionary.modules.dashboard}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.05em] font-semibold ${
                active
                  ? `${isRtl ? "border-r-2" : "border-l-2"} border-tertiary-fixed text-white bg-on-primary-fixed-variant/10`
                  : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5"
              }`}
            >
              <LayoutDashboard
                size={20}
                className={active ? "opacity-100" : "opacity-70"}
                aria-hidden="true"
              />
              <span>{dictionary.modules.dashboard}</span>
            </PendingLink>
          );
        })()}

        {/* Functional Domain Accordions */}
        {sections.map(renderSection)}

        {/* Reports Standalone Link */}
        {(() => {
          const active = isRouteActive(pathname, "/reports");
          return (
            <PendingLink
              href="/reports"
              pendingLabel={dictionary.modules.reports}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.05em] font-semibold ${
                active
                  ? `${isRtl ? "border-r-2" : "border-l-2"} border-tertiary-fixed text-white bg-on-primary-fixed-variant/10`
                  : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5"
              }`}
            >
              <BarChart3
                size={20}
                className={active ? "opacity-100" : "opacity-70"}
                aria-hidden="true"
              />
              <span>{dictionary.modules.reports}</span>
            </PendingLink>
          );
        })()}

        {/* Administration Accordion at Bottom */}
        <div className="mt-auto pt-4 border-t border-white/10">
          {renderSection(adminSection)}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar-nav"
        aria-label={mobileOpen ? dictionary.menu.close : dictionary.menu.open}
        className={`fixed top-4 z-[60] rounded-lg bg-primary p-2 text-white md:hidden ${
          isRtl ? "right-4" : "left-4"
        }`}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        id="mobile-sidebar-nav"
        aria-label={dictionary.menu.mainNavigation}
        className={`fixed top-0 z-50 flex h-full w-[260px] flex-col bg-primary px-4 py-6 transition-transform duration-300 ${
          isRtl ? "right-0" : "left-0"
        } ${
          mobileOpen
            ? "visible translate-x-0"
            : `invisible md:visible ${isRtl ? "translate-x-full" : "-translate-x-full"}`
        } md:translate-x-0`}
        dir={shellDirection}
      >
        {navContent}
      </nav>
    </>
  );
}
