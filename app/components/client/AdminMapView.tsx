"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { ReportWithUpdates } from "@/types/report";
import { formatTime } from "@/app/lib/utils";

declare global {
  interface Window { __bayanLeafletMapId?: string; }
  interface HTMLElement { _leaflet_id?: number; }
}

const PRIORITY_RING: Record<string, string> = {
  low: "#6b7280",
  medium: "#B89400",
  high: "#bf6416",
  critical: "#b83232",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  in_progress: "In Progress",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#B89400",
  verified: "#2264b5",
  in_progress: "#e11d48",
};

const STA_RITA: [number, number] = [14.84798, 120.2972185];
const PIN_SIZE = 28;

type PanFn = (lat: number, lng: number, id: string) => void;
type Props = { reports: ReportWithUpdates[] };

export default function AdminMapView({ reports }: Props) {
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const panFnRef = useRef<PanFn | null>(null);

  const active = useMemo(
    () => reports.filter((r) => r.latitude && r.longitude && !["resolved", "rejected"].includes(r.status)),
    [reports],
  );

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

    import("leaflet").then((mod) => {
      L = mod.default ?? mod;
      if (!containerRef.current) return;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("leaflet-pin-anim")) {
        const style = document.createElement("style");
        style.id = "leaflet-pin-anim";
        style.textContent = `
          @keyframes bayan-pulse {
            0%,100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.7); opacity: 0; }
          }
          .bayan-pin-pulse { animation: bayan-pulse 1.6s ease-out infinite; }
        `;
        document.head.appendChild(style);
      }

      map = L.map(containerRef.current!).setView(STA_RITA, 15);
      mapRef.current = map;
      window.__bayanLeafletMapId = uid;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markerMap: Record<string, ReturnType<typeof L.marker>> = {};

      active.forEach((report) => {
        const pinColor = STATUS_COLORS[report.status] ?? "#6b7280";
        const ring = PRIORITY_RING[report.priority] ?? PRIORITY_RING.low;
        const isCritical = report.priority === "critical";

        const pinHtml = `
          <div style="position:relative;width:${PIN_SIZE + 8}px;height:${PIN_SIZE + 8}px;display:flex;align-items:center;justify-content:center">
            ${isCritical ? `<span class="bayan-pin-pulse" style="position:absolute;width:${PIN_SIZE + 8}px;height:${PIN_SIZE + 8}px;border-radius:50%;background:${pinColor};pointer-events:none"></span>` : ""}
            <span style="
              display:block;
              width:${PIN_SIZE}px;
              height:${PIN_SIZE}px;
              background:${pinColor};
              border-radius:50%;
              border:3px solid white;
              box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 0 3px ${ring};
              position:relative;
            "></span>
          </div>`;

        const icon = L.divIcon({
          html: pinHtml,
          className: "",
          iconSize: [PIN_SIZE + 8, PIN_SIZE + 8],
          iconAnchor: [(PIN_SIZE + 8) / 2, (PIN_SIZE + 8) / 2],
          popupAnchor: [0, -(PIN_SIZE / 2 + 6)],
        });

        const popup = `
          <div style="font-size:12px;line-height:1.7;min-width:180px">
            <strong style="font-size:13px;display:block;margin-bottom:3px">${report.incident_type}</strong>
            <span style="color:#6b7280;font-size:11px">${report.address ?? `${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`}</span><br/>
            <span style="font-size:11px">${report.reporter_name}</span><br/>
            <a href="tel:${report.contact_number}" style="color:#2264b5;font-weight:700;font-size:12px">${report.contact_number}</a>
            <div style="margin-top:5px;display:flex;gap:4px">
              <span style="padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700;background:${pinColor}22;color:${pinColor}">${STATUS_LABELS[report.status] ?? report.status}</span>
              <span style="padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700;background:${ring}22;color:${ring}">${report.priority.toUpperCase()}</span>
            </div>
          </div>`;

        const marker = L.marker([report.latitude as number, report.longitude as number], { icon })
          .addTo(map)
          .bindPopup(popup);

        markerMap[report.id] = marker;
      });

      panFnRef.current = (lat, lng, id) => {
        map.flyTo([lat, lng], 17, { duration: 0.8 });
        setTimeout(() => markerMap[id]?.openPopup(), 850);
      };
    });

    return () => {
      panFnRef.current = null;
      if (mapRef.current) {
        (mapRef.current as ReturnType<typeof import("leaflet").map>).remove();
        mapRef.current = null;
        if (window.__bayanLeafletMapId === uid) {
          delete window.__bayanLeafletMapId;
        }
      }
    };
  }, [uid, active]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-map-location-dot text-[var(--red)]"></i>
          <span className="text-[13px] font-bold text-[var(--text)]">Active Incidents Map</span>
          <span className="rounded-full bg-[#ffe8e8] px-2 py-0.5 text-[10px] font-bold text-[#b83232]">
            {active.length} active
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted)]">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span style={{ background: color }} className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"></span>
              {STATUS_LABELS[status]}
            </span>
          ))}
          <span className="ml-1 border-l border-[var(--line)] pl-3 text-[9px] uppercase tracking-wide">ring = priority</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:h-[520px]">
        <div ref={containerRef} className="h-[300px] md:h-full md:flex-1" />

        <div className="flex flex-col border-t border-[var(--line)] bg-white md:w-64 md:shrink-0 md:border-l md:border-t-0">
          <div className="border-b border-[var(--line)] px-3 py-2">
            <p className="text-[11px] font-bold text-[var(--muted)]">
              ACTIVE REPORTS ({active.length})
            </p>
          </div>
          <div className="flex flex-row overflow-x-auto md:flex-1 md:flex-col md:overflow-y-auto">
            {active.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-[var(--muted)]">
                No active incidents
              </div>
            ) : (
              active.map((report) => {
                const ring = PRIORITY_RING[report.priority] ?? PRIORITY_RING.low;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => panFnRef.current?.(report.latitude as number, report.longitude as number, report.id)}
                    className="flex shrink-0 items-start gap-2 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[#fff5f5] active:bg-[#ffe4e6] md:w-full md:shrink"
                    style={{ minWidth: 160 }}
                  >
                    <span
                      style={{ background: STATUS_COLORS[report.status] ?? "#6b7280", boxShadow: `0 0 0 2.5px white, 0 0 0 4px ${ring}` }}
                      className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                    ></span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-[var(--text)]">
                        {report.incident_type}
                      </p>
                      <p className="truncate text-[11px] text-[var(--muted)]">
                        {report.address ?? "Location captured"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                        {report.reporter_name} · {formatTime(report.created_at)}
                      </p>
                    </div>
                    <i className="fa-solid fa-chevron-right mt-1 shrink-0 text-[9px] text-[var(--muted)] hidden md:block"></i>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
