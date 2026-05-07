"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { updateReportStatus } from "@/lib/actions/reportActions";
import { ReportPriority, ReportStatus } from "../../../types/report";
import type { ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { formatTime } from "../../lib/utils";

type ToastKind = "success" | "error" | "info";

type AdminReportCardProps = {
  report: ReportWithUpdates;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onOptimisticUpdate: (reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => void;
  onRollback: (report: ReportWithUpdates) => void;
  onToast: (message: string, kind?: ToastKind) => void;
  onOpenDrawer?: () => void;
};

const statusLabels: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Verified]: "Verified",
  [ReportStatus.InProgress]: "In Progress",
  [ReportStatus.Resolved]: "Resolved",
  [ReportStatus.Rejected]: "Rejected",
};

const statusClasses: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "bg-[#fff8dc] text-[#B89400]",
  [ReportStatus.Verified]: "bg-[#e8f1ff] text-[#2264b5]",
  [ReportStatus.InProgress]: "bg-[#fff0df] text-[#bf6416]",
  [ReportStatus.Resolved]: "bg-[var(--green-soft)] text-[var(--green)]",
  [ReportStatus.Rejected]: "bg-[#ffe8e8] text-[#b83232]",
};

const statusDot: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "#B89400",
  [ReportStatus.Verified]: "#2264b5",
  [ReportStatus.InProgress]: "#bf6416",
  [ReportStatus.Resolved]: "#20a45d",
  [ReportStatus.Rejected]: "#b83232",
};

const priorityLabels: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "Low",
  [ReportPriority.Medium]: "Medium",
  [ReportPriority.High]: "High",
  [ReportPriority.Critical]: "Critical",
};

const priorityClasses: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "bg-[#eef1f5] text-[var(--muted)]",
  [ReportPriority.Medium]: "bg-[#fff8dc] text-[#B89400]",
  [ReportPriority.High]: "bg-[#fff0df] text-[#bf6416]",
  [ReportPriority.Critical]: "bg-[#ffe8e8] text-[#b83232]",
};

const priorityBorder: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "border-l-[#d1d5db]",
  [ReportPriority.Medium]: "border-l-[#B89400]",
  [ReportPriority.High]: "border-l-[#bf6416]",
  [ReportPriority.Critical]: "border-l-[#b83232]",
};

const incidentIcon: Record<string, string> = {
  "Fire": "fa-fire",
  "Flood/Water Hazard": "fa-water",
  "Medical Emergency": "fa-kit-medical",
  "Crime/Security": "fa-shield-halved",
  "Accident": "fa-car-burst",
};

const incidentPalette: Record<string, string> = {
  "Fire": "bg-orange-50 text-orange-600",
  "Flood/Water Hazard": "bg-blue-50 text-blue-600",
  "Medical Emergency": "bg-red-50 text-red-600",
  "Crime/Security": "bg-slate-100 text-slate-700",
  "Accident": "bg-amber-50 text-amber-700",
  "default": "bg-slate-100 text-slate-600",
};

const statusOptions: { value: ReportStatus; label: string }[] = [
  { value: ReportStatus.Pending, label: "Pending" },
  { value: ReportStatus.Verified, label: "Verified" },
  { value: ReportStatus.InProgress, label: "In Progress" },
  { value: ReportStatus.Resolved, label: "Resolved" },
  { value: ReportStatus.Rejected, label: "Rejected" },
];

const priorityOptions: { value: ReportPriority; label: string }[] = [
  { value: ReportPriority.Low, label: "Low" },
  { value: ReportPriority.Medium, label: "Medium" },
  { value: ReportPriority.High, label: "High" },
  { value: ReportPriority.Critical, label: "Critical" },
];

const RESPONDER_TEAMS = ["", "Tanod Team A", "Tanod Team B", "BFP Sta. Rita", "PNP Station", "MDRRMO"];

