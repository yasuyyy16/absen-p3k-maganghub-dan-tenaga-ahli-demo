'use client';

import { useState, useTransition } from 'react';
import { absenPulangAction } from '@/app/actions/attendance';
import type { LocationPayload } from '@/lib/types';
import { getCurrentBrowserLocation } from '@/lib/geolocation';
import AttendanceConfirmModal from '@/components/dashboard/AttendanceConfirmModal';

interface AbsenPulangCardProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkOutTimeFormatted: string | null;
  isLeave: boolean;
  isWeekend?: boolean;
  liveLocation?: LocationPayload | null;
  liveError?: string | null;
}

export default function AbsenPulangCard({
  isCheckedIn,
  isCheckedOut,
  checkOutTimeFormatted,
  isLeave,
  isWeekend = false,
  liveLocation,
}: AbsenPulangCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleOpenModal = () => {
    if (isWeekend) return;
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isGeoLoading && !isPending) {
      setIsModalOpen(false);
    }
  };

  const handleConfirmAbsenPulang = async () => {
    setFeedback(null);
    setIsGeoLoading(true);

    try {
      const location = liveLocation ?? (await getCurrentBrowserLocation());
      setIsGeoLoading(false);

      // Submit to Server Action with coordinates
      startTransition(async () => {
        const result = await absenPulangAction(location);
        setIsModalOpen(false);
        if (!result.success) {
          setFeedback({ type: 'error', message: result.message });
        } else {
          setFeedback({ type: 'success', message: result.message });
        }
      });
    } catch (err: unknown) {
      setIsGeoLoading(false);
      setIsModalOpen(false);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif.';
      setFeedback({ type: 'error', message: errorMessage });
    }
  };

  const isBusy = isPending || isGeoLoading;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Absen Pulang
          </h3>
          {isCheckedOut && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Tercatat
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Presensi keluar jam operasional harian berbasis GPS.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-3.5 mb-4 rounded-xl text-xs sm:text-sm font-medium border ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isCheckedOut ? (
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Jam Pulang
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {checkOutTimeFormatted ? `${checkOutTimeFormatted}` : 'Tercatat'}
              </span>
            </div>
          </div>
        </div>
      ) : isLeave ? (
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 text-xs text-slate-500 italic text-center">
          Status hari ini Izin / Sakit.
        </div>
      ) : !isCheckedIn ? (
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 text-xs text-slate-500 italic text-center">
          Belum melakukan Absen Pagi.
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenModal}
          disabled={isBusy || isWeekend}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#006194] hover:bg-[#004e77] active:bg-[#003d5e] text-white font-bold text-sm sm:text-base transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isBusy ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
              <span>Absen Pulang</span>
            </>
          )}
        </button>
      )}

      {/* Confirmation Modal */}
      <AttendanceConfirmModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAbsenPulang}
        mode="PULANG"
        isGeoLoading={isGeoLoading}
        isPending={isPending}
      />
    </div>
  );
}
