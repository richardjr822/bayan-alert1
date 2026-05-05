"use client";

import type { ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { formatTime } from "../../lib/utils";

type ReportCardProps = {
  report: ReportWithUpdates;
};

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending",
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
  if (report.status_updates.length) {
    return [...report.status_updates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  return [
    {
      id: `${report.id}-initial`,
      report_id: report.id,
      status: "pending",
      remarks: null,
      updated_by: report.reporter_name,
      created_at: report.created_at,
    },
  ];
}

export default function ReportCard({ report }: ReportCardProps) {
  const timeline = getTimeline(report);

  return (
    <article className="w-full rounded-md border border-[#cfd5dc] bg-white p-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <i className="fa-solid fa-truck-medical text-[18px] text-[var(--red)]"></i>
          <h3 className="text-[15px] font-bold text-[var(--text)]">{report.incident_type}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-[9px] py-1 text-[10px] font-extrabold ${statusClasses[report.status]}`}>
            {statusLabels[report.status]}
          </span>
          <span className={`rounded-full px-[9px] py-1 text-[10px] font-extrabold ${priorityClasses[report.priority]}`}>
            {priorityLabels[report.priority]}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px] text-[var(--muted)]">
        <span>Location:</span>
        <strong className="font-medium text-[var(--text)]">{report.address ?? "Location captured"}</strong>
        <span>Submitted:</span>
        <strong className="font-medium text-[var(--text)]">{formatTime(report.created_at)}</strong>
        <span>Description:</span>
        <strong className="font-medium text-[var(--text)]">{report.description}</strong>
      </div>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h4 className="mb-3 text-[12px] font-bold text-[var(--text)]">Status Timeline</h4>
        <div className="space-y-0">
          {timeline.map((update, index) => (
            <div key={update.id} className="grid grid-cols-[18px_1fr] gap-3">
              <div className="relative flex justify-center">
                <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${statusClasses[update.status]}`}></span>
                {index < timeline.length - 1 ? <span className="absolute top-5 h-full w-px bg-[var(--line)]"></span> : null}
              </div>
              <div className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold text-[var(--text)]">{statusLabels[update.status]}</span>
                  <span className="text-[10px] text-[var(--muted)]">{formatTime(update.created_at)}</span>
                </div>
                {update.remarks ? <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{update.remarks}</p> : null}
                <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Updated by {update.updated_by}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
