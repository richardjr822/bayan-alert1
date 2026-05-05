import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { Report, ReportWithUpdates, StatusUpdate } from "@/types/report";
import Container from "../components/Container";
import Footer from "../components/Footer";
import SectionHeader from "../components/SectionHeader";
import Topbar from "../components/Topbar";
import AdminDashboardClient, { type AdminDashboardStats } from "../components/client/AdminDashboardClient";
import DashboardClient from "../components/client/DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const reportQuery = supabaseServer
    .from("reports")
    .select("id, user_id, reporter_name, contact_number, incident_type, description, latitude, longitude, address, status, priority, created_at, updated_at")
    .order("created_at", { ascending: false });

  const { data: reportsData } =
    session.role === "admin"
      ? await reportQuery.returns<Report[]>()
      : await reportQuery.eq("user_id", session.id).returns<Report[]>();

  const reports = reportsData ?? [];
  const reportIds = reports.map((report) => report.id);

  const { data: statusUpdatesData } = reportIds.length
    ? await supabaseServer
        .from("status_updates")
        .select("id, report_id, status, remarks, updated_by, created_at")
        .in("report_id", reportIds)
        .order("created_at", { ascending: true })
        .returns<StatusUpdate[]>()
    : { data: [] };

  const updatesByReportId = new Map<string, StatusUpdate[]>();

  for (const update of statusUpdatesData ?? []) {
    const currentUpdates = updatesByReportId.get(update.report_id) ?? [];
    currentUpdates.push(update);
    updatesByReportId.set(update.report_id, currentUpdates);
  }

  const reportsWithUpdates: ReportWithUpdates[] = reports.map((report) => ({
    ...report,
    status_updates: updatesByReportId.get(report.id) ?? [],
  }));
  const isAdmin = session.role === "admin";
  const adminStats: AdminDashboardStats = {
    total: reportsWithUpdates.length,
    pending: reportsWithUpdates.filter((report) => report.status === "pending").length,
    active: reportsWithUpdates.filter((report) => report.status === "verified" || report.status === "in_progress").length,
    resolved: reportsWithUpdates.filter((report) => report.status === "resolved").length,
    rejected: reportsWithUpdates.filter((report) => report.status === "rejected").length,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 bg-[var(--bg-gray)] py-[88px]">
        <Container size={isAdmin ? "default" : "narrow"}>
          <SectionHeader
            title={isAdmin ? "Admin Emergency Dashboard" : "My Emergency Reports"}
            description={
              isAdmin
                ? "Review incoming reports, update priorities, and record response progress."
                : "Track your submitted reports and follow response updates from barangay officials."
            }
          />
          <div className="mt-10">
            {isAdmin ? (
              <AdminDashboardClient reports={reportsWithUpdates} stats={adminStats} />
            ) : (
              <DashboardClient reports={reportsWithUpdates} />
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
