import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getReportsWithUpdates } from "@/lib/actions/reportActions";
import AdminLayoutClient from "../../components/client/AdminLayoutClient";
import AdminReportsClient from "../../components/client/AdminReportsClient";

export default async function HistoryPage() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  const reportsResult = await getReportsWithUpdates();

  return (
    <AdminLayoutClient
      adminName={session.fullName}
      pageTitle="History"
      pageSubtitle="Resolved and rejected reports"
    >
      {"error" in reportsResult ? (
        <div className="px-4 py-6 md:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {reportsResult.error}
          </div>
        </div>
      ) : (
        <AdminReportsClient reports={reportsResult.data} initialTab="history" />
      )}
    </AdminLayoutClient>
  );
}
