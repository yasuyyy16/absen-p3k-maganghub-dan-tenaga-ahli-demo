'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { getAccuracyInfo } from '@/lib/location';

// Dynamically import map with SSR disabled to prevent window/Leaflet errors
const AttendanceMap = dynamic(
  () => import('@/components/map/AttendanceMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 sm:h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
        Memuat peta lokasi...
      </div>
    ),
  }
);

interface AttendanceLocationCardProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  latitudeOut?: number | null;
  longitudeOut?: number | null;
  accuracyOut?: number | null;
  addressOut?: string | null;
  isFriday?: boolean;
  liveLatitude?: number | null;
  liveLongitude?: number | null;
  liveAccuracy?: number | null;
  isLiveLoading?: boolean;
  liveError?: string | null;
}

export default function AttendanceLocationCard({
  latitude,
  longitude,
  accuracy,
  address,
  latitudeOut,
  longitudeOut,
  accuracyOut,
  addressOut,
  isFriday = false,
  liveLatitude,
  liveLongitude,
  liveAccuracy,
  isLiveLoading,
  liveError,
}: AttendanceLocationCardProps) {
  const hasInLocation = typeof latitude === 'number' && typeof longitude === 'number';
  const hasOutLocation = typeof latitudeOut === 'number' && typeof longitudeOut === 'number';
  const hasLiveLocation = typeof liveLatitude === 'number' && typeof liveLongitude === 'number';

  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('IN');

  const isOut = activeTab === 'OUT';

  // If viewing OUT and OUT location exists, show recorded OUT location. Otherwise show LIVE location.
  const showLive = isOut ? !hasOutLocation : !hasInLocation;

  const currentLat = showLive ? liveLatitude : isOut ? latitudeOut : latitude;
  const currentLon = showLive ? liveLongitude : isOut ? longitudeOut : longitude;
  const currentAccuracy = showLive ? liveAccuracy : isOut ? accuracyOut : accuracy;
  const currentAddress = showLive ? 'Posisi Anda saat ini (Realtime GPS)' : isOut ? addressOut : address;
  const currentTitle = showLive ? 'Posisi Anda Saat Ini' : isOut ? 'Lokasi Absen Pulang' : 'Lokasi Absen Pagi';
  const hasSelectedLocation =
    typeof currentLat === 'number' && typeof currentLon === 'number';

  const accuracyInfo = getAccuracyInfo(currentAccuracy ?? null);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Lokasi Presensi
          </h3>
          <p className="text-xs text-slate-500">
            {showLive ? 'Menampilkan posisi GPS Anda secara realtime.' : 'Titik koordinat geografis terekam saat melakukan presensi.'}
          </p>
        </div>

        {/* Tab Toggle (Always show when live location or recorded data exists) */}
        {(hasInLocation || hasOutLocation || hasLiveLocation) && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('IN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'IN'
                  ? 'bg-white text-[#006194] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('OUT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'OUT'
                  ? 'bg-white text-[#006194] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pulang
            </button>
          </div>
        )}
      </div>

      {liveError && showLive && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-red-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{liveError}</span>
        </div>
      )}

      {isLiveLoading && showLive && !hasLiveLocation && (
        <div className="w-full h-48 sm:h-64 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs font-medium gap-2">
          <svg className="animate-spin w-5 h-5 text-[#006194]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Mencari lokasi Anda...</span>
        </div>
      )}

      {(!showLive || hasLiveLocation) && typeof currentLat === 'number' && typeof currentLon === 'number' ? (
        <>
          {/* Map Visualization */}
          <AttendanceMap
            latitude={currentLat}
            longitude={currentLon}
            accuracy={currentAccuracy}
            address={currentAddress}
            title={currentTitle}
            heightClass="h-48 sm:h-64"
          />

          {/* Accuracy Warning if GPS accuracy is low (>50m) */}
          {accuracyInfo.warning && (
            <div
              role="alert"
              className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span>{accuracyInfo.warning}</span>
            </div>
          )}

          {/* Location Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {/* Latitude */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                Latitude
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 truncate block">
                {currentLat.toFixed(6)}
              </span>
            </div>

            {/* Longitude */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                Longitude
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 truncate block">
                {currentLon.toFixed(6)}
              </span>
            </div>

            {/* Accuracy with Semantic Label */}
            <div className="col-span-2 sm:col-span-1 bg-slate-50/80 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                Akurasi GPS
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                  {accuracyInfo.formatted}
                </span>
                {accuracyInfo.level !== 'UNKNOWN' && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${accuracyInfo.badgeStyle}`}>
                    {accuracyInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Address Box */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                Alamat / Wilayah
              </span>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-snug break-words">
                {currentAddress || 'Alamat tidak tersedia'}
              </p>
            </div>
          </div>
        </>
      ) : isFriday && !hasSelectedLocation ? (
        <div className="p-6 bg-emerald-50/60 border border-dashed border-emerald-200 rounded-xl text-center space-y-1 text-emerald-800">
          <p className="text-xs sm:text-sm font-semibold">
            Hari Jumat — WFH (Bebas Lokasi)
          </p>
          <p className="text-xs text-emerald-700/90">
            Presensi hari Jumat tidak memerlukan pencatatan lokasi GPS.
          </p>
        </div>
      ) : showLive && !isLiveLoading ? (
        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1 text-slate-500">
          <p className="text-xs sm:text-sm font-medium">
            Menunggu sinyal GPS perangkat...
          </p>
          <p className="text-xs text-slate-400">
            Pastikan izin lokasi/GPS aktif di perangkat Anda.
          </p>
        </div>
      ) : !showLive && !hasSelectedLocation ? (
        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1 text-slate-500">
          <p className="text-xs sm:text-sm font-medium">
            {isOut
              ? 'Lokasi Absen Pulang belum tersedia.'
              : 'Lokasi Absen Pagi belum tersedia.'}
          </p>
          <p className="text-xs text-slate-400">
            {isOut
              ? 'Data lokasi akan tersimpan otomatis saat Anda melakukan Absen Pulang.'
              : 'Data lokasi tersimpan saat Anda melakukan Absen Pagi.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
