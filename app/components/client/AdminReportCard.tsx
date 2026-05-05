"use client";

import { useState, type FormEvent } from "react";
import { updateReportStatus } from "@/lib/actions/reportActions";
import type { ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import { formatTime } from "../../lib/utils";
import Button from "./ui/Button";
import SelectInput from "./ui/SelectInput";
import Textarea from "./ui/Textarea";

type ToastKind = "success" | "error" | "info";

type AdminReportCardProps = {
  report: ReportWithUpdates;
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

function createOptimisticUpdate(reportId: string, status: ReportStatus, remarks: string): StatusUpdate {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    report_id: reportId,
    status,
    remarks,
    updated_by: "Admin",
    created_at: new Date().toISOString(),
  };
}

export default function AdminReportCard({ report, onOptimisticUpdate, onRollback, onToast }: AdminReportCardProps) {
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [priority, setPriority] = useState<ReportPriority>(report.priority);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeline = getTimeline(report);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanRemarks = remarks.trim();

    if (!cleanRemarks) {
      onToast("Remarks are required before updating a report.", "error");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    const previousReport = report;
    const optimisticUpdate = createOptimisticUpdate(report.id, status, cleanRemarks);
    onOptimisticUpdate(report.id, status, priority, optimisticUpdate);

    const result = await updateReportStatus({
      reportId: report.id,
      status,
      priority,
      remarks: cleanRemarks,
    });

    setIsSubmitting(false);

    if ("error" in result) {
      onRollback(previousReport);
      onToast(result.error, "error");
      return;
    }

    setRemarks("");
    onToast("Report updated successfully.", "success");
  };

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
        <span>Reporter:</span>
        <strong className="font-medium text-[var(--text)]">{report.reporter_name}</strong>
        <span>Contact:</span>
        <strong className="font-medium text-[var(--text)]">{report.contact_number}</strong>
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

      <form className="mt-4 border-t border-[var(--line)] pt-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput
            id={`status-${report.id}`}
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ReportStatus)}
            options={statusOptions}
          />
          <SelectInput
            id={`priority-${report.id}`}
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as ReportPriority)}
            options={priorityOptions}
          />
        </div>
        <Textarea
          id={`remarks-${report.id}`}
          label="Remarks *"
          rows={3}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Add response notes for this status update"
          required
        />
        <Button type="submit" variant="red" className="mt-3 w-full sm:w-auto" disabled={isSubmitting}>
          <i className={isSubmitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk"}></i>
          <span>{isSubmitting ? "Updating..." : "Update Report"}</span>
        </Button>
      </form>
    </article>
  );
}
