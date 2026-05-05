"use client";

import { useMemo, useState } from "react";
import type { ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import AdminReportCard from "./AdminReportCard";
import SelectInput from "./ui/SelectInput";
import StatCard from "./StatCard";
import ToastStack from "./ToastStack";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};

type StatusFilter = "all" | ReportStatus;
type PriorityFilter = "all" | ReportPriority;
type SortFilter = "newest" | "oldest";

export type AdminDashboardStats = {
  total: number;
  pending: number;
  active: number;
  resolved: number;
  rejected: number;
};

type AdminDashboardClientProps = {
  reports: ReportWithUpdates[];
  stats: AdminDashboardStats;
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const priorityOptions: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const sortOptions: { value: SortFilter; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AdminDashboardClient({ reports, stats }: AdminDashboardClientProps) {
  const [items, setItems] = useState(reports);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const updateReportOptimistically = (
    reportId: string,
    status: ReportStatus,
    priority: ReportPriority,
    update: StatusUpdate | null,
  ) => {
    setItems((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
              priority,
              updated_at: update?.created_at ?? new Date().toISOString(),
              status_updates: update ? [...report.status_updates, update] : report.status_updates,
            }
          : report,
      ),
    );
  };

  const replaceReport = (report: ReportWithUpdates) => {
    setItems((prev) => prev.map((item) => (item.id === report.id ? report : item)));
  };

  const filteredReports = useMemo(() => {
    return [...items]
      .filter((report) => statusFilter === "all" || report.status === statusFilter)
      .filter((report) => priorityFilter === "all" || report.priority === priorityFilter)
      .sort((a, b) => {
        const left = new Date(a.created_at).getTime();
        const right = new Date(b.created_at).getTime();
        return sortFilter === "newest" ? right - left : left - right;
      });
  }, [items, priorityFilter, sortFilter, statusFilter]);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-5">
        <StatCard value={stats.total} label="Total Reports" />
        <StatCard value={stats.pending} label="Pending" />
        <StatCard value={stats.active} label="Active" />
        <StatCard value={stats.resolved} label="Resolved" />
        <StatCard value={stats.rejected} label="Rejected" />
      </div>

      <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput
            id="statusFilter"
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            options={statusOptions}
          />
          <SelectInput
            id="priorityFilter"
            label="Priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            options={priorityOptions}
          />
          <SelectInput
            id="sortFilter"
            label="Sort"
            value={sortFilter}
            onChange={(event) => setSortFilter(event.target.value as SortFilter)}
            options={sortOptions}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {filteredReports.length ? (
          filteredReports.map((report) => (
            <AdminReportCard
              key={report.id}
              report={report}
              onOptimisticUpdate={updateReportOptimistically}
              onRollback={replaceReport}
              onToast={pushToast}
            />
          ))
        ) : (
          <div className="rounded-md border border-[#cfd5dc] bg-white p-6 text-center text-[12px] text-[var(--muted)]">
            No reports match the selected filters.
          </div>
        )}
      </div>
      <ToastStack toasts={toasts} />
    </>
  );
}
