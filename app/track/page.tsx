import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getReportsWithUpdates } from "@/lib/actions/reportActions";
import { fetchPublicReport } from "@/lib/actions/trackingActions";
import { ReportStatus } from "@/types/report";
import type { ReportWithUpdates } from "@/types/report";
import Topbar from "../components/Topbar";
import Footer from "../components/Footer";
import TrackClient from "./TrackClient";
import TrackResidentView from "./TrackResidentView";

export const metadata: Metadata = {
  title: "Track Report — BayanAlert",
  description: "Check the status of your submitted emergency report.",
};

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function TrackPage({ searchParams }: Props) {
  const session = await getSession();

  if (session?.role === "resident") {
    const result = await getReportsWithUpdates();
    const reports: ReportWithUpdates[] = "data" in result ? (result.data ?? []) : [];
    const activeCount = reports.filter((r) =>
      [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress].includes(r.status),
    ).length;

    return (
      <div className="flex min-h-screen flex-col">
        <Topbar notifications={activeCount} />
        <main className="flex-1 bg-[var(--bg-gray)]">
          {"error" in result ? (
            <div className="mx-auto w-[min(680px,92vw)] pt-8">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {result.error}
              </div>
            </div>
          ) : (
            <TrackResidentView reports={reports} />
          )}
        </main>
        <Footer />
      </div>
    );
  }

  const params = await searchParams;
  const rawId = params.id?.trim() ?? null;
  const normalizedId = rawId?.toUpperCase() ?? null;
  const report = normalizedId ? await fetchPublicReport(normalizedId) : null;
  const notFound = !!normalizedId && !report;

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 bg-[var(--bg-gray)] py-10">
        <TrackClient initialId={normalizedId} initialReport={report} notFound={notFound} />
      </main>
      <Footer />
    </div>
  );
}
