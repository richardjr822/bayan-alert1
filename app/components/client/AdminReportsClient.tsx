"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { exportHistoryCSV, updateReportStatus } from "@/lib/actions/reportActions";
import { supabase } from "@/lib/supabase/client";
import { ReportPriority, ReportStatus } from "@/types/report";
import type { ReportWithUpdates, StatusUpdate } from "@/types/report";
import AdminReportCard from "./AdminReportCard";
import ReportDetailDrawer from "./ReportDetailDrawer";
import ToastStack from "./ToastStack";

type ToastKind = "success" | "error" | "info";

type Props = {
  reports: ReportWithUpdates[];
  initialTab?: "active" | "history";
};

type BulkMode = "idle" | "assign";

const ACTIVE_STATUSES = [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress];
const HISTORY_STATUSES = [ReportStatus.Resolved, ReportStatus.Rejected];
const PRIORITY_VALUES = [ReportPriority.Low, ReportPriority.Medium, ReportPriority.High, ReportPriority.Critical];

const STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Verified]: "Verified",
  [ReportStatus.InProgress]: "In Progress",
  [ReportStatus.Resolved]: "Resolved",
  [ReportStatus.Rejected]: "Rejected",
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "Low",
  [ReportPriority.Medium]: "Medium",
  [ReportPriority.High]: "High",
  [ReportPriority.Critical]: "Critical",
};

const STATUS_BADGES: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "bg-[#fff8dc] text-[#B89400]",
  [ReportStatus.Verified]: "bg-[#e8f1ff] text-[#2264b5]",
  [ReportStatus.InProgress]: "bg-[#fff0df] text-[#bf6416]",
  [ReportStatus.Resolved]: "bg-[var(--green-soft)] text-[var(--green)]",
  [ReportStatus.Rejected]: "bg-[#ffe8e8] text-[#b83232]",
};

const PRIORITY_BADGES: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "bg-[#eef1f5] text-[var(--muted)]",
  [ReportPriority.Medium]: "bg-[#fff8dc] text-[#B89400]",
  [ReportPriority.High]: "bg-[#fff0df] text-[#bf6416]",
  [ReportPriority.Critical]: "bg-[#ffe8e8] text-[#b83232]",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString();
}

function formatHumanId(report: ReportWithUpdates) {
  const year = new Date(report.created_at).getFullYear();
  let hash = 0;
  for (let i = 0; i < report.id.length; i += 1) hash = (hash * 31 + report.id.charCodeAt(i)) % 10000;
  return `BA-${year}-${String(hash).padStart(4, "0")}`;
}

