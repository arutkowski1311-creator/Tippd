"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */

export interface MapJob {
  id: string;
  lat: number;
  lng: number;
  address: string;
  customer_name: string;
  type: "drop" | "pickup";
  status: string;
  unit_number?: string;
  size?: string;
  base_rate?: number;
  actual_drop_time?: string;
  requested_pickup_start?: string;
  days_on_site?: number;
}

export interface TruckLocation {
  driver_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  status: string; // "on_route" | "offline" | "at_dump" | "at_yard" etc.
  updated_at?: string;
  truck_name?: string | null;
  truck_plate?: string | null;
}

interface MapProps {
  yard: { lat: number; lng: number; address: string };
  jobs: MapJob[];
  transferStations: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
  }>;
  routePath?: Array<{ lat: number; lng: number }>;
  truckLocations?: TruckLocation[];
  selectedJobId?: string | null;
  onJobClick?: (jobId: string) => void;
}

/* ---------- Dark map styles ---------- */

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#373737" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c3c3c" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#4e4e4e" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d3d3d" }],
  },
];

/* ---------- SVG Marker Builders ---------- */

/** Numbered circle marker for stops */
function circleMarkerIcon(
  color: string,
  label?: string,
  scale: number = 1,
): string {
  const size = Math.round(32 * scale);
  const half = size / 2;
  const fontSize = Math.round(12 * scale);
  const textEl = label
    ? `<text x="${half}" y="${half + fontSize * 0.35}" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold" font-size="${fontSize}">${label}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${half}" cy="${half}" r="${half - 1}" fill="${color}" stroke="#fff" stroke-width="2"/>
    ${textEl}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Diamond marker for transfer stations */
function diamondMarkerIcon(color: string, scale: number = 1): string {
  const size = Math.round(28 * scale);
  const half = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <polygon points="${half},1 ${size - 1},${half} ${half},${size - 1} 1,${half}" fill="${color}" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Truck marker SVG — body shape with optional heading arrow */
function truckMarkerIcon(status: string, heading?: number | null): string {
  const isOnRoute = status === "on_route" || status === "at_dump";
  const isAtYard = status === "at_yard";
  const bodyColor = isOnRoute ? "#22c55e" : isAtYard ? "#3b82f6" : "#6b7280";
  const borderColor = "#ffffff";
  const rotation = heading != null ? heading : 0;

  // Truck-cab SVG (top-down view): rounded rect body + small cab nub at top
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <g transform="rotate(${rotation}, 22, 22)">
      <!-- Truck body (rectangle) -->
      <rect x="12" y="10" width="20" height="26" rx="3" fill="${bodyColor}" stroke="${borderColor}" stroke-width="2"/>
      <!-- Cab nub at front -->
      <rect x="15" y="7" width="14" height="7" rx="2" fill="${bodyColor}" stroke="${borderColor}" stroke-width="1.5"/>
      <!-- Windshield -->
      <rect x="16" y="8" width="12" height="4" rx="1" fill="rgba(255,255,255,0.35)"/>
      <!-- Heading arrow at top -->
      <polygon points="22,2 26,9 18,9" fill="${borderColor}" opacity="0.9"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Pulse ring for active truck */
function truckPulseIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <circle cx="32" cy="32" r="26" fill="none" stroke="${color}" stroke-width="3" opacity="0.5">
      <animate attributeName="r" from="18" to="30" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Status badge color for info windows */
function getInfoStatusBadge(status: string): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: "#3b82f620", text: "#60a5fa", label: "Scheduled" },
    en_route_drop: { bg: "#6366f120", text: "#818cf8", label: "En Route (Drop)" },
    dropped: { bg: "#10b98120", text: "#34d399", label: "Dropped" },
    active: { bg: "#10b98120", text: "#34d399", label: "Active" },
    pickup_requested: { bg: "#f9731620", text: "#fb923c", label: "Pickup Requested" },
    pickup_scheduled: { bg: "#3b82f620", text: "#60a5fa", label: "Pickup Scheduled" },
    en_route_pickup: { bg: "#6366f120", text: "#818cf8", label: "En Route (Pickup)" },
    pending_approval: { bg: "#f59e0b20", text: "#fbbf24", label: "Pending" },
  };
  return map[status] || { bg: "#ffffff20", text: "#9ca3af", label: status };
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function fmtTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  } catch {
    return dateStr;
  }
}

/** Build styled info window HTML for a job */
function buildJobInfoHTML(job: MapJob): string {
  const isDrop = job.type === "drop";
  const badge = getInfoStatusBadge(job.status);
  const typeBg = isDrop ? "#3b82f6" : "#f97316";
  const typeLabel = isDrop ? "Drop-off" : "Pickup";

  let rows = "";

  rows += `
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${typeBg};color:#fff;">${typeLabel}</span>
      <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${badge.bg};color:${badge.text};border:1px solid ${badge.text}40;">${badge.label}</span>
    </div>
  `;

  rows += `
    <div style="margin-bottom:6px;">
      <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Address</div>
      <div style="font-size:13px;color:#374151;">${job.address}</div>
    </div>
  `;

  if (job.unit_number || job.size) {
    rows += `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Dumpster</div>
        <div style="font-size:13px;color:#374151;">
          ${job.unit_number ? `<strong>${job.unit_number}</strong>` : ""}
          ${job.unit_number && job.size ? " &middot; " : ""}
          ${job.size ? `${job.size}` : ""}
        </div>
      </div>
    `;
  }

  if (job.actual_drop_time) {
    rows += `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Drop Time</div>
        <div style="font-size:13px;color:#374151;">${fmtDate(job.actual_drop_time)}</div>
      </div>
    `;
  }

  if (job.days_on_site !== undefined && job.days_on_site >= 0) {
    const daysColor = job.days_on_site > 7 ? "#ef4444" : job.days_on_site > 3 ? "#f59e0b" : "#10b981";
    rows += `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Days on Site</div>
        <div style="font-size:13px;font-weight:600;color:${daysColor};">${job.days_on_site} day${job.days_on_site !== 1 ? "s" : ""}</div>
      </div>
    `;
  }

  if (job.requested_pickup_start) {
    rows += `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Scheduled Pickup</div>
        <div style="font-size:13px;color:#374151;">${fmtDate(job.requested_pickup_start)}</div>
      </div>
    `;
  }

  if (job.base_rate !== undefined) {
    rows += `
      <div style="margin-bottom:2px;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Rate</div>
        <div style="font-size:14px;font-weight:700;color:#059669;">$${job.base_rate.toLocaleString()}</div>
      </div>
    `;
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:8px 4px;max-width:280px;min-width:220px;">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:6px;border-bottom:2px solid ${typeBg};padding-bottom:6px;">
        ${job.customer_name}
      </div>
      ${rows}
    </div>
  `;
}

