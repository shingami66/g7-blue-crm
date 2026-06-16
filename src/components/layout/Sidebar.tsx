"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  FolderKanban,
  Package,
  CreditCard,
  Settings,
  Menu,
  X,
  BriefcaseBusiness,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Services", href: "/services", icon: BriefcaseBusiness },
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Suppliers", href: "/suppliers", icon: Package },
  { label: "Payments", href: "/payments", icon: CreditCard },
];

const bottomItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      {/* Brand */}
      <div className="mb-8 px-4">
        <h1 className="text-[36px] leading-[44px] tracking-[-0.02em] font-bold text-white">
          G7 BLUE
        </h1>
        <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-white/70 mt-1">
          Enterprise CRM
        </p>
      </div>

      {/* Main Nav */}
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.05em] font-semibold ${
                active
                  ? "border-l-2 border-tertiary-fixed text-white bg-on-primary-fixed-variant/10"
                  : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5"
              }`}
            >
              <Icon size={20} className={active ? "opacity-100" : "opacity-70"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="mt-auto">
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[12px] leading-[16px] tracking-[0.05em] font-semibold ${
                active
                  ? "border-l-2 border-tertiary-fixed text-white bg-on-primary-fixed-variant/10"
                  : "text-white/70 hover:text-white hover:bg-on-primary-fixed-variant/5"
              }`}
            >
              <Icon size={20} className={active ? "opacity-100" : "opacity-70"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-primary text-white rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 h-full w-[260px] bg-primary flex flex-col py-6 px-4 z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {navContent}
      </nav>
    </>
  );
}
