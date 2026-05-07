"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

type LeafletMapThumbnailProps = {
  lat: number;
  lng: number;
};

export default function LeafletMapThumbnail({ lat, lng }: LeafletMapThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    async function init() {
      const L = (await import("leaflet")).default;
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#D4AA00;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([lat, lng], { icon }).addTo(map);
      map.setView([lat, lng], 15);
      mapRef.current = map;

      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg border border-[var(--line)]"
    />
  );
}
