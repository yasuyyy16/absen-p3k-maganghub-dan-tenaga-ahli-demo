'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAccuracyInfo } from '@/lib/location';
import { useI18n } from '@/lib/i18n/context';

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

export interface LocationModalRecord {
  id: number;
  nama?: string;
  universitas?: string | null;
  jurusan?: string | null;
  jenisPersonel?: string | null;
  dateFormatted: string;
  checkInFormatted?: string | null;
  checkOutFormatted?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  address?: string | null;
  latitude_out?: number | null;
  longitude_out?: number | null;
  accuracy_out?: number | null;
  address_out?: string | null;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LocationModalRecord | null;
}

export default function LocationModal({
  isOpen,
  onClose,
  record,
}: LocationModalProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('IN');
  const [prevRecordId, setPrevRecordId] = useState<number | undefined>(record?.id);

  // Synchronize default activeTab during render when record changes
  if (record && record.id !== prevRecordId) {
    setPrevRecordId(record.id);
    const hasIn = typeof record.latitude === 'number' && typeof record.longitude === 'number';
    const hasOut = typeof record.latitude_out === 'number' && typeof record.longitude_out === 'number';
    setActiveTab(!hasIn && hasOut ? 'OUT' : 'IN');
  }

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

  const isOut = activeTab === 'OUT';
  const hasSelectedLocation = isOut ? hasOutLocation : hasInLocation;

  const currentLat = isOut ? record.latitude_out : record.latitude;
  const currentLon = isOut ? record.longitude_out : record.longitude;
  const currentAccuracy = isOut ? record.accuracy_out : record.accuracy;
  const currentAddress = isOut ? record.address_out : record.address;
  const currentTitle = isOut ? t.dashboard.locationCheckOut : t.dashboard.locationCheckIn;
  const currentTime = isOut ? record.checkOutFormatted : record.checkInFormatted;

  const accuracyInfo = getAccuracyInfo(currentAccuracy);

  const academicInfo = [record.universitas, record.jurusan].filter(Boolean).join(' • ');

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
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="location-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {t.history.modalLocationTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.nama ? `${record.nama} • ` : ''}{record.dateFormatted}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer"
            aria-label={t.common.close}
          >
            ✕
          </button>
        </div>

        {/* Toggle Tabs if both exist */}
        {hasInLocation && hasOutLocation && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('IN')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'IN'
                  ? 'bg-white text-[#006194] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.dashboard.tabIn}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('OUT')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'OUT'
                  ? 'bg-white text-[#006194] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.dashboard.tabOut}
            </button>
          </div>
        )}

        {hasSelectedLocation && typeof currentLat === 'number' && typeof currentLon === 'number' ? (
          <>
            {/* Interactive Map */}
            <AttendanceMap
              latitude={currentLat}
              longitude={currentLon}
              accuracy={currentAccuracy}
              address={currentAddress}
              title={currentTitle}
              heightClass="h-48 sm:h-56"
            />

            {/* Accuracy Warning if low */}
            {accuracyInfo.warning && (
              <div
                role="alert"
                className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{locale === 'en' ? t.accuracy.warningLow : accuracyInfo.warning}</span>
              </div>
            )}

            {/* Context Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {record.nama && (
                <div className="col-span-2 sm:col-span-3 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                    {locale === 'en' ? 'Name / Person' : 'Nama / Person'}
                  </span>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 block">
                      {record.nama}
                    </span>
                    {academicInfo && (
                      <span className="text-[11px] text-slate-600 font-medium">
                        {academicInfo}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  {locale === 'en' ? 'Attendance Type' : 'Jenis Presensi'}
                </span>
                <span className="font-bold text-slate-900 block">
                  {isOut ? t.dashboard.tabOut : t.dashboard.tabIn}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  {locale === 'en' ? 'Recorded Time' : 'Waktu Tercatat'}
                </span>
                <span className="font-bold font-mono text-slate-900 block">
                  {currentTime ?? '-'}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  {t.dashboard.gpsAccuracy}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold font-mono text-slate-900 block">
                    {accuracyInfo.formatted}
                  </span>
                  {accuracyInfo.level !== 'UNKNOWN' && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${accuracyInfo.badgeStyle}`}>
                      {accuracyInfo.level === 'GOOD' ? t.accuracy.high : accuracyInfo.level === 'MODERATE' ? t.accuracy.medium : accuracyInfo.level === 'LOW' ? t.accuracy.low : t.accuracy.unknown}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Latitude
                </span>
                <span className="font-bold font-mono text-slate-900 truncate block">
                  {currentLat.toFixed(6)}
                </span>
              </div>

              <div className="col-span-1 sm:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Longitude
                </span>
                <span className="font-bold font-mono text-slate-900 truncate block">
                  {currentLon.toFixed(6)}
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
                  {t.dashboard.addressLabel}
                </span>
                <p className="text-slate-800 font-medium break-words leading-relaxed">
                  {currentAddress || t.dashboard.addressUnavailable}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1 text-slate-500">
            <p className="text-xs sm:text-sm font-medium">
              {isOut
                ? t.dashboard.checkOutLocationUnavailable
                : t.dashboard.checkInLocationUnavailable}
            </p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
