// ─── HERE Truck Routing API Client ───
// Provides truck-specific routing with weight limits, bridge clearance,
// real-time traffic, and road restrictions.

import { decode } from "@here/flexpolyline";

const HERE_API_KEY = process.env.HERE_API_KEY;
const ROUTER_BASE = "https://router.hereapi.com/v8";

// Metro Waste truck specs (Peterbilt 348 / Kenworth T370 roll-off)
const TRUCK_SPECS = {
  height: 400,          // 4.0m (~13ft) — roll-off with container
  width: 260,           // 2.6m (~8.5ft)
  length: 1100,         // 11.0m (~36ft)
  grossWeight: 15000,   // 15,000 kg (~33,000 lbs) loaded
  weightPerAxle: 7500,  // 7,500 kg per axle
  axleCount: 3,
  trailersCount: 0,
  tunnelCategory: "D",  // Allowed in most tunnels
};

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TruckRouteResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  polyline: RoutePoint[];
}

export interface WaypointSequenceResult {
  optimizedOrder: number[];
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  legs: Array<{
    from: number;
    to: number;
    distanceMiles: number;
    durationMinutes: number;
  }>;
  polyline: RoutePoint[];
}

/**
 * Get truck-optimized route between two points.
 * Uses HERE Routing v8 with truck transport mode.
 * Considers: weight limits, bridge clearance, road restrictions, real-time traffic.
 */
