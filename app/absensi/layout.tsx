import { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'Dashboard Absensi - P3K MagangHub & Tenaga Ahli',
  description: 'Sistem Absensi Internal Peserta MagangHub dan Tenaga Ahli unit P3K.',
};

export default function AbsensiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-100 text-slate-900">
      {/* Header / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/absensi" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-sky-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              P3K
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Sistem Absensi
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                MagangHub & Tenaga Ahli
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/absensi/riwayat"
              className="min-h-[38px] px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 flex items-center shadow-2xs"
            >
              Riwayat
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 cursor-pointer"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-500">
            Unit P3K &copy; {new Date().getFullYear()} &bull; Sistem Absensi Internal
          </p>
        </div>
      </footer>
    </div>
  );
}
