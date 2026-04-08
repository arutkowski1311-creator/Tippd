"use client";

import { useRef, useEffect, useCallback } from "react";

/* ─── Types ─── */

export interface FleetDumpster {
  id: string;
  unit_number: string;
  size: string;
  status: string;
  condition_grade: string;
  fill_status: "empty" | "full" | "unknown";
  lat: number | null;
  lng: number | null;
  location_label: string;
  staged_at: string | null;
}

interface FleetMapProps {
  dumpsters: FleetDumpster[];
  yard: { lat: number; lng: number; address: string } | null;
  transferStations?: Array<{ id: string; lat: number; lng: number; name: string }>;
}

/* ─── Dark map styles (same palette as DispatchMap) ─── */

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

/* ─── SVG marker builders ─── */

/** Dumpster icon — small rectangular bin shape, color-coded by status */
function dumpsterMarkerSvg(status: string, fillStatus: string): string {
  // Color by status
  const colorMap: Record<string, string> = {
    available:       "#22c55e",   // green
    in_yard:         "#22c55e",   // green
    needs_cleaning:  "#22c55e",   // green
    needs_repair:    "#f59e0b",   // amber
    assigned:        "#eab308",   // yellow
    deployed:        "#3b82f6",   // blue
    picked_up_full:  "#f97316",   // orange
    returning:       "#f97316",   // orange
    staged:          "#f97316",   // orange — pulsing handled separately
    at_transfer:     "#ef4444",   // red
    repair:          "#dc2626",   // red
    retired:         "#6b7280",   // gray
  };
  const bodyColor = colorMap[status] ?? "#6b7280";

  // Fill indicator dot: dark = full, light outline = empty
  const fillDot = fillStatus === "full"
    ? `<circle cx="16" cy="10" r="3.5" fill="#1f2937" stroke="#fff" stroke-width="1"/>`
    : fillStatus === "empty"
    ? `<circle cx="16" cy="10" r="3.5" fill="none" stroke="#fff" stroke-width="1.5"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <!-- Bin body -->
    <rect x="5" y="13" width="22" height="14" rx="2" fill="${bodyColor}" stroke="#fff" stroke-width="1.5"/>
    <!-- Bin lid -->
    <rect x="4" y="10" width="24" height="4" rx="1.5" fill="${bodyColor}" stroke="#fff" stroke-width="1.5"/>
    <!-- Vertical ribs on body -->
    <line x1="11" y1="14" x2="11" y2="26" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
    <line x1="16" y1="14" x2="16" y2="26" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
    <line x1="21" y1="14" x2="21" y2="26" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
    ${fillDot}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Orange pulsing ring overlay for staged boxes */
function pulseRingSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56">
    <circle cx="28" cy="28" r="22" fill="none" stroke="#f97316" stroke-width="3" opacity="0.6">
      <animate attributeName="r" from="16" to="26" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Diamond marker for transfer stations */
function diamondSvg(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    <polygon points="12,1 23,12 12,23 1,12" fill="${color}" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Available",
    in_yard: "In Yard",
    needs_cleaning: "Needs Cleaning",
    needs_repair: "Needs Repair",
    assigned: "Assigned",
    deployed: "Deployed",
    picked_up_full: "In Transit (Full)",
    returning: "Returning",
    staged: "Staged — Not Yet Dumped",
    at_transfer: "At Transfer Station",
    repair: "In Repair",
    retired: "Retired",
  };
  return labels[status] ?? status;
}

function fmtDuration(isoString: string | null): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
}

function buildDumpsterInfoHTML(d: FleetDumpster): string {
  const statusColor = {
    available: "#22c55e", in_yard: "#22c55e", needs_cleaning: "#22c55e",
    needs_repair: "#f59e0b", assigned: "#eab308", deployed: "#3b82f6",
    picked_up_full: "#f97316", returning: "#f97316",
    staged: "#f97316", at_transfer: "#ef4444",
    repair: "#dc2626", retired: "#6b7280",
  }[d.status] ?? "#9ca3af";

  const gradeColor = { A: "#22c55e", B: "#16a34a", C: "#eab308", D: "#f97316", F: "#dc2626" }[d.condition_grade] ?? "#9ca3af";

  const fillLabel = d.fill_status === "full" ? "🔴 Full" : d.fill_status === "empty" ? "🟢 Empty" : "Unknown";

  const stagedNote = d.status === "staged" && d.staged_at
    ? `<div style="margin-top:6px;padding:6px 8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">
        <div style="font-size:11px;font-weight:700;color:#c2410c;">⏳ Staged for ${fmtDuration(d.staged_at)}</div>
        <div style="font-size:11px;color:#92400e;">Waiting for facility to open</div>
       </div>`
    : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:6px 2px;min-width:200px;max-width:260px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="font-size:16px;font-weight:800;color:#111827;">${d.unit_number}</div>
        <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${statusLabel(d.status)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:6px;">
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Size</div>
          <div style="font-size:13px;font-weight:600;color:#374151;">${d.size}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Grade</div>
          <div style="font-size:13px;font-weight:700;color:${gradeColor};">${d.condition_grade}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Fill</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${fillLabel}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:5px;">${d.location_label}</div>
      ${stagedNote}
    </div>
  `;
}

