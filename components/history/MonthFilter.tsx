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
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <label
          htmlFor="month-select"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-0.5"
        >
          Filter Bulan
        </label>
        <p className="text-xs text-slate-500">
          Pilih bulan kalender untuk melihat riwayat kehadiran.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="month-select"
          type="month"
          value={currentMonth}
          onChange={handleMonthChange}
          className="min-h-[44px] h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:border-sky-600 focus:ring-1 focus:ring-sky-600 cursor-pointer shadow-2xs"
        />
      </div>
    </div>
  );
}
