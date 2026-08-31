import { AttendanceHistoryItem } from '@/lib/types';
import AttendanceStatusBadge from '@/components/dashboard/AttendanceStatusBadge';

interface HistoryTableProps {
  items: AttendanceHistoryItem[];
}

export default function HistoryTable({ items }: HistoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center shadow-xs space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center mx-auto text-lg">
          —
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
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Tanggal</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Absen Masuk</th>
              <th className="py-3.5 px-4">Absen Pulang</th>
              <th className="py-3.5 px-4">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                  {item.dateFormatted}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <AttendanceStatusBadge status={item.status} />
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                  {item.checkInFormatted ?? '-'}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                  {item.checkOutFormatted ?? '-'}
                </td>
                <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                  {item.notes ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Visible on mobile only) */}
      <div className="block sm:hidden divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">
                {item.dateFormatted}
              </span>
              <AttendanceStatusBadge status={item.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Absen Masuk
                </span>
                <span className="font-mono font-medium text-slate-800">
                  {item.checkInFormatted ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Absen Pulang
                </span>
                <span className="font-mono font-medium text-slate-800">
                  {item.checkOutFormatted ?? '-'}
                </span>
              </div>
            </div>

            {item.notes && (
              <div className="text-xs text-slate-600 pt-0.5">
                <span className="font-semibold text-slate-700">Keterangan: </span>
                <span>{item.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
