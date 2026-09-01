'use client';

import { useState, useTransition } from 'react';
import { absenPulangAction } from '@/app/actions/attendance';
import { getCurrentBrowserLocation } from '@/lib/geolocation';
import SlideToConfirm from '@/components/dashboard/SlideToConfirm';
import AttendanceConfirmModal from '@/components/dashboard/AttendanceConfirmModal';

interface AbsenPulangCardProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkOutTimeFormatted: string | null;
  isLeave: boolean;
}

export default function AbsenPulangCard({
  isCheckedIn,
  isCheckedOut,
  checkOutTimeFormatted,
  isLeave,
}: AbsenPulangCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSlideComplete = () => {
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isGeoLoading && !isPending) {
      setIsModalOpen(false);
      setResetKey((prev) => prev + 1);
    }
  };

  const handleConfirmAbsenPulang = async () => {
    setFeedback(null);
    setIsGeoLoading(true);

    try {
      // 1. Request GPS position from browser
      const location = await getCurrentBrowserLocation();
      setIsGeoLoading(false);

      // 2. Submit to Server Action with coordinates
      startTransition(async () => {
        const result = await absenPulangAction(location);
        setIsModalOpen(false);
        if (!result.success) {
          setResetKey((prev) => prev + 1);
          setFeedback({ type: 'error', message: result.message });
        } else {
          setFeedback({ type: 'success', message: result.message });
        }
      });
    } catch (err: unknown) {
      setIsGeoLoading(false);
      setIsModalOpen(false);
      setResetKey((prev) => prev + 1);
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
        <SlideToConfirm
          label="Geser untuk Absen Pulang →"
          onSlideComplete={handleSlideComplete}
          disabled={isBusy}
          isBusy={isBusy}
          resetKey={resetKey}
        />
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
