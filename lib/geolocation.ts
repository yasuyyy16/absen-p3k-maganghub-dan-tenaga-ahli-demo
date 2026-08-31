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
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                'Izin akses lokasi ditolak. Silakan aktifkan izin lokasi/GPS pada browser perangkat Anda untuk melakukan absensi.'
              )
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                'Lokasi GPS tidak dapat diperoleh. Pastikan sensor lokasi/GPS perangkat Anda aktif.'
              )
            );
            break;
          case error.TIMEOUT:
            reject(
              new Error(
                'Permintaan lokasi GPS melebihi batas waktu (timeout). Pastikan Anda memiliki sinyal GPS dan silakan coba lagi.'
              )
            );
            break;
          default:
            reject(
              new Error(
                'Gagal mendapatkan lokasi GPS. Silakan pastikan izin lokasi diaktifkan lalu coba lagi.'
              )
            );
            break;
        }
      },
      options
    );
  });
}
