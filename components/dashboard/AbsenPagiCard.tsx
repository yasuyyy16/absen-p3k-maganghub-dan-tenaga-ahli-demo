'use client';

import { useState, useTransition } from 'react';
import { absenPagiAction } from '@/app/actions/attendance';

interface AbsenPagiCardProps {
  isCheckedIn: boolean;
  checkInTimeFormatted: string | null;
  isLeave: boolean;
}

export default function AbsenPagiCard({
  isCheckedIn,
  checkInTimeFormatted,
  isLeave,
}: AbsenPagiCardProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleAbsenPagi = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await absenPagiAction();
      if (!result.success) {
        setFeedback({ type: 'error', message: result.message });
      } else {
        setFeedback({ type: 'success', message: result.message });
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Presensi Pagi
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Lakukan Absen Pagi saat memulai jam operasional harian.
          </p>
        </div>

        {feedback && (
          <div
            role="alert"
            aria-live="polite"
            className={`p-3.5 rounded-md text-sm font-medium border ${
              feedback.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {isCheckedIn ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Absen Pagi
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tercatat
              </span>
            </div>
            <p className="text-base font-semibold text-slate-900">
              {checkInTimeFormatted ? `Pukul ${checkInTimeFormatted}` : 'Sudah Masuk'}
            </p>
            <p className="text-xs text-slate-600">
              Kamu sudah absen pagi hari ini.
            </p>
          </div>
        ) : isLeave ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
            Hari ini Anda berstatus Izin / Sakit. Absen Pagi tidak diperlukan.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAbsenPagi}
            disabled={isPending}
            className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            {isPending ? 'Mencatat Presensi...' : 'Absen Pagi'}
          </button>
        )}
      </div>
    </div>
  );
}
