"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fetchPublicReport } from "@/lib/actions/trackingActions";
import type { PublicTrackingData, PublicStatusUpdate } from "@/types/tracking";
import { ReportPriority, ReportStatus } from "@/types/report";

type Props = {
  initialId: string | null;
  initialReport: PublicTrackingData | null;
  notFound: boolean;
};

type LiveStatus = "idle" | "connected" | "disconnected";

const INCIDENT_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  "Medical Emergency": { icon: "fa-solid fa-truck-medical", color: "#e24b4a", bg: "#ffe8e8" },
  "Fire": { icon: "fa-solid fa-fire", color: "#ef9f27", bg: "#fff3dc" },
  "Flood": { icon: "fa-solid fa-water", color: "#378add", bg: "#e8f1ff" },
  "Crime/Security": { icon: "fa-solid fa-shield-halved", color: "#8b5cf6", bg: "#f3eeff" },
  "Accident": { icon: "fa-solid fa-car-burst", color: "#e24b4a", bg: "#ffe8e8" },
};
const DEFAULT_INCIDENT = { icon: "fa-solid fa-circle-exclamation", color: "#687689", bg: "#eef1f5" };

const STATUS_CONFIG: Record<ReportStatus, {
  label: string;
  description: string;
  bg: string;
  border: string;
  icon: string;
  iconColor: string;
  dotColor: string;
  textColor: string;
}> = {
  [ReportStatus.Pending]: {
    label: "Awaiting Review",
    description: "Your report has been received and is in the queue.",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "fa-solid fa-clock",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-400",
    textColor: "text-amber-900",
  },
  [ReportStatus.Verified]: {
    label: "Verified",
    description: "Barangay officials have confirmed your report.",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "fa-solid fa-circle-check",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-400",
    textColor: "text-blue-900",
  },
  [ReportStatus.InProgress]: {
    label: "Responders Dispatched",
    description: "Help is on the way to your location.",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "fa-solid fa-truck-fast",
    iconColor: "text-purple-500",
    dotColor: "bg-purple-400",
    textColor: "text-purple-900",
  },
  [ReportStatus.Resolved]: {
    label: "Resolved",
    description: "This incident has been addressed by barangay officials.",
    bg: "bg-[var(--green-soft)]",
    border: "border-[#86efac]",
    icon: "fa-solid fa-circle-check",
    iconColor: "text-[var(--green)]",
    dotColor: "bg-[var(--green)]",
    textColor: "text-[#14532d]",
  },
  [ReportStatus.Rejected]: {
    label: "Not Actioned",
    description: "This report was reviewed and not actioned. Call 911 if this is still an emergency.",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "fa-solid fa-circle-xmark",
    iconColor: "text-red-500",
    dotColor: "bg-red-400",
    textColor: "text-red-900",
  },
};

const PRIORITY_CONFIG: Record<ReportPriority, { label: string; badge: string }> = {
  [ReportPriority.Low]: { label: "Low", badge: "bg-[#eef1f5] text-[var(--muted)]" },
  [ReportPriority.Medium]: { label: "Medium", badge: "bg-[#fff8dc] text-[#B89400]" },
  [ReportPriority.High]: { label: "High", badge: "bg-[#fff0df] text-[#bf6416]" },
  [ReportPriority.Critical]: { label: "Critical", badge: "bg-[#ffe8e8] text-[#b83232]" },
};