type QuickAction = { label: string; icon: string; status: ReportStatus; cls: string };
const quickActions: Partial<Record<ReportStatus, QuickAction[]>> = {
  [ReportStatus.Pending]: [
    { label: "Verify", icon: "fa-circle-check", status: ReportStatus.Verified, cls: "border-[#2264b5] text-[#2264b5] hover:bg-[#e8f1ff]" },
    { label: "Reject", icon: "fa-circle-xmark", status: ReportStatus.Rejected, cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
  ],
  [ReportStatus.Verified]: [
    { label: "Dispatch", icon: "fa-person-running", status: ReportStatus.InProgress, cls: "border-[#bf6416] text-[#bf6416] hover:bg-[#fff0df]" },
    { label: "Reject", icon: "fa-circle-xmark", status: ReportStatus.Rejected, cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
  ],
  [ReportStatus.InProgress]: [
    { label: "Resolve", icon: "fa-flag-checkered", status: ReportStatus.Resolved, cls: "border-[var(--green)] text-[var(--green)] hover:bg-[var(--green-soft)]" },
    { label: "Reject", icon: "fa-circle-xmark", status: ReportStatus.Rejected, cls: "border-[#b83232] text-[#b83232] hover:bg-[#ffe8e8]" },
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
    : [{ id: `${report.id}-initial`, report_id: report.id, status: ReportStatus.Pending, remarks: null, updated_by: report.reporter_name, created_at: report.created_at }];
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
  onOpenDrawer,
}: AdminReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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
  const iconStyle = incidentPalette[report.incident_type] ?? incidentPalette.default;
  const isOld = Date.now() - new Date(report.created_at).getTime() > 30 * 60 * 1000;
  const actions = quickActions[report.status] ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) setDetailOpen(true);
  }, []);

  useEffect(() => {
    setStatus(report.status);
    setPriority(report.priority);
  }, [report.status, report.priority]);

  const humanId = useMemo(() => {
    const year = new Date(report.created_at).getFullYear();
    let hash = 0;
    for (let i = 0; i < report.id.length; i += 1) hash = (hash * 31 + report.id.charCodeAt(i)) % 10000;
    return `BA-${year}-${String(hash).padStart(4, "0")}`;
  }, [report.created_at, report.id]);

  const addressLine = report.address ?? (report.latitude && report.longitude ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}` : "Location unavailable");

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
      className={`w-full overflow-hidden rounded-xl border border-l-4 bg-white transition ${priorityBorder[report.priority]} ${isSelected ? "ring-2 ring-[var(--red)]/30" : ""}`}
    >
      {/* Card header — tappable on mobile to open drawer */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {onSelect ? (
          <label className="inline-flex h-10 w-6 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => { e.stopPropagation(); onSelect(report.id, e.target.checked); }}
              className="h-4 w-4 accent-[var(--red)]"
              aria-label={`Select report ${humanId}`}
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => onOpenDrawer ? onOpenDrawer() : setExpanded((v) => !v)}
          className="flex flex-1 items-start gap-3 text-left"
          aria-label={`Open ${report.incident_type} report`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconStyle}`}>
            <i className={`fa-solid ${icon} text-[16px]`}></i>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-[var(--muted)]">{humanId}</p>
                <h3 className="truncate text-[14px] font-bold text-[var(--text)]">{report.incident_type}</h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusClasses[report.status]}`}>
                  {statusLabels[report.status]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${priorityClasses[report.priority]}`}>
                  {priorityLabels[report.priority]}
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">{report.reporter_name}</span>
              <span className="truncate max-w-full">{addressLine}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Action row — always visible on mobile */}
      <div className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-2.5">
        <a
          href={`tel:${report.contact_number}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-[12px] font-semibold text-[#2264b5]"
          aria-label={`Call ${report.reporter_name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <i className="fa-solid fa-phone text-[11px]"></i>
          <span className="hidden sm:inline">Call</span>
        </a>
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={(e) => handleQuickAction(action, e)}
            disabled={quickLoading !== null}
            className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold transition disabled:opacity-50 ${action.cls}`}
            aria-label={action.label}
          >
            <i className={`fa-solid ${quickLoading === action.status ? "fa-spinner fa-spin" : action.icon} text-[11px]`}></i>
            <span>{action.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOpenDrawer ? onOpenDrawer() : setDetailOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0D1B2A] px-3 text-[12px] font-semibold text-white"
          aria-label="Open report details"
        >
          <i className="fa-solid fa-eye text-[11px]"></i>
          <span className="hidden sm:inline">Details</span>
        </button>

        {/* Desktop toggle for inline form */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-black/10 sm:inline-flex"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[11px]`}></i>
        </button>

        <span
          title={formatTime(report.created_at)}
          className={`ml-auto hidden text-[11px] sm:block ${report.status === ReportStatus.Pending && isOld ? "font-bold text-[#b83232]" : "text-[var(--muted)]"}`}
        >
          {elapsed}
        </span>
      </div>

      {expanded && detailOpen ? (
        <div className="border-t border-[var(--line)] px-4 pb-4">
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-[var(--bg-gray)] p-3 text-[12px] sm:grid-cols-2">
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
              <span className="font-medium text-[var(--text)]">{addressLine}</span>
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

          <div className="mt-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Timeline</p>
            <div>
              {timeline.map((update, index) => (
                <div key={update.id} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <span
                      style={{ background: statusDot[update.status] }}
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                    ></span>
                    {index < timeline.length - 1 ? <span className="mt-1 w-px flex-1 bg-[var(--line)]"></span> : null}
                  </div>
                  <div className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusClasses[update.status]}`}>
                        {statusLabels[update.status]}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">{formatTime(update.created_at)}</span>
                      {update.updated_by ? <span className="text-[10px] text-[var(--muted)]">by {update.updated_by}</span> : null}
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

          <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-[var(--line)] bg-white p-3">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Update Report</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReportStatus)}
                  className="h-12 w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 text-[16px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReportPriority)}
                  className="h-12 w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 text-[16px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {priorityOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Assign to</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-12 w-full rounded-lg border border-[#d7dde5] bg-white px-2.5 text-[16px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
                >
                  {RESPONDER_TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t || "— No assignment —"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRemarks((v) => !v)}
              className="mt-3 inline-flex h-11 items-center gap-1.5 text-[12px] font-semibold text-[var(--muted)]"
              aria-label={showRemarks ? "Hide remarks" : "Add remarks"}
            >
              <i className={`fa-solid ${showRemarks ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`}></i>
              {showRemarks ? "Hide remarks" : "Add remarks (optional)"}
            </button>

            {showRemarks ? (
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Response notes for this update..."
                className="mt-2 w-full resize-none rounded-lg border border-[#d7dde5] bg-white px-3 py-2 text-[16px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
              />
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--red)] px-5 text-[12px] font-bold text-white transition hover:bg-[var(--red-dark)] disabled:opacity-60"
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
