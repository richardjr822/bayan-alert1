"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportStatus } from "../../../types/report";
import type { ReportWithUpdates } from "../../../types/report";
import ReportCard from "./ReportCard";

type DashboardClientProps = {
  reports: ReportWithUpdates[];
};

type Tab = "active" | "resolved";

function relativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? "s" : ""} ago`;
}

const ACTIVE_STATUSES = [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress];
const RESOLVED_STATUSES = [ReportStatus.Resolved, ReportStatus.Rejected];

const STATUS_LABEL: Partial<Record<ReportStatus, string>> = {
  [ReportStatus.Pending]: "Pending Review",
  [ReportStatus.Verified]: "Verified",
  [ReportStatus.InProgress]: "In Progress",
};

const INCIDENT_ICONS: Record<string, string> = {
  "Medical Emergency": "fa-solid fa-truck-medical",
  "Fire": "fa-solid fa-fire",
  "Flood": "fa-solid fa-water",
  "Crime / Security": "fa-solid fa-shield-halved",
  "Road Accident": "fa-solid fa-car-burst",
  "Structural Damage": "fa-solid fa-house-crack",
  "Missing Person": "fa-solid fa-person-circle-question",
};

function getIcon(type: string) {
  return INCIDENT_ICONS[type] ?? "fa-solid fa-circle-exclamation";
}

export default function DashboardClient({ reports }: DashboardClientProps) {
  const [tab, setTab] = useState<Tab>("active");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const activeReports = useMemo(
    () => reports.filter((r) => ACTIVE_STATUSES.includes(r.status) && !removedIds.has(r.id)),
    [reports, removedIds],
  );

  const resolvedReports = useMemo(
    () => reports.filter((r) => RESOLVED_STATUSES.includes(r.status)),
    [reports],
  );

  const bannerReport = useMemo(
    () => activeReports.find((r) => r.status === ReportStatus.Pending || r.status === ReportStatus.InProgress),
    [activeReports],
  );

  function handleCancelSuccess(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    router.refresh();
  }

  return (
    <div className="mx-auto w-[min(920px,92vw)] pb-16">
      <div className="flex items-start justify-between gap-4 pb-6 pt-8">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--dark)] sm:text-[26px]">My Emergency Reports</h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Track your submitted reports and follow response updates from barangay officials.
          </p>
        </div>
        <Link
          href="/report"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--red)] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[var(--red-dark)]"
        >
          <i className="fa-solid fa-circle-exclamation" />
          <span className="hidden sm:inline">New Report</span>
        </Link>
      </div>

      {bannerReport ? (
        <div className="mb-6 flex items-start gap-4 rounded-xl border border-[#dfc84a] bg-[#fffbe6] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,170,0,0.18)]">
            <i className={`${getIcon(bannerReport.incident_type)} text-[17px] text-[#8a6400]`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-bold text-[var(--dark)]">{bannerReport.incident_type}</p>
              <span className="rounded-full bg-[#fff0b3] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a6400]">
                {STATUS_LABEL[bannerReport.status]}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Last updated {relativeTime(bannerReport.updated_at)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="sticky top-[72px] z-30 -mx-3 mb-6 border-b border-[var(--line)] bg-[var(--bg-gray)] px-3 md:static md:mx-0 md:px-0">
        <div className="flex">
          {(["active", "resolved"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 pb-3 pt-2.5 text-[13px] font-semibold transition-colors ${
                tab === t ? "text-[var(--dark)]" : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <span>{t === "active" ? "Active Reports" : "Resolved Reports"}</span>
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t ? "bg-[var(--red)] text-white" : "bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {t === "active" ? activeReports.length : resolvedReports.length}
              </span>
              {tab === t ? (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[var(--red)]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "active" ? (
        activeReports.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              className="mb-5 opacity-25"
            >
              <path
                d="M28 4L6 16v20c0 11.05 8.4 21.38 22 24 13.6-2.62 22-12.95 22-24V16L28 4z"
                fill="var(--line)"
                stroke="var(--muted)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M28 20v10M28 34v2"
                stroke="var(--muted)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <h3 className="text-[20px] font-semibold text-[var(--text)]">No active reports</h3>
            <p className="mt-2 text-[14px] text-[var(--muted)]">Stay safe. Report emergencies instantly.</p>
            <Link
              href="/report"
              className="mt-7 inline-flex items-center gap-2 rounded-[8px] bg-[var(--red)] px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-[var(--red-dark)]"
            >
              <i className="fa-solid fa-circle-exclamation" />
              Report Emergency
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeReports.map((r) => (
              <ReportCard key={r.id} report={r} onCancel={handleCancelSuccess} />
            ))}
          </div>
        )
      ) : resolvedReports.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[var(--muted)]">No resolved reports yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {resolvedReports.map((r) => (
            <ReportCard key={r.id} report={r} isResolved />
          ))}
        </div>
      )}
    </div>
  );
}
