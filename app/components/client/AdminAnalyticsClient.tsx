"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReportStatus, RESPONDER_TEAMS } from "@/types/report";
import type { ReportWithUpdates } from "@/types/report";

type Props = {
  reports: ReportWithUpdates[];
};

export default function AdminAnalyticsClient({ reports }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const range = searchParams.get("range") || "month";
  const customStart = searchParams.get("start") || "";
  const customEnd = searchParams.get("end") || "";

  const [localStart, setLocalStart] = useState(customStart);
  const [localEnd, setLocalEnd] = useState(customEnd);

  const updateRange = (r: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", r);
    if (r !== "custom") {
      params.delete("start");
      params.delete("end");
    }
    router.push(`?${params.toString()}`);
  };

  const updateCustom = () => {
    if (localStart && localEnd) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", "custom");
      params.set("start", localStart);
      params.set("end", localEnd);
      router.push(`?${params.toString()}`);
    }
  };

  const filteredReports = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (range === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 86400000);
    } else if (range === "week") {
      start = new Date(now.getTime() - 7 * 86400000);
      end = now;
    } else if (range === "month") {
      start = new Date(now.getTime() - 30 * 86400000);
      end = now;
    } else if (range === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    }

    if (!start || !end) return reports;
    return reports.filter((r) => {
      const d = new Date(r.created_at);
      return d >= start! && d <= end!;
    });
  }, [reports, range, customStart, customEnd]);

  // Section 1: Overview KPIs
  const kpis = useMemo(() => {
    const total = filteredReports.length;
    const resolved = filteredReports.filter((r) => r.status === ReportStatus.Resolved).length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    
    const typeCounts: Record<string, number> = {};
    let sumResTime = 0;
    let resolvedWithTimeCount = 0;

    filteredReports.forEach((r) => {
      typeCounts[r.incident_type] = (typeCounts[r.incident_type] || 0) + 1;
      
      if (r.status === ReportStatus.Resolved) {
        const create = new Date(r.created_at).getTime();
        const update = new Date(r.updated_at).getTime();
        const mins = (update - create) / 60000;
        if (mins >= 0) {
          sumResTime += mins;
          resolvedWithTimeCount++;
        }
      }
    });

    const avgResMins = resolvedWithTimeCount > 0 ? sumResTime / resolvedWithTimeCount : 0;
    const avgResTime = avgResMins < 60 ? `${Math.round(avgResMins)}m` : `${(avgResMins / 60).toFixed(1)}h`;
    
    let commonType = "None";
    let max = 0;
    for (const [t, c] of Object.entries(typeCounts)) {
      if (c > max) { max = c; commonType = t; }
    }

    return { total, rate, avgResTime, commonType };
  }, [filteredReports]);

  // Section 2: Incidents by Type
  const typeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => { counts[r.incident_type] = (counts[r.incident_type] || 0) + 1; });
    const total = filteredReports.length || 1;
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // Section 3: Peak Hours Heatmap
  const heatmap = useMemo(() => {
    // 7 days (0=Sun, 1=Mon), 24 hours
    const map: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxCount = 0;
    filteredReports.forEach((r) => {
      const d = new Date(r.created_at);
      const day = d.getDay(); // 0-6
      const hour = d.getHours(); // 0-23
      map[day][hour]++;
      if (map[day][hour] > maxCount) maxCount = map[day][hour];
    });
    return { map, maxCount };
  }, [filteredReports]);

  const getHeatmapColor = (count: number, max: number) => {
    if (count === 0) return "#F7F6F2";
    if (count <= max * 0.33) return "#F5E080";
    if (count <= max * 0.66) return "#D4AA00";
    return "#7a6200";
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Section 4: Response Time by Type
  const responseTimes = useMemo(() => {
    const times: Record<string, { sum: number; count: number }> = {};
    filteredReports.forEach((r) => {
      const firstResponse = r.status_updates.find(u => u.status !== ReportStatus.Pending);
      if (firstResponse) {
        const t1 = new Date(r.created_at).getTime();
        const t2 = new Date(firstResponse.created_at).getTime();
        const mins = (t2 - t1) / 60000;
        if (mins >= 0) {
          if (!times[r.incident_type]) times[r.incident_type] = { sum: 0, count: 0 };
          times[r.incident_type].sum += mins;
          times[r.incident_type].count++;
        }
      }
    });

    return Object.entries(times).map(([type, data]) => {
      const avg = data.sum / data.count;
      return { type, avgMins: Math.round(avg) };
    }).sort((a, b) => b.avgMins - a.avgMins);
  }, [filteredReports]);

  // Section 5: Responder Performance
  const responderStats = useMemo(() => {
    const stats: Record<string, { assigned: number; resolved: number; resTimeSum: number }> = {};
    RESPONDER_TEAMS.forEach((t) => stats[t] = { assigned: 0, resolved: 0, resTimeSum: 0 });

    filteredReports.forEach((r) => {
      let teamAssigned: string | null = null;
      // find assignment
      r.status_updates.forEach((u) => {
        if (u.remarks && u.remarks.includes("Assigned to: ")) {
          RESPONDER_TEAMS.forEach(t => {
            if (u.remarks!.includes(`Assigned to: ${t}`)) teamAssigned = t;
          });
        }
      });

      if (teamAssigned) {
        stats[teamAssigned].assigned++;
        if (r.status === ReportStatus.Resolved) {
          stats[teamAssigned].resolved++;
          const t1 = new Date(r.created_at).getTime();
          const t2 = new Date(r.updated_at).getTime();
          stats[teamAssigned].resTimeSum += (t2 - t1) / 60000;
        }
      }
    });

    return RESPONDER_TEAMS.map((team) => {
      const s = stats[team];
      const rate = s.assigned > 0 ? Math.round((s.resolved / s.assigned) * 100) : 0;
      const avgMins = s.resolved > 0 ? s.resTimeSum / s.resolved : 0;
      const avgStr = avgMins === 0 ? "-" : avgMins < 60 ? `${Math.round(avgMins)}m` : `${(avgMins / 60).toFixed(1)}h`;
      return { team, assigned: s.assigned, resolved: s.resolved, rate, avgStr };
    }).sort((a, b) => b.assigned - a.assigned);
  }, [filteredReports]);

  return (
    <div className="flex flex-col gap-6">
      {/* Date Range Selector (Sticky) */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-1 rounded-lg bg-black/5 p-1 sm:w-auto">
            {["today", "week", "month", "custom"].map((r) => (
              <button
                key={r}
                onClick={() => updateRange(r)}
                className={`min-h-[44px] flex-1 rounded-md px-3 text-[13px] font-semibold capitalize transition ${
                  range === r ? "bg-white text-[var(--text)] shadow-sm" : "text-[#687689] hover:text-[var(--text)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="h-12 flex-1 rounded-lg border border-black/10 px-3 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none"
                style={{ minWidth: "130px" }}
              />
              <input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="h-12 flex-1 rounded-lg border border-black/10 px-3 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none"
                style={{ minWidth: "130px" }}
              />
              <button
                onClick={updateCustom}
                disabled={!localStart || !localEnd}
                className="h-12 w-full rounded-lg bg-[#D4AA00] px-4 text-[13px] font-bold text-[#0D1B2A] transition hover:bg-[#B98F00] disabled:opacity-50 sm:w-auto"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Overview KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#687689]">Total Reports</p>
          <p className="mt-1 font-display text-[28px] font-bold text-[var(--text)]">{kpis.total}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#687689]">Avg Resolution</p>
          <p className="mt-1 font-display text-[28px] font-bold text-[var(--text)]">{kpis.avgResTime}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#687689]">Resolution Rate</p>
          <p className="mt-1 font-display text-[28px] font-bold text-[var(--text)]">{kpis.rate}%</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#687689]">Most Common</p>
          <p className="mt-1 truncate font-display text-[20px] font-bold text-[var(--text)] leading-[36px]" title={kpis.commonType}>
            {kpis.commonType}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 2: Incidents by Type */}
        <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-display text-[16px] font-bold text-[var(--text)]">Incidents by Type</h3>
          <div className="space-y-4">
            {typeStats.length === 0 ? <p className="text-[13px] text-[#687689]">No data available.</p> : null}
            {typeStats.map((s) => (
              <div key={s.type}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-semibold text-[var(--text)]">{s.type}</span>
                  <span className="text-[#687689]">{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#f2f3f5]">
                  <div className="h-full rounded-full bg-[#D4AA00]" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Response Time by Type */}
        <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-display text-[16px] font-bold text-[var(--text)]">Avg Initial Response Time</h3>
          <div className="space-y-4">
            {responseTimes.length === 0 ? <p className="text-[13px] text-[#687689]">No data available.</p> : null}
            {responseTimes.map((s) => {
              const maxScale = Math.max(...responseTimes.map(r => r.avgMins), 120);
              const pct = Math.min(100, (s.avgMins / maxScale) * 100);
              const color = s.avgMins < 30 ? "bg-[#20a45d]" : s.avgMins < 120 ? "bg-[#bf6416]" : "bg-[#b83232]";
              return (
                <div key={s.type}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-semibold text-[var(--text)]">{s.type}</span>
                    <span className="text-[#687689]">{s.avgMins} min</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f2f3f5]">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Peak Hours Heatmap */}
      <div className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        <div className="border-b border-black/5 p-5">
          <h3 className="font-display text-[16px] font-bold text-[var(--text)]">Peak Reporting Hours</h3>
        </div>
        <div className="overflow-x-auto p-5">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1">
              {/* Header: hours */}
              <div />
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-center text-[10px] text-[#687689]">{h}h</div>
              ))}
              
              {/* Body: days */}
              {DAYS.map((day, dIdx) => (
                <div key={day} className="contents">
                  <div className="flex items-center justify-end pr-2 text-[11px] font-semibold text-[#687689]">
                    {day}
                  </div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const count = heatmap.map[dIdx][h];
                    const bg = getHeatmapColor(count, heatmap.maxCount);
                    return (
                      <div
                        key={`${day}-${h}`}
                        className="aspect-square rounded-[3px] border border-black/5"
                        style={{ backgroundColor: bg }}
                        title={`${day} ${h}:00 - ${count} incidents`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-[#687689]">
              <span>Less</span>
              <div className="h-3 w-3 rounded-sm border border-black/5" style={{ backgroundColor: getHeatmapColor(0, 100) }} />
              <div className="h-3 w-3 rounded-sm border border-black/5" style={{ backgroundColor: getHeatmapColor(30, 100) }} />
              <div className="h-3 w-3 rounded-sm border border-black/5" style={{ backgroundColor: getHeatmapColor(60, 100) }} />
              <div className="h-3 w-3 rounded-sm border border-black/5" style={{ backgroundColor: getHeatmapColor(100, 100) }} />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Responder Performance */}
      <div className="rounded-xl border border-black/5 bg-white shadow-sm">
        <div className="border-b border-black/5 p-5">
          <h3 className="font-display text-[16px] font-bold text-[var(--text)]">Responder Performance</h3>
        </div>
        <div className="hidden md:block">
          <table className="min-w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/5 bg-[#f2f3f5] text-[11px] uppercase tracking-widest text-[#687689]">
                <th className="px-5 py-3 font-semibold">Team Name</th>
                <th className="px-5 py-3 font-semibold">Assigned</th>
                <th className="px-5 py-3 font-semibold">Resolved</th>
                <th className="px-5 py-3 font-semibold">Avg Res Time</th>
                <th className="px-5 py-3 font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {responderStats.map((s) => (
                <tr key={s.team} className="transition hover:bg-black/5">
                  <td className="px-5 py-3 font-semibold text-[var(--text)]">{s.team}</td>
                  <td className="px-5 py-3 text-[#687689]">{s.assigned}</td>
                  <td className="px-5 py-3 text-[#687689]">{s.resolved}</td>
                  <td className="px-5 py-3 text-[#687689]">{s.avgStr}</td>
                  <td className="px-5 py-3 text-[#687689]">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      s.rate >= 80 ? "bg-[#d8f5e6] text-[#20a45d]" : s.rate >= 50 ? "bg-[#fff8dc] text-[#B89400]" : "bg-[#ffe8e8] text-[#b83232]"
                    }`}>
                      {s.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile View for Table */}
        <div className="divide-y divide-black/5 md:hidden">
          {responderStats.map((s) => (
            <div key={s.team} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-[14px] text-[var(--text)]">{s.team}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  s.rate >= 80 ? "bg-[#d8f5e6] text-[#20a45d]" : s.rate >= 50 ? "bg-[#fff8dc] text-[#B89400]" : "bg-[#ffe8e8] text-[#b83232]"
                }`}>
                  {s.rate}% Rate
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div>
                  <span className="block text-[10px] uppercase text-[#687689]">Assigned</span>
                  <span className="font-semibold text-[var(--text)]">{s.assigned}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#687689]">Resolved</span>
                  <span className="font-semibold text-[var(--text)]">{s.resolved}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#687689]">Avg Time</span>
                  <span className="font-semibold text-[var(--text)]">{s.avgStr}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



    </div>
  );
}
