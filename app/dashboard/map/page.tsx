import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveReportsWithUpdates } from "@/lib/actions/reportActions";
import type { ReportWithUpdates } from "@/types/report";
import AdminLayoutClient from "../../components/client/AdminLayoutClient";
import AdminMapView from "../../components/client/AdminMapView";

export default async function MapPage() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  const reportsResult = await getActiveReportsWithUpdates();
  const reportsWithUpdates: ReportWithUpdates[] = "data" in reportsResult ? (reportsResult.data ?? []) : [];

  return (
    <AdminLayoutClient
      adminName={session.fullName}
      pageTitle="Live Map"
      pageSubtitle="Geospatial view of active incidents"
    >
      <div className="flex flex-col p-4 pb-[calc(16px+56px)] md:p-8 md:pb-8" style={{ height: "calc(100dvh - 72px)" }}>
        {"error" in reportsResult ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {reportsResult.error}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden rounded-[12px] border border-black/5 bg-surface-2 shadow-sm">
            <AdminMapView reports={reportsWithUpdates} />
          </div>
        )}
      </div>
    </AdminLayoutClient>
  );
}
