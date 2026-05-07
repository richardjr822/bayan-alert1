"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ReportPriority, ReportStatus } from "@/types/report";
import type { ReportWithUpdates, StatusUpdate } from "@/types/report";
import { formatTime } from "@/app/lib/utils";
import ReportDetailDrawer from "./ReportDetailDrawer";
import ToastStack from "./ToastStack";

declare global {
  interface Window { __bayanLeafletMapId?: string; }
  interface HTMLElement { _leaflet_id?: number; }
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Verified]: "Verified",
  [ReportStatus.InProgress]: "In Progress",
  [ReportStatus.Resolved]: "Resolved",
  [ReportStatus.Rejected]: "Rejected",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "#EF9F27",
  [ReportStatus.Verified]: "#378ADD",
  [ReportStatus.InProgress]: "#8B5CF6",
  [ReportStatus.Resolved]: "#20a45d",
  [ReportStatus.Rejected]: "#b83232",
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "Low",
  [ReportPriority.Medium]: "Medium",
  [ReportPriority.High]: "High",
  [ReportPriority.Critical]: "Critical",
};

const PRIORITY_ORDER: Record<ReportPriority, number> = {
  [ReportPriority.Critical]: 0,
  [ReportPriority.High]: 1,
  [ReportPriority.Medium]: 2,
  [ReportPriority.Low]: 3,
};

const MAP_CENTER: [number, number] = [14.8559, 120.2880];
const MAP_ZOOM = 14;
const PIN_SIZE = 18;

