'use client';

import { formatSuratTugasPeriod } from '@/lib/attendance/history';
import { AttendanceHistoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';
import {
  formatI18nDateOnlyLong,
  formatI18nDateTime,
  formatI18nDuration,
} from '@/lib/i18n';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] gap-3 border-b border-slate-100 py-2.5 text-sm last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 break-words">{value}</dd>
    </div>
  );
}

export default function SuratTugasDetailModal({
  record,
  onClose,
}: {
  record: AttendanceHistoryItem | null;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();

  if (!record) return null;

  const suratTugas = record.surat_tugas;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-surat-tugas-detail-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg space-y-4 rounded-t-3xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h2 id="history-surat-tugas-detail-title" className="text-lg font-bold text-slate-900">
              {t.history.modalDetailTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{t.history.modalDetailSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194]"
            aria-label={t.common.close}
          >
            ×
          </button>
        </div>

        {suratTugas ? (
          <dl>
            <DetailRow
              label={t.history.detailPeriod}
              value={formatSuratTugasPeriod(suratTugas.mulai_tugas, suratTugas.selesai_tugas)}
            />
            <DetailRow label={t.history.detailStatus} value={t.status.assignmentLetter} />
            <DetailRow label={t.history.detailNumber} value={suratTugas.nomor_surat_tugas} />
            <DetailRow label={t.history.detailIssueDate} value={formatI18nDateOnlyLong(suratTugas.tanggal_terbit, locale)} />
            <DetailRow label={t.history.detailStartDate} value={formatI18nDateOnlyLong(suratTugas.mulai_tugas, locale)} />
            <DetailRow label={t.history.detailEndDate} value={formatI18nDateOnlyLong(suratTugas.selesai_tugas, locale)} />
            <DetailRow
              label={t.history.detailDuration}
              value={formatI18nDuration(suratTugas.mulai_tugas, suratTugas.selesai_tugas, locale)}
            />
            <DetailRow label={t.history.detailLocation} value={suratTugas.lokasi} />
            <DetailRow
              label={t.history.detailCreatedBy}
              value={`${suratTugas.user.nama} (${suratTugas.user.username})`}
            />
            <DetailRow label={t.history.detailCreatedAt} value={formatI18nDateTime(suratTugas.created_at, locale)} />
          </dl>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t.history.detailUnavailable}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194]"
        >
          {t.history.closeModal}
        </button>
      </div>
    </div>
  );
}
