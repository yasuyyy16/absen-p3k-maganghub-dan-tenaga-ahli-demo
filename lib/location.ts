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

export type AccuracyLevel = 'GOOD' | 'MODERATE' | 'LOW' | 'UNKNOWN';

export interface AccuracyInfo {
  level: AccuracyLevel;
  label: string;
  formatted: string;
  badgeStyle: string;
  textStyle: string;
  warning?: string;
}

/**
 * Evaluates semantic GPS accuracy level and returns formatted UI presentation metadata.
 * Thresholds:
 * - <= 20m: Akurasi baik
 * - 21m - 50m: Akurasi sedang
 * - > 50m: Akurasi rendah (with advisory warning)
 */
export function getAccuracyInfo(accuracy?: number | null): AccuracyInfo {
  if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy <= 0) {
    return {
      level: 'UNKNOWN',
      label: 'Tidak tersedia',
      formatted: 'Tidak tersedia',
      badgeStyle: 'bg-slate-100 text-slate-600 border-slate-200',
      textStyle: 'text-slate-500',
    };
  }

  const rounded = Math.round(accuracy);
  const formatted = `±${rounded} meter`;

  if (accuracy <= 20) {
    return {
      level: 'GOOD',
      label: 'Akurasi baik',
      formatted,
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      textStyle: 'text-emerald-700',
    };
  }

  if (accuracy <= 50) {
    return {
      level: 'MODERATE',
      label: 'Akurasi sedang',
      formatted,
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
      textStyle: 'text-amber-700',
    };
  }

  return {
    level: 'LOW',
    label: 'Akurasi rendah',
    formatted,
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
    textStyle: 'text-rose-700',
    warning: 'Akurasi lokasi rendah. Pastikan GPS aktif dan berada di area terbuka.',
  };
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
