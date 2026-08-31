import { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'Dashboard Absensi - P3K MagangHub & Tenaga Ahli',
  description: 'Sistem Absensi Internal Peserta MagangHub dan Tenaga Ahli unit P3K KKP.',
};

export default function AbsensiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#f7f9ff] text-[#181c20]">
      {/* Header / Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 pt-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          <Link
            href="/absensi"
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] rounded-xl p-1 -ml-1 group transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#006194] border border-sky-100 font-bold flex items-center justify-center text-sm shadow-2xs group-hover:bg-sky-100 transition-colors">
              P3K
            </div>
            <div>
              <span className="text-base font-bold text-[#006194] leading-tight block">
                Sistem Absensi
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                MagangHub & Tenaga Ahli
              </span>
            </div>
          </Link>

          {/* Desktop Navigation & Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/absensi"
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-[#006194] hover:bg-sky-50 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] flex items-center gap-1.5"
            >
              Dashboard
            </Link>

            <Link
              href="/absensi/riwayat"
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-[#006194] hover:bg-sky-50 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006194] flex items-center gap-1.5"
            >
              Riwayat
            </Link>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span>Keluar</span>
              </button>
            </form>
          </div>

          {/* Mobile Right Badge */}
          <div className="sm:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-[#006194] border border-sky-100 flex items-center justify-center text-xs font-bold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-5 mt-auto text-center hidden sm:block">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs text-slate-500">
            Unit P3K &copy; {new Date().getFullYear()} &bull; Sistem Absensi Internal Kementerian Kelautan dan Perikanan
          </p>
        </div>
      </footer>
    </div>
  );
}
