import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getReportsWithUpdates } from "@/lib/actions/reportActions";
import { ReportStatus } from "@/types/report";
import type { ReportWithUpdates } from "@/types/report";
import Footer from "../components/Footer";
import Topbar from "../components/Topbar";
import AdminDashboardClient, { type AdminDashboardStats } from "../components/client/AdminDashboardClient";
import DashboardClient from "../components/client/DashboardClient";
import AdminLayoutClient from "../components/client/AdminLayoutClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const reportsResult = await getReportsWithUpdates();
  const reportsWithUpdates: ReportWithUpdates[] = "data" in reportsResult ? (reportsResult.data ?? []) : [];
  const isAdmin = session.role === "admin";

  if (isAdmin) {
    const adminStats: AdminDashboardStats = {
      total: reportsWithUpdates.length,
      pending: reportsWithUpdates.filter((r) => r.status === ReportStatus.Pending).length,
      active: reportsWithUpdates.filter(
        (r) => r.status === ReportStatus.Verified || r.status === ReportStatus.InProgress,
      ).length,
      resolved: reportsWithUpdates.filter((r) => r.status === ReportStatus.Resolved).length,
      rejected: reportsWithUpdates.filter((r) => r.status === ReportStatus.Rejected).length,
    };
    return (
      <AdminLayoutClient
        adminName={session.fullName}
        pageTitle="Command Center"
        pageSubtitle="Live overview of incoming incidents"
      >
        {"error" in reportsResult ? (
          <div className="px-4 py-6 md:px-8">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {reportsResult.error}
            </div>
          </div>
        ) : (
          <AdminDashboardClient reports={reportsWithUpdates} stats={adminStats} />
        )}
      </AdminLayoutClient>
    );
  }

  const activeCount = reportsWithUpdates.filter((r) =>
    [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress].includes(r.status),
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar notifications={activeCount} />
      <main className="flex-1 bg-[var(--bg-gray)]">
        {"error" in reportsResult ? (
          <div className="mx-auto w-[min(920px,92vw)] pt-8">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {reportsResult.error}
            </div>
          </div>
        ) : (
          <DashboardClient reports={reportsWithUpdates} />
        )}
      </main>
      <Footer />
    </div>
  );
}
