import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAttendanceHistory } from '@/lib/attendance/history';
import { formatWibMonthLong } from '@/lib/time';
import MonthFilter from '@/components/history/MonthFilter';
import HistoryTable from '@/components/history/HistoryTable';
import Pagination from '@/components/history/Pagination';

export const metadata: Metadata = {
  title: 'Riwayat Absensi - P3K MagangHub & Tenaga Ahli',
  description: 'Riwayat kehadiran personal peserta MagangHub dan Tenaga Ahli unit P3K KKP.',
};

interface RiwayatPageProps {
  searchParams: Promise<{
    month?: string;
    page?: string;
  }>;
}

export default async function RiwayatPage({ searchParams }: RiwayatPageProps) {
  const session = await getSession();

  if (!session || session.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
    select: { nama: true, jenis_personel: true, is_active: true, role: true },
  });

  if (!user || !user.is_active || user.role !== 'VIEWER') {
    redirect('/absensi/login');
  }

  const isProfileComplete = Boolean(
    user.nama && user.nama.trim().length > 0 &&
    user.jenis_personel && user.jenis_personel.trim().length > 0
  );

  if (!isProfileComplete) {
    redirect('/absensi/profil');
  }

  const resolvedParams = await searchParams;
  const historyData = await getAttendanceHistory(
    session.userId,
    resolvedParams?.month,
    resolvedParams?.page
  );

  const monthFormatted = formatWibMonthLong(historyData.selectedMonth);

  return (
    <div className="space-y-5">
      {/* Header & Controls Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat Absensi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola dan pantau catatan kehadiran Anda pada bulan{' '}
            <strong className="text-slate-800 font-semibold">{monthFormatted}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/absensi"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <MonthFilter currentMonth={historyData.selectedMonth} />
        </div>
      </div>

      {/* History Table / Mobile Cards */}
      <HistoryTable items={historyData.items} />

      {/* Pagination */}
      {historyData.totalCount > 0 && (
        <Pagination
          month={historyData.selectedMonth}
          currentPage={historyData.page}
          totalPages={historyData.totalPages}
          totalCount={historyData.totalCount}
        />
      )}
    </div>
  );
}
