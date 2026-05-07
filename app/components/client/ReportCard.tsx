"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ReportPriority, ReportStatus } from "../../../types/report";
import type { ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { cancelReport } from "@/lib/actions/reportActions";

const LeafletMapThumbnail = dynamic(() => import("./LeafletMapThumbnail"), { ssr: false });


type ReportCardProps = {
  report: ReportWithUpdates;
  onCancel?: (id: string) => void;
  isResolved?: boolean;
};

const INCIDENT_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  "Medical Emergency": { icon: "fa-solid fa-truck-medical", color: "#e24b4a", bg: "#ffe8e8" },
  "Fire": { icon: "fa-solid fa-fire", color: "#ef9f27", bg: "#fff3dc" },
  "Flood": { icon: "fa-solid fa-water", color: "#378add", bg: "#e8f1ff" },
  "Crime / Security": { icon: "fa-solid fa-shield-halved", color: "#8b5cf6", bg: "#f3eeff" },
  "Road Accident": { icon: "fa-solid fa-car-burst", color: "#e24b4a", bg: "#ffe8e8" },
  "Structural Damage": { icon: "fa-solid fa-house-crack", color: "#ef9f27", bg: "#fff3dc" },
  "Missing Person": { icon: "fa-solid fa-person-circle-question", color: "#8b5cf6", bg: "#f3eeff" },
};
const DEFAULT_INCIDENT = { icon: "fa-solid fa-circle-exclamation", color: "#687689", bg: "#eef1f5" };

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  [ReportStatus.Pending]: { label: "Pending Review", badge: "bg-[#fff8dc] text-[#B89400]" },
  [ReportStatus.Verified]: { label: "Verified", badge: "bg-[#e8f1ff] text-[#2264b5]" },
  [ReportStatus.InProgress]: { label: "In Progress", badge: "bg-[#fff0df] text-[#bf6416]" },
  [ReportStatus.Resolved]: { label: "Resolved", badge: "bg-[var(--green-soft)] text-[var(--green)]" },
  [ReportStatus.Rejected]: { label: "Rejected", badge: "bg-[#ffe8e8] text-[#b83232]" },
};

const STATUS_DOT: Record<string, string> = {
  [ReportStatus.Pending]: "bg-[#D4AA00]",
  [ReportStatus.Verified]: "bg-[#378ADD]",
  [ReportStatus.InProgress]: "bg-[#EF9F27]",
  [ReportStatus.Resolved]: "bg-[#22C55E]",
  [ReportStatus.Rejected]: "bg-[#E24B4A]",
};

const PRIORITY_CONFIG: Record<ReportPriority, { label: string; badge: string }> = {
  [ReportPriority.Low]: { label: "Low", badge: "bg-[#eef1f5] text-[var(--muted)]" },
  [ReportPriority.Medium]: { label: "Medium", badge: "bg-[#fff8dc] text-[#B89400]" },
  [ReportPriority.High]: { label: "High", badge: "bg-[#fff0df] text-[#bf6416]" },
  [ReportPriority.Critical]: { label: "Critical", badge: "bg-[#ffe8e8] text-[#b83232]" },
};

const CANCEL_REASONS = ["Submitted by mistake", "Issue resolved on its own", "Other"];

function isCancelledByResident(r: ReportWithUpdates) {
  return (
    r.status === ReportStatus.Rejected &&
    r.status_updates.some((u) => u.remarks?.startsWith("Cancelled by resident:"))
  );
}

function buildTimeline(r: ReportWithUpdates): StatusUpdate[] {
  const initial: StatusUpdate = {
    id: `${r.id}-initial`,
    report_id: r.id,
    status: ReportStatus.Pending,
    remarks: null,
    updated_by: "",
    created_at: r.created_at,
  };
  return [
    initial,
    ...[...r.status_updates].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  ];
}

