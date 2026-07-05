import { redirect } from "next/navigation";
import { getCurrentAppUser, checkPermission } from "@/lib/auth/permissions";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { GlobalPendingProvider } from "@/components/ui/GlobalPendingProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUser = await getCurrentAppUser();

  if (!appUser || !appUser.is_active) {
    redirect("/unauthorized");
  }

  const isAdmin = await checkPermission("users:manage");
  // Temporary dev-only RTL shell override for Shell-1A manual verification.
  // Remove after real app_users.locale runtime wiring is approved.
  const shellDirection =
    process.env.NODE_ENV !== "production" && process.env.G7_DEV_RTL === "1"
      ? "rtl"
      : "ltr";

  return (
    <GlobalPendingProvider>
      <div
        className="dashboard-shell flex min-h-screen bg-surface"
        data-dev-rtl={shellDirection === "rtl" ? "true" : undefined}
        dir={shellDirection}
      >
        <div className="dashboard-sidebar">
          <Sidebar isAdmin={isAdmin} shellDirection={shellDirection} />
        </div>
        <div
          className={`dashboard-content flex-1 flex flex-col min-h-screen ${
            shellDirection === "rtl" ? "md:mr-[260px]" : "md:ml-[260px]"
          }`}
        >
          <div className="dashboard-topbar">
            <Topbar />
          </div>
          <main className="dashboard-main flex-1 p-4 md:p-6 max-w-[1440px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </GlobalPendingProvider>
  );
}
