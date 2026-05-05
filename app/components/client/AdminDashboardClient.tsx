"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { updateReportStatus } from "@/lib/actions/reportActions";
import { supabase } from "@/lib/supabase/client";
import type { Report, ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import AdminReportCard from "./AdminReportCard";
import ToastStack from "./ToastStack";

const AdminMapView = dynamic(() => import("./AdminMapView"), { ssr: false });

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; message: string; kind: ToastKind };
type Tab = "list" | "map" | "analytics";
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

type Props = { reports: ReportWithUpdates[]; stats: AdminDashboardStats };

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {}
}

export default function AdminDashboardClient({ reports: initial }: Props) {
  const [items, setItems] = useState<ReportWithUpdates[]>(initial);
  const [tab, setTab] = useState<Tab>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ReportStatus>("verified");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const r = payload.new as Report;
          setItems((prev) => [{ ...r, status_updates: [] }, ...prev]);
          playChime();
          pushToast(`New report: ${r.incident_type} — ${r.reporter_name}`, "info");
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("New Emergency Report", {
              body: `${r.incident_type} — ${r.address ?? "Location captured"}`,
              icon: "/app-logo.png",
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pushToast]);

  const liveStats = useMemo(() => ({
    total: items.length,
    pending: items.filter((r) => r.status === "pending").length,
    active: items.filter((r) => r.status === "verified" || r.status === "in_progress").length,
    resolved: items.filter((r) => r.status === "resolved").length,
    rejected: items.filter((r) => r.status === "rejected").length,
  }), [items]);

  const updateOptimistically = useCallback(
    (reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => {
      setItems((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status, priority, updated_at: update?.created_at ?? new Date().toISOString(), status_updates: update ? [...r.status_updates, update] : r.status_updates }
            : r,
        ),
      );
    }, [],
  );

  const replaceReport = useCallback((report: ReportWithUpdates) => {
    setItems((prev) => prev.map((r) => (r.id === report.id ? report : r)));
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...items]
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => priorityFilter === "all" || r.priority === priorityFilter)
      .filter((r) => {
        if (!q) return true;
        return (
          r.reporter_name.toLowerCase().includes(q) ||
          r.contact_number.includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.address ?? "").toLowerCase().includes(q) ||
          r.incident_type.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const l = new Date(a.created_at).getTime();
        const rv = new Date(b.created_at).getTime();
        return sortFilter === "newest" ? rv - l : l - rv;
      });
  }, [items, statusFilter, priorityFilter, sortFilter, search]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredReports.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkUpdate = async () => {
    if (!selectedIds.size || isBulkUpdating) return;
    setIsBulkUpdating(true);
    let succeeded = 0;
    for (const id of selectedIds) {
      const report = items.find((r) => r.id === id);
      if (!report) continue;
      const result = await updateReportStatus({ reportId: id, status: bulkStatus, priority: report.priority });
      if (!("error" in result)) {
        updateOptimistically(id, bulkStatus, report.priority, null);
        succeeded++;
      }
    }
    setIsBulkUpdating(false);
    clearSelection();
    pushToast(`${succeeded} report${succeeded !== 1 ? "s" : ""} updated to ${bulkStatus}.`, "success");
  };

  const analyticsData = useMemo(() => {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const r of items) {
      byType[r.incident_type] = (byType[r.incident_type] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
    }
    const resolved = items.filter((r) => r.status === "resolved" && r.status_updates.length > 0);
    const avgMs = resolved.length
      ? resolved.reduce((sum, r) => {
          const last = r.status_updates[r.status_updates.length - 1];
          return sum + (new Date(last.created_at).getTime() - new Date(r.created_at).getTime());
        }, 0) / resolved.length
      : 0;
    const avgHours = Math.round(avgMs / 36e5 * 10) / 10;
    return { byType, byStatus, byPriority, avgHours, resolvedCount: resolved.length };
  }, [items]);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "list", label: "Reports", icon: "fa-solid fa-list-ul" },
    { key: "map", label: "Map", icon: "fa-solid fa-map-location-dot" },
    { key: "analytics", label: "Analytics", icon: "fa-solid fa-chart-bar" },
  ];

  const PRIORITY_COLORS: Record<string, string> = {
    low: "#6b7280", medium: "#B89400", high: "#bf6416", critical: "#b83232",
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "#B89400", verified: "#2264b5", in_progress: "#bf6416", resolved: "#20a45d", rejected: "#b83232",
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
        {([
          ["Total", liveStats.total, "text-[var(--dark)]"],
          ["Pending", liveStats.pending, "text-[#B89400]"],
          ["Active", liveStats.active, "text-[#bf6416]"],
          ["Resolved", liveStats.resolved, "text-[var(--green)]"],
          ["Rejected", liveStats.rejected, "text-[#b83232]"],
        ] as [string, number, string][]).map(([label, value, cls]) => (
          <div key={label} className="rounded-xl border border-[var(--line)] bg-white px-2 py-3 text-center shadow-sm md:p-4">
            <p className={`text-[18px] font-extrabold md:text-[22px] ${cls}`}>{value}</p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--muted)] md:text-[11px]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-1 rounded-xl border border-[var(--line)] bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[12px] font-bold transition sm:px-4 ${tab === t.key ? "bg-[var(--dark)] text-white shadow" : "text-[var(--muted)] hover:bg-[var(--bg-gray)]"}`}
          >
            <i className={t.icon}></i>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "map" ? (
        <AdminMapView reports={items} />
      ) : tab === "analytics" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold text-[var(--text)]">Incidents by Type</h3>
            <div className="space-y-3">
              {Object.entries(analyticsData.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-[var(--text)]">{type}</span>
                      <span className="font-bold text-[var(--text)]">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-gray)]">
                      <div
                        className="h-full rounded-full bg-[var(--red)] transition-all"
                        style={{ width: `${(count / liveStats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold text-[var(--text)]">Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(analyticsData.byStatus).map(([s, count]) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-20 text-[11px] font-semibold capitalize text-[var(--muted)]">{s.replace("_", " ")}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-gray)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(count / liveStats.total) * 100}%`, background: STATUS_COLORS[s] ?? "#6b7280" }}
                    />
                  </div>
                  <span className="w-6 text-right text-[12px] font-bold text-[var(--text)]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold text-[var(--text)]">Priority Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analyticsData.byPriority).map(([p, count]) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-16 text-[11px] font-semibold capitalize text-[var(--muted)]">{p}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-gray)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(count / liveStats.total) * 100}%`, background: PRIORITY_COLORS[p] ?? "#6b7280" }}
                    />
                  </div>
                  <span className="w-6 text-right text-[12px] font-bold text-[var(--text)]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[13px] font-bold text-[var(--text)]">Response Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green-soft)]">
                  <i className="fa-solid fa-clock-rotate-left text-[20px] text-[var(--green)]"></i>
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-[var(--text)]">
                    {analyticsData.resolvedCount > 0 ? `${analyticsData.avgHours}h` : "—"}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Average resolution time</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green-soft)]">
                  <i className="fa-solid fa-circle-check text-[20px] text-[var(--green)]"></i>
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-[var(--text)]">{analyticsData.resolvedCount}</p>
                  <p className="text-[11px] text-[var(--muted)]">Reports resolved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, contact, address, ID..."
                className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-2 focus:ring-[var(--red)]/20"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2.5 text-[11px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2.5 text-[11px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
              >
                <option value="all">All priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value as SortFilter)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2.5 text-[11px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-[11px] font-semibold text-[var(--red-dark)] hover:underline">
                Select all ({filteredReports.length})
              </button>
              {selectedIds.size > 0 ? (
                <button onClick={clearSelection} className="text-[11px] font-semibold text-[var(--muted)] hover:underline">
                  Clear ({selectedIds.size})
                </button>
              ) : null}
            </div>
            <span className="text-[11px] text-[var(--muted)]">{filteredReports.length} reports</span>
          </div>

          {selectedIds.size > 0 ? (
            <div className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[var(--text)]">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="p-1 text-[var(--muted)]">
                  <i className="fa-solid fa-xmark text-[12px]"></i>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as ReportStatus)}
                  className="flex-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-[11px] text-[var(--text)] focus:outline-none"
                >
                  <option value="verified">Mark Verified</option>
                  <option value="in_progress">Mark In Progress</option>
                  <option value="resolved">Mark Resolved</option>
                  <option value="rejected">Mark Rejected</option>
                </select>
                <button
                  onClick={handleBulkUpdate}
                  disabled={isBulkUpdating}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--dark)] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-60"
                >
                  <i className={isBulkUpdating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check-double"}></i>
                  {isBulkUpdating ? "Updating..." : "Apply"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {filteredReports.length ? (
              filteredReports.map((report) => (
                <AdminReportCard
                  key={report.id}
                  report={report}
                  isSelected={selectedIds.has(report.id)}
                  onSelect={toggleSelect}
                  onOptimisticUpdate={updateOptimistically}
                  onRollback={replaceReport}
                  onToast={pushToast}
                />
              ))
            ) : (
              <div className="rounded-xl border border-[#cfd5dc] bg-white p-8 text-center text-[12px] text-[var(--muted)]">
                <i className="fa-solid fa-filter text-[24px] opacity-30"></i>
                <p className="mt-3">No reports match the selected filters.</p>
              </div>
            )}
          </div>
        </>
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
