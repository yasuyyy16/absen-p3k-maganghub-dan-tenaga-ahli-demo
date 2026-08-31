'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

export default function BottomNav() {
  const pathname = usePathname();
  const isDashboard = pathname === '/absensi';
  const isRiwayat = pathname.startsWith('/absensi/riwayat');

  return (
    <nav
      aria-label="Navigasi Bawah"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Dashboard Tab */}
        <Link
          href="/absensi"
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-2 rounded-xl transition-colors ${
            isDashboard
              ? 'text-[#006194] font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-current={isDashboard ? 'page' : undefined}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[11px]">Dashboard</span>
        </Link>

        {/* Riwayat Tab */}
        <Link
          href="/absensi/riwayat"
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-2 rounded-xl transition-colors ${
            isRiwayat
              ? 'text-[#006194] font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-current={isRiwayat ? 'page' : undefined}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-[11px]">Riwayat</span>
        </Link>

        {/* Keluar Tab */}
        <form action={logoutAction} className="flex items-center">
          <button
            type="submit"
            className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50/50 transition-colors cursor-pointer"
            aria-label="Keluar dari akun"
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            <span className="text-[11px] font-medium">Keluar</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