type PanFn = (lat: number, lng: number, id: string) => void;
type FitFn = () => void;
type Props = { reports: ReportWithUpdates[] };

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AdminMapView({ reports }: Props) {
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const panFnRef = useRef<PanFn | null>(null);
  const fitFnRef = useRef<FitFn | null>(null);
  const [showList, setShowList] = useState(false);
  const [drawerReport, setDrawerReport] = useState<ReportWithUpdates | null>(null);
  const [localReports, setLocalReports] = useState(reports);
  const [toasts, setToasts] = useState<{ id: string; message: string; kind: "success" | "error" | "info" }[]>([]);

  useEffect(() => { setLocalReports(reports); }, [reports]);

  const pushToast = useCallback((message: string, kind: "success" | "error" | "info" = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleOptimisticUpdate = useCallback((reportId: string, status: ReportStatus, priority: ReportPriority, update: StatusUpdate | null) => {
    setLocalReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status, priority, updated_at: update?.created_at ?? r.updated_at, status_updates: update ? [...r.status_updates, update] : r.status_updates } : r));
  }, []);

  const handleRollback = useCallback((report: ReportWithUpdates) => {
    setLocalReports((prev) => prev.map((r) => r.id === report.id ? report : r));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const reportId = (e as CustomEvent<string>).detail;
      const found = localReports.find((r) => r.id === reportId);
      if (found) setDrawerReport(found);
    };
    window.addEventListener("bayan-open-drawer", handler);
    return () => window.removeEventListener("bayan-open-drawer", handler);
  }, [localReports]);

  const active = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.latitude &&
          r.longitude &&
          [ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress].includes(r.status),
      ),
    [reports],
  );

  const activeSorted = useMemo(() => {
    return [...active].sort((a, b) => {
      const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (byPriority !== 0) return byPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [active]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (window.__bayanLeafletMapId === uid) return;

    const container = containerRef.current;
    if (container._leaflet_id) {
      while (container.firstChild) container.removeChild(container.firstChild);
      delete container._leaflet_id;
    }

    let L: typeof import("leaflet");
    let map: ReturnType<typeof import("leaflet").map>;

    const loadCss = (id: string, href: string) => {
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    const loadScript = (id: string, src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    import("leaflet").then(async (mod) => {
      L = mod.default ?? mod;
      if (!containerRef.current) return;

      loadCss("leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
      loadCss("leaflet-markercluster-css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
      loadCss("leaflet-markercluster-default-css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");

      if (!document.getElementById("bayan-map-styles")) {
        const style = document.createElement("style");
        style.id = "bayan-map-styles";
        style.textContent = `
          .bayan-marker{position:relative;width:${PIN_SIZE}px;height:${PIN_SIZE}px;display:flex;align-items:center;justify-content:center}
          .bayan-marker__core{width:${PIN_SIZE}px;height:${PIN_SIZE}px;border-radius:50%;background:var(--pin);border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.25)}
          .bayan-marker__ring{position:absolute;border-radius:50%;border:2px solid var(--ring);width:var(--ring-size);height:var(--ring-size);opacity:0.9}
          .bayan-marker__ring.pulse{animation:bayan-pulse 2s ease-in-out infinite}
          @keyframes bayan-pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.4}100%{transform:scale(1);opacity:1}}
          .bayan-popup .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 16px 32px rgba(15,23,42,0.2)}
          .bayan-popup-card{min-width:220px;font-family:inherit;color:#1f2937}
          .bayan-popup-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:700}
          .bayan-popup-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:color-mix(in srgb, var(--badge) 16%, transparent);color:var(--badge)}
          .bayan-popup-meta{margin-top:6px;font-size:11px;color:#475569;display:flex;flex-direction:column;gap:6px}
          .bayan-popup-call{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#2264b5}
          .bayan-popup-address{margin-top:6px;font-size:11px;color:#64748b}
          .bayan-popup-time{margin-top:6px;font-size:10px;color:#94a3b8}
          .bayan-popup-footer{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
          .bayan-popup-link{display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1px solid #e2e8f0;padding:6px 10px;font-size:11px;font-weight:700;color:#1f2937}
          .leaflet-popup-content{margin:12px}
        `;
        document.head.appendChild(style);
      }

      await loadScript("leaflet-markercluster-js", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");

      if (!containerRef.current || mapRef.current || containerRef.current._leaflet_id) {
        return;
      }

      map = L.map(containerRef.current!).setView(MAP_CENTER, MAP_ZOOM);
      mapRef.current = map;
      window.__bayanLeafletMapId = uid;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markerMap: Record<string, ReturnType<typeof L.marker>> = {};
      const bounds = L.latLngBounds([]);
      const clusterGroup = (L as typeof import("leaflet") & { markerClusterGroup?: () => ReturnType<typeof L.featureGroup> }).markerClusterGroup
        ? (L as typeof import("leaflet") & { markerClusterGroup: () => ReturnType<typeof L.featureGroup> }).markerClusterGroup()
        : null;

      activeSorted.forEach((report) => {
        const pinColor = STATUS_COLORS[report.status] ?? "#6b7280";
        const ringColor = report.priority === ReportPriority.High || report.priority === ReportPriority.Critical ? pinColor : "transparent";
        const ringSize = report.priority === ReportPriority.Critical ? 24 : report.priority === ReportPriority.High ? 18 : 0;
        const isCritical = report.priority === ReportPriority.Critical;
        const statusLabel = STATUS_LABELS[report.status] ?? report.status;
        const priorityLabel = PRIORITY_LABELS[report.priority] ?? report.priority;
        const address = report.address ?? `${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`;

        const pinHtml = `
          <div class="bayan-marker" style="--pin:${pinColor};--ring:${ringColor};--ring-size:${ringSize}px">
            ${ringSize ? `<span class="bayan-marker__ring ${isCritical ? "pulse" : ""}"></span>` : ""}
            <span class="bayan-marker__core"></span>
          </div>`;

        const icon = L.divIcon({
          html: pinHtml,
          className: "",
          iconSize: [PIN_SIZE, PIN_SIZE],
          iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
          popupAnchor: [0, -(PIN_SIZE / 2 + 6)],
        });

        const popup = `
          <div class="bayan-popup-card" style="--badge:${pinColor}">
            <div class="bayan-popup-title">
              <span>${report.incident_type}</span>
              <span class="bayan-popup-badge">${priorityLabel}</span>
            </div>
            <div class="bayan-popup-meta">
              <span>${report.reporter_name}</span>
              <a class="bayan-popup-call" href="tel:${report.contact_number}"><i class="fa-solid fa-phone"></i>${report.contact_number}</a>
            </div>
            <div class="bayan-popup-address">${address}</div>
            <div class="bayan-popup-time">Submitted ${formatTime(report.created_at)}</div>
            <div class="bayan-popup-footer">
              <span class="bayan-popup-badge">${statusLabel}</span>
              <button class="bayan-popup-link" onclick="window.dispatchEvent(new CustomEvent('bayan-open-drawer',{detail:'${report.id}'}))">Open Full Report →</button>
            </div>
          </div>`;

        const marker = L.marker([report.latitude as number, report.longitude as number], { icon })
          .bindPopup(popup, { className: "bayan-popup" });

        markerMap[report.id] = marker;
        bounds.extend([report.latitude as number, report.longitude as number]);
        if (clusterGroup) {
          clusterGroup.addLayer(marker);
        } else {
          marker.addTo(map);
        }
      });

      if (clusterGroup) clusterGroup.addTo(map);

      panFnRef.current = (lat, lng, id) => {
        map.flyTo([lat, lng], 16, { duration: 0.8 });
        setTimeout(() => markerMap[id]?.openPopup(), 850);
      };

      fitFnRef.current = () => {
        if (!activeSorted.length) return;
        map.fitBounds(bounds, { padding: [24, 24] });
      };
    });

    return () => {
      panFnRef.current = null;
      fitFnRef.current = null;
      if (mapRef.current) {
        (mapRef.current as ReturnType<typeof import("leaflet").map>).remove();
        mapRef.current = null;
        if (window.__bayanLeafletMapId === uid) {
          delete window.__bayanLeafletMapId;
        }
      }
    };
  }, [uid, activeSorted]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-map-location-dot text-[var(--red)]"></i>
          <span className="text-[13px] font-bold text-[var(--text)]">Active Incidents Map</span>
          <span className="rounded-full bg-[#ffe8e8] px-2 py-0.5 text-[10px] font-bold text-[#b83232]">
            {activeSorted.length} active
          </span>
        </div>
        <div className="hidden items-center gap-3 text-[10px] text-[var(--muted)] md:flex">
          {[ReportStatus.Pending, ReportStatus.Verified, ReportStatus.InProgress].map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span style={{ background: STATUS_COLORS[status] }} className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"></span>
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fitFnRef.current?.()}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-[12px] font-semibold text-[var(--text)]"
            aria-label="Fit all pins"
          >
            <i className="fa-solid fa-expand"></i>
            Fit All Pins
          </button>
          <button
            type="button"
            onClick={() => setShowList(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-[12px] font-semibold text-[var(--text)] md:hidden"
            aria-label="Open active reports list"
          >
            <i className="fa-solid fa-list"></i>
            List
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:h-[520px]">
        <div ref={containerRef} className="h-[320px] md:h-full md:flex-1" />

        <div className="hidden flex-col border-t border-[var(--line)] bg-white md:flex md:w-72 md:shrink-0 md:border-l md:border-t-0">
          <div className="border-b border-[var(--line)] px-3 py-2">
            <p className="text-[11px] font-bold text-[var(--muted)]">ACTIVE REPORTS ({activeSorted.length})</p>
          </div>
          <div className="flex flex-row overflow-x-auto md:flex-1 md:flex-col md:overflow-y-auto">
            {activeSorted.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-[var(--muted)]">No active incidents</div>
            ) : (
              activeSorted.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => panFnRef.current?.(report.latitude as number, report.longitude as number, report.id)}
                  className="flex shrink-0 items-start gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[#fff5f5] active:bg-[#ffe4e6] md:w-full md:shrink"
                  style={{ minWidth: 160 }}
                  aria-label={`Center map on ${report.incident_type}`}
                >
                  <span
                    style={{ background: STATUS_COLORS[report.status] }}
                    className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                  ></span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-[var(--text)]">{report.incident_type}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">{report.address ?? "Location captured"}</p>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">{formatTime(report.created_at)}</p>
                  </div>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${report.status === ReportStatus.Pending ? "bg-[#fff8dc] text-[#B89400]" : report.status === ReportStatus.Verified ? "bg-[#e8f1ff] text-[#2264b5]" : "bg-[#efe9ff] text-[#6b46c1]"}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {showList ? (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowList(false)}
            aria-label="Close active reports list"
          />
          <div className="relative w-full rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <p className="text-[12px] font-bold text-[var(--text)]">Active Reports ({activeSorted.length})</p>
              <button
                type="button"
                onClick={() => setShowList(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10"
                aria-label="Close list"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {activeSorted.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[var(--muted)]">No active incidents</div>
              ) : (
                activeSorted.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      setShowList(false);
                      panFnRef.current?.(report.latitude as number, report.longitude as number, report.id);
                    }}
                    className="flex w-full items-start gap-3 border-b border-[var(--line)] px-4 py-4 text-left"
                    aria-label={`Center map on ${report.incident_type}`}
                  >
                    <span
                      style={{ background: STATUS_COLORS[report.status] }}
                      className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                    ></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-[var(--text)]">{report.incident_type}</p>
                      <p className="truncate text-[12px] text-[var(--muted)]">{report.address ?? "Location captured"}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">{formatTime(report.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${report.status === ReportStatus.Pending ? "bg-[#fff8dc] text-[#B89400]" : report.status === ReportStatus.Verified ? "bg-[#e8f1ff] text-[#2264b5]" : "bg-[#efe9ff] text-[#6b46c1]"}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ReportDetailDrawer
        report={drawerReport ? localReports.find((r) => r.id === drawerReport.id) ?? drawerReport : null}
        onClose={() => setDrawerReport(null)}
        onOptimisticUpdate={handleOptimisticUpdate}
        onRollback={handleRollback}
        onToast={pushToast}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}