function timelineMessage(update: StatusUpdate, isInitial: boolean): string {
  if (isInitial) return "You submitted this report";
  const remark = update.remarks ?? "";
  if (remark.startsWith("Cancelled by resident:")) return "You cancelled this report";
  switch (update.status) {
    case ReportStatus.Pending:
      return "You submitted this report";
    case ReportStatus.Verified:
      return "Verified by barangay officials";
    case ReportStatus.InProgress: {
      const match = remark.match(/assigned to (.+)/i);
      return match ? `Assigned to ${match[1]}` : "Responders are on the way";
    }
    case ReportStatus.Resolved:
      return "Resolved by barangay officials";
    case ReportStatus.Rejected:
      return "Report reviewed — not actioned";
    default:
      return "Status updated";
  }
}

function resolvedDuration(r: ReportWithUpdates): string | null {
  const entry = r.status_updates.find((u) => u.status === ReportStatus.Resolved);
  if (!entry) return null;
  const diff = new Date(entry.created_at).getTime() - new Date(r.created_at).getTime();
  const totalMins = Math.floor(diff / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins} min${mins !== 1 ? "s" : ""}`;
  if (mins === 0) return `${hrs} hr${hrs !== 1 ? "s" : ""}`;
  return `${hrs} hr${hrs !== 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
}

function formatSubmitTime(dateString: string): string {
  const d = new Date(dateString);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function useReverseGeocode(lat: number | null, lng: number | null) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null) return;
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    )
      .then((r) => r.json())
      .then((data: { display_name?: string }) => {
        if (data.display_name) {
          const parts = data.display_name.split(",");
          setAddress(parts.slice(0, 2).join(",").trim());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lat, lng]);

  return { address, loading };
}

