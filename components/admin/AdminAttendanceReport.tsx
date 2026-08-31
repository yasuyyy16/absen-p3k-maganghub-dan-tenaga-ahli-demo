'use client';

import { useState } from 'react';
import { AttendanceStatus, PersonnelType } from '@/lib/types';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';
import LocationModal from '@/components/history/LocationModal';

export interface AdminAttendanceReportItem {
  id: number;
  nama: string;
  username: string;
  personType: PersonnelType;
  dateFormatted: string;
  checkInFormatted: string | null;
  checkOutFormatted: string | null;
  status: AttendanceStatus;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  latitude_out: number | null;
  longitude_out: number | null;
  accuracy_out: number | null;
  address_out: string | null;
}

interface AdminAttendanceReportProps {
  items: AdminAttendanceReportItem[];
}

export default function AdminAttendanceReport({
  items,
}: AdminAttendanceReportProps) {
  const [selectedLocationRecord, setSelectedLocationRecord] =
    useState<AdminAttendanceReportItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs">
        <p className="text-sm text-slate-500">
          Tidak ada data laporan presensi pada periode ini.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama</th>
                <th className="py-3.5 px-4">Jenis Personel</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Jam Masuk</th>
                <th className="py-3.5 px-4">Jam Pulang</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Keterangan / Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((item, index) => {
                const isMagang = item.personType === 'MAGANG';
                const hasLocation =
                  typeof item.latitude === 'number' ||
                  typeof item.latitude_out === 'number';

                return (
                  <tr key={item.id} className="hover:bg-sky-50/20 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-mono">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div>{item.nama}</div>
                      <div className="text-xs text-slate-400 font-mono font-normal">
                        @{item.username}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isMagang
                            ? 'bg-sky-50 text-[#006194] border border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isMagang ? 'Peserta MagangHub' : 'Tenaga Ahli'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {item.dateFormatted}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {item.checkInFormatted ?? '-'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {item.checkOutFormatted ?? '-'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <AttendanceStatusBadge status={item.status} />
                    </td>

                    {/* Keterangan / Lokasi Column */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-xs">
                        {item.notes && (
                          <div className="text-xs text-slate-800 font-medium">
                            <span className="text-slate-400 font-normal">Ket: </span>
                            {item.notes}
                          </div>
                        )}

                        {hasLocation ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 truncate max-w-[180px]">
                              {item.address || 'Titik GPS tersimpan'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedLocationRecord(item)}
                              className="px-2 py-0.5 rounded bg-sky-50 text-[#006194] hover:bg-sky-100 border border-sky-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                            >
                              Lihat Lokasi
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {!item.notes ? '-' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal for Admin (Read-only Map & Coordinates) */}
      <LocationModal
        isOpen={Boolean(selectedLocationRecord)}
        onClose={() => setSelectedLocationRecord(null)}
        record={
          selectedLocationRecord
            ? {
                id: selectedLocationRecord.id,
                date: new Date(),
                dateFormatted: selectedLocationRecord.dateFormatted,
                checkInFormatted: selectedLocationRecord.checkInFormatted,
                checkOutFormatted: selectedLocationRecord.checkOutFormatted,
                status: selectedLocationRecord.status,
                notes: selectedLocationRecord.notes,
                latitude: selectedLocationRecord.latitude,
                longitude: selectedLocationRecord.longitude,
                accuracy: selectedLocationRecord.accuracy,
                address: selectedLocationRecord.address,
                latitude_out: selectedLocationRecord.latitude_out,
                longitude_out: selectedLocationRecord.longitude_out,
                accuracy_out: selectedLocationRecord.accuracy_out,
                address_out: selectedLocationRecord.address_out,
              }
            : null
        }
      />
    </>
  );
}
