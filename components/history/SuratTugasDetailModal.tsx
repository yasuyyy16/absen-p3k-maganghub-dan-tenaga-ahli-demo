'use client';

import { formatDateOnlyLong } from '@/lib/time';
import { formatSuratTugasPeriod } from '@/lib/attendance/history';
import { AttendanceHistoryItem } from '@/lib/types';

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function getDuration(start: Date, end: Date): string {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Number.isFinite(days) && days > 0 ? `${days} hari kalender` : '-';
}

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
              Detail Surat Tugas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Riwayat Absensi</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194]"
            aria-label="Tutup detail Surat Tugas"
          >
            ×
          </button>
        </div>

        {suratTugas ? (
          <dl>
            <DetailRow
              label="Periode"
              value={formatSuratTugasPeriod(suratTugas.mulai_tugas, suratTugas.selesai_tugas)}
            />
            <DetailRow label="Status" value="Surat Tugas" />
            <DetailRow label="Nomor Surat" value={suratTugas.nomor_surat_tugas} />
            <DetailRow label="Tanggal Terbit" value={formatDateOnlyLong(suratTugas.tanggal_terbit)} />
            <DetailRow label="Tanggal Mulai" value={formatDateOnlyLong(suratTugas.mulai_tugas)} />
            <DetailRow label="Tanggal Selesai" value={formatDateOnlyLong(suratTugas.selesai_tugas)} />
            <DetailRow
              label="Durasi"
              value={getDuration(suratTugas.mulai_tugas, suratTugas.selesai_tugas)}
            />
            <DetailRow label="Lokasi" value={suratTugas.lokasi} />
            <DetailRow
              label="Dibuat Oleh"
              value={`${suratTugas.user.nama} (${suratTugas.user.username})`}
            />
            <DetailRow label="Waktu Dibuat" value={formatDateTime(suratTugas.created_at)} />
          </dl>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Detail Surat Tugas tidak tersedia untuk record ini.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194]"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
