/**
 * Geographical distance calculations using Haversine formula.
 */

/**
 * Calculates great-circle distance between two GPS coordinates in kilometers.
 * Accuracy: ~0.1 km.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Number.NaN;
  }

  // Exact same point
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

/**
 * Formats distance in a human-friendly way in Vietnamese (e.g. "~4.2 km" or "< 500 m").
 */
export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return "Không rõ khoảng cách";
  }
  if (distanceKm < 0.5) {
    return "Dưới 500 m";
  }
  if (distanceKm < 1) {
    return `Cách ~${Math.round(distanceKm * 1000)} m`;
  }
  return `Cách ~${distanceKm.toFixed(1)} km`;
}
