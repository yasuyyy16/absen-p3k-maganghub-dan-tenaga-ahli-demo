'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSuratTugasAction } from '@/app/actions/attendance';
import { formatSuratTugasPeriod } from '@/lib/attendance/history';
import { AttendanceHistoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface DeleteSuratTugasModalProps {
  record: AttendanceHistoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteSuratTugasModal({
  record,
  onClose,
  onSuccess,
}: DeleteSuratTugasModalProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevRecordId, setPrevRecordId] = useState<number | undefined>(record?.id);

  if (record?.id !== prevRecordId) {
    setPrevRecordId(record?.id);
    setErrorMessage(null);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending && record) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPending, record, onClose]);

  if (!record || record.status !== 'SURAT_TUGAS' || !record.surat_tugas_id) {
    return null;
  }

  const suratTugas = record.surat_tugas;
  const targetId = record.surat_tugas_id;

  const handleDelete = () => {
    if (isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteSuratTugasAction(targetId);
      if (result.success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      } else {
        setErrorMessage(result.message || (locale === 'en' ? 'Failed to delete Assignment Letter.' : 'Gagal menghapus Surat Tugas.'));
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-surat-tugas-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-md space-y-4 rounded-t-3xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <div>
              <h2 id="delete-surat-tugas-title" className="text-base font-bold text-slate-900">
                {t.history.modalDeleteTitle}
              </h2>
              <p className="text-xs text-slate-500">{t.history.modalDeleteSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
            aria-label={t.common.close}
          >
            ×
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.history.modalDeleteDesc}
          </p>

          <p className="text-xs font-semibold text-red-600">
            {t.history.modalDeleteWarning}
          </p>

          {suratTugas && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.history.detailNumber}:</span>
                <span className="font-semibold text-slate-800">{suratTugas.nomor_surat_tugas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.history.detailPeriod}:</span>
                <span className="font-semibold text-slate-800">
                  {formatSuratTugasPeriod(suratTugas.mulai_tugas, suratTugas.selesai_tugas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.history.detailLocation}:</span>
                <span className="font-medium text-slate-700 max-w-[200px] truncate text-right">
                  {suratTugas.lokasi}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer disabled:opacity-50"
          >
            {t.history.deleteCancelBtn}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-xs"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t.history.deletingBtn}</span>
              </>
            ) : (
              <span>{t.history.deleteConfirmBtn}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
