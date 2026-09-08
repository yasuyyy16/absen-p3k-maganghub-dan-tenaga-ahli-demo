'use client';

import { useState, useTransition, useEffect } from 'react';
import { catatRapatAction } from '@/app/actions/attendance';

interface AktivitasKhususSectionProps {
  isRapat: boolean;
  canSelectRapat: boolean;
  entryMode: 'NO_ATTENDANCE' | 'FROM_HADIR' | null;
  blockedReason?: string | null;
  checkInTimeFormatted?: string | null;
  notes?: string | null;
  isWeekend?: boolean;
  isWindowClosed?: boolean;
}

export default function AktivitasKhususSection({
  isRapat,
  canSelectRapat,
  entryMode,
  blockedReason,
  checkInTimeFormatted,
  notes,
  isWeekend = false,
  isWindowClosed = false,
}: AktivitasKhususSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [keterangan, setKeterangan] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen && !isPending) {
        setIsModalOpen(false);
        setKeterangan('');
        setErrorMessage(null);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isPending]);

  const handleConfirmRapat = () => {
    const trimmed = keterangan.trim();
    if (!trimmed) {
      setErrorMessage('Keterangan rapat wajib diisi.');
      return;
    }
    if (trimmed.length > 500) {
      setErrorMessage('Keterangan rapat maksimal 500 karakter.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await catatRapatAction(trimmed);
      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        setIsModalOpen(false);
        setKeterangan('');
      }
    });
  };

  const isFromHadir = entryMode === 'FROM_HADIR';

  return (
    <section aria-labelledby="aktivitas-khusus-heading" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2
          id="aktivitas-khusus-heading"
          className="text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          Aktivitas Khusus
        </h2>
      </div>

      {isRapat ? (
        <div className="bg-teal-50/80 border border-teal-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5 text-teal-950">
          <div
            className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-teal-900">
                Kehadiran Rapat Tercatat
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-300/80">
                Aktif
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-800 leading-relaxed">
              Hari ini presensi Anda tercatat sebagai Rapat. Anda tidak perlu melakukan Absen Pagi maupun Absen Pulang.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-medium text-teal-900 border-t border-teal-200/60 mt-2">
              <div>
                <span className="text-teal-700/90">Jam Masuk: </span>
                <span className={`font-mono ${checkInTimeFormatted ? 'font-semibold text-teal-950' : 'text-teal-600'}`}>
                  {checkInTimeFormatted ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-teal-700/90">Jam Pulang: </span>
                <span className="font-semibold text-teal-950 font-sans">Rapat</span>
              </div>
            </div>
            {notes && notes.trim() !== '' && (
              <div className="pt-2 text-xs text-teal-900 border-t border-teal-200/60 mt-2">
                <span className="font-semibold text-teal-950">Keterangan: </span>
                <span className="text-teal-800 break-words">{notes}</span>
              </div>
            )}
          </div>
        </div>
      ) : canSelectRapat ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900">
                Rapat
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isFromHadir
                  ? 'Jika Anda memiliki rapat, termasuk rapat di luar kantor, tandai presensi hari ini sebagai Rapat. Jam Absen Pagi tetap tersimpan dan Anda tidak perlu melakukan Absen Pulang.'
                  : 'Anda dapat memilih Rapat tanpa melakukan Absen Pagi maupun Absen Pulang.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setKeterangan('');
                setErrorMessage(null);
                setIsModalOpen(true);
              }}
              className="shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <span>Rapat</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500">
          {isWeekend
            ? 'Aktivitas Khusus tidak tersedia pada hari libur akhir pekan.'
            : isWindowClosed
            ? 'Waktu presensi hari ini telah berakhir.'
            : blockedReason ?? 'Aktivitas Khusus saat ini tidak dapat dipilih.'}
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs pb-safe"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rapat-modal-title"
          aria-describedby="rapat-modal-desc"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              setIsModalOpen(false);
              setKeterangan('');
              setErrorMessage(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="rapat-modal-title" className="text-base font-bold text-slate-900">
                Konfirmasi Rapat
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isPending) {
                    setIsModalOpen(false);
                    setKeterangan('');
                    setErrorMessage(null);
                  }
                }}
                disabled={isPending}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog konfirmasi"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-700" id="rapat-modal-desc">
              <p className="text-sm font-semibold text-slate-900">
                {isFromHadir
                  ? 'Apakah Anda yakin ingin mengubah status presensi hari ini menjadi Rapat?'
                  : 'Apakah Anda yakin ingin mencatat hari ini sebagai Rapat?'}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isFromHadir
                  ? 'Status presensi hari ini akan diubah menjadi Rapat. Jam Absen Pagi tetap tersimpan dan Anda tidak perlu melakukan Absen Pulang.'
                  : 'Presensi hari ini akan dicatat sebagai Rapat. Anda tidak perlu melakukan Absen Pagi atau Absen Pulang.'}
              </p>
            </div>

            {/* Keterangan Rapat Input */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="keterangan-rapat"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Keterangan Rapat <span className="text-red-500">*</span>
              </label>
              <textarea
                id="keterangan-rapat"
                value={keterangan}
                onChange={(e) => {
                  setKeterangan(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Contoh: Rapat koordinasi dengan tim pengelola P3K di luar kantor."
                rows={3}
                maxLength={500}
                disabled={isPending}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 resize-none transition"
                required
                aria-required="true"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Keterangan ini wajib diisi.</span>
                <span>{keterangan.length}/500</span>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium"
              >
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setKeterangan('');
                  setErrorMessage(null);
                }}
                disabled={isPending}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRapat}
                disabled={isPending}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{isFromHadir ? 'Ya, Ubah ke Rapat' : 'Ya, Catat Rapat'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
