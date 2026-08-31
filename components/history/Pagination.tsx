import Link from 'next/link';

interface PaginationProps {
  month: string;
  currentPage: number;
  totalPages: number;
}

export default function Pagination({
  month,
  currentPage,
  totalPages,
}: PaginationProps) {
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Paginasi Riwayat"
      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3"
    >
      <div>
        {hasPrev ? (
          <Link
            href={`/absensi/riwayat?month=${encodeURIComponent(month)}&page=${currentPage - 1}`}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 flex items-center justify-center shadow-2xs"
          >
            &larr; Sebelumnya
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center justify-center"
          >
            &larr; Sebelumnya
          </span>
        )}
      </div>

      <span className="text-xs sm:text-sm font-medium text-slate-700">
        Halaman <strong className="font-bold text-slate-900">{currentPage}</strong> dari{' '}
        <strong className="font-bold text-slate-900">{totalPages}</strong>
      </span>

      <div>
        {hasNext ? (
          <Link
            href={`/absensi/riwayat?month=${encodeURIComponent(month)}&page=${currentPage + 1}`}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 flex items-center justify-center shadow-2xs"
          >
            Selanjutnya &rarr;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center justify-center"
          >
            Selanjutnya &rarr;
          </span>
        )}
      </div>
    </nav>
  );
}
