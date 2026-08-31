'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AttendanceHistoryItem } from '@/lib/types';
import { formatAccuracy } from '@/lib/location';

const AttendanceMap = dynamic(
  () => import('@/components/map/AttendanceMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-56 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
        Memuat peta lokasi...
      </div>
    ),
  }
);

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceHistoryItem | null;
}

export default function LocationModal({
  isOpen,
  onClose,
  record,
}: LocationModalProps) {
  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('IN');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const hasInLocation = typeof record.latitude === 'number' && typeof record.longitude === 'number';
  const hasOutLocation = typeof record.latitude_out === 'number' && typeof record.longitude_out === 'number';

  if (!hasInLocation && !hasOutLocation) return null;

  const isOut = activeTab === 'OUT' && hasOutLocation;
  const currentLat = isOut ? record.latitude_out! : record.latitude!;
  const currentLon = isOut ? record.longitude_out! : record.longitude!;
  const currentAccuracy = isOut ? record.accuracy_out : record.accuracy;
  const currentAddress = isOut ? record.address_out : record.address;
  const currentTitle = isOut ? 'Lokasi Absen Pulang' : 'Lokasi Absen Pagi';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs pb-safe transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="location-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              Detail Lokasi Absensi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.dateFormatted}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer"
            aria-label="Tutup dialog lokasi"
          >
            ✕
          </button>
        </div>

        {/* Tabs for In/Out if both exist */}
        {hasInLocation && hasOutLocation && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('IN')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'IN'
                  ? 'bg-white text-[#006194] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lokasi Masuk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('OUT')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'OUT'
                  ? 'bg-white text-[#006194] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lokasi Pulang
            </button>
          </div>
        )}

        {/* Map */}
        <AttendanceMap
          latitude={currentLat}
          longitude={currentLon}
          accuracy={currentAccuracy}
          address={currentAddress}
          title={currentTitle}
          heightClass="h-48 sm:h-56"
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
              Latitude
            </span>
            <span className="font-bold font-mono text-slate-900 truncate block">
              {currentLat.toFixed(6)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
              Longitude
            </span>
            <span className="font-bold font-mono text-slate-900 truncate block">
              {currentLon.toFixed(6)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
              Akurasi
            </span>
            <span className="font-bold text-slate-900 block">
              {formatAccuracy(currentAccuracy)}
            </span>
          </div>
        </div>

        {/* Address Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2 text-xs">
          <svg className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 block mb-0.5">
              Alamat
            </span>
            <p className="text-slate-800 font-medium break-words leading-relaxed">
              {currentAddress || 'Alamat tidak dapat diperoleh'}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
