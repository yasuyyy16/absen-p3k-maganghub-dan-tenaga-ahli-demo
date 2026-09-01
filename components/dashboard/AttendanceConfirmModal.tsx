'use client';

import { useEffect } from 'react';

interface AttendanceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'PAGI' | 'PULANG';
  isGeoLoading: boolean;
  isPending: boolean;
}

export default function AttendanceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  isGeoLoading,
  isPending,
}: AttendanceConfirmModalProps) {
  const isBusy = isGeoLoading || isPending;
  const isPagi = mode === 'PAGI';

  const modalTitle = isPagi ? 'Konfirmasi Absen Pagi' : 'Konfirmasi Absen Pulang';
  const confirmMessage = isPagi
    ? 'Apakah Anda yakin ingin mencatat Absen Pagi sekarang?'
    : 'Apakah Anda yakin ingin mencatat Absen Pulang sekarang?';
  const confirmButtonLabel = isPagi ? 'Konfirmasi Absen' : 'Konfirmasi Absen Pulang';

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy && isOpen) {
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
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs pb-safe transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Drag handle on mobile */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
              isPagi
                ? 'bg-sky-50 text-[#006194] border border-sky-100'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}
          >
            {isPagi ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-dialog-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {modalTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Presensi digital berbasis lokasi GPS
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {confirmMessage}
          </p>

          <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/70 text-slate-700 text-xs flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="leading-snug">
              Titik koordinat GPS dan waktu presensi aktual akan terekam secara otomatis oleh sistem.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004e77] text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isGeoLoading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengambil Lokasi GPS...</span>
              </>
            ) : isPending ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{isPagi ? 'Mencatat Presensi...' : 'Mencatat Pulang...'}</span>
              </>
            ) : (
              <span>{confirmButtonLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
