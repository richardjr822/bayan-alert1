import { STORAGE_KEY, STA_RITA_CENTER, STA_RITA_RADIUS_KM } from "./constants";
import type { Report } from "../types/report";

export function loadReports(): Report[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((report) => report?.reportId !== "BAY-001000");
  } catch {
    return [];
  }
}

export function saveReports(data: Report[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString();
}

export function sanitizeContact(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 11);
}

export function nextReportId(list: Report[]) {
  const highest = list.reduce((max, report) => {
    const numeric = Number(String(report.reportId || "").replace("BAY-", ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  const next = highest + 1;
  return `BAY-${String(next).padStart(6, "0")}`;
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinStaRita(lat: number, lng: number) {
  const distance = calculateDistance(STA_RITA_CENTER.lat, STA_RITA_CENTER.lng, lat, lng);
  return distance <= STA_RITA_RADIUS_KM;
}

export async function getAddressFromCoords(lat: number, lng: number) {
  const baseUrl = process.env.NEXT_PUBLIC_GEOCODE_URL ?? "https://nominatim.openstreetmap.org/reverse";
  const url = new URL(baseUrl);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!data) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