function getDurationMinutes(report: ReportWithUpdates) {
  const last = report.status_updates[report.status_updates.length - 1];
  const end = last ? new Date(last.created_at).getTime() : new Date(report.updated_at).getTime();
  const start = new Date(report.created_at).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function getLastUpdate(report: ReportWithUpdates): StatusUpdate | null {
  if (!report.status_updates.length) return null;
  return report.status_updates[report.status_updates.length - 1] ?? null;
}

export default function AdminReportsClient({ reports: initialReports, initialTab = "active" }: Props) {
  const [items, setItems] = useState<ReportWithUpdates[]>(initialReports);
  const [tab, setTab] = useState<"active" | "history">(initialTab);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<BulkMode>("idle");
  const [bulkAssignTeam, setBulkAssignTeam] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState<"today" | "week" | "month" | "custom">("month");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [page, setPage] = useState(1);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<{ id: string; message: string; kind: ToastKind }[]>([]);
  const [drawerReport, setDrawerReport] = useState<ReportWithUpdates | null>(null);

  const pushToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-reports-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const report = payload.new as ReportWithUpdates;
          setItems((prev) => [{ ...report, status_updates: [] }, ...prev]);
          pushToast(`New report: ${report.incident_type}`, "info");
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reports" },
        (payload) => {
          const updated = payload.new as ReportWithUpdates;
          setItems((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_updates" },
        (payload) => {
          const update = payload.new as StatusUpdate;
          setItems((prev) =>
            prev.map((r) =>
              r.id === update.report_id
                ? { ...r, status: update.status, status_updates: [...r.status_updates, update] }
                : r,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pushToast]);

  const activeItems = useMemo(() => items.filter((r) => ACTIVE_STATUSES.includes(r.status)), [items]);
  const historyItems = useMemo(() => items.filter((r) => HISTORY_STATUSES.includes(r.status)), [items]);

  const filteredActive = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const base = activeItems.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (!normalized) return true;
      const hay = `${r.reporter_name} ${r.incident_type} ${r.address ?? ""} ${r.id}`.toLowerCase();
      return hay.includes(normalized);
    });

    const sorted = [...base].sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "severity") {
        const order: Record<ReportPriority, number> = {
          [ReportPriority.Critical]: 1,
          [ReportPriority.High]: 2,
          [ReportPriority.Medium]: 3,
          [ReportPriority.Low]: 4,
        };
        return order[a.priority] - order[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted;
  }, [activeItems, search, statusFilter, priorityFilter, sortBy]);

  const filteredHistory = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const now = new Date();
    const start = new Date(now);
    if (historyRange === "today") start.setHours(0, 0, 0, 0);
    if (historyRange === "week") start.setDate(start.getDate() - 7);
    if (historyRange === "month") start.setMonth(start.getMonth() - 1);

    const inRange = (iso: string) => {
      if (historyRange === "custom") {
        if (!historyStart || !historyEnd) return true;
        const d = new Date(iso).getTime();
        const s = new Date(historyStart).getTime();
        const e = new Date(historyEnd).getTime();
        return d >= s && d <= e;
      }
      return new Date(iso).getTime() >= start.getTime();
    };

    return historyItems.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!inRange(r.created_at)) return false;
      if (!normalized) return true;
      const hay = `${r.reporter_name} ${r.incident_type} ${r.address ?? ""} ${r.id}`.toLowerCase();
      return hay.includes(normalized);
    });
  }, [historyItems, historyRange, historyStart, historyEnd, search, statusFilter]);

  const pagedHistory = useMemo(() => {
    const start = (page - 1) * 25;
    return filteredHistory.slice(start, start + 25);
  }, [filteredHistory, page]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / 25));

  useEffect(() => {
    setPage((current) => (current > totalPages ? totalPages : current));
  }, [totalPages]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      if (checked) return [...prev, id];
      return prev.filter((item) => item !== id);
    });
  };

  const clearSelection = () => {
    setSelected([]);
    setBulkMode("idle");
    setBulkAssignTeam("");
  };

  const updateLocalReport = (reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status,
              priority,
              updated_at: update?.created_at ?? r.updated_at,
              status_updates: update ? [...r.status_updates, update] : r.status_updates,
            }
          : r,
      ),
    );
  };

  const handleOptimisticUpdate = (reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => {
    updateLocalReport(reportId, status, priority, update);
  };

  const handleRollback = (report: ReportWithUpdates) => {
    setItems((prev) => prev.map((r) => (r.id === report.id ? report : r)));
  };

  const runBulkUpdate = async (status: ReportStatus, remarks: string, assignedTo?: string) => {
    if (bulkLoading) return;
    setBulkLoading(true);

    const previous = items.filter((r) => selected.includes(r.id));
    const optimisticUpdates = selected.map((id) => ({
      id: `bulk-${id}-${Date.now()}`,
      report_id: id,
      status,
      remarks: remarks || null,
      updated_by: "Admin",
      created_at: new Date().toISOString(),
    }));

    selected.forEach((id, index) => {
      const current = items.find((r) => r.id === id);
      if (!current) return;
      updateLocalReport(id, status, current.priority, optimisticUpdates[index]);
    });

    const results = await Promise.all(
      selected.map((id) =>
        updateReportStatus({ reportId: id, status, priority: items.find((r) => r.id === id)?.priority ?? ReportPriority.Low, remarks, assignedTo }),
      ),
    );

    const hasError = results.some((r) => "error" in r);
    if (hasError) {
      previous.forEach((r) => handleRollback(r));
      pushToast("Some updates failed. Try again.", "error");
    } else {
      pushToast("Bulk update applied.", "success");
      clearSelection();
    }

    setBulkLoading(false);
  };

  const exportCSV = async () => {
    const result = await exportHistoryCSV(statusFilter === "all" ? "all" : statusFilter, historyRange, historyStart, historyEnd);
    if (typeof result === "object" && "error" in result) {
      pushToast(result.error, "error");
      return;
    }
    const blob = new Blob([result], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bayanalert-history-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setTab("active");
              setPage(1);
              setSelected([]);
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className={`min-h-[44px] rounded-full px-4 text-[12px] font-semibold ${tab === "active" ? "bg-[#0D1B2A] text-white" : "text-[var(--muted)]"}`}
            aria-label="Show active reports"
          >
            Active Reports
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("history");
              setPage(1);
              setSelected([]);
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className={`min-h-[44px] rounded-full px-4 text-[12px] font-semibold ${tab === "history" ? "bg-[#0D1B2A] text-white" : "text-[var(--muted)]"}`}
            aria-label="Show report history"
          >
            History
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports"
          className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
          style={{ minWidth: "160px" }}
          aria-label="Search reports"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
          className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
          style={{ minWidth: "130px" }}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          {tab === "active"
            ? ACTIVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))
            : HISTORY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
        </select>
        {tab === "active" ? (
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ReportPriority | "all")}
            className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
            style={{ minWidth: "130px" }}
            aria-label="Filter by severity"
          >
            <option value="all">All Severity</option>
            {PRIORITY_VALUES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        ) : null}
        {tab === "active" ? (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "severity")}
            className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
            style={{ minWidth: "120px" }}
            aria-label="Sort reports"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="severity">Severity</option>
          </select>
        ) : null}

        {tab === "history" ? (
          <>
            <select
              value={historyRange}
              onChange={(e) => setHistoryRange(e.target.value as "today" | "week" | "month" | "custom")}
              className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
              style={{ minWidth: "130px" }}
              aria-label="Filter by date range"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
            {historyRange === "custom" ? (
              <>
                <input
                  type="date"
                  value={historyStart}
                  onChange={(e) => setHistoryStart(e.target.value)}
                  className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
                  style={{ minWidth: "140px" }}
                  aria-label="Start date"
                />
                <input
                  type="date"
                  value={historyEnd}
                  onChange={(e) => setHistoryEnd(e.target.value)}
                  className="h-12 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-[var(--text)]"
                  style={{ minWidth: "140px" }}
                  aria-label="End date"
                />
              </>
            ) : null}
            <button
              type="button"
              onClick={exportCSV}
              className="h-12 rounded-lg bg-[#0D1B2A] px-4 text-[12px] font-semibold text-white"
              aria-label="Export history to CSV"
            >
              Export CSV
            </button>
          </>
        ) : null}
      </div>

      {tab === "active" ? (
        <div className="mt-6 space-y-4">
          {filteredActive.length === 0 ? (
            <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[13px] text-[var(--muted)]">
              No active reports found.
            </div>
          ) : (
            filteredActive.map((report) => (
              <AdminReportCard
                key={report.id}
                report={report}
                isSelected={selected.includes(report.id)}
                onSelect={handleSelect}
                onOptimisticUpdate={handleOptimisticUpdate}
                onRollback={handleRollback}
                onToast={pushToast}
                onOpenDrawer={() => setDrawerReport(report)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="mt-6">
          <div className="hidden overflow-hidden rounded-xl border border-black/10 bg-white md:block">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-[var(--bg-gray)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Report ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Resolved/Rejected</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Final Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((report) => {
                  const lastUpdate = getLastUpdate(report);
                  const duration = getDurationMinutes(report);
                  const isOpen = expandedHistory[report.id] ?? false;
                  return (
                    <Fragment key={report.id}>
                      <tr className="border-t border-black/5">
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--muted)]">{formatHumanId(report)}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--text)]">{report.incident_type}</td>
                        <td className="px-4 py-3 text-[var(--text)]">{report.reporter_name}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{report.address ?? `${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{formatTime(report.created_at)}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{lastUpdate ? formatTime(lastUpdate.created_at) : "—"}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{duration} mins</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_BADGES[report.status]}`}>
                            {STATUS_LABELS[report.status]}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t border-black/5">
                        <td colSpan={8} className="px-4 pb-4">
                          <button
                            type="button"
                            onClick={() => setExpandedHistory((prev) => ({ ...prev, [report.id]: !isOpen }))}
                            className="inline-flex h-11 items-center gap-2 text-[12px] font-semibold text-[var(--text)]"
                            aria-label="Toggle history details"
                          >
                            <i className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                            {isOpen ? "Hide details" : "View details"}
                          </button>
                          {isOpen ? (
                            <div className="mt-3 rounded-lg bg-[var(--bg-gray)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Resolution Note</p>
                              <p className="mt-1 text-[12px] text-[var(--text)]">{lastUpdate?.remarks ?? "No remarks provided."}</p>
                              <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Timeline</p>
                                <div className="mt-2 space-y-2">
                                  {report.status_updates.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between text-[12px]">
                                      <span className="font-semibold text-[var(--text)]">{STATUS_LABELS[u.status]}</span>
                                      <span className="text-[var(--muted)]">{formatTime(u.created_at)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {pagedHistory.map((report) => {
              const lastUpdate = getLastUpdate(report);
              const duration = getDurationMinutes(report);
              const isOpen = expandedHistory[report.id] ?? false;
              return (
                <div key={report.id} className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-[var(--muted)]">{formatHumanId(report)}</p>
                      <p className="text-[13px] font-bold text-[var(--text)]">{report.incident_type}</p>
                      <p className="text-[12px] text-[var(--muted)]">{report.reporter_name}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_BADGES[report.status]}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  <div className="mt-3 text-[12px] text-[var(--muted)]">
                    <p>{report.address ?? `${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`}</p>
                    <p className="mt-1">Submitted {formatTime(report.created_at)}</p>
                    <p className="mt-1">Resolved {lastUpdate ? formatTime(lastUpdate.created_at) : "—"}</p>
                    <p className="mt-1">Duration {duration} mins</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedHistory((prev) => ({ ...prev, [report.id]: !isOpen }))}
                    className="mt-3 inline-flex h-11 items-center gap-2 text-[12px] font-semibold text-[var(--text)]"
                    aria-label="Toggle history details"
                  >
                    <i className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                    {isOpen ? "Hide details" : "View details"}
                  </button>
                  {isOpen ? (
                    <div className="mt-3 rounded-lg bg-[var(--bg-gray)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Resolution Note</p>
                      <p className="mt-1 text-[12px] text-[var(--text)]">{lastUpdate?.remarks ?? "No remarks provided."}</p>
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Timeline</p>
                        <div className="mt-2 space-y-2">
                          {report.status_updates.map((u) => (
                            <div key={u.id} className="flex items-center justify-between text-[12px]">
                              <span className="font-semibold text-[var(--text)]">{STATUS_LABELS[u.status]}</span>
                              <span className="text-[var(--muted)]">{formatTime(u.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-11 rounded-lg border border-black/10 px-3 text-[12px] font-semibold text-[var(--text)] disabled:opacity-40"
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-11 rounded-lg border border-black/10 px-3 text-[12px] font-semibold text-[var(--text)] disabled:opacity-40"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selected.length > 0 ? (
        <div className="fixed bottom-[64px] left-0 right-0 z-40 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#D4AA00] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] text-[#0D1B2A] shadow-2xl">
            <span className="text-[12px] font-bold">{selected.length} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              {bulkMode === "assign" ? (
                <select
                  value={bulkAssignTeam}
                  onChange={(e) => setBulkAssignTeam(e.target.value)}
                  className="h-11 rounded-lg border border-black/20 bg-white px-3 text-[12px]"
                  aria-label="Assign team"
                >
                  <option value="">Select team</option>
                  <option value="Tanod Team A">Tanod Team A</option>
                  <option value="Tanod Team B">Tanod Team B</option>
                  <option value="BFP Sta. Rita">BFP Sta. Rita</option>
                  <option value="PNP Station">PNP Station</option>
                  <option value="MDRRMO">MDRRMO</option>
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => runBulkUpdate(ReportStatus.Verified, "")}
                className="h-11 rounded-lg bg-white px-3 text-[12px] font-bold"
                aria-label="Mark verified"
                disabled={bulkLoading}
              >
                {bulkLoading ? "Updating..." : "Mark Verified"}
              </button>
              <button
                type="button"
                onClick={() => setBulkMode("assign")}
                className="h-11 rounded-lg bg-white px-3 text-[12px] font-bold"
                aria-label="Assign team"
                disabled={bulkLoading}
              >
                Assign Team
              </button>
              {bulkMode === "assign" ? (
                <button
                  type="button"
                  onClick={() => runBulkUpdate(ReportStatus.InProgress, bulkAssignTeam ? `Assigned to: ${bulkAssignTeam}` : "", bulkAssignTeam || undefined)}
                  className="h-11 rounded-lg bg-[#0D1B2A] px-3 text-[12px] font-bold text-white"
                  aria-label="Confirm assign"
                  disabled={!bulkAssignTeam || bulkLoading}
                >
                  Confirm
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => runBulkUpdate(ReportStatus.Rejected, "Marked as duplicate")}
                className="h-11 rounded-lg bg-white px-3 text-[12px] font-bold"
                aria-label="Mark duplicate"
                disabled={bulkLoading}
              >
                Mark Duplicate
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="h-11 rounded-lg border border-black/20 bg-white px-3 text-[12px] font-bold"
                aria-label="Cancel selection"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ReportDetailDrawer
        report={drawerReport ? items.find((r) => r.id === drawerReport.id) ?? drawerReport : null}
        onClose={() => setDrawerReport(null)}
        onOptimisticUpdate={handleOptimisticUpdate}
        onRollback={handleRollback}
        onToast={pushToast}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}
