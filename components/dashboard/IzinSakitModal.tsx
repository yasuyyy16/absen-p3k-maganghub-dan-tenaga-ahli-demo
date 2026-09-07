'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  submitIzinSakitAction,
  ubahKeIzinSakitAction,
} from '@/app/actions/attendance';
import { MAX_PROOF_FILE_SIZE, validateProofFile } from '@/lib/constants/attendance';
import { compressImageProof, isCompressibleImage } from '@/lib/image-compression';

interface IzinSakitModalProps {
  mode?: 'CREATE' | 'CONVERT';
}

export default function IzinSakitModal({ mode = 'CREATE' }: IzinSakitModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'IZIN' | 'SAKIT'>('IZIN');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConvert = mode === 'CONVERT';
  const modalTitle = isConvert ? 'Ubah Status ke Izin / Sakit' : 'Pengajuan Izin / Sakit';
  const buttonLabel = isConvert ? 'Ubah Status ke Izin / Sakit' : 'Pengajuan Izin / Sakit';
  const statusLabel = status === 'IZIN' ? 'IZIN' : 'SAKIT';

  // Handle Escape key navigation (Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending && !isCompressing) {
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
  }, [isOpen, showConfirm, isPending, isCompressing]);

  // Handle file selection with client-side compression for images > 1 MB
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setCompressionInfo(null);
    const file = e.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }

    // Check basic validation (MIME and extension)
    const initialValidation = validateProofFile(file);
    if (!initialValidation.valid) {
      // If it is just a size error on a compressible image, attempt compression
      if (initialValidation.error === 'Ukuran file maksimal 1 MB.' && isCompressibleImage(file)) {
        // Proceed to compression below
      } else {
        setErrorMsg(initialValidation.error || 'Format bukti tidak valid.');
        setProofFile(null);
        e.target.value = '';
        return;
      }
    }

    // PDF files: strictly never modified or compressed
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (file.size > MAX_PROOF_FILE_SIZE) {
        setErrorMsg('Ukuran file PDF melebihi 1 MB. Maksimal ukuran: 1 MB.');
        setProofFile(null);
        e.target.value = '';
        return;
      }
      setProofFile(file);
      return;
    }

    // Image files: if already <= 1 MB, keep original without unnecessary recompression
    if (file.size <= MAX_PROOF_FILE_SIZE) {
      setProofFile(file);
      return;
    }

    // Image files > 1 MB: compress/resize client-side
    setIsCompressing(true);
    try {
      const compressed = await compressImageProof(file);
      setProofFile(compressed);
      const origSizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const compressedSizeStr =
        compressed.size >= 1024 * 1024
          ? (compressed.size / (1024 * 1024)).toFixed(1) + ' MB'
          : Math.round(compressed.size / 1024) + ' KB';
      setCompressionInfo(`Foto berhasil dioptimalkan: ${origSizeMb} → ${compressedSizeStr}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Ukuran gambar terlalu besar dan tidak dapat dikompresi di bawah 1 MB.';
      setErrorMsg(msg);
      setProofFile(null);
      e.target.value = '';
    } finally {
      setIsCompressing(false);
    }
  };

  // First step form submit
  const handleFirstStepSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isCompressing) {
      setErrorMsg('Sedang mengompresi gambar, silakan tunggu sebentar...');
      return;
    }

    if (!proofFile) {
      setErrorMsg('Bukti wajib diunggah untuk IZIN/SAKIT.');
      return;
    }

    const validation = validateProofFile(proofFile);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Bukti tidak valid.');
      return;
    }

    if (isConvert) {
      setShowConfirm(true);
    } else {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('notes', notes);
      formData.append('proof', proofFile);

      startTransition(async () => {
        const result = await submitIzinSakitAction(formData);
        if (!result.success) {
          setErrorMsg(result.message);
        } else {
          setIsOpen(false);
          setNotes('');
          setProofFile(null);
          setCompressionInfo(null);
        }
      });
    }
  };

  // Second step explicit confirmation submit for CONVERT mode
  const handleConfirmConvert = () => {
    setErrorMsg(null);

    if (isCompressing) {
      setErrorMsg('Sedang mengompresi gambar, silakan tunggu sebentar...');
      return;
    }

    if (!proofFile) {
      setErrorMsg('Bukti wajib diunggah untuk IZIN/SAKIT.');
      return;
    }

    const validation = validateProofFile(proofFile);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Bukti tidak valid.');
      return;
    }

    const formData = new FormData();
    formData.append('status', status);
    formData.append('notes', notes);
    formData.append('proof', proofFile);

    startTransition(async () => {
      const result = await ubahKeIzinSakitAction(formData);
      if (!result.success) {
        setShowConfirm(false);
        setErrorMsg(result.message);
      } else {
        setShowConfirm(false);
        setIsOpen(false);
        setNotes('');
        setProofFile(null);
        setCompressionInfo(null);
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
          setCompressionInfo(null);
          setIsOpen(true);
        }}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer shadow-xs flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs pb-safe transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby={showConfirm ? 'confirm-modal-title' : 'modal-title'}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending && !isCompressing) {
              if (showConfirm) {
                setShowConfirm(false);
              } else {
                setIsOpen(false);
              }
            }
          }}
        >
          {!showConfirm ? (
            /* Step 1: Input Status and Notes Dialog / Bottom Sheet */
            <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              {/* Drag Handle (Mobile only) */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" aria-hidden="true" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  {modalTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => !isPending && !isCompressing && setIsOpen(false)}
                  disabled={isPending || isCompressing}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-50"
                  aria-label="Tutup modal"
                >
                  ✕
                </button>
              </div>

              {isConvert && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-xs font-medium leading-relaxed">
                  Perhatian: Mengubah status akan membatalkan Absen Pagi hari ini dan mencatat kehadiran Anda sebagai Izin atau Sakit.
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium"
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
                    {/* Sakit Option */}
                    <label
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                        status === 'SAKIT'
                          ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-600/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value="SAKIT"
                        checked={status === 'SAKIT'}
                        onChange={() => setStatus('SAKIT')}
                        disabled={isPending || isCompressing}
                        className="sr-only"
                      />
                      <svg className={`w-6 h-6 mb-1 ${status === 'SAKIT' ? 'text-purple-700' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="font-semibold text-xs sm:text-sm">Sakit</span>
                    </label>

                    {/* Izin Option */}
                    <label
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                        status === 'IZIN'
                          ? 'border-[#006194] bg-sky-50 text-[#001d31] ring-2 ring-[#006194]/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value="IZIN"
                        checked={status === 'IZIN'}
                        onChange={() => setStatus('IZIN')}
                        disabled={isPending || isCompressing}
                        className="sr-only"
                      />
                      <svg className={`w-6 h-6 mb-1 ${status === 'IZIN' ? 'text-[#006194]' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="font-semibold text-xs sm:text-sm">Izin</span>
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
                    disabled={isPending || isCompressing}
                    placeholder="Tuliskan alasan pengajuan izin atau sakit..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all resize-none outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="proof"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                  >
                    Bukti Pendukung <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    id="proof"
                    name="proof"
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                    onChange={handleFileChange}
                    disabled={isPending || isCompressing}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 disabled:opacity-60 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-[#006194] hover:file:bg-sky-100"
                  />
                  {isCompressing && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-sky-700 bg-sky-50 p-2 rounded-lg border border-sky-200 animate-pulse">
                      <svg className="w-4 h-4 animate-spin shrink-0 text-sky-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Mengoptimalkan ukuran gambar dokumen...</span>
                    </div>
                  )}
                  {compressionInfo && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <svg className="w-3.5 h-3.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span>{compressionInfo}</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-500">
                    Bukti wajib diunggah untuk IZIN/SAKIT. Format: JPG, JPEG, PNG, PDF. Maksimal ukuran: 1 MB.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending || isCompressing}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-60"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isCompressing}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004e77] text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-60 shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {isPending
                        ? 'Memproses...'
                        : isCompressing
                        ? 'Mengoptimalkan...'
                        : isConvert
                        ? 'Lanjutkan'
                        : 'Ajukan'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Step 2: Explicit Confirmation Dialog for CONVERT mode */
            <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" aria-hidden="true" />

              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                  !
                </div>
                <h2
                  id="confirm-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900"
                >
                  Konfirmasi Perubahan Status
                </h2>
              </div>

              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Anda akan mengubah status presensi hari ini dari{' '}
                  <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    HADIR
                  </span>{' '}
                  menjadi{' '}
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      status === 'IZIN'
                        ? 'bg-sky-100 text-[#006194]'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  .
                </p>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-xs font-semibold leading-relaxed">
                  Perhatian: Perubahan ini akan membatalkan Absen Pagi hari ini.
                </div>

                {notes.trim().length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-700">
                    <span className="font-semibold block text-slate-500 mb-0.5 uppercase tracking-wider text-[10px]">
                      Keterangan Tambahan:
                    </span>
                    <p className="italic text-slate-800 break-words">{notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending || isCompressing}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] cursor-pointer disabled:opacity-60"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={isPending || isCompressing}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer disabled:opacity-60 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>{isPending ? 'Mengubah...' : 'Ya, Ubah Status'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
