import { redirect } from "next/navigation";
import { getCurrentAppUser, checkPermission } from "@/lib/auth/permissions";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

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

  return (
    <div className="dashboard-shell flex min-h-screen bg-surface">
      <div className="dashboard-sidebar">
        <Sidebar isAdmin={isAdmin} />
      </div>
      <div className="dashboard-content flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <div className="dashboard-topbar">
          <Topbar />
        </div>
        <main className="dashboard-main flex-1 p-4 md:p-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
