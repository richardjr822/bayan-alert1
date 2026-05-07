"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ReportPriority, ReportStatus } from "../../../types/report";
import type { Report, ReportWithUpdates, StatusUpdate } from "../../../types/report";
import ToastStack from "./ToastStack";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; message: string; kind: ToastKind };

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

function timeSince(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

const TYPE_ICONS: Record<string, string> = {
  Fire: "fa-solid fa-fire text-red-500",
  Medical: "fa-solid fa-notes-medical text-blue-500",
  Crime: "fa-solid fa-user-ninja text-gray-700",
  Accident: "fa-solid fa-car-burst text-orange-500",
  Natural_Disaster: "fa-solid fa-house-tsunami text-teal-600",
  Other: "fa-solid fa-triangle-exclamation text-gray-500",
};

export default function AdminDashboardClient({ reports: initial }: Props) {
  const [items, setItems] = useState<ReportWithUpdates[]>(initial);
  const [realtimeStatus, setRealtimeStatus] = useState<"CONNECTED" | "DISCONNECTED" | "CONNECTING">("CONNECTING");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<"today" | "week" | "month" | "all">("week");
  const [nowBase] = useState(() => Date.now());

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
        }
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
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("CONNECTED");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setRealtimeStatus("DISCONNECTED");
      });
    return () => { supabase.removeChannel(channel); };
  }, [pushToast]);

  const liveStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const resolvedToday = items.filter(r => {
      if (r.status !== ReportStatus.Resolved) return false;
      const lastUpdate = r.status_updates[r.status_updates.length - 1];
      const dateStr = lastUpdate ? lastUpdate.created_at : r.updated_at;
      return dateStr.startsWith(today);
    }).length;

    return {
      total: items.length,
      pending: items.filter((r) => r.status === ReportStatus.Pending).length,
      inProgress: items.filter((r) => r.status === ReportStatus.InProgress).length,
      resolvedToday,
      rejected: items.filter((r) => r.status === ReportStatus.Rejected).length,
    };
  }, [items]);

  const needsAttention = useMemo(() => {
    return items
      .filter(
        (r) =>
          (r.priority === ReportPriority.Critical || r.priority === ReportPriority.High) &&
          (r.status === ReportStatus.Pending || r.status === ReportStatus.Verified),
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [items]);

  const activityFeed = useMemo(() => {
    const allUpdates = items.flatMap(r => 
      r.status_updates.map(u => ({ ...u, report: r }))
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return allUpdates.slice(0, 10);
  }, [items]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now);
    if (analyticsRange === "today") rangeStart.setHours(0, 0, 0, 0);
    if (analyticsRange === "week") rangeStart.setDate(rangeStart.getDate() - 7);
    if (analyticsRange === "month") rangeStart.setMonth(rangeStart.getMonth() - 1);

    const inRange = (iso: string) =>
      analyticsRange === "all" ? true : new Date(iso).getTime() >= rangeStart.getTime();

    const inScope = analyticsRange === "all" ? items : items.filter((r) => inRange(r.created_at));

    const byType: Record<string, number> = {};
    for (const r of inScope) {
      byType[r.incident_type] = (byType[r.incident_type] ?? 0) + 1;
    }

    const resolved = inScope.filter(
      (r) => r.status === ReportStatus.Resolved && r.status_updates.length > 0,
    );

    let totalMs = 0;
    let minMs = Infinity;

    for (const r of resolved) {
      const last = r.status_updates[r.status_updates.length - 1];
      const ms = new Date(last.created_at).getTime() - new Date(r.created_at).getTime();
      totalMs += ms;
      if (ms < minMs) minMs = ms;
    }

    const avgMs = resolved.length ? totalMs / resolved.length : 0;
    const avgHours = Math.floor(avgMs / 36e5);
    const avgMins = Math.floor((avgMs % 36e5) / 60000);
    const avgFormatted = resolved.length ? `${avgHours}h ${avgMins}m` : "—";
    
    const fastestMins = minMs !== Infinity ? Math.max(1, Math.floor(minMs / 60000)) : 0;
    const fastestFormatted = fastestMins ? (fastestMins < 60 ? `${fastestMins}m` : `${Math.floor(fastestMins/60)}h ${fastestMins%60}m`) : "—";

    const openRate = inScope.length ? (inScope.filter((r) => r.status === ReportStatus.Pending).length / inScope.length) * 100 : 0;

    const criticalOpen = inScope.filter(
      (r) =>
        (r.priority === ReportPriority.Critical || r.priority === ReportPriority.High) &&
        (r.status === ReportStatus.Pending || r.status === ReportStatus.Verified),
    ).length;

    const stalePending = inScope.filter((r) => {
      if (r.status !== ReportStatus.Pending) return false;
      const ageMins = (nowBase - new Date(r.created_at).getTime()) / 60000;
      return ageMins >= 30;
    }).length;

    return {
      byType,
      avgFormatted,
      resolvedCount: resolved.length,
      fastestFormatted,
      openRate,
      criticalOpen,
      stalePending,
    };
  }, [items, analyticsRange, nowBase]);

  const lastReceived = items.length > 0 
    ? new Date(items[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "—";

  return (
    <div className="px-4 py-6 font-sans text-text md:px-8">
      {/* Stat Strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          { label: "Total Reports", value: liveStats.total, trend: "+12", color: "text-text" },
          { label: "Pending", value: liveStats.pending, trend: "+3", color: liveStats.pending > 0 ? "text-severity-high" : "text-text", dot: liveStats.pending > 0 },
          { label: "In Progress", value: liveStats.inProgress, trend: "-1", color: "text-status-in-progress" },
          { label: "Resolved Today", value: liveStats.resolvedToday, trend: "+5", color: "text-status-resolved" },
          { label: "Rejected", value: liveStats.rejected, trend: "0", color: "text-status-rejected" },
        ].map((stat, i) => (
          <div key={i} className="rounded-[12px] bg-surface-2 p-4 shadow-sm relative border border-black/5">
            {stat.dot && (
              <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-severity-high opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-severity-high"></span>
              </span>
            )}
            <p className="text-[13px] font-medium text-text-2">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`font-display text-[28px] font-bold leading-none ${stat.color}`}>{stat.value}</span>
              <span className="text-[11px] font-medium text-text-3">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          
          {/* Needs Attention Panel */}
          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <h2 className="font-display text-[16px] font-bold text-navy mb-4 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-severity-critical"></i>
              Needs Attention
            </h2>
            
            {needsAttention.length > 0 ? (
              <div className="space-y-3">
                {needsAttention.map((report) => (
                  <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3 border border-black/5 transition-all hover:border-black/10">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${report.priority === 'critical' ? 'bg-severity-critical' : 'bg-severity-high'}`}>
                        {report.priority}
                      </span>
                      <i className={`${TYPE_ICONS[report.incident_type] || TYPE_ICONS.Other} shrink-0 text-[14px]`}></i>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text truncate">{report.address || "Unknown Location"}</p>
                        <p className="text-[11px] text-text-2">{timeSince(report.created_at)} ago</p>
                      </div>
                    </div>
                    <button
                      onClick={() => pushToast("Assigning responder modal opened", "success")}
                      className="shrink-0 rounded-[8px] bg-navy px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-navy-mid"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-resolved/10 mb-3">
                  <i className="fa-solid fa-check text-[20px] text-status-resolved"></i>
                </div>
                <p className="font-medium text-text">All critical incidents addressed</p>
                <p className="text-[13px] text-text-2">No pending high-priority reports.</p>
              </div>
            )}
          </div>

          {/* Live Activity Feed */}
          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <h2 className="font-display text-[16px] font-bold text-navy mb-4 flex items-center gap-2">
              <i className="fa-solid fa-bolt text-gold"></i>
              Live Activity Feed
            </h2>
            
            <div className="relative">
              {activityFeed.length > 0 ? (
                <div className="space-y-4">
                  {activityFeed.map((update, i) => (
                    <div key={update.id} className="flex gap-3 animate-[slideIn_0.2s_ease-out]">
                      <div className="relative mt-1 flex flex-col items-center">
                        <div className={`h-2.5 w-2.5 rounded-full bg-status-${update.status.replace("_", "-")}`}></div>
                        {i !== activityFeed.length - 1 && <div className="absolute top-3 bottom-[-16px] w-[2px] bg-black/5"></div>}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-[13px] text-text">
                          <span className="font-semibold">{update.report.incident_type}</span> marked as{" "}
                          <span className={`font-semibold text-status-${update.status.replace("_", "-")}`}>{update.status.replace("_", " ")}</span>
                        </p>
                        <p className="text-[11px] text-text-2 mt-0.5">
                          by <span className="font-medium">{update.updated_by || "Admin"}</span> • {timeSince(update.created_at)} ago
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-text-2 py-4">No recent activity.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Response Performance */}
          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[16px] font-bold text-navy">Response Performance</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-2">Range</span>
                <select
                  value={analyticsRange}
                  onChange={(e) => setAnalyticsRange(e.target.value as "today" | "week" | "month" | "all")}
                  className="h-12 rounded-lg border border-black/10 bg-white px-3 text-[16px] text-text"
                  aria-label="Filter analytics by date range"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[11px] font-medium text-text-2">Avg Resolution</p>
                <p className="font-display text-[20px] font-bold text-text mt-1">{analyticsData.avgFormatted}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-text-2">Resolved in Range</p>
                <p className="font-display text-[20px] font-bold text-text mt-1">{analyticsData.resolvedCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-text-2">Fastest Response</p>
                <p className="font-display text-[20px] font-bold text-text mt-1">{analyticsData.fastestFormatted}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-text-2">Open Rate</p>
                <p className="font-display text-[20px] font-bold text-text mt-1">{analyticsData.openRate.toFixed(1)}%</p>
              </div>
            </div>
            {/* Thin Arc Gauge for Open Rate */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/5">
              <div 
                className="absolute left-0 top-0 h-full rounded-full bg-gold transition-all duration-500" 
                style={{ width: `${Math.min(100, analyticsData.openRate)}%` }}
              ></div>
            </div>
          </div>

          {/* Incidents by Type */}
          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <h2 className="font-display text-[16px] font-bold text-navy mb-4">Incidents by Type</h2>
            <div className="space-y-3">
              {Object.entries(analyticsData.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-text">{type.replace("_", " ")}</span>
                      <span className="font-bold text-text">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dim transition-all"
                        style={{ width: `${liveStats.total ? (count / liveStats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <h2 className="font-display text-[16px] font-bold text-navy mb-4">Actionable Insights</h2>
            <div className="space-y-3 text-[13px] text-text">
              <div className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-3 py-2.5">
                <span>High-priority open reports</span>
                <span className="font-bold text-severity-high">{analyticsData.criticalOpen}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-3 py-2.5">
                <span>Pending over 30 minutes</span>
                <span className="font-bold text-status-rejected">{analyticsData.stalePending}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-3 py-2.5">
                <span>Resolved in range</span>
                <span className="font-bold text-status-resolved">{analyticsData.resolvedCount}</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-[12px] bg-surface-2 p-5 shadow-sm border border-black/5">
            <h2 className="font-display text-[16px] font-bold text-navy mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="text-[13px] font-medium text-text-2">Last Report Received</span>
                <span className="text-[13px] font-bold text-text">{lastReceived}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="text-[13px] font-medium text-text-2">Active Admin Sessions</span>
                <span className="text-[13px] font-bold text-text">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-2">Realtime Channel</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${realtimeStatus === 'CONNECTED' ? 'bg-status-resolved' : realtimeStatus === 'CONNECTING' ? 'bg-status-pending' : 'bg-status-rejected'}`}></span>
                  <span className="text-[12px] font-bold text-text">
                    {realtimeStatus === 'CONNECTED' ? 'Connected' : realtimeStatus === 'CONNECTING' ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ToastStack toasts={toasts} />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