function getTimelineMessage(status: ReportStatus, remarks: string | null): string {
  const remark = remarks ?? "";
  switch (status) {
    case ReportStatus.Pending:
      return "Report received by BayanAlert system";
    case ReportStatus.Verified:
      return "Verified by barangay officials";
    case ReportStatus.InProgress: {
      const match = remark.match(/assigned to (.+)/i);
      return match ? `Assigned to ${match[1]}` : "Responders dispatched";
    }
    case ReportStatus.Resolved:
      return "Incident resolved by barangay officials";
    case ReportStatus.Rejected:
      return "Report reviewed — not actioned";
    default:
      return "Status updated";
  }
}

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSubmitTime(dateString: string): string {
  const d = new Date(dateString);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

function resolvedDuration(report: PublicTrackingData): string | null {
  const entry = report.status_updates.find((u) => u.status === ReportStatus.Resolved);
  if (!entry) return null;
  const diff = new Date(entry.created_at).getTime() - new Date(report.created_at).getTime();
  const totalMins = Math.floor(diff / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins} min${mins !== 1 ? "s" : ""}`;
  if (mins === 0) return `${hrs} hr${hrs !== 1 ? "s" : ""}`;
  return `${hrs} hr${hrs !== 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
}

function buildTimeline(report: PublicTrackingData): PublicStatusUpdate[] {
  const initial: PublicStatusUpdate = {
    id: `${report.report_id}-initial`,
    status: ReportStatus.Pending,
    remarks: null,
    created_at: report.created_at,
  };
  const sorted = [...report.status_updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return report.status_updates.length === 0 ? [initial] : [...sorted, initial];
}

export default function TrackClient({ initialId, initialReport, notFound }: Props) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(initialId ?? "");
  const [inputError, setInputError] = useState("");
  const [report, setReport] = useState<PublicTrackingData | null>(initialReport);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refreshReport = useCallback(async (reportId: string) => {
    const updated = await fetchPublicReport(reportId);
    if (updated) setReport(updated);
  }, []);

  useEffect(() => {
    if (!report) return;

    const reportId = report.report_id;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`track:${reportId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reports",
          filter: `id=eq.${reportId}`,
        },
        () => {
          refreshReport(reportId);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveStatus("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setLiveStatus("disconnected");
      });

    channelRef.current = channel;
    setLiveStatus("connected");

    return () => {
      channel.unsubscribe();
      setLiveStatus("idle");
    };
  }, [report?.report_id, refreshReport]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const val = inputValue.trim().toUpperCase();
    if (!val) {
      setInputError("Please enter a report ID.");
      return;
    }
    setInputError("");
    router.push(`/track?id=${encodeURIComponent(val)}`);
  }

  const statusCfg = report ? (STATUS_CONFIG[report.status] ?? STATUS_CONFIG[ReportStatus.Pending]) : null;
  const incidentCfg = report ? (INCIDENT_CONFIG[report.incident_type] ?? DEFAULT_INCIDENT) : null;
  const timeline = report ? buildTimeline(report) : [];
  const duration = report ? resolvedDuration(report) : null;
  const isActive = report
    ? [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress].includes(report.status)
    : false;

  return (
    <div className="mx-auto w-[min(560px,calc(100vw-32px))] space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h1 className="text-[28px] font-bold text-[var(--dark)]">Track Your Report</h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Enter your report ID to see the current status.
        </p>

        <form onSubmit={handleSearch} className="mt-5 space-y-3">
          <div>
            <label htmlFor="trackId" className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
              Report ID
            </label>
            <input
              id="trackId"
              type="text"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value.toUpperCase()); setInputError(""); }}
              placeholder="BA-2026-0001"
              className={`h-12 w-full rounded-[8px] border bg-white px-4 font-mono text-[15px] text-[var(--text)] placeholder:font-sans placeholder:text-[var(--muted)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)] ${inputError ? "border-red-400 focus:border-red-400" : "border-[var(--line)] focus:border-[var(--red)]"}`}
            />
            {inputError ? (
              <p className="mt-1.5 text-[12px] text-red-500">{inputError}</p>
            ) : null}
          </div>
          <button
            type="submit"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--red)] text-[15px] font-semibold text-[var(--dark)] transition hover:bg-[var(--red-dark)]"
          >
            <i className="fa-solid fa-magnifying-glass" />
            Track Report
          </button>
        </form>
      </div>

      {!initialId ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto mb-4 opacity-30">
            <path
              d="M32 6L8 20v24c0 12.4 9.5 24 24 27 14.5-3 24-14.6 24-27V20L32 6z"
              fill="var(--line)"
              stroke="var(--muted)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="44" cy="44" r="12" fill="white" stroke="var(--muted)" strokeWidth="2" />
            <path d="M49 49l4 4" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="44" cy="44" r="6" fill="none" stroke="var(--muted)" strokeWidth="2" />
          </svg>
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">
            Enter your report ID above to check the status of your emergency report.
            Your report ID was shown after you submitted.
          </p>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Example: <span className="font-mono font-semibold text-[var(--dark)]">BA-2026-0001</span>
          </p>
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6" style={{ borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-xmark mt-0.5 text-[22px] text-red-500" />
            <div>
              <h2 className="text-[16px] font-bold text-red-900">Report Not Found</h2>
              <p className="mt-1 text-[13px] text-red-700">
                No report found with ID <span className="font-mono font-semibold">{initialId}</span>.
                Check the ID and try again.
              </p>
              <Link
                href="/report"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-700 hover:underline"
              >
                Submit a new report <i className="fa-solid fa-arrow-right text-[11px]" />
              </Link>
            </div>
          </div>
        </div>
      ) : report && statusCfg && incidentCfg ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
          {liveStatus !== "idle" ? (
            <div className="flex items-center justify-end gap-2 px-5 pt-4">
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  liveStatus === "connected"
                    ? "bg-[var(--green-soft)] text-[var(--green)]"
                    : "bg-[var(--bg-gray)] text-[var(--muted)]"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    liveStatus === "connected"
                      ? "animate-pulse bg-[var(--green)]"
                      : "bg-[var(--muted)]"
                  }`}
                />
                {liveStatus === "connected" ? "Live updates active" : "Live updates paused"}
              </span>
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ background: incidentCfg.bg }}
              >
                <i className={`${incidentCfg.icon} text-[20px]`} style={{ color: incidentCfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[20px] font-bold text-[var(--dark)]">{report.incident_type}</h2>
                <p className="mt-0.5 font-mono text-[12px] text-[var(--muted)]">{report.report_id}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${PRIORITY_CONFIG[report.priority].badge}`}>
                  {PRIORITY_CONFIG[report.priority].label}
                </span>
                <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${statusCfg.bg} ${statusCfg.textColor}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Location</p>
                <p className="mt-1 text-[var(--text)]">
                  {report.address
                    ? report.address.split(",").slice(0, 2).join(",").trim()
                    : "Location not available"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Submitted</p>
                <p className="mt-1 text-[var(--text)]">{formatSubmitTime(report.created_at)}</p>
              </div>
              {duration ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Resolved</p>
                  <p className="mt-1 font-medium text-[var(--green)]">in {duration}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className={`mx-5 mb-5 rounded-xl border p-4 sm:mx-6 sm:mb-6 ${statusCfg.bg} ${statusCfg.border}`}>
            <div className="flex items-start gap-3">
              <i className={`${statusCfg.icon} mt-0.5 text-[22px] sm:text-[18px] ${statusCfg.iconColor} shrink-0`} />
              <div>
                <p className={`text-[15px] font-bold sm:text-[14px] ${statusCfg.textColor}`}>{statusCfg.label}</p>
                <p className={`mt-0.5 text-[13px] leading-relaxed ${statusCfg.textColor} opacity-80`}>
                  {statusCfg.description}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] px-5 py-5 sm:px-6">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--red)]">
              Response Timeline
            </p>
            <div>
              {timeline.map((entry, index) => {
                const isInitial = entry.id.endsWith("-initial");
                const entryCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG[ReportStatus.Pending];
                const message = isInitial
                  ? "Report received by BayanAlert system"
                  : getTimelineMessage(entry.status, entry.remarks);

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[14px_1fr] gap-3"
                    style={{ animation: `fadeIn 300ms ease-out ${index * 80}ms both` }}
                  >
                    <div className="relative flex justify-center">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${entryCfg.dotColor}`} />
                      {index < timeline.length - 1 ? (
                        <span className="absolute top-5 h-full w-px bg-[var(--line)]" />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${entryCfg.bg} ${entryCfg.textColor}`}>
                          {isInitial ? "Submitted" : entryCfg.label}
                        </span>
                        <span className="text-[11px] text-[var(--muted)]">{formatDateTime(entry.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--text)]">{message}</p>
                      {!isInitial && entry.remarks && entry.status === ReportStatus.Resolved ? (
                        <p className="mt-1.5 rounded-lg bg-[var(--bg-gray)] px-3 py-2 text-[12px] leading-relaxed text-[var(--muted)] italic">
                          {entry.remarks}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--line)] px-5 py-4 sm:px-6">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-red-600">
              <i className="fa-solid fa-phone" />
              Call 911 for life-threatening emergencies
            </p>
            {isActive ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                Response taking too long?{" "}
                <a href="tel:+63" className="font-semibold text-[var(--text)] hover:underline">
                  Contact the barangay directly
                </a>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
    </div>
  );
}
