import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
