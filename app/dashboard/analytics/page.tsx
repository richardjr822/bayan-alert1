import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getReportsWithUpdates } from "@/lib/actions/reportActions";
import AdminLayoutClient from "../../components/client/AdminLayoutClient";
import AdminAnalyticsClient from "../../components/client/AdminAnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  const reportsResult = await getReportsWithUpdates();
  const reports = "data" in reportsResult ? (reportsResult.data ?? []) : [];

  return (
    <AdminLayoutClient
      adminName={session.fullName}
      pageTitle="Analytics"
      pageSubtitle="Trends and response performance"
    >
      {"error" in reportsResult ? (
        <div className="px-4 py-6 md:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {reportsResult.error}
          </div>
        </div>
      ) : (
        <div className="px-4 py-6 md:px-8">
          <AdminAnalyticsClient reports={reports} />
        </div>
      )}
    </AdminLayoutClient>
  );
}