/* ─── Component ─── */

export default function FleetMap({ dumpsters, yard, transferStations = [] }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const pulseMarkersRef = useRef<google.maps.Marker[]>([]);
  const isInitializedRef = useRef(false);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    pulseMarkersRef.current.forEach((m) => m.setMap(null));
    pulseMarkersRef.current = [];
  }, []);

  /* ── Initialize map ── */
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!containerRef.current) return;
    if (typeof window === "undefined" || !window.google?.maps) return;

    const defaultCenter = yard
      ? { lat: yard.lat, lng: yard.lng }
      : { lat: 40.59, lng: -74.69 };

    const map = new google.maps.Map(containerRef.current, {
      center: defaultCenter,
      zoom: 11,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
    isInitializedRef.current = true;
  }, [yard]);

  /* ── Sync markers whenever dumpsters data changes ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const gm = window.google?.maps;
    if (!gm) return;

    const iw = infoWindowRef.current!;
    clearMarkers();

    const newMarkers: google.maps.Marker[] = [];
    const newPulse: google.maps.Marker[] = [];

    /* Yard marker */
    if (yard?.lat && yard?.lng) {
      const yardMarker = new gm.Marker({
        position: { lat: yard.lat, lng: yard.lng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="#fff" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="900" font-size="13">Y</text>
            </svg>`
          )}`,
          scaledSize: new gm.Size(32, 32),
          anchor: new gm.Point(16, 16),
        },
        title: "Yard",
        zIndex: 5,
      });
      yardMarker.addListener("click", () => {
        iw.setContent(`<div style="font-family:sans-serif;padding:4px 2px;"><strong>Yard</strong><br/><span style="font-size:12px;color:#6b7280;">${yard.address}</span></div>`);
        iw.open(map, yardMarker);
      });
      newMarkers.push(yardMarker);
    }

    /* Transfer station markers */
    transferStations.forEach((ts) => {
      if (!ts.lat || !ts.lng) return;
      const tsMarker = new gm.Marker({
        position: { lat: ts.lat, lng: ts.lng },
        map,
        icon: {
          url: diamondSvg("#ef4444"),
          scaledSize: new gm.Size(24, 24),
          anchor: new gm.Point(12, 12),
        },
        title: ts.name,
        zIndex: 5,
      });
      tsMarker.addListener("click", () => {
        iw.setContent(`<div style="font-family:sans-serif;padding:4px 2px;"><strong>${ts.name}</strong><br/><span style="font-size:11px;color:#6b7280;">Transfer Station</span></div>`);
        iw.open(map, tsMarker);
      });
      newMarkers.push(tsMarker);
    });

    /* Dumpster markers */
    dumpsters.forEach((d) => {
      if (d.lat == null || d.lng == null) return;

      // Pulse ring for staged boxes
      if (d.status === "staged") {
        const pulse = new gm.Marker({
          position: { lat: d.lat, lng: d.lng },
          map,
          icon: {
            url: pulseRingSvg(),
            scaledSize: new gm.Size(56, 56),
            anchor: new gm.Point(28, 28),
          },
          zIndex: 8,
          clickable: false,
        });
        newPulse.push(pulse);
      }

      const marker = new gm.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        icon: {
          url: dumpsterMarkerSvg(d.status, d.fill_status),
          scaledSize: new gm.Size(32, 32),
          anchor: new gm.Point(16, 27),
        },
        title: `${d.unit_number} — ${d.size}`,
        zIndex: d.status === "staged" ? 20 : 10,
      });

      marker.addListener("click", () => {
        iw.setContent(buildDumpsterInfoHTML(d));
        iw.open(map, marker);
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
    pulseMarkersRef.current = newPulse;

    // Auto-fit map to show all markers if there are dumpsters
    const validDumpsters = dumpsters.filter((d) => d.lat != null && d.lng != null);
    if (validDumpsters.length > 0) {
      const bounds = new gm.LatLngBounds();
      validDumpsters.forEach((d) => bounds.extend({ lat: d.lat!, lng: d.lng! }));
      if (yard?.lat && yard?.lng) bounds.extend({ lat: yard.lat, lng: yard.lng });
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      // Don't zoom in too far
      const listener = gm.event.addListener(map, "idle", () => {
        if ((map.getZoom() ?? 15) > 14) map.setZoom(14);
        gm.event.removeListener(listener);
      });
    }
  }, [dumpsters, yard, transferStations, clearMarkers]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-white/10"
      style={{ height: "calc(100vh - 280px)", minHeight: "480px" }}
    />
  );
}
