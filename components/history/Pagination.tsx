'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

interface PaginationProps {
  month: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function Pagination({
  month,
  currentPage,
  totalPages,
  totalCount,
}: PaginationProps) {
  const { t, locale } = useI18n();
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label={locale === 'en' ? 'History Pagination' : 'Paginasi Riwayat'}
      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap"
    >
      <span className="text-xs sm:text-sm text-slate-500 font-medium">
        {locale === 'en' ? (
          <>Total <strong className="font-bold text-slate-900">{totalCount}</strong> records</>
        ) : (
          <>Total <strong className="font-bold text-slate-900">{totalCount}</strong> catatan</>
        )}
      </span>

      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={`/absensi/riwayat?month=${encodeURIComponent(month)}&page=${currentPage - 1}`}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] flex items-center gap-1 shadow-2xs"
            aria-label={locale === 'en' ? 'Previous page' : 'Halaman sebelumnya'}
          >
            &larr; <span className="hidden sm:inline">{t.history.paginationPrev}</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-300 text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center gap-1"
          >
            &larr; <span className="hidden sm:inline">{t.history.paginationPrev}</span>
          </span>
        )}

        <span className="text-xs sm:text-sm font-medium text-slate-700 px-2">
          {currentPage} / {totalPages}
        </span>

        {hasNext ? (
          <Link
            href={`/absensi/riwayat?month=${encodeURIComponent(month)}&page=${currentPage + 1}`}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] flex items-center gap-1 shadow-2xs"
            aria-label={locale === 'en' ? 'Next page' : 'Halaman selanjutnya'}
          >
            <span className="hidden sm:inline">{t.history.paginationNext}</span> &rarr;
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-300 text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center gap-1"
          >
            <span className="hidden sm:inline">{t.history.paginationNext}</span> &rarr;
          </span>
        )}
      </div>
    </nav>
  );
}
