'use client';

import { useState } from 'react';
import { AttendanceHistoryItem } from '@/lib/types';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import LocationModal from '@/components/history/LocationModal';

interface HistoryTableProps {
  items: AttendanceHistoryItem[];
}

export default function HistoryTable({ items }: HistoryTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Tidak ada riwayat absensi
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Belum ada data absensi pada bulan yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Desktop Table View (md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Check-in</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Check-out</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Lokasi GPS</th>
                <th className="py-3.5 px-4 min-w-[160px]">Keterangan</th>
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
                      {item.dateFormatted}
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

                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {item.checkOutFormatted ? (
                        <span className="flex items-center gap-1.5 text-sky-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          {item.checkOutFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <AttendanceStatusBadge
                        status={item.status}
                        hasCheckIn={Boolean(item.checkInFormatted)}
                        hasCheckOut={Boolean(item.checkOutFormatted)}
                      />
                    </td>

                    {/* Location Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {hasLocation ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#006194] hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          <span>Lihat Lokasi</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed max-w-xs break-words">
                      {item.notes ? item.notes : <span className="text-slate-400 italic">-</span>}
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
                    {item.dateFormatted}
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
                      Check-in
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.checkInFormatted ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                      Check-out
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.checkOutFormatted ?? '-'}
                    </span>
                  </div>
                </div>

                {/* Location row on mobile */}
                {hasLocation && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-xs text-slate-500 truncate flex-1 min-w-0">
                      {item.address || item.address_out || 'Titik GPS tersimpan'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-sky-50 text-[#006194] border border-sky-200 text-xs font-semibold shrink-0 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                      Lihat Lokasi
                    </button>
                  </div>
                )}

                {item.notes && (
                  <div className="text-xs text-slate-600 pt-0.5">
                    <span className="font-semibold text-slate-700">Keterangan: </span>
                    <span className="break-words">{item.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </>
  );
}
