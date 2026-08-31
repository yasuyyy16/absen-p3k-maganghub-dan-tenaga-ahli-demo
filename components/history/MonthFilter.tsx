'use client';

import { useRouter } from 'next/navigation';

interface MonthFilterProps {
  currentMonth: string;
}

export default function MonthFilter({ currentMonth }: MonthFilterProps) {
  const router = useRouter();

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    if (newMonth) {
      router.push(`/absensi/riwayat?month=${encodeURIComponent(newMonth)}&page=1`);
    }
  };

  return (
    <div className="relative w-full sm:w-56">
      <input
        id="month-select"
        type="month"
        value={currentMonth}
        onChange={handleMonthChange}
        className="w-full min-h-[44px] h-11 pl-4 pr-10 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:border-[#006194] focus:ring-2 focus:ring-[#006194]/20 cursor-pointer shadow-xs transition-all outline-none"
        aria-label="Pilih Bulan Kalender"
      />
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>
    </div>
  );
}
