'use client';

import { useState } from 'react';
import { AttendanceHistoryItem } from '@/lib/types';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import LocationModal from '@/components/history/LocationModal';
import SuratTugasDetailModal from '@/components/history/SuratTugasDetailModal';
import DeleteSuratTugasModal from '@/components/history/DeleteSuratTugasModal';
import { useI18n } from '@/lib/i18n/context';
import { formatI18nDateOnlyLong } from '@/lib/i18n';

interface HistoryTableProps {
  items: AttendanceHistoryItem[];
}

export default function HistoryTable({ items }: HistoryTableProps) {
  const { t, locale } = useI18n();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceHistoryItem | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {t.history.emptyTitle}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          {t.history.emptyDesc}
        </p>
      </div>
    );
  }

  return (
    <>
      {successNotification && (
        <div
          role="alert"
          className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs text-emerald-950 animate-in fade-in slide-in-from-top-2 duration-300 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-bold text-emerald-950">
              {successNotification}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer p-1"
            aria-label={t.common.close}
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Desktop Table View (md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableDate}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableCheckIn}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableCheckOut}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableStatus}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableActionLocation}</th>
                <th className="py-3.5 px-4 min-w-[160px]">{t.history.tableNotes}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t.history.tableProof}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((item) => {
                const hasLocation =
                  typeof item.latitude === 'number' ||
                  typeof item.latitude_out === 'number';

                return (
                  <tr key={item.id} className="hover:bg-sky-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {formatI18nDateOnlyLong(item.date, locale)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {item.checkInFormatted ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.checkInFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'RAPAT' ? (
                        <span className="font-sans font-semibold text-teal-800 text-xs">
                          {t.status.meeting}
                        </span>
                      ) : item.checkOutFormatted ? (
                        <span className="flex items-center gap-1.5 text-sky-700 font-mono font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          {item.checkOutFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <AttendanceStatusBadge
                        status={item.status}
                        hasCheckIn={Boolean(item.checkInFormatted)}
                        hasCheckOut={Boolean(item.checkOutFormatted)}
                      />
                    </td>

                    {/* Location / Action Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'SURAT_TUGAS' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {t.history.detailBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRecord(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {t.history.deleteBtn}
                          </button>
                        </div>
                      ) : hasLocation ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#006194] hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          <span>{t.history.viewLocationBtn}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed max-w-xs break-words">
                      {item.notes ? item.notes : <span className="text-slate-400 italic">-</span>}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {(item.status === 'IZIN' || item.status === 'SAKIT') && item.proof_file_url ? (
                        <a
                          href={item.proof_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          <span>{t.history.viewProofBtn}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (Below md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {items.map((item) => {
            const hasLocation =
              typeof item.latitude === 'number' ||
              typeof item.latitude_out === 'number';

            return (
              <div key={item.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {formatI18nDateOnlyLong(item.date, locale)}
                  </span>
                  <AttendanceStatusBadge
                    status={item.status}
                    hasCheckIn={Boolean(item.checkInFormatted)}
                    hasCheckOut={Boolean(item.checkOutFormatted)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                      {t.history.tableCheckIn}
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.checkInFormatted ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                      {t.history.tableCheckOut}
                    </span>
                    {item.status === 'RAPAT' ? (
                      <span className="font-sans font-semibold text-teal-800">
                        {t.status.meeting}
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-slate-800">
                        {item.checkOutFormatted ?? '-'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Location / Action row on mobile */}
                {item.status === 'SURAT_TUGAS' ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="min-h-[36px] w-full rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 cursor-pointer text-center border border-indigo-200"
                    >
                      {t.history.detailBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRecord(item)}
                      className="min-h-[36px] w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 cursor-pointer text-center border border-red-200"
                    >
                      {t.history.deleteBtn}
                    </button>
                  </div>
                ) : hasLocation ? (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-xs text-slate-500 truncate flex-1 min-w-0">
                      {item.address || item.address_out || (locale === 'en' ? 'GPS coordinates saved' : 'Titik GPS tersimpan')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-sky-50 text-[#006194] border border-sky-200 text-xs font-semibold shrink-0 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                      {t.history.viewLocationBtn}
                    </button>
                  </div>
                ) : null}

                {item.notes && (
                  <div className="text-xs text-slate-600 pt-0.5">
                    <span className="font-semibold text-slate-700">{t.history.tableNotes}: </span>
                    <span className="break-words">{item.notes}</span>
                  </div>
                )}

                {(item.status === 'IZIN' || item.status === 'SAKIT') && item.proof_file_url && (
                  <div className="pt-2">
                    <a
                      href={item.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      <span>{t.history.viewProofBtn} {item.status === 'IZIN' ? t.status.leave : t.status.sick}</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={Boolean(selectedRecord && selectedRecord.status !== 'SURAT_TUGAS')}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord?.status === 'SURAT_TUGAS' ? null : selectedRecord}
      />
      <SuratTugasDetailModal
        record={selectedRecord?.status === 'SURAT_TUGAS' ? selectedRecord : null}
        onClose={() => setSelectedRecord(null)}
      />
      <DeleteSuratTugasModal
        record={deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onSuccess={() => setSuccessNotification(t.actions.deleteSuratTugasSuccess)}
      />
    </>
  );
}
