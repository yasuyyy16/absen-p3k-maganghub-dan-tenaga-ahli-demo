'use client';

import { useState, useEffect } from 'react';

interface LiveClockCardProps {
  initialDateFormatted: string;
  initialTimeFormatted: string;
}

export default function LiveClockCard({
  initialDateFormatted,
  initialTimeFormatted,
}: LiveClockCardProps) {
  const [timeFormatted, setTimeFormatted] = useState(initialTimeFormatted);
  const [dateFormatted, setDateFormatted] = useState(initialDateFormatted);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr =
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now) + ' WIB';

      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      setTimeFormatted(timeStr);
      setDateFormatted(dateStr);
    };

    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute inset-0 bg-radial-[at_top] from-sky-50/50 via-transparent to-transparent pointer-events-none" />

      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Waktu Operasional
      </span>

      <h1 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[#006194] my-1">
        {timeFormatted}
      </h1>

      <p className="text-sm sm:text-base font-medium text-slate-700 mt-1">
        {dateFormatted}
      </p>

      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-xs text-slate-600 font-medium">
        <svg className="w-3.5 h-3.5 text-[#006194]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span>Asia/Jakarta (WIB)</span>
      </div>
    </div>
  );
}
