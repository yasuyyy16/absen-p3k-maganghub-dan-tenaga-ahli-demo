import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getAttendanceHistory } from '@/lib/attendance/history';
import { formatWibMonthLong } from '@/lib/time';
import MonthFilter from '@/components/history/MonthFilter';
import HistoryTable from '@/components/history/HistoryTable';
import Pagination from '@/components/history/Pagination';

export const metadata: Metadata = {
  title: 'Riwayat Absensi - P3K MagangHub & Tenaga Ahli',
  description: 'Riwayat kehadiran personal peserta MagangHub dan Tenaga Ahli unit P3K.',
};

interface RiwayatPageProps {
  searchParams: Promise<{
    month?: string;
    page?: string;
  }>;
}

export default async function RiwayatPage({ searchParams }: RiwayatPageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/absensi/login');
  }

  const resolvedParams = await searchParams;
  const historyData = await getAttendanceHistory(
    session.personType,
    session.personId,
    resolvedParams?.month,
    resolvedParams?.page
  );

  const monthFormatted = formatWibMonthLong(historyData.selectedMonth);

  return (
    <div className="space-y-5">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/absensi"
          className="min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 flex items-center gap-1.5 shadow-2xs"
        >
          &larr; Kembali ke Dashboard
        </Link>
      </div>

      {/* Page Title Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Riwayat Absensi
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Catatan kehadiran personal untuk akun <strong className="font-semibold text-slate-800">{session.nama}</strong> (@{session.username}).
        </p>
      </div>

      {/* Month Filter Selector */}
      <MonthFilter currentMonth={historyData.selectedMonth} />

      {/* Summary Badge */}
      <div className="flex items-center justify-between text-xs sm:text-sm px-1 text-slate-600">
        <span>
          Menampilkan <strong className="font-bold text-slate-900">{historyData.totalCount}</strong> data presensi pada{' '}
          <strong className="font-bold text-slate-900">{monthFormatted}</strong>
        </span>
      </div>

      {/* History Table / Card List */}
      <HistoryTable items={historyData.items} />

      {/* Server-Side Pagination Controls */}
      {historyData.totalCount > 0 && (
        <Pagination
          month={historyData.selectedMonth}
          currentPage={historyData.page}
          totalPages={historyData.totalPages}
        />
      )}
    </div>
  );
}
