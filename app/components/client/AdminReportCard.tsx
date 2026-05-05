"use client";

import { useState, type FormEvent } from "react";
import { updateReportStatus } from "@/lib/actions/reportActions";
import type { ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { formatTime } from "../../lib/utils";

type ToastKind = "success" | "error" | "info";

type AdminReportCardProps = {
  report: ReportWithUpdates;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onOptimisticUpdate: (reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => void;
  onRollback: (report: ReportWithUpdates) => void;
  onToast: (message: string, kind?: ToastKind) => void;
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

const statusDot: Record<ReportStatus, string> = {
  pending: "#B89400",
  verified: "#2264b5",
  in_progress: "#bf6416",
  resolved: "#20a45d",
  rejected: "#b83232",
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

const priorityBorder: Record<ReportPriority, string> = {
  low: "#d1d5db",
  medium: "#B89400",
  high: "#bf6416",
  critical: "#b83232",
};

const priorityCardBg: Record<ReportPriority, string> = {
  low: "#ffffff",
  medium: "#ffffff",
  high: "#fffcf5",
  critical: "#fff8f8",
};

const incidentIcon: Record<string, string> = {
  "Fire": "fa-fire",
  "Flood/Water Hazard": "fa-water",
  "Medical Emergency": "fa-kit-medical",
  "Crime/Security": "fa-shield-halved",
  "Accident": "fa-car-burst",
};

const statusOptions: { value: ReportStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const priorityOptions: { value: ReportPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const RESPONDER_TEAMS = ["", "Tanod Team A", "Tanod Team B", "BFP Sta. Rita", "PNP Station", "MDRRMO"];

type QuickAction = { label: string; icon: string; status: ReportStatus; cls: string };
const quickActions: Partial<Record<ReportStatus, QuickAction[]>> = {
  pending: [
    { label: "Verify", icon: "fa-circle-check", status: "verified", cls: "border-[#2264b5] text-[#2264b5] hover:bg-[#e8f1ff]" },
    { label: "Reject", icon: "fa-circle-xmark", status: "rejected", cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
  ],
  verified: [
    { label: "Dispatch", icon: "fa-person-running", status: "in_progress", cls: "border-[#bf6416] text-[#bf6416] hover:bg-[#fff0df]" },
    { label: "Reject", icon: "fa-circle-xmark", status: "rejected", cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
  ],
  in_progress: [
    { label: "Resolve", icon: "fa-flag-checkered", status: "resolved", cls: "border-[var(--green)] text-[var(--green)] hover:bg-[var(--green-soft)]" },
    { label: "Reject", icon: "fa-circle-xmark", status: "rejected", cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
  ],
};

function getElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getTimeline(report: ReportWithUpdates): StatusUpdate[] {
  const updates = report.status_updates.length
    ? [...report.status_updates]
    : [{ id: `${report.id}-initial`, report_id: report.id, status: "pending" as ReportStatus, remarks: null, updated_by: report.reporter_name, created_at: report.created_at }];
  return updates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function createOptimisticUpdate(reportId: string, status: ReportStatus, remarks: string): StatusUpdate {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    report_id: reportId,
    status,
    remarks: remarks || null,
    updated_by: "Admin",
    created_at: new Date().toISOString(),
  };
}

export default function AdminReportCard({
  report,
  isSelected = false,
  onSelect,
  onOptimisticUpdate,
  onRollback,
  onToast,
}: AdminReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [priority, setPriority] = useState<ReportPriority>(report.priority);
  const [assignedTo, setAssignedTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoading, setQuickLoading] = useState<ReportStatus | null>(null);

  const timeline = getTimeline(report);
  const elapsed = getElapsed(report.created_at);
  const icon = incidentIcon[report.incident_type] ?? "fa-circle-exclamation";
  const isOld = Date.now() - new Date(report.created_at).getTime() > 30 * 60 * 1000;
  const actions = quickActions[report.status] ?? [];

  const runUpdate = async (newStatus: ReportStatus, newPriority: ReportPriority, fullRemarks: string) => {
    const optimisticUpdate = createOptimisticUpdate(report.id, newStatus, fullRemarks);
    onOptimisticUpdate(report.id, newStatus, newPriority, optimisticUpdate);
    const result = await updateReportStatus({ reportId: report.id, status: newStatus, priority: newPriority, remarks: fullRemarks, assignedTo: assignedTo || undefined });
    return result;
  };

  const handleQuickAction = async (action: QuickAction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (quickLoading) return;
    setQuickLoading(action.status);
    const previousReport = report;
    const result = await runUpdate(action.status, report.priority, "");
    setQuickLoading(null);
    if ("error" in result) { onRollback(previousReport); onToast(result.error, "error"); return; }
    onToast(`Marked as ${statusLabels[action.status]}.`, "success");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const previousReport = report;
    const cleanRemarks = remarks.trim();
    const fullRemarks = assignedTo ? `Assigned to: ${assignedTo}${cleanRemarks ? `. ${cleanRemarks}` : ""}` : cleanRemarks;
    const result = await runUpdate(status, priority, fullRemarks);
    setIsSubmitting(false);
    if ("error" in result) { onRollback(previousReport); onToast(result.error, "error"); return; }
    setRemarks(""); setAssignedTo("");
    onToast("Report updated.", "success");
  };

  return (
    <article
      style={{ borderLeftColor: priorityBorder[report.priority], backgroundColor: priorityCardBg[report.priority] }}
      className={`w-full overflow-hidden rounded-xl border border-l-4 transition ${isSelected ? "ring-2 ring-[var(--red)]/30" : ""}`}
    >
      {/* ── PREVIEW ROW ── */}
      <div
        className="flex cursor-pointer items-start gap-3 px-4 pt-4 pb-3"
        onClick={() => setExpanded((v) => !v)}
      >
        {onSelect ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onSelect(report.id, e.target.checked); }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--red)]"
          />
        ) : null}

        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusClasses[report.status]}`}>
          <i className={`fa-solid ${icon} text-[14px]`}></i>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-bold text-[var(--text)]">{report.incident_type}</h3>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {report.reporter_name}
                <span className={`ml-1.5 ${report.status === "pending" && isOld ? "font-bold text-[#b83232]" : "text-[var(--muted)]"}`}>
                  · {elapsed}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusClasses[report.status]}`}>
                {statusLabels[report.status]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${priorityClasses[report.priority]}`}>
                {priorityLabels[report.priority]}
              </span>
              <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} ml-1 text-[9px] text-[var(--muted)]`}></i>
            </div>
          </div>
          {report.address ? (
            <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
              <i className="fa-solid fa-location-dot mr-1 text-[9px]"></i>{report.address}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      {actions.length > 0 ? (
        <div className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-2.5">
          <span className="text-[10px] font-semibold text-[var(--muted)]">Quick:</span>
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              onClick={(e) => handleQuickAction(action, e)}
              disabled={quickLoading !== null}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${action.cls}`}
            >
              <i className={`fa-solid ${quickLoading === action.status ? "fa-spinner fa-spin" : action.icon} text-[10px]`}></i>
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center border-t border-[var(--line)] px-4 py-2.5">
          <span className="font-mono text-[10px] text-[var(--muted)]">#{report.id.slice(0, 8).toUpperCase()}</span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[9px]`}></i>
            {expanded ? "Collapse" : "Details"}
          </button>
        </div>
      )}

      {/* ── EXPANDED PANEL ── */}
      {expanded ? (
        <div className="border-t border-[var(--line)] px-4 pt-4 pb-4">
          {/* Info grid */}
          <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg bg-[var(--bg-gray)] p-3 text-[12px] sm:grid-cols-2">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Reporter</span>
              <span className="font-medium text-[var(--text)]">{report.reporter_name}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Contact</span>
              <a href={`tel:${report.contact_number}`} className="inline-flex items-center gap-1.5 font-bold text-[#2264b5]">
                <i className="fa-solid fa-phone text-[10px]"></i>
                {report.contact_number}
              </a>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Location</span>
              <span className="font-medium text-[var(--text)]">{report.address ?? "Location captured"}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Submitted</span>
              <span className="font-medium text-[var(--text)]">{formatTime(report.created_at)}</span>
            </div>
            {report.description ? (
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Description</span>
                <span className="font-medium text-[var(--text)]">{report.description}</span>
              </div>
            ) : null}
          </div>

          {/* Timeline */}
          <div className="mb-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Timeline</p>
            <div>
              {timeline.map((update, index) => (
                <div key={update.id} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <span
                      style={{ background: statusDot[update.status] }}
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                    ></span>
                    {index < timeline.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-[var(--line)]"></span>
                    ) : null}
                  </div>
                  <div className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusClasses[update.status]}`}>
                        {statusLabels[update.status]}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">{formatTime(update.created_at)}</span>
                      {update.updated_by ? (
                        <span className="text-[10px] text-[var(--muted)]">by {update.updated_by}</span>
                      ) : null}
                    </div>
                    {update.remarks ? (
                      <p className="mt-1 rounded-lg bg-[var(--bg-gray)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--text)]">
                        {update.remarks}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Update form */}
          <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--line)] bg-white p-3">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Update Report</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReportStatus)}
                  className="w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 py-2 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReportPriority)}
                  className="w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 py-2 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Assign to</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 py-2 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {RESPONDER_TEAMS.map((t) => <option key={t} value={t}>{t || "— No assignment —"}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRemarks((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <i className={`fa-solid ${showRemarks ? "fa-chevron-up" : "fa-chevron-down"} text-[9px]`}></i>
              {showRemarks ? "Hide remarks" : "Add remarks (optional)"}
            </button>

            {showRemarks ? (
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Response notes for this update..."
                className="mt-2 w-full resize-none rounded-lg border border-[#d7dde5] bg-white px-3 py-2 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
              />
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--red)] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[var(--red-dark)] disabled:opacity-60 sm:w-auto sm:justify-start sm:py-2.5"
            >
              <i className={isSubmitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk"}></i>
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