export default function ReportCard({ report, onCancel, isResolved = false }: ReportCardProps) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleShareLink() {
    const url = `${window.location.origin}/track?id=${report.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const { address: geocodedAddress, loading: geocodeLoading } = useReverseGeocode(
    report.address ? null : report.latitude,
    report.address ? null : report.longitude,
  );

  const cancelled = isCancelledByResident(report);
  const incidentCfg = INCIDENT_CONFIG[report.incident_type] ?? DEFAULT_INCIDENT;
  const statusCfg = cancelled
    ? { label: "Cancelled", badge: "bg-[#eef1f5] text-[var(--muted)]" }
    : (STATUS_CONFIG[report.status] ?? { label: report.status, badge: "bg-[#eef1f5] text-[var(--muted)]" });
  const priorityCfg = PRIORITY_CONFIG[report.priority];
  const timeline = buildTimeline(report);
  const duration = isResolved ? resolvedDuration(report) : null;

  const displayAddress = geocodedAddress ?? report.address ?? null;
  const lat = report.latitude;
  const lng = report.longitude;

  async function handleConfirmCancel() {
    setCancelPending(true);
    setCancelError("");
    const result = await cancelReport(report.id, cancelReason);
    if ("error" in result) {
      setCancelError(result.error);
      setCancelPending(false);
    } else {
      setCancelOpen(false);
      onCancel?.(report.id);
    }
  }

  return (
    <article className="w-full rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: incidentCfg.bg }}
          >
            <i className={`${incidentCfg.icon} text-[16px]`} style={{ color: incidentCfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold text-[var(--dark)]">{report.incident_type}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="font-mono text-[11px] text-[var(--muted)]">
                #{shortId(report.id)}
              </p>
              <button
                onClick={handleShareLink}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                <i className={linkCopied ? "fa-solid fa-check text-[var(--green)]" : "fa-solid fa-link"} />
                {linkCopied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${priorityCfg.badge}`}>
              {priorityCfg.label}
            </span>
            <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        <div className="grid gap-y-1.5 text-[13px]">
          <div className="flex gap-3">
            <span className="w-20 shrink-0 text-[var(--muted)]">Submitted</span>
            <span className="text-[var(--text)]">{formatSubmitTime(report.created_at)}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-20 shrink-0 text-[var(--muted)]">Location</span>
            <span className="text-[var(--text)]">
              {geocodeLoading ? (
                <span className="inline-block h-4 w-40 animate-pulse rounded bg-[var(--line)]" />
              ) : displayAddress ? (
                displayAddress
              ) : lat && lng ? (
                `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              ) : (
                "Location not captured"
              )}
            </span>
          </div>
          {report.description ? (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 text-[var(--muted)]">Details</span>
              <span className="text-[var(--text)]">{report.description}</span>
            </div>
          ) : null}
          {isResolved && duration ? (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 text-[var(--muted)]">Duration</span>
              <span className="font-medium text-[var(--green)]">Resolved in {duration}</span>
            </div>
          ) : null}
        </div>

        {!isResolved && lat && lng ? (
          <div className="mt-4 h-[140px] md:h-[180px]">
            <LeafletMapThumbnail lat={lat} lng={lng} />
          </div>
        ) : !isResolved && !lat && !lng ? (
          <div className="mt-4 flex h-[100px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg-gray)]">
            <p className="text-[12px] text-[var(--muted)]">
              <i className="fa-solid fa-location-slash mr-1.5" />
              {report.address ?? "Location not captured"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--line)] px-5 py-4">
        {isResolved ? (
          <>
            <button
              onClick={() => setTimelineOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              View Timeline
              <i
                className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${timelineOpen ? "rotate-180" : ""}`}
              />
            </button>
            {timelineOpen ? (
              <div className="mt-4">
                <Timeline timeline={timeline} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h4 className="mb-4 text-[13px] font-semibold text-[var(--dark)]">Response Timeline</h4>
            <Timeline timeline={timeline} />
          </>
        )}
      </div>

      {report.status === ReportStatus.Pending && !cancelled && !isResolved ? (
        <div className="border-t border-[var(--line)] px-5 py-4">
          {cancelOpen ? (
            <div className="rounded-lg border border-[#f3c6c6] bg-[#fff8f8] p-4">
              <p className="mb-3 text-[13px] font-semibold text-[var(--text)]">Reason for cancellation</p>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-[6px] border border-[var(--line)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[rgba(212,170,0,0.2)]"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {cancelError ? (
                <p className="mt-2 text-[12px] text-[#c0392b]">{cancelError}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelPending}
                  className="flex-1 rounded-[6px] bg-[#c0392b] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#a93226] disabled:opacity-60 md:flex-none md:px-5"
                >
                  {cancelPending ? "Cancelling..." : "Confirm Cancel"}
                </button>
                <button
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelError("");
                  }}
                  className="rounded-[6px] border border-[var(--line)] bg-white px-5 py-2.5 text-[13px] font-semibold text-[var(--muted)] transition hover:bg-[var(--bg-gray)]"
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-[6px] border border-[#f3c6c6] py-2.5 text-[13px] font-semibold text-[#c0392b] transition hover:bg-[#fff5f5] md:w-auto md:px-5"
            >
              <i className="fa-solid fa-xmark mr-1.5" />
              Cancel Report
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function Timeline({ timeline }: { timeline: StatusUpdate[] }) {
  return (
    <div>
      {timeline.map((update, index) => {
        const isInitial = update.id.endsWith("-initial");
        const isCancelEntry = update.remarks?.startsWith("Cancelled by resident:") ?? false;
        const message = timelineMessage(update, isInitial);
        const dotClass = isCancelEntry
          ? "bg-[#E24B4A]"
          : (STATUS_DOT[update.status] ?? "bg-[var(--muted)]");
        const badgeCfg = isCancelEntry
          ? { label: "Cancelled", badge: "bg-[#eef1f5] text-[var(--muted)]" }
          : (STATUS_CONFIG[update.status] ?? { label: update.status, badge: "bg-[#eef1f5] text-[var(--muted)]" });

        return (
          <div key={update.id} className="grid grid-cols-[16px_1fr] gap-3">
            <div className="relative flex justify-center">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
              {index < timeline.length - 1 ? (
                <span className="absolute top-5 h-full w-px bg-[var(--line)]" />
              ) : null}
            </div>
            <div className="pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeCfg.badge}`}
                >
                  {badgeCfg.label}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {new Date(update.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--text)]">{message}</p>
              {update.remarks && !update.remarks.startsWith("Cancelled by resident:") ? (
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{update.remarks}</p>
              ) : null}
              {isCancelEntry ? (
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Reason: {update.remarks!.replace("Cancelled by resident:", "").trim()}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
