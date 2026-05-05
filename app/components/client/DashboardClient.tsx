"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReportWithUpdates } from "../../../types/report";
import ReportCard from "./ReportCard";
import StatCard from "./StatCard";

type DashboardClientProps = {
  reports: ReportWithUpdates[];
};

export default function DashboardClient({ reports }: DashboardClientProps) {
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((report) =>
      ["pending", "verified", "in_progress"].includes(report.status),
    ).length;
    const resolved = reports.filter((report) => report.status === "resolved").length;
    return { total, pending, resolved };
  }, [reports]);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard value={stats.total} label="Total Reports" />
        <StatCard value={stats.pending} label="Pending" />
        <StatCard value={stats.resolved} label="Resolved Reports" />
      </div>
      <div className="mt-9 min-h-[260px] rounded-lg border border-[var(--line)] bg-[#f7f7f8] p-6">
        <div className="grid gap-4">
          {reports.length ? (
            reports.map((report) => <ReportCard key={report.id} report={report} />)
          ) : (
            <div className="rounded-md border border-[#cfd5dc] bg-white p-6 text-center text-[12px] text-[var(--muted)]">
              <p>You have not submitted any emergency reports yet.</p>
              <Link
                href="/report"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-[5px] bg-[var(--red)] px-4 py-[11px] text-[12px] font-semibold text-white transition hover:bg-[var(--red-dark)]"
              >
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>Submit First Report</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
