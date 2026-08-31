'use client';

import { useState, useTransition } from 'react';
import { absenPulangAction } from '@/app/actions/attendance';

interface AbsenPulangCardProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkOutTimeFormatted: string | null;
  isLeave: boolean;
  isCheckoutAllowed: boolean;
}

export default function AbsenPulangCard({
  isCheckedIn,
  isCheckedOut,
  checkOutTimeFormatted,
  isLeave,
  isCheckoutAllowed,
}: AbsenPulangCardProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleAbsenPulang = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await absenPulangAction();
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
            Presensi Pulang
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Lakukan Absen Pulang pada akhir jam kerja (mulai pukul 16:00 WIB).
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

        {isCheckedOut ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Absen Pulang
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tercatat
              </span>
            </div>
            <p className="text-base font-semibold text-slate-900">
              {checkOutTimeFormatted ? `Pukul ${checkOutTimeFormatted}` : 'Sudah Pulang'}
            </p>
            <p className="text-xs text-slate-600">
              Kamu sudah absen pulang hari ini.
            </p>
          </div>
        ) : isLeave ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
            Hari ini Anda berstatus Izin / Sakit. Absen Pulang tidak diperlukan.
          </div>
        ) : !isCheckedIn ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
            Lakukan Absen Pagi terlebih dahulu sebelum dapat melakukan Absen Pulang.
          </div>
        ) : !isCheckoutAllowed ? (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600">
              Absen Pulang hanya dapat dilakukan mulai pukul <strong>16:00 WIB</strong>.
            </div>
            <button
              type="button"
              disabled
              className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 font-semibold text-base cursor-not-allowed border border-slate-300"
            >
              Absen Pulang (Mulai 16:00 WIB)
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAbsenPulang}
            disabled={isPending}
            className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            {isPending ? 'Mencatat Absen Pulang...' : 'Absen Pulang'}
          </button>
        )}
      </div>
    </div>
  );
}
