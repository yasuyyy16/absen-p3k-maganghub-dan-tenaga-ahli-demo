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
  jenisPersonel?: string | null;
  universitas?: string | null;
  jurusan?: string | null;
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
                <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">No</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Nama</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jenis Personel</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Universitas & Jurusan</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jam Masuk</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jam Pulang</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 min-w-[140px] max-w-xs">Keterangan</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Lokasi Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((item, index) => {
                const roleLabel =
                  item.jenisPersonel ||
                  (item.personType === 'MAGANG' ? 'Peserta Magang' : 'Tenaga Ahli');
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
                          roleLabel === 'Tenaga Ahli'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : roleLabel === 'MagangHub'
                            ? 'bg-sky-50 text-[#006194] border border-sky-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 text-xs">
                      {item.universitas ? (
                        <div>
                          <span className="font-medium text-slate-900 block">{item.universitas}</span>
                          {item.jurusan && (
                            <span className="text-[11px] text-slate-500 font-normal block">{item.jurusan}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
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

                    {/* Keterangan Column */}
                    <td className="py-3.5 px-4 text-xs text-slate-700 leading-relaxed max-w-xs break-words">
                      {item.notes ? item.notes : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Lokasi Presensi Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {hasLocation ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLocationRecord(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#006194] hover:bg-sky-100 border border-sky-200 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal for Admin (Interactive Map, Coordinates, Name, Time, Academic Info) */}
      <LocationModal
        isOpen={Boolean(selectedLocationRecord)}
        onClose={() => setSelectedLocationRecord(null)}
        record={
          selectedLocationRecord
            ? {
                id: selectedLocationRecord.id,
                nama: selectedLocationRecord.nama,
                universitas: selectedLocationRecord.universitas,
                jurusan: selectedLocationRecord.jurusan,
                jenisPersonel: selectedLocationRecord.jenisPersonel,
                dateFormatted: selectedLocationRecord.dateFormatted,
                checkInFormatted: selectedLocationRecord.checkInFormatted,
                checkOutFormatted: selectedLocationRecord.checkOutFormatted,
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
