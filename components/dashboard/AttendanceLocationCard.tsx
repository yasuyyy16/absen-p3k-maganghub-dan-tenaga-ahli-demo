'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { formatAccuracy } from '@/lib/location';

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
}: AttendanceLocationCardProps) {
  const hasInLocation = typeof latitude === 'number' && typeof longitude === 'number';
  const hasOutLocation = typeof latitudeOut === 'number' && typeof longitudeOut === 'number';

  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('IN');

  if (!hasInLocation && !hasOutLocation) {
    return null;
  }

  // Determine current active coordinates
  const isOut = activeTab === 'OUT' && hasOutLocation;
  const currentLat = isOut ? latitudeOut! : latitude!;
  const currentLon = isOut ? longitudeOut! : longitude!;
  const currentAccuracy = isOut ? accuracyOut : accuracy;
  const currentAddress = isOut ? addressOut : address;
  const currentTitle = isOut ? 'Lokasi Absen Pulang' : 'Lokasi Absen Pagi';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Lokasi Presensi
          </h3>
          <p className="text-xs text-slate-500">
            Titik koordinat geografis terekam saat melakukan presensi.
          </p>
        </div>

        {hasInLocation && hasOutLocation && (
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

      {/* Map Visualization */}
      <AttendanceMap
        latitude={currentLat}
        longitude={currentLon}
        accuracy={currentAccuracy}
        address={currentAddress}
        title={currentTitle}
        heightClass="h-48 sm:h-64"
      />

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

        {/* Accuracy */}
        <div className="col-span-2 sm:col-span-1 bg-slate-50/80 border border-slate-100 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
            Akurasi GPS
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 block">
            {formatAccuracy(currentAccuracy)}
          </span>
        </div>
      </div>

      {/* Address */}
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
            {currentAddress || 'Alamat tidak dapat diperoleh'}
          </p>
        </div>
      </div>
    </div>
  );
}