/** Build styled info window for a truck */
function buildTruckInfoHTML(t: TruckLocation): string {
  const isOnRoute = t.status === "on_route" || t.status === "at_dump";
  const statusColor = isOnRoute ? "#22c55e" : t.status === "at_yard" ? "#3b82f6" : "#6b7280";
  const statusLabel = t.status === "on_route" ? "On Route" :
    t.status === "at_dump" ? "At Transfer Station" :
    t.status === "at_yard" ? "At Yard" :
    t.status === "offline" ? "Offline" : t.status;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:8px 4px;min-width:180px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${statusColor};flex-shrink:0;"></div>
        <div style="font-size:15px;font-weight:700;color:#111827;">${t.driver_name}</div>
      </div>
      ${t.truck_name ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px;">🚛 ${t.truck_name}${t.truck_plate ? ` · ${t.truck_plate}` : ""}</div>` : ""}
      <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;margin-bottom:6px;">${statusLabel}</div>
      ${t.speed != null && t.speed > 0 ? `<div style="font-size:12px;color:#6b7280;">${Math.round(t.speed)} mph</div>` : ""}
      ${t.updated_at ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Updated ${fmtTime(t.updated_at)}</div>` : ""}
    </div>
  `;
}

/* ---------- Component ---------- */

export default function DispatchMap({
  yard,
  jobs,
  transferStations,
  routePath,
  truckLocations,
  selectedJobId,
  onJobClick,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const truckMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const pulseOverlayRef = useRef<google.maps.Marker | null>(null);
  const isInitializedRef = useRef(false);

  /* ---- Cleanup helpers ---- */

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  const clearTruckMarkers = useCallback(() => {
    truckMarkersRef.current.forEach((m) => m.setMap(null));
    truckMarkersRef.current = [];
  }, []);

  const clearPolyline = useCallback(() => {
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
  }, []);

  const clearDirections = useCallback(() => {
    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current = null;
  }, []);

  const clearPulse = useCallback(() => {
    pulseOverlayRef.current?.setMap(null);
    pulseOverlayRef.current = null;
  }, []);

  /* ---- Initialize map once ---- */

  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!containerRef.current) return;
    if (typeof window === "undefined" || !window.google?.maps) return;

    const map = new google.maps.Map(containerRef.current, {
      center: { lat: 40.59, lng: -74.69 },
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
  }, []);

  /* ---- Sync route polyline using Directions Service ---- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing route
    clearPolyline();
    clearDirections();

    if (!routePath || routePath.length < 2) return;

    const gm = window.google.maps;

    // Try Directions Service for real road routing
    try {
      const service = new gm.DirectionsService();
      const renderer = new gm.DirectionsRenderer({
        map,
        suppressMarkers: true, // we manage our own markers
        preserveViewport: true,
        polylineOptions: {
          strokeColor: "#8b5cf6",
          strokeOpacity: 0.85,
          strokeWeight: 4,
        },
      });
      directionsRendererRef.current = renderer;

      const origin = routePath[0];
      const destination = routePath[routePath.length - 1];
      const middlePoints = routePath.slice(1, -1);

      // Directions API allows max 25 waypoints
      const waypointSlice = middlePoints.slice(0, 23);

      const waypoints: google.maps.DirectionsWaypoint[] = waypointSlice.map((p) => ({
        location: new gm.LatLng(p.lat, p.lng),
        stopover: false, // faster — no U-turns at waypoints
      }));

      service.route(
        {
          origin: new gm.LatLng(origin.lat, origin.lng),
          destination: new gm.LatLng(destination.lat, destination.lng),
          waypoints,
          optimizeWaypoints: false,
          travelMode: gm.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: gm.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          if (status === gm.DirectionsStatus.OK && result) {
            renderer.setDirections(result);
          } else {
            // Directions API not available or over quota — fall back to straight polyline
            renderer.setMap(null);
            directionsRendererRef.current = null;
            const fallbackPolyline = new gm.Polyline({
              path: routePath.map((p) => ({ lat: p.lat, lng: p.lng })),
              geodesic: true,
              strokeColor: "#8b5cf6",
              strokeOpacity: 0.7,
              strokeWeight: 3,
              map,
            });
            polylineRef.current = fallbackPolyline;
          }
        }
      );
    } catch {
      // Fallback if DirectionsService not available
      const fallbackPolyline = new window.google.maps.Polyline({
        path: routePath.map((p) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: "#8b5cf6",
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map,
      });
      polylineRef.current = fallbackPolyline;
    }
  }, [routePath, clearPolyline, clearDirections]);

  /* ---- Sync stop markers whenever jobs/selection change ---- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const gm = window.google.maps;
    const iw = infoWindowRef.current!;

    clearMarkers();
    clearPulse();

    const markers: google.maps.Marker[] = [];

    /* -- Yard marker -- */
    const yardMarker = new gm.Marker({
      position: { lat: yard.lat, lng: yard.lng },
      map,
      icon: {
        url: circleMarkerIcon("#22c55e", "Y"),
        scaledSize: new gm.Size(32, 32),
        anchor: new gm.Point(16, 16),
      },
      title: "Yard",
      zIndex: 10,
    });
    yardMarker.addListener("click", () => {
      iw.setContent(
        `<div style="color:#212121;font-family:sans-serif;padding:4px 0;">
          <strong>Yard</strong><br/>
          <span style="font-size:13px;">${yard.address}</span>
        </div>`,
      );
      iw.open(map, yardMarker);
    });
    markers.push(yardMarker);

    /* -- Job markers -- */
    jobs.forEach((job) => {
      const isDrop = job.type === "drop";
      const color = isDrop ? "#3b82f6" : "#f97316";
      const isSelected = job.id === selectedJobId;

      const marker = new gm.Marker({
        position: { lat: job.lat, lng: job.lng },
        map,
        icon: {
          url: circleMarkerIcon(color, undefined, isSelected ? 1.3 : 1),
          scaledSize: isSelected ? new gm.Size(42, 42) : new gm.Size(32, 32),
          anchor: isSelected ? new gm.Point(21, 21) : new gm.Point(16, 16),
        },
        title: `${job.customer_name} (${job.type})`,
        zIndex: isSelected ? 20 : 5,
      });

      marker.addListener("click", () => {
        iw.setContent(buildJobInfoHTML(job));
        iw.open(map, marker);
      });

      markers.push(marker);

      /* Pulse ring for selected job */
      if (isSelected) {
        const pulseMarker = new gm.Marker({
          position: { lat: job.lat, lng: job.lng },
          map,
          icon: {
            url: buildPulseIcon(color),
            scaledSize: new gm.Size(56, 56),
            anchor: new gm.Point(28, 28),
          },
          clickable: false,
          zIndex: 19,
        });
        pulseOverlayRef.current = pulseMarker;
      }
    });

    /* -- Transfer station markers -- */
    transferStations.forEach((ts) => {
      const marker = new gm.Marker({
        position: { lat: ts.lat, lng: ts.lng },
        map,
        icon: {
          url: diamondMarkerIcon("#ef4444"),
          scaledSize: new gm.Size(28, 28),
          anchor: new gm.Point(14, 14),
        },
        title: ts.name,
        zIndex: 8,
      });

      marker.addListener("click", () => {
        iw.close();
        iw.setContent(
          `<div style="color:#212121;font-family:sans-serif;padding:4px 0;">
            <strong>Transfer Station</strong><br/>
            <span style="font-size:13px;">${ts.name}</span>
          </div>`,
        );
        iw.open(map, marker);
      });

      markers.push(marker);
    });

    markersRef.current = markers;
  }, [yard, jobs, transferStations, selectedJobId, onJobClick, clearMarkers, clearPulse]);

  /* ---- Sync truck markers (separate effect so they update independently) ---- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const gm = window.google.maps;
    const iw = infoWindowRef.current!;

    clearTruckMarkers();

    if (!truckLocations || truckLocations.length === 0) return;

    const markers: google.maps.Marker[] = [];

    truckLocations.forEach((truck) => {
      if (truck.lat == null || truck.lng == null) return;

      const isActive = truck.status === "on_route" || truck.status === "at_dump";
      const statusColor = isActive ? "#22c55e" :
        truck.status === "at_yard" ? "#3b82f6" : "#6b7280";

      // Pulse ring for active trucks
      if (isActive) {
        const pulse = new gm.Marker({
          position: { lat: truck.lat, lng: truck.lng },
          map,
          icon: {
            url: truckPulseIcon(statusColor),
            scaledSize: new gm.Size(64, 64),
            anchor: new gm.Point(32, 32),
          },
          clickable: false,
          zIndex: 24,
        });
        markers.push(pulse);
      }

      // Truck body marker
      const marker = new gm.Marker({
        position: { lat: truck.lat, lng: truck.lng },
        map,
        icon: {
          url: truckMarkerIcon(truck.status, truck.heading),
          scaledSize: new gm.Size(44, 44),
          anchor: new gm.Point(22, 22),
        },
        title: `${truck.driver_name}${truck.truck_name ? ` · ${truck.truck_name}` : ""}`,
        zIndex: 25,
      });

      marker.addListener("click", () => {
        iw.setContent(buildTruckInfoHTML(truck));
        iw.open(map, marker);
      });

      markers.push(marker);
    });

    truckMarkersRef.current = markers;
  }, [truckLocations, clearTruckMarkers]);

  /* ---- Cleanup on unmount ---- */

  useEffect(() => {
    return () => {
      clearMarkers();
      clearTruckMarkers();
      clearPolyline();
      clearDirections();
      clearPulse();
    };
  }, [clearMarkers, clearTruckMarkers, clearPolyline, clearDirections, clearPulse]);

  /* ---- Check if Google Maps is available ---- */

  const isGoogleReady =
    typeof window !== "undefined" && !!window.google?.maps;

  if (!isGoogleReady) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400",
          "h-full w-full min-h-[400px]",
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-8 w-8 animate-spin text-zinc-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span className="text-sm">Map loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full min-h-[400px] rounded-md overflow-hidden")}
    />
  );
}

/* ---------- Pulse animation SVG for selected job ---------- */

function buildPulseIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56">
    <circle cx="28" cy="28" r="22" fill="none" stroke="${color}" stroke-width="3" opacity="0.5">
      <animate attributeName="r" from="14" to="26" dur="1.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="28" cy="28" r="14" fill="none" stroke="${color}" stroke-width="2" opacity="0.3">
      <animate attributeName="r" from="10" to="22" dur="1.2s" begin="0.3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" begin="0.3s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
