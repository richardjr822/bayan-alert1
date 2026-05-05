"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { submitReport } from "@/lib/actions/reportActions";
import { supabase } from "@/lib/supabase/client";
import { getAddressFromCoords, sanitizeContact } from "../../lib/utils";
import ToastStack from "./ToastStack";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; message: string; kind: ToastKind };
type Coordinates = { latitude: number; longitude: number };
type NearbyReport = { id: string; created_at: string };

const INCIDENT_TYPES = [
  { value: "Fire", label: "Fire", icon: "fa-solid fa-fire", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", active: "bg-orange-100 border-orange-500 ring-2 ring-orange-200" },
  { value: "Medical Emergency", label: "Medical", icon: "fa-solid fa-kit-medical", color: "text-red-600", bg: "bg-red-50 border-red-200", active: "bg-red-100 border-red-500 ring-2 ring-red-200" },
  { value: "Flood", label: "Flood", icon: "fa-solid fa-water", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", active: "bg-blue-100 border-blue-500 ring-2 ring-blue-200" },
  { value: "Crime/Security", label: "Crime", icon: "fa-solid fa-shield-halved", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", active: "bg-purple-100 border-purple-500 ring-2 ring-purple-200" },
  { value: "Accident", label: "Accident", icon: "fa-solid fa-car-burst", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", active: "bg-amber-100 border-amber-500 ring-2 ring-amber-200" },
  { value: "Other", label: "Other", icon: "fa-solid fa-circle-exclamation", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", active: "bg-slate-100 border-slate-500 ring-2 ring-slate-200" },
];

const DESCRIPTION_PRESETS = [
  "Someone is injured",
  "Building is on fire",
  "Water is rising rapidly",
  "Person is trapped or missing",
  "Multiple people affected",
  "Immediate medical attention needed",
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", base: "bg-slate-100 text-slate-600 border-slate-300", active: "bg-slate-200 border-slate-600 ring-2 ring-slate-300" },
  { value: "medium", label: "Medium", base: "bg-yellow-50 text-yellow-700 border-yellow-300", active: "bg-yellow-100 border-yellow-500 ring-2 ring-yellow-200" },
  { value: "high", label: "High", base: "bg-orange-50 text-orange-700 border-orange-300", active: "bg-orange-100 border-orange-500 ring-2 ring-orange-200" },
  { value: "critical", label: "Critical", base: "bg-red-50 text-red-700 border-red-300", active: "bg-red-100 border-red-500 ring-2 ring-red-200" },
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = { defaultContact?: string };

export default function ReportFormClient({ defaultContact = "" }: Props) {
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("low");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [isLocating, setIsLocating] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState(defaultContact);
  const [isContactEditable, setIsContactEditable] = useState(!defaultContact);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reportRef, setReportRef] = useState("");
  const [nearbyReport, setNearbyReport] = useState<NearbyReport | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const pushToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCoordinates(coords);
    setResolvedAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    setLocationError("");
    setIsLocating(false);
    setIsResolvingAddress(true);
    getAddressFromCoords(coords.latitude, coords.longitude)
      .then((addr) => { setResolvedAddress(addr); setIsResolvingAddress(false); })
      .catch(() => setIsResolvingAddress(false));
  }, []);

  const handleLocationFailure = useCallback((msg: string) => {
    setCoordinates(null);
    setResolvedAddress("");
    setLocationError(msg);
    setIsLocating(false);
    setShowManualEntry(true);
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) { handleLocationFailure("Location is not supported by your browser."); return; }
    setIsLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      () => handleLocationFailure("Can't detect your location. Describe where you are below."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      const t = window.setTimeout(() => handleLocationFailure("Location is not supported by your browser."), 0);
      return () => window.clearTimeout(t);
    }
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      () => handleLocationFailure("Can't detect your location. Describe where you are below."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [handleLocationSuccess, handleLocationFailure]);

  useEffect(() => {
    if (!incidentType || !coordinates) return;
    let active = true;
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    supabase
      .from("reports")
      .select("id, created_at")
      .eq("incident_type", incidentType)
      .gte("created_at", thirtyMinsAgo)
      .in("status", ["pending", "verified", "in_progress"])
      .gte("latitude", coordinates.latitude - 0.0005)
      .lte("latitude", coordinates.latitude + 0.0005)
      .gte("longitude", coordinates.longitude - 0.0005)
      .lte("longitude", coordinates.longitude + 0.0005)
      .limit(1)
      .then(({ data }) => { if (active) setNearbyReport((data as NearbyReport[] | null)?.[0] ?? null); });
    return () => { active = false; setNearbyReport(null); };
  }, [incidentType, coordinates]);

  function togglePreset(preset: string) {
    setSelectedPresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    );
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!incidentType) { pushToast("Please select an incident type.", "error"); return; }
    const locationText = resolvedAddress || manualAddress;
    if (!locationText) { pushToast("Please provide your location.", "error"); return; }
    if (!contact) { pushToast("Please enter your contact number.", "error"); return; }

    setIsSubmitting(true);
    setSubmitError("");

    const fullDescription = [...selectedPresets, description].filter(Boolean).join(". ") || incidentType;

    const result = await submitReport({
      incidentType,
      description: fullDescription,
      contactNumber: contact,
      latitude: coordinates?.latitude ?? 0,
      longitude: coordinates?.longitude ?? 0,
      address: locationText,
      severity,
    });

    if ("error" in result) {
      setSubmitError(result.error);
      setIsSubmitting(false);
      return;
    }

    setReportRef(result.reportId.slice(0, 8).toUpperCase());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.40)]">
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-soft)]">
            <i className="fa-solid fa-circle-check text-[32px] text-[var(--green)]"></i>
          </div>
          <h2 className="text-[22px] font-extrabold text-[var(--text)]">Report Submitted</h2>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            A barangay official will respond shortly. Stay safe and keep your phone nearby.
          </p>
          <div className="my-6 rounded-xl bg-[var(--bg-gray)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Reference Number</p>
            <p className="mt-1 font-mono text-[26px] font-extrabold tracking-widest text-[var(--dark)]">{reportRef}</p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">Screenshot this for follow-up</p>
          </div>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dark)] px-7 py-3.5 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            <i className="fa-solid fa-gauge-high"></i>
            Track your report
          </a>
          <button
            onClick={() => {
              setSubmitted(false);
              setIncidentType("");
              setSeverity("low");
              setSelectedPresets([]);
              setDescription("");
              setPhotoPreview(null);
              setReportRef("");
              setSubmitError("");
            }}
            className="mt-3 block w-full text-center text-[12px] text-[var(--muted)] underline underline-offset-2"
          >
            Submit another report
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.40)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="bg-[var(--red)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <i className="fa-solid fa-circle-exclamation text-[16px] text-white"></i>
            </div>
            <div>
              <p className="text-[13px] font-extrabold leading-none text-white">Emergency Report Form</p>
              <p className="mt-0.5 text-[11px] text-white/65">Brgy Sta. Rita &mdash; Lungsod ng Olongapo</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[var(--line)]">

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-1 mr-1.5 opacity-50"></i>What happened?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INCIDENT_TYPES.map((type) => {
                const sel = incidentType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setIncidentType(type.value)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 py-4 transition active:scale-[0.96] ${sel ? type.active : type.bg}`}
                  >
                    <i className={`${type.icon} text-[22px] ${type.color} ${sel ? "" : "opacity-70"}`}></i>
                    <span className={`text-[11px] font-bold ${sel ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-2 mr-1.5 opacity-50"></i>How urgent?
            </p>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`flex-1 rounded-lg border-2 py-2.5 text-[12px] font-bold transition ${severity === opt.value ? opt.active : opt.base}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-3 mr-1.5 opacity-50"></i>Where are you?
            </p>
            {coordinates ? (
              <div className="flex items-start gap-3 rounded-xl bg-[var(--green-soft)] px-4 py-3">
                <i className="fa-solid fa-circle-check mt-0.5 shrink-0 text-[14px] text-[var(--green)]"></i>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[var(--green)]">Location Confirmed</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#1a6641]">
                    {isResolvingAddress ? "Resolving address..." : resolvedAddress}
                  </p>
                </div>
                <button type="button" onClick={requestLocation} className="shrink-0 text-[10px] font-semibold text-[var(--green)] underline">
                  Refresh
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                disabled={isLocating}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--bg-gray)] py-5 text-[13px] font-bold text-[var(--text)] transition hover:bg-white disabled:opacity-60"
              >
                <i className={`text-[18px] text-[var(--red)] ${isLocating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-location-crosshairs"}`}></i>
                <span>{isLocating ? "Detecting location..." : "Tap to detect my location"}</span>
              </button>
            )}
            {locationError ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#c0392b]">
                <i className="fa-solid fa-triangle-exclamation shrink-0"></i>
                {locationError}
              </p>
            ) : null}
            {showManualEntry || !coordinates ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">
                  Can&apos;t detect location? Describe where you are:
                </p>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="e.g. Purok 3, near Sta. Rita Elementary School"
                  className="w-full rounded-lg border border-[#d7dde5] bg-white px-3 py-2.5 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)]"
                />
              </div>
            ) : null}
            {nearbyReport ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-[13px] text-amber-600"></i>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  <strong>Someone nearby already reported a {incidentType}</strong>{" "}
                  at {new Date(nearbyReport.created_at).toLocaleTimeString()}. You can still submit if it&apos;s a different incident.
                </p>
              </div>
            ) : null}
          </div>

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-4 mr-1.5 opacity-50"></i>
              What&apos;s happening?{" "}
              <span className="font-normal normal-case text-[var(--muted)]">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DESCRIPTION_PRESETS.map((preset) => {
                const active = selectedPresets.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition ${active ? "border-[var(--red)] bg-[var(--red)]/10 text-[var(--text)]" : "border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--bg-gray)]"}`}
                  >
                    <i className={`mr-1.5 ${active ? "fa-solid fa-square-check text-[var(--red)]" : "fa-regular fa-square"}`}></i>
                    {preset}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="Add more details... (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-3 w-full resize-none rounded-xl border border-[#d7dde5] bg-white px-3 py-2.5 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)]"
            />
          </div>

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-5 mr-1.5 opacity-50"></i>
              Add Photo{" "}
              <span className="font-normal normal-case text-[var(--muted)]">(helps officials respond faster)</span>
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePhotoSelect}
            />
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Report photo" className="max-h-[200px] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <i className="fa-solid fa-xmark text-[12px]"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--bg-gray)] py-5 text-[13px] font-semibold text-[var(--muted)] transition hover:border-[var(--red)] hover:bg-white hover:text-[var(--text)]"
              >
                <i className="fa-solid fa-camera text-[20px]"></i>
                <span>Take or upload a photo</span>
              </button>
            )}
          </div>

          <div className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <i className="fa-solid fa-6 mr-1.5 opacity-50"></i>Your Contact
            </p>
            {!isContactEditable ? (
              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg-gray)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-lock text-[11px] text-[var(--muted)]"></i>
                  <span className="text-[13px] font-semibold text-[var(--text)]">{contact}</span>
                </div>
                <button type="button" onClick={() => setIsContactEditable(true)} className="text-[11px] font-semibold text-[var(--red-dark)] underline underline-offset-2">
                  Edit
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="09XXXXXXXXX"
                maxLength={11}
                value={contact}
                onChange={(e) => setContact(sanitizeContact(e.target.value))}
                className="w-full rounded-xl border border-[#d7dde5] bg-white px-4 py-3 text-[13px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)]"
              />
            )}
          </div>

          <div className="p-5">
            {submitError ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#fff5f5] px-4 py-3">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0 text-[#c0392b]"></i>
                <div className="text-[12px] text-[#c0392b]">
                  <p className="font-bold">Submission failed</p>
                  <p>{submitError}</p>
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--red)] py-4 text-[16px] font-extrabold text-white shadow-[0_4px_24px_rgba(212,170,0,0.40)] transition hover:bg-[var(--red-dark)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <><i className="fa-solid fa-spinner fa-spin"></i><span>Submitting...</span></>
              ) : (
                <><i className="fa-solid fa-circle-exclamation text-[16px]"></i><span>SUBMIT EMERGENCY REPORT</span></>
              )}
            </button>
            <p className="mt-3 text-center text-[10px] text-[var(--muted)]">
              Your location and contact will be shared with barangay officials only.
            </p>
          </div>

        </div>
      </form>
      <ToastStack toasts={toasts} />
    </>
  );
}
