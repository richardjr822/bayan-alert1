"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { updateReportStatus, cancelReport } from "@/lib/actions/reportActions";
import { ReportPriority, ReportStatus, RESPONDER_TEAMS } from "@/types/report";
import type { ReportWithUpdates, StatusUpdate } from "@/types/report";
import { formatTime } from "@/app/lib/utils";

type ToastFn = (msg: string, kind?: "success" | "error" | "info") => void;

type Props = {
  report: ReportWithUpdates | null;
  onClose: () => void;
  onOptimisticUpdate: (id: string, s: ReportStatus, p: ReportPriority, u: StatusUpdate | null) => void;
  onRollback: (r: ReportWithUpdates) => void;
  onToast: ToastFn;
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "Pending",
  [ReportStatus.Verified]: "Verified",
  [ReportStatus.InProgress]: "In Progress",
  [ReportStatus.Resolved]: "Resolved",
  [ReportStatus.Rejected]: "Rejected",
};

const STATUS_CLS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "bg-[#fff8dc] text-[#B89400]",
  [ReportStatus.Verified]: "bg-[#e8f1ff] text-[#2264b5]",
  [ReportStatus.InProgress]: "bg-[#fff0df] text-[#bf6416]",
  [ReportStatus.Resolved]: "bg-[#d8f5e6] text-[#20a45d]",
  [ReportStatus.Rejected]: "bg-[#ffe8e8] text-[#b83232]",
};

const STATUS_DOT: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: "#B89400",
  [ReportStatus.Verified]: "#2264b5",
  [ReportStatus.InProgress]: "#bf6416",
  [ReportStatus.Resolved]: "#20a45d",
  [ReportStatus.Rejected]: "#b83232",
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "Low",
  [ReportPriority.Medium]: "Medium",
  [ReportPriority.High]: "High",
  [ReportPriority.Critical]: "Critical",
};

const PRIORITY_CLS: Record<ReportPriority, string> = {
  [ReportPriority.Low]: "bg-[#eef1f5] text-[#687689]",
  [ReportPriority.Medium]: "bg-[#fff8dc] text-[#B89400]",
  [ReportPriority.High]: "bg-[#fff0df] text-[#bf6416]",
  [ReportPriority.Critical]: "bg-[#ffe8e8] text-[#b83232]",
};

const ICON_MAP: Record<string, string> = {
  Fire: "fa-fire",
  "Flood/Water Hazard": "fa-water",
  "Medical Emergency": "fa-kit-medical",
  "Crime/Security": "fa-shield-halved",
  Accident: "fa-car-burst",
};

const ICON_PALETTE: Record<string, string> = {
  Fire: "bg-orange-50 text-orange-600",
  "Flood/Water Hazard": "bg-blue-50 text-blue-600",
  "Medical Emergency": "bg-red-50 text-red-600",
  "Crime/Security": "bg-slate-100 text-slate-700",
  Accident: "bg-amber-50 text-amber-700",
};

const STATUS_OPTS: { value: ReportStatus; label: string }[] = [
  { value: ReportStatus.Pending, label: "Pending" },
  { value: ReportStatus.Verified, label: "Verified" },
  { value: ReportStatus.InProgress, label: "In Progress" },
  { value: ReportStatus.Resolved, label: "Resolved" },
  { value: ReportStatus.Rejected, label: "Rejected" },
];

const PRIORITY_OPTS: { value: ReportPriority; label: string }[] = [
  { value: ReportPriority.Low, label: "Low" },
  { value: ReportPriority.Medium, label: "Medium" },
  { value: ReportPriority.High, label: "High" },
  { value: ReportPriority.Critical, label: "Critical" },
];

const CANCEL_REASONS = ["Duplicate report", "False alarm", "Resolved by reporter", "Insufficient information", "Other"];

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function humanId(report: ReportWithUpdates): string {
  const year = new Date(report.created_at).getFullYear();
  let hash = 0;
  for (let i = 0; i < report.id.length; i += 1) hash = (hash * 31 + report.id.charCodeAt(i)) % 10000;
  return `BA-${year}-${String(hash).padStart(4, "0")}`;
}

