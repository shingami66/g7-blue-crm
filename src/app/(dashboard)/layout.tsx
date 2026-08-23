import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  checkPermission,
  getCurrentAppUser,
} from "@/lib/auth/permissions";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import BusinessYearSelectorData from "@/components/i18n/BusinessYearSelectorData";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUser = await getCurrentAppUser();

  if (!appUser || !appUser.is_active) {
    redirect("/unauthorized");
  }

  const [isAdmin, locale] = await Promise.all([
    checkPermission("users:manage"),
    getCurrentSessionEffectiveLocale(),
  ]);
  const shellDirection = getDirection(locale);

  return (
    <LocaleProvider locale={locale}>
      <div
        className="dashboard-shell flex min-h-screen max-w-full bg-surface"
        dir={shellDirection}
      >
        <div className="dashboard-sidebar">
          <Sidebar isAdmin={isAdmin} shellDirection={shellDirection} />
        </div>
        <div
          className={`dashboard-content flex min-h-screen min-w-0 max-w-full flex-1 flex-col ${
            shellDirection === "rtl" ? "md:mr-[260px]" : "md:ml-[260px]"
          }`}
        >
          <div className="dashboard-topbar">
            <Topbar
              businessYearSelector={
                <Suspense fallback={null}>
                  <BusinessYearSelectorData />
                </Suspense>
              }
            />
          </div>
          <main className="dashboard-main mx-auto w-full min-w-0 max-w-[1440px] flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
