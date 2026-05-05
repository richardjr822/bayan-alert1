"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReportWithUpdates } from "../../../types/report";
import PushSubscribeButton from "./PushSubscribeButton";
import ReportCard from "./ReportCard";
import StatCard from "./StatCard";

type DashboardClientProps = {
  reports: ReportWithUpdates[];
};

const activeStatusConfig = {
  pending: {
    icon: "fa-solid fa-hourglass-half",
    color: "text-[#B89400]",
    bg: "bg-[#fffbeb] border-[#f5d87a]",
    message: "Your report has been received and is awaiting review by barangay officials.",
  },
  verified: {
    icon: "fa-solid fa-circle-check",
    color: "text-[#2264b5]",
    bg: "bg-[#eff6ff] border-[#93c5fd]",
    message: "Your report has been verified. Responders are being coordinated.",
  },
  in_progress: {
    icon: "fa-solid fa-person-running",
    color: "text-[#bf6416]",
    bg: "bg-[#fff7ed] border-[#fdba74]",
    message: "Barangay responders are actively addressing your report.",
  },
} as const;

export default function DashboardClient({ reports }: DashboardClientProps) {
  const stats = useMemo(() => {
    const total = reports.length;
    const active = reports.filter((r) =>
      ["pending", "verified", "in_progress"].includes(r.status),
    ).length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    return { total, active, resolved };
  }, [reports]);

  const mostRecentActive = useMemo(
    () => reports.find((r) => ["pending", "verified", "in_progress"].includes(r.status)),
    [reports],
  );

  const showStatCards = reports.length >= 5;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <PushSubscribeButton />
      </div>

      {mostRecentActive ? (
        <div className={`mb-6 flex items-start gap-4 rounded-xl border p-4 ${activeStatusConfig[mostRecentActive.status as keyof typeof activeStatusConfig]?.bg ?? "bg-[var(--bg-gray)] border-[var(--line)]"}`}>
          <i className={`mt-0.5 text-[20px] ${activeStatusConfig[mostRecentActive.status as keyof typeof activeStatusConfig]?.icon ?? "fa-solid fa-circle-info"} ${activeStatusConfig[mostRecentActive.status as keyof typeof activeStatusConfig]?.color ?? "text-[var(--muted)]"}`}></i>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--text)]">
              {mostRecentActive.incident_type} — {mostRecentActive.status === "pending" ? "Awaiting Review" : mostRecentActive.status === "verified" ? "Verified" : "In Progress"}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">
              {activeStatusConfig[mostRecentActive.status as keyof typeof activeStatusConfig]?.message}
            </p>
          </div>
        </div>
      ) : null}

      {showStatCards ? (
        <div className="mb-6 grid gap-5 md:grid-cols-3">
          <StatCard value={stats.total} label="Total Reports" />
          <StatCard value={stats.active} label="Active Now" />
          <StatCard value={stats.resolved} label="Resolved" />
        </div>
      ) : null}

      <div className="min-h-[260px] rounded-lg border border-[var(--line)] bg-[#f7f7f8] p-6">
        <div className="grid gap-4">
          {reports.length ? (
            reports.map((report) => <ReportCard key={report.id} report={report} />)
          ) : (
            <div className="rounded-md border border-[#cfd5dc] bg-white p-8 text-center">
              <i className="fa-solid fa-file-circle-plus text-[32px] text-[var(--red)] opacity-40"></i>
              <p className="mt-3 text-[13px] font-medium text-[var(--text)]">No reports submitted yet</p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                Use the button below to report an emergency to barangay officials.
              </p>
              <Link
                href="/report"
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-[var(--red)] px-5 py-[11px] text-[12px] font-bold text-white transition hover:bg-[var(--red-dark)]"
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