function getTimeline(report: ReportWithUpdates): StatusUpdate[] {
  const updates = report.status_updates.length
    ? [...report.status_updates]
    : [{ id: `${report.id}-init`, report_id: report.id, status: ReportStatus.Pending, remarks: null, updated_by: report.reporter_name, created_at: report.created_at }];
  return updates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function ReportDetailDrawer({ report, onClose, onOptimisticUpdate, onRollback, onToast }: Props) {
  const uid = useId();
  const [visible, setVisible] = useState(false);
  const [geoAddress, setGeoAddress] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.Pending);
  const [priority, setPriority] = useState<ReportPriority>(ReportPriority.Low);
  const [assignedTo, setAssignedTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<unknown>(null);

  useEffect(() => {
    if (report) {
      setStatus(report.status);
      setPriority(report.priority);
      setAssignedTo("");
      setRemarks("");
      setDangerOpen(false);
      setCancelConfirm(false);
      setGeoAddress(null);
      requestAnimationFrame(() => setVisible(true));

      if (report.latitude && report.longitude) {
        setGeoLoading(true);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${report.latitude}&lon=${report.longitude}&format=json`)
          .then((r) => r.json())
          .then((d) => setGeoAddress(d?.display_name ?? null))
          .catch(() => setGeoAddress(null))
          .finally(() => setGeoLoading(false));
      }
    } else {
      setVisible(false);
    }
  }, [report]);

  useEffect(() => {
    if (!report?.latitude || !report?.longitude || !miniMapRef.current || miniMapInstance.current) return;
    const container = miniMapRef.current;
    import("leaflet").then((L) => {
      const mod = L.default ?? L;
      if (container._leaflet_id) {
        while (container.firstChild) container.removeChild(container.firstChild);
        delete container._leaflet_id;
      }
      const m = mod.map(container, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([report.latitude!, report.longitude!], 16);
      mod.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
      mod.marker([report.latitude!, report.longitude!]).addTo(m);
      miniMapInstance.current = m;
    });
    return () => {
      if (miniMapInstance.current) {
        (miniMapInstance.current as ReturnType<typeof import("leaflet").map>).remove();
        miniMapInstance.current = null;
      }
    };
  }, [report?.latitude, report?.longitude, report?.id]);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!report || saving) return;
    setSaving(true);
    const prev = report;
    const cleanRemarks = remarks.trim();
    const fullRemarks = assignedTo ? `Assigned to: ${assignedTo}${cleanRemarks ? `. ${cleanRemarks}` : ""}` : cleanRemarks;
    const optimistic: StatusUpdate = {
      id: `opt-${Date.now()}`,
      report_id: report.id,
      status,
      remarks: fullRemarks || null,
      updated_by: "Barangay Official",
      created_at: new Date().toISOString(),
    };
    onOptimisticUpdate(report.id, status, priority, optimistic);
    const result = await updateReportStatus({ reportId: report.id, status, priority, remarks: fullRemarks, assignedTo: assignedTo || undefined });
    setSaving(false);
    if ("error" in result) {
      onRollback(prev);
      onToast(result.error, "error");
      return;
    }
    setRemarks("");
    setAssignedTo("");
    onToast("Report updated.", "success");
  };

  const handleCancel = async () => {
    if (!report || cancelling) return;
    setCancelling(true);
    const result = await cancelReport(report.id, cancelReason);
    setCancelling(false);
    if ("error" in result) {
      onToast(result.error, "error");
      return;
    }
    onToast("Report cancelled.", "success");
    close();
  };

  if (!report) return null;

  const icon = ICON_MAP[report.incident_type] ?? "fa-circle-exclamation";
  const iconPalette = ICON_PALETTE[report.incident_type] ?? "bg-slate-100 text-slate-600";
  const timeline = getTimeline(report);
  const hid = humanId(report);
  const coords = report.latitude && report.longitude ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}` : null;

  return (
    <>
      {lightbox && report.photo_url ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.photo_url} alt="Report photo full size" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
          <button type="button" onClick={() => setLightbox(false)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close photo">
            <i className="fa-solid fa-xmark text-[16px]" />
          </button>
        </div>
      ) : null}

      <div className={`fixed inset-0 z-[1050] bg-black/40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={close} aria-label="Close drawer overlay" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Report detail: ${report.incident_type}`}
        className={`fixed z-[1060] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out
          bottom-0 right-0 w-full h-[92vh] rounded-t-2xl md:rounded-none md:top-0 md:bottom-0 md:h-full md:w-[480px]
          ${visible ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"}`}
      >
        {/* Close */}
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
          <span className="font-mono text-[11px] text-[#687689]">{hid}</span>
          <button type="button" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 transition hover:bg-black/5" aria-label="Close drawer">
            <i className="fa-solid fa-xmark text-[14px]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconPalette}`}>
                <i className={`fa-solid ${icon} text-[20px]`} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[18px] font-bold text-[var(--text)]">{report.incident_type}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${PRIORITY_CLS[report.priority]}`}>{PRIORITY_LABELS[report.priority]}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${STATUS_CLS[report.status]}`}>{STATUS_LABELS[report.status]}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#687689]">
              <i className="fa-regular fa-clock text-[11px]" />
              <span>{formatTime(report.created_at)}</span>
              <span className="text-[10px]">({elapsed(report.created_at)})</span>
            </div>
          </div>

          {/* Reporter */}
          <div className="px-5 py-4 border-b border-black/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Reporter</p>
            <p className="text-[14px] font-semibold text-[var(--text)]">{report.reporter_name}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[13px] text-[var(--text)]">{report.contact_number}</span>
              <a href={`tel:${report.contact_number}`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#d8f5e6] px-3 text-[12px] font-bold text-[#20a45d] transition hover:bg-[#c0edda]" aria-label={`Call ${report.reporter_name}`}>
                <i className="fa-solid fa-phone text-[11px]" />
                Call
              </a>
            </div>
            {report.address ? <p className="mt-2 text-[12px] text-[#687689]">{report.address}</p> : null}
          </div>

          {/* Location */}
          {coords ? (
            <div className="px-5 py-4 border-b border-black/5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Location</p>
              {geoLoading ? (
                <div className="h-5 w-3/4 animate-pulse rounded bg-black/5" />
              ) : geoAddress ? (
                <p className="text-[13px] text-[var(--text)]">{geoAddress}</p>
              ) : null}
              <div ref={miniMapRef} className="mt-3 h-[200px] w-full overflow-hidden rounded-xl border border-black/5" />
              <p className="mt-2 font-mono text-[11px] text-[#687689]">{coords}</p>
            </div>
          ) : null}

          {/* Description */}
          <div className="px-5 py-4 border-b border-black/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Description</p>
            {report.description ? (
              <p className="text-[13px] leading-relaxed text-[var(--text)]">{report.description}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef1f5] px-3 py-1 text-[12px] font-medium text-[#687689]">{report.incident_type}</span>
              </div>
            )}
          </div>

          {/* Photo */}
          {report.photo_url ? (
            <div className="px-5 py-4 border-b border-black/5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Photo</p>
              <button type="button" onClick={() => setLightbox(true)} className="block w-full overflow-hidden rounded-xl border border-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={report.photo_url} alt="Report photo" className="max-h-[220px] w-full object-cover" />
              </button>
              <p className="mt-1.5 text-[11px] text-[#687689]">Tap to view full size</p>
            </div>
          ) : null}

          {/* Timeline */}
          <div className="px-5 py-4 border-b border-black/5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Status Timeline</p>
            <div>
              {timeline.map((u, i) => (
                <div key={u.id} className="flex gap-3 animate-[drawerSlide_200ms_ease-out]">
                  <div className="relative flex flex-col items-center">
                    <span style={{ background: STATUS_DOT[u.status] }} className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" />
                    {i < timeline.length - 1 ? <span className="mt-1 w-px flex-1 bg-black/10" /> : null}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_CLS[u.status]}`}>{STATUS_LABELS[u.status]}</span>
                      <span className="text-[10px] text-[#687689]">{formatTime(u.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#687689]">Updated by Barangay Official</p>
                    {u.remarks ? <p className="mt-1.5 rounded-lg bg-[#f2f3f5] px-3 py-2 text-[11px] leading-relaxed text-[var(--text)]">{u.remarks}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          {report.status === ReportStatus.Pending ? (
            <div className="px-5 py-4">
              <button type="button" onClick={() => setDangerOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-lg border border-[#b83232]/20 px-3 text-[12px] font-semibold text-[#b83232] transition hover:bg-[#ffe8e8]" aria-label="Toggle danger zone">
                <span className="flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-[11px]" /> Danger Zone</span>
                <i className={`fa-solid ${dangerOpen ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
              </button>
              {dangerOpen ? (
                <div className="mt-3 rounded-lg border border-[#b83232]/10 bg-[#fff5f5] p-4">
                  <p className="text-[12px] font-semibold text-[#b83232]">Cancel this report</p>
                  <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-[#b83232]/20 bg-white px-3 text-[16px] text-[var(--text)]" aria-label="Cancel reason">
                    {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {!cancelConfirm ? (
                    <button type="button" onClick={() => setCancelConfirm(true)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#b83232] text-[13px] font-bold text-[#b83232] transition hover:bg-[#b83232] hover:text-white" aria-label="Cancel report">
                      <i className="fa-solid fa-xmark" /> Cancel Report
                    </button>
                  ) : (
                    <button type="button" onClick={handleCancel} disabled={cancelling} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#b83232] text-[13px] font-bold text-white transition hover:bg-[#9a2828] disabled:opacity-60" aria-label="Confirm cancel report">
                      <i className={cancelling ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check"} />
                      {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* spacer for sticky form */}
          <div className="h-[280px]" />
        </div>

        {/* Update form — sticky bottom */}
        <form onSubmit={handleSave} className="shrink-0 border-t border-black/5 bg-white px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#687689]">Update Report</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#687689]">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)} className="h-12 w-full rounded-lg border border-black/10 bg-white px-2 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none" aria-label="Update status">
                {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#687689]">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as ReportPriority)} className="h-12 w-full rounded-lg border border-black/10 bg-white px-2 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none" aria-label="Update priority">
                {PRIORITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#687689]">Assign to</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="h-12 w-full rounded-lg border border-black/10 bg-white px-2 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none" aria-label="Assign responder team">
                <option value="">— None —</option>
                {RESPONDER_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-[16px] text-[var(--text)] focus:border-[#D4AA00] focus:outline-none" aria-label="Optional notes" />
          <button type="submit" disabled={saving} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D4AA00] text-[13px] font-bold text-[#0D1B2A] transition hover:bg-[#B98F00] disabled:opacity-60" aria-label="Save changes">
            <i className={saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk"} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drawerSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </>
  );
}
