// ─── Haversine Distance & Route Utilities ───

const EARTH_RADIUS_MILES = 3958.8;

/** Calculate distance between two lat/lng points in miles */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/** Estimate drive time in minutes (avg 25mph for local roads) */
export function estimateDriveTime(miles: number): number {
  return Math.round((miles / 25) * 60);
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Calculate total route miles through a sequence of stops */
export function totalRouteMiles(stops: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineDistance(
      stops[i - 1].lat,
      stops[i - 1].lng,
      stops[i].lat,
      stops[i].lng
    );
  }
  return Math.round(total * 10) / 10;
}

/** Find the nearest point from a list to a given point */
export function findNearest(
  from: LatLng,
  candidates: (LatLng & { id: string })[]
): (LatLng & { id: string }) | null {
  if (candidates.length === 0) return null;
  let nearest = candidates[0];
  let minDist = haversineDistance(from.lat, from.lng, nearest.lat, nearest.lng);
  for (let i = 1; i < candidates.length; i++) {
    const dist = haversineDistance(from.lat, from.lng, candidates[i].lat, candidates[i].lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = candidates[i];
    }
  }
  return nearest;
}

/** Simple nearest-neighbor route optimization */
export function nearestNeighborRoute(
  start: LatLng,
  stops: (LatLng & { id: string })[],
  end?: LatLng
): { sequence: string[]; totalMiles: number; totalMinutes: number } {
  const remaining = [...stops];
  const sequence: string[] = [];
  const route: LatLng[] = [start];
  let current = start;

  while (remaining.length > 0) {
    const nearest = findNearest(current, remaining)!;
    sequence.push(nearest.id);
    route.push(nearest);
    current = nearest;
    remaining.splice(remaining.indexOf(nearest), 1);
  }

  if (end) route.push(end);

  const totalMiles = totalRouteMiles(route);
  const totalMinutes = estimateDriveTime(totalMiles);

  return { sequence, totalMiles, totalMinutes };
}
