'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  submitIzinSakitAction,
  ubahKeIzinSakitAction,
} from '@/app/actions/attendance';

interface IzinSakitModalProps {
  mode?: 'CREATE' | 'CONVERT';
}

export default function IzinSakitModal({ mode = 'CREATE' }: IzinSakitModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'IZIN' | 'SAKIT'>('IZIN');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConvert = mode === 'CONVERT';
  const modalTitle = isConvert ? 'Ubah Status ke Izin / Sakit' : 'Pengajuan Izin / Sakit';
  const buttonLabel = isConvert ? 'Ubah Status ke Izin / Sakit' : 'Pengajuan Izin / Sakit';
  const statusLabel = status === 'IZIN' ? 'IZIN' : 'SAKIT';

  // Handle Escape key navigation (Anti-Slop R-32 / Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        if (showConfirm) {
          setShowConfirm(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
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
  }, [isOpen, showConfirm, isPending]);

  // First step form submit
  const handleFirstStepSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isConvert) {
      // In CONVERT mode, do NOT call server action immediately. Show confirmation dialog.
      setShowConfirm(true);
    } else {
      // In CREATE mode, proceed directly with server action
      const formData = new FormData();
      formData.append('status', status);
      formData.append('notes', notes);

      startTransition(async () => {
        const result = await submitIzinSakitAction(formData);
        if (!result.success) {
          setErrorMsg(result.message);
        } else {
          setIsOpen(false);
          setNotes('');
        }
      });
    }
  };

  // Second step explicit confirmation submit for CONVERT mode
  const handleConfirmConvert = () => {
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('status', status);
    formData.append('notes', notes);

    startTransition(async () => {
      const result = await ubahKeIzinSakitAction(formData);
      if (!result.success) {
        setShowConfirm(false);
        setErrorMsg(result.message);
      } else {
        setShowConfirm(false);
        setIsOpen(false);
        setNotes('');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMsg(null);
          setShowConfirm(false);
          setIsOpen(true);
        }}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer shadow-xs flex items-center justify-center"
      >
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby={showConfirm ? 'confirm-modal-title' : 'modal-title'}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              if (showConfirm) {
                setShowConfirm(false);
              } else {
                setIsOpen(false);
              }
            }
          }}
        >
          {!showConfirm ? (
            /* Step 1: Input Status and Notes Dialog */
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                  {modalTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => !isPending && setIsOpen(false)}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer"
                  aria-label="Tutup modal"
                >
                  ✕
                </button>
              </div>

              {isConvert && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-medium leading-relaxed">
                  Perhatian: Mengubah status akan membatalkan Absen Pagi hari ini dan mencatat kehadiran Anda sebagai Izin atau Sakit.
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm font-medium"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleFirstStepSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Jenis Ketidakhadiran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm cursor-pointer transition-colors ${
                        status === 'IZIN'
                          ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value="IZIN"
                        checked={status === 'IZIN'}
                        onChange={() => setStatus('IZIN')}
                        disabled={isPending}
                        className="sr-only"
                      />
                      <span>Izin</span>
                    </label>

                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm cursor-pointer transition-colors ${
                        status === 'SAKIT'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value="SAKIT"
                        checked={status === 'SAKIT'}
                        onChange={() => setStatus('SAKIT')}
                        disabled={isPending}
                        className="sr-only"
                      />
                      <span>Sakit</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="notes"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                    >
                      Keterangan (Opsional)
                    </label>
                    <span className="text-xs text-slate-400 font-mono">
                      {notes.length}/500
                    </span>
                  </div>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isPending}
                    placeholder="Tuliskan alasan atau keterangan ketidakhadiran..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 disabled:opacity-60 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer disabled:opacity-60"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isPending
                      ? 'Memproses...'
                      : isConvert
                      ? 'Lanjutkan Perubahan'
                      : 'Kirim Pengajuan'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Step 2: Explicit Confirmation Dialog for CONVERT mode */
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2
                  id="confirm-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Konfirmasi Perubahan Status
                </h2>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-800 leading-relaxed">
                  Anda akan mengubah status presensi hari ini dari{' '}
                  <strong className="font-bold text-slate-900">HADIR</strong>{' '}
                  menjadi{' '}
                  <strong
                    className={`font-bold ${
                      status === 'IZIN' ? 'text-sky-700' : 'text-purple-700'
                    }`}
                  >
                    {statusLabel}
                  </strong>
                  .
                </p>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-xs font-semibold leading-relaxed">
                  Perubahan ini akan membatalkan Absen Pagi hari ini.
                </div>

                {notes.trim().length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                    <span className="font-semibold block text-slate-500 mb-0.5">
                      Keterangan:
                    </span>
                    <span className="italic break-words">{notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer disabled:opacity-60"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={isPending}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isPending ? 'Mengubah Status...' : 'Ya, Ubah Status'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
