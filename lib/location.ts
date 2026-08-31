/**
 * Centralized GPS and Geocoding utilities for attendance tracking.
 */

/**
 * Validates if latitude and longitude are valid numeric geographic coordinates.
 */
export function isValidCoordinates(
  latitude?: number | null,
  longitude?: number | null
): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    !isFinite(latitude) ||
    !isFinite(longitude)
  ) {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  return true;
}

/**
 * Formats GPS accuracy in meters.
 * e.g., "±15 meter"
 */
export function formatAccuracy(accuracy?: number | null): string {
  if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy <= 0) {
    return 'Tidak tersedia';
  }
  return `±${Math.round(accuracy)} meter`;
}

/**
 * Server-side reverse geocoding helper using OpenStreetMap Nominatim API with timeout.
 * Gracefully returns null if network fails or times out, never throwing to caller.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SistemAbsensiP3KKKP/1.0 (internal-system@kkp.go.id)',
        'Accept-Language': 'id,en;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || !data.address) {
      return data?.display_name ?? null;
    }

    const addr = data.address;
    const parts = [
      addr.building || addr.amenity || addr.office || addr.commercial,
      addr.road || addr.street,
      addr.suburb || addr.village || addr.neighbourhood || addr.quarter,
      addr.city || addr.town || addr.county || addr.city_district || addr.regency,
      addr.state || addr.province || addr.region,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return data.display_name ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
