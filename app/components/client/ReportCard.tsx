"use client";

import type { ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { formatTime } from "../../lib/utils";
import CancelReportButton from "./CancelReportButton";

type ReportCardProps = {
  report: ReportWithUpdates;
};

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending Review",
  verified: "Verified",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

const statusClasses: Record<ReportStatus, string> = {
  pending: "bg-[#fff8dc] text-[#B89400]",
  verified: "bg-[#e8f1ff] text-[#2264b5]",
  in_progress: "bg-[#fff0df] text-[#bf6416]",
  resolved: "bg-[var(--green-soft)] text-[var(--green)]",
  rejected: "bg-[#ffe8e8] text-[#b83232]",
};

const timelineAttribution: Record<ReportStatus, string> = {
  pending: "Submitted by you",
  verified: "Verified by barangay officials",
  in_progress: "Responders are on the way",
  resolved: "Marked resolved by barangay officials",
  rejected: "Reviewed by barangay officials",
};

const priorityLabels: Record<ReportPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const priorityClasses: Record<ReportPriority, string> = {
  low: "bg-[#eef1f5] text-[var(--muted)]",
  medium: "bg-[#fff8dc] text-[#B89400]",
  high: "bg-[#fff0df] text-[#bf6416]",
  critical: "bg-[#ffe8e8] text-[#b83232]",
};

function getTimeline(report: ReportWithUpdates): StatusUpdate[] {
  const base: StatusUpdate = {
    id: `${report.id}-initial`,
    report_id: report.id,
    status: "pending",
    remarks: null,
    updated_by: "",
    created_at: report.created_at,
  };
  if (!report.status_updates.length) return [base];
  return [base, ...[...report.status_updates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )];
}

function isCancelledByResident(report: ReportWithUpdates): boolean {
  return (
    report.status === "rejected" &&
    report.status_updates.some((u) => u.remarks?.startsWith("Cancelled by resident:"))
  );
}

export default function ReportCard({ report }: ReportCardProps) {
  const timeline = getTimeline(report);
  const cancelled = isCancelledByResident(report);
  const displayStatus = cancelled ? "Cancelled by you" : statusLabels[report.status];
  const displayStatusClass = cancelled ? "bg-[#eef1f5] text-[var(--muted)]" : statusClasses[report.status];

  const lat = report.latitude;
  const lng = report.longitude;
  const mapSrc = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003}%2C${lat - 0.003}%2C${lng + 0.003}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`
    : null;
  const mapLink = lat && lng
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`
    : null;

  return (
    <article className="w-full rounded-md border border-[#cfd5dc] bg-white p-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <i className="fa-solid fa-truck-medical text-[18px] text-[var(--red)]"></i>
          <h3 className="text-[15px] font-bold text-[var(--text)]">{report.incident_type}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-[9px] py-1 text-[10px] font-extrabold ${displayStatusClass}`}>
            {displayStatus}
          </span>
          <span className={`rounded-full px-[9px] py-1 text-[10px] font-extrabold ${priorityClasses[report.priority]}`}>
            {priorityLabels[report.priority]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px] text-[var(--muted)]">
        <span>Location:</span>
        <strong className="font-medium text-[var(--text)]">
          {report.address ?? (lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Location not captured")}
        </strong>
        <span>Submitted:</span>
        <strong className="font-medium text-[var(--text)]">{formatTime(report.created_at)}</strong>
        <span>Description:</span>
        <strong className="font-medium text-[var(--text)]">{report.description}</strong>
      </div>

      {mapSrc && mapLink ? (
        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block overflow-hidden rounded-lg border border-[var(--line)]"
        >
          <iframe
            src={mapSrc}
            width="100%"
            height="110"
            className="pointer-events-none block border-0"
            loading="lazy"
            title="Report location map"
          />
          <div className="flex items-center gap-1.5 bg-[var(--bg-gray)] px-3 py-1.5 text-[10px] text-[var(--muted)]">
            <i className="fa-solid fa-map-location-dot text-[var(--red)]"></i>
            View full map on OpenStreetMap
          </div>
        </a>
      ) : null}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h4 className="mb-3 text-[12px] font-bold text-[var(--text)]">Response Timeline</h4>
        <div className="space-y-0">
          {timeline.map((update, index) => {
            const isInitial = update.id.endsWith("-initial");
            const isCancelEntry = update.remarks?.startsWith("Cancelled by resident:");
            const attribution = isInitial
              ? "You submitted this report"
              : isCancelEntry
                ? "Cancelled by you"
                : timelineAttribution[update.status] ?? "Barangay Officials";
            const entryRemarks = isCancelEntry
              ? update.remarks!.replace("Cancelled by resident:", "Reason:").trim()
              : update.remarks;

            return (
              <div key={update.id} className="grid grid-cols-[18px_1fr] gap-3">
                <div className="relative flex justify-center">
                  <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${statusClasses[update.status]}`}></span>
                  {index < timeline.length - 1 ? (
                    <span className="absolute top-5 h-full w-px bg-[var(--line)]"></span>
                  ) : null}
                </div>
                <div className="pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-bold text-[var(--text)]">
                      {isInitial ? "Submitted" : statusLabels[update.status]}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{formatTime(update.created_at)}</span>
                  </div>
                  {entryRemarks ? (
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{entryRemarks}</p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] font-medium text-[var(--muted)]">{attribution}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {report.status === "pending" && !cancelled ? (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <CancelReportButton reportId={report.id} />
        </div>
      ) : null}
    </article>
  );
}
