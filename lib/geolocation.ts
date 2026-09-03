import { LocationPayload } from './types';

/**
 * Requests the current GPS coordinates from the browser's Geolocation API.
 * Accurately handles permission denied, position unavailable, timeout, and unsupported browser states.
 */
export function getCurrentBrowserLocation(): Promise<LocationPayload> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(
        new Error(
          'Browser yang Anda gunakan tidak mendukung fitur geolokasi GPS.'
        )
      );
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(formatGeolocationError(error)));
      },
      options
    );
  });
}

/**
 * Helper to map GeolocationPositionError to clear Indonesian error message
 */
export function formatGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Izin akses lokasi ditolak. Silakan aktifkan izin lokasi/GPS pada browser perangkat Anda untuk melakukan absensi.';
    case error.POSITION_UNAVAILABLE:
      return 'Lokasi GPS tidak dapat diperoleh. Pastikan sensor lokasi/GPS perangkat Anda aktif.';
    case error.TIMEOUT:
      return 'Permintaan lokasi GPS melebihi batas waktu (timeout). Pastikan Anda memiliki sinyal GPS dan silakan coba lagi.';
    default:
      return 'Gagal mendapatkan lokasi GPS. Silakan pastikan izin lokasi diaktifkan lalu coba lagi.';
  }
}

/**
 * Starts watching position via navigator.geolocation.watchPosition and returns cleanup function.
 */
export function watchBrowserLocation(
  onSuccess: (payload: LocationPayload) => void,
  onError: (errorMessage: string) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError('Browser yang Anda gunakan tidak mendukung fitur geolokasi GPS.');
    return () => {};
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      console.log('GPS Success:', position.coords.latitude, position.coords.longitude);
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      console.error('GPS Error:', error.code, error.message);
      onError(formatGeolocationError(error));
    },
    options
  );

  console.log('GPS watchPosition started with ID:', watchId);

  return () => {
    console.log('GPS cleanup called for ID:', watchId);
    navigator.geolocation.clearWatch(watchId);
  };
}