export async function getTruckRoute(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<TruckRouteResult | null> {
  if (!HERE_API_KEY) {
    console.warn("[HERE] No API key configured");
    return null;
  }

  const params = new URLSearchParams({
    apikey: HERE_API_KEY,
    transportMode: "truck",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    return: "summary,polyline",
    "truck[grossWeight]": String(TRUCK_SPECS.grossWeight),
    "truck[weightPerAxle]": String(TRUCK_SPECS.weightPerAxle),
    "truck[height]": String(TRUCK_SPECS.height),
    "truck[width]": String(TRUCK_SPECS.width),
    "truck[length]": String(TRUCK_SPECS.length),
    "truck[axleCount]": String(TRUCK_SPECS.axleCount),
    "truck[trailersCount]": String(TRUCK_SPECS.trailersCount),
    "truck[tunnelCategory]": TRUCK_SPECS.tunnelCategory,
    departureTime: new Date().toISOString(),  // Real-time traffic
  });

  try {
    const res = await fetch(`${ROUTER_BASE}/routes?${params}`);
    if (!res.ok) {
      console.error("[HERE] Route error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const section = route.sections?.[0];
    const distanceMeters = section?.summary?.length || 0;
    const durationSeconds = section?.summary?.duration || 0;

    // Decode polyline for actual road path
    let polyline: RoutePoint[] = [origin, destination];
    if (section?.polyline) {
      try {
        const decoded = decode(section.polyline);
        polyline = decoded.polyline.map((point: number[]) => ({ lat: point[0], lng: point[1] }));
      } catch {
        // Keep fallback
      }
    }

    return {
      distanceMeters,
      distanceMiles: Math.round((distanceMeters / 1609.344) * 10) / 10,
      durationSeconds,
      durationMinutes: Math.round(durationSeconds / 60),
      polyline,
    };
  } catch (err) {
    console.error("[HERE] Route request failed:", err);
    return null;
  }
}

/**
 * Get truck-optimized route through multiple waypoints.
 * HERE calculates the optimal sequence considering truck restrictions and traffic.
 */
export async function getTruckRouteMultiStop(
  waypoints: RoutePoint[]
): Promise<TruckRouteResult | null> {
  if (!HERE_API_KEY || waypoints.length < 2) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const vias = waypoints.slice(1, -1);

  const params = new URLSearchParams({
    apikey: HERE_API_KEY,
    transportMode: "truck",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    return: "summary,polyline",
    "truck[grossWeight]": String(TRUCK_SPECS.grossWeight),
    "truck[weightPerAxle]": String(TRUCK_SPECS.weightPerAxle),
    "truck[height]": String(TRUCK_SPECS.height),
    "truck[width]": String(TRUCK_SPECS.width),
    "truck[length]": String(TRUCK_SPECS.length),
    "truck[axleCount]": String(TRUCK_SPECS.axleCount),
    departureTime: new Date().toISOString(),
  });

  // Add via points
  vias.forEach((v) => {
    params.append("via", `${v.lat},${v.lng}`);
  });

  try {
    const res = await fetch(`${ROUTER_BASE}/routes?${params}`);
    if (!res.ok) {
      console.error("[HERE] Multi-stop error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    // Sum up all sections
    let totalDistance = 0;
    let totalDuration = 0;
    const allPoints: RoutePoint[] = [];

    for (const section of route.sections || []) {
      totalDistance += section.summary?.length || 0;
      totalDuration += section.summary?.duration || 0;
      // Decode the flexible polyline to get actual road path
      if (section.polyline) {
        try {
          const decoded = decode(section.polyline);
          for (const point of decoded.polyline) {
            allPoints.push({ lat: point[0], lng: point[1] });
          }
        } catch (e) {
          // Fallback: add section endpoints
          if (section.departure?.place?.location) {
            allPoints.push({
              lat: section.departure.place.location.lat,
              lng: section.departure.place.location.lng,
            });
          }
          if (section.arrival?.place?.location) {
            allPoints.push({
              lat: section.arrival.place.location.lat,
              lng: section.arrival.place.location.lng,
            });
          }
        }
      }
    }

    return {
      distanceMeters: totalDistance,
      distanceMiles: Math.round((totalDistance / 1609.344) * 10) / 10,
      durationSeconds: totalDuration,
      durationMinutes: Math.round(totalDuration / 60),
      polyline: allPoints,
    };
  } catch (err) {
    console.error("[HERE] Multi-stop request failed:", err);
    return null;
  }
}

/**
 * Calculate truck distance/time matrix between multiple points.
 * Useful for finding optimal sequences.
 */
export async function getTruckMatrix(
  origins: RoutePoint[],
  destinations: RoutePoint[]
): Promise<{ distances: number[][]; durations: number[][] } | null> {
  if (!HERE_API_KEY) return null;

  const params = new URLSearchParams({
    apikey: HERE_API_KEY,
    "async": "false",
  });

  const body = {
    origins: origins.map((o) => ({ lat: o.lat, lng: o.lng })),
    destinations: destinations.map((d) => ({ lat: d.lat, lng: d.lng })),
    regionDefinition: {
      type: "circle",
      center: { lat: 40.59, lng: -74.69 }, // Branchburg center
      radius: 80000, // 80km radius
    },
    truck: {
      grossWeight: TRUCK_SPECS.grossWeight,
      weightPerAxle: TRUCK_SPECS.weightPerAxle,
      height: TRUCK_SPECS.height,
      width: TRUCK_SPECS.width,
      length: TRUCK_SPECS.length,
      axleCount: TRUCK_SPECS.axleCount,
    },
    matrixAttributes: ["distances", "travelTimes"],
  };

  try {
    const res = await fetch(
      `https://matrix.router.hereapi.com/v8/matrix?${params}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      console.error("[HERE] Matrix error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const matrix = data.matrix;

    // Reshape flat arrays into 2D matrices
    const numOrigins = origins.length;
    const numDests = destinations.length;
    const distances: number[][] = [];
    const durations: number[][] = [];

    for (let i = 0; i < numOrigins; i++) {
      distances.push([]);
      durations.push([]);
      for (let j = 0; j < numDests; j++) {
        const idx = i * numDests + j;
        // Convert meters to miles
        distances[i].push(
          Math.round(((matrix.distances?.[idx] || 0) / 1609.344) * 10) / 10
        );
        // Convert seconds to minutes
        durations[i].push(
          Math.round((matrix.travelTimes?.[idx] || 0) / 60)
        );
      }
    }

    return { distances, durations };
  } catch (err) {
    console.error("[HERE] Matrix request failed:", err);
    return null;
  }
}

// Polyline decoding now handled by @here/flexpolyline package
